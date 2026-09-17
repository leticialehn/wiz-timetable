# EPIC-002: Reconcile Database with Production

**Status:** Done (closed 2026-09-17, authorized by owner)
**Priority:** P1 (do right after EPIC-001)
**Addresses:** NFR-2, NFR-9 · `docs/DB-AUDIT.md` §2/§3/§5

## Closure summary (2026-09-17)

All 3 stories Done, all with QA Gate PASS:

- 2.1 — baseline migration, drift resolved, DDL captured, unique constraint
  verified. Also found and fixed a live RLS lockdown regression + a
  default-privileges gap along the way (see `docs/DB-AUDIT.md` §0).
- 2.2 — Realtime strategy decided and implemented, split by student-PII
  sensitivity.
- 2.3 — full constraint inventory (PK/UNIQUE/FK/CHECK) for all 12 tables,
  verified live against prod with zero drift. Surfaced a real blocker for
  EPIC-006 (disagreeing `tipo` CHECK constraints across 3 tables) —
  documented in `docs/DB-AUDIT.md` §5a, not resolved here (out of this
  epic's scope).

All 7 epic-level ACs satisfied. Gates: `docs/qa/gates/2.2-realtime-strategy.yml`,
`docs/qa/gates/2.3-constraints-inventory.yml` (2.1 used `/code-review` +
Supabase's security advisor in place of a formal gate file, documented in the
story itself).

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
