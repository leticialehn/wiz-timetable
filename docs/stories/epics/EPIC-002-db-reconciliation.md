# EPIC-002: Reconcile Database with Production

**Status:** Draft
**Priority:** P1 (do right after EPIC-001)
**Addresses:** NFR-2, NFR-9 · `docs/DB-AUDIT.md` §2/§3/§5

## Problem

`supabase/migrations/` cannot rebuild production. `aulas_licoes`, `calendario_excecoes`
and `alertas_status` were created directly in Supabase Studio; `alunos.data_inicio_nivel`
and `alunos.data_nascimento` were added the same way. Several CHECK constraints were
mutated by anonymous `DO $$` blocks. Realtime is also partly broken for the browser
after the lockdown migration.

## Goal

`supabase migration list` shows local == remote; every table and column in production
is represented by a committed migration; a documented decision exists for the Realtime
strategy.

## Acceptance criteria (epic-level)

1. A baseline migration generated from production (`supabase db pull`) is committed.
2. `supabase migration list` is clean (no drift) against the production project.
3. DDL for `aulas_licoes`, `calendario_excecoes`, `alertas_status`, and the two
   `alunos` columns is present in version control (inside the baseline or as explicit
   follow-ups).
4. The real unique constraint on `aulas_presenca` / `aulas_notas` (does it include
   `parte` / `horario_especifico`?) is verified and captured.
5. RLS + GRANT state of all 12 tables is documented in `docs/DB-AUDIT.md` §3 from the
   actual production catalog, not inferred.
6. A decision is recorded for Realtime: re-add narrow SELECT policies for the
   professora-screen tables, OR switch to polling, OR authenticated Realtime.
7. `CONTRIBUTING`-style note added: **no more schema edits in Studio** — migrations only.

## Stories

| ID  | Title                                                  | Executor       | QA gate |
| --- | ------------------------------------------------------ | -------------- | ------- |
| 2.1 | Baseline migration from production; drift check        | @data-engineer | @dev    |
| 2.2 | Realtime strategy decision + implementation            | @data-engineer | @dev    |
| 2.3 | Verify + document RLS/GRANT/constraints for all tables | @data-engineer | @dev    |

## Risks

- `supabase db pull` requires the project ref + a DB password / access token — @devops
  provides credentials; never commit them.
- A squashed baseline changes migration hashes → coordinate so no one has pending
  local migrations when it lands.
