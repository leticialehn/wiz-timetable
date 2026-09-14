# EPIC-006: "Comercial" Class Type & Prospect Tracking

**Status:** Draft
**Priority:** P2 (product feature; blocked on EPIC-002 Story 2.1)
**Addresses:** user request 2026-09-14 (session), `docs/DB-AUDIT.md` §2 (migration drift)

## Problem

The secretaria needs to schedule prospective clients ("clientes que vão conversar
sobre uma possível matrícula") into 15-minute slots on the grade, the same way
"Aula Online" already splits a 1h period into three 20-minute slots. Today there is
no class type for this — the closest workaround (typing a name into an existing
slot) would either occupy a real teaching seat or get miscounted alongside
experimental-class walk-ins ("Exp " prefix convention) in the existing "Leads"
report, both of which the user explicitly wants kept separate.

## Goal

A new `TipoHorario` "Comercial" with 4×15min sub-slots per period, bookable the
same way as any other cell type (free-text name, never a real `alunos` row — same
mechanism already used by "Exp" experimentais and other avulsos). A dedicated,
top-level nav tab lists Comercial prospects only, cleanly separated from the
existing Leads report (which keeps covering everything else) and from real
matriculated students (already a structurally separate table — no risk there).

## Non-goals

- No new "prospect" database table. Reuses `aluno_nome_avulso` — the same
  free-text mechanism "Exp" and other avulsos already use. Revisit only if the
  business later needs prospect-specific fields (phone, follow-up status, etc.).
- No CRM workflow (status tracking, follow-up reminders) — this epic is booking +
  visibility only.

## Dependency

**Blocked on EPIC-002 Story 2.1 (baseline migration from production) landing
first**, per the user's explicit decision 2026-09-14. `horarios_config.tipo`,
`grade_base.tipo`, and `excecoes_semana.tipo` all have Postgres CHECK constraints
that must be widened to allow `"comercial"` as a value — `docs/DB-AUDIT.md` §2
already documents that these same constraints were previously mutated in
production via anonymous `DO $$` blocks with no committed migration behind them.
Adding a new value the same undisciplined way would compound that drift right
after EPIC-001 fixed the app-code half of the project's quality gates. Land 2.1
first so this constraint change is the first migration written the _correct_ way.

## Acceptance criteria (epic-level)

1. `TipoHorario` includes `"comercial"`, capacity 4, label "Comercial", does not
   track livro/nível progress (`TIPO_MOSTRA_LIVRO: false`).
2. A "Comercial" cell splits into 4 fixed 15-minute sub-slots per period (`:00`,
   `:15`, `:30`, `:45`), same interaction pattern as "Online"'s 3×20min slots —
   implemented as a shared, config-driven mechanism (not a second copy-pasted
   `if (tipo === "online")` branch).
3. Secretaria can configure a "Comercial" cell on any período/professora, same as
   any other tipo today (no additional restriction).
4. The DB migration adding `"comercial"` to all three `tipo` CHECK constraints is
   a committed, named migration file (not a Studio/ad-hoc edit), applied after
   Story 2.1's baseline is in place.
5. A new top-level nav item "Comercial" (not nested under Relatórios) lists every
   booked prospect, grouped/deduplicated by name the same way the existing Leads
   report does, filtered strictly to `tipo === "comercial"`.
6. The existing "Leads" report (`/admin/relatorios/avulsos`) excludes
   `tipo === "comercial"` rows, so a prospect appears in exactly one place.
7. `npm run typecheck` and `npm run lint` pass; no regression to existing tipos'
   capacity, sub-slot, or Leads-report behavior.

## Stories

| ID  | Title                                                   | Executor | QA gate    |
| --- | ------------------------------------------------------- | -------- | ---------- |
| 6.1 | Add "Comercial" horario type (schema + types + grid UI) | @dev     | @architect |
| 6.2 | "Comercial" nav tab + prospect list, split from Leads   | @dev     | @architect |

## Risks

- The migration (AC4) cannot land safely until Story 2.1 closes EPIC-002's drift —
  do not shortcut this by editing the constraint directly in Studio again.
- Generalizing the "online" sub-slot branch in `admin.index.tsx` (AC2) touches
  code that also renders every other tipo's cell — keep the refactor narrow and
  covered by re-checking Online's existing behavior is unchanged, not just
  Comercial's new behavior.
