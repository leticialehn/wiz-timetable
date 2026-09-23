# EPIC-007: Comercial Booking Integrity + Matriculation Flow

**Status:** Done (2026-09-23)
**Priority:** P1 (real data-integrity bug affecting matrícula counts)

**Closure (2026-09-23):** All 3 stories Done, all QA gate PASS. 7.1 fixed the
root-cause bug (Comercial cells never call `criarAluno` anymore, and are
always scoped "só esta semana"). 7.2 migrated the 4 real "Exp" `alunos` rows
into Comercial avulso bookings and deleted them — verified live, 0 remain,
`alunosMatriculados` dropped from 160 to 156 (the correct count). 7.3 added
the "MATRICULADO" button with inline nome/nível editing. All 3 epic-level
ACs satisfied, no open items.
**Addresses:** user request 2026-09-22 (session), follow-up to EPIC-006

## Problem

User report: "Exp" experimental-class walk-ins (secretaria types "Exp Fulana" into
a grid cell to try a class before deciding to enroll) were being saved as real
`alunos` rows. Investigated and confirmed: `admin.index.tsx`'s main inline cell
editor (`LinhaVaziaEditavel`) unconditionally calls `criarAluno({nome, nivel})`
whenever a typed name doesn't match an existing aluno, for **any** cell type —
there is no `tipo` branch that keeps a booking avulso-only. This has already
happened for real: **4 real `alunos` rows exist in production** today with names
starting "Exp ", `ativo=true, situacao='matriculado'`, inflating
`getRelatorioMatriculas`'s `alunosMatriculados`/`novasMatriculas` counts.

**More serious latent bug found during this investigation:** the same
unconditional `criarAluno` call applies to `tipo === "comercial"` cells too.
Story 6.1/6.2 (EPIC-006, already shipped) assumed Comercial bookings only ever
write `aluno_nome_avulso` (free text, no real `alunos` row) — confirmed by
re-reading both stories' QA gates that this was verified only against the
_other_ avulso path (the "add to any period" modal), never against the main
grid editor secretaria actually uses. No live Comercial bookings exist in prod
yet (0 rows), so no damage done there yet — but the bug is live and would
silently break `getRelatorioMatriculas`'s counts and the Leads/Comercial
mutual-exclusivity the moment someone books a Comercial slot from the grid.

## Goal

1. Booking an empty cell of `tipo === "comercial"` from the grid never creates a
   real `alunos` row — always avulso (`aluno_nome_avulso`), matching what
   Story 6.1/6.2 assumed.
2. The 4 existing "Exp" `alunos` rows are migrated: their bookings become
   Comercial avulso occurrences (name only, no "Exp " prefix — the Comercial
   cell's own distinct color/tab is now the "this is a prospect, not an
   enrolled student" signal, replacing the need for a text prefix), and their
   `alunos` rows are removed (owner-confirmed: no notes/presença history needs
   preserving for these — they did at most one experimental class).
3. A "MATRICULADO" button on `/admin/comercial`, next to each prospect, that —
   when clicked — turns that row's name and nível into inline-editable fields
   (nível not tracked today for a prospect, since they're not a real aluno yet)
   and, on confirm, creates a real `alunos` row via the existing `criarAluno`
   function — the one sanctioned way a Comercial prospect becomes a real
   student.

## Acceptance criteria (epic-level)

1. `LinhaVaziaEditavel`'s cell editor never calls `criarAluno` for a
   `tipo === "comercial"` cell — always books via `aluno_nome_avulso`.
2. No regression to any other cell type's existing "type a new name → create a
   real aluno" behavior (that's correct for regular/vip/online/etc. — a new
   name there usually is a real new student).
3. The 4 production "Exp" `alunos` rows are gone from the `alunos` table; their
   original booking slots (día/período/professora) now show as Comercial
   avulso bookings with the plain name (no "Exp " prefix), findable on
   `/admin/comercial`.
4. `/admin/comercial` has a working "MATRICULADO" flow: click → inline
   editable nome + nível → confirm → real `alunos` row created with the
   entered values.
5. `npm run typecheck`, `npm run lint`, `npm test` all pass throughout.

## Stories

| ID  | Title                                                                | Executor       | QA gate    |
| --- | -------------------------------------------------------------------- | -------------- | ---------- |
| 7.1 | Fix: Comercial cells never auto-create a real `alunos` row           | @dev           | @architect |
| 7.2 | Data migration: move the 4 "Exp" alunos into Comercial avulso        | @data-engineer | @dev       |
| 7.3 | "MATRICULADO" button on /admin/comercial (inline nome+nível → aluno) | @dev           | @architect |

## Risks

- **7.2 touches real production data for real people (minors).** Every
  affected row must be identified and reviewed live before any write; each
  write pinned to a specific `id`, never a broad `WHERE nome LIKE`. Order
  matters: `grade_base`/`excecoes_semana.aluno_id` is `ON DELETE CASCADE` to
  `alunos` — the booking row must be repointed to avulso (`aluno_id = NULL`,
  `aluno_nome_avulso` set, `tipo = 'comercial'`) **before** the `alunos` row is
  deleted, or the booking itself would be destroyed by the cascade along with
  the (desired) presença/alertas cleanup.
- 7.1 must not accidentally change behavior for non-Comercial tipos — the
  "type a new name → create a real aluno" behavior is correct everywhere else.
- 7.3's "MATRICULADO" flow doesn't need to (and per this session's scoping,
  doesn't) link the new `alunos` row back to the prospect's historical
  Comercial occurrences — it's a fresh enrollment, not a data-migration of
  their prospect history. Confirm this reading holds; flagged as an explicit
  scope boundary, not an oversight, if revisited later.
