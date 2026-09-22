# EPIC-005: Data-Integrity Guards (Credits, Cascade Delete)

**Status:** Draft
**Priority:** P2
**Addresses:** `docs/DB-AUDIT.md` §5, `docs/architecture.md` §9

## Problem

Two data-integrity gaps found during EPIC-002's audit, both confirmed live in the
current code:

1. **Credit accounting is a non-atomic read-then-write.**
   `presenca.functions.ts`'s credit adjustment (`FR-14`) does:

   ```ts
   const { data: aluno } = await client.from("alunos").select("creditos")...;
   await client.from("alunos").update({ creditos: aluno.creditos + delta })...;
   ```

   No transaction, no `UPDATE ... SET creditos = creditos + delta` (atomic
   increment). Two concurrent presença writes for the same aluno (unlikely but not
   impossible — e.g. two tabs, or a retry after a slow response) can lose one
   update. There's also no protection against a crash/network failure between the
   presença write and the credit update leaving them out of sync.

2. **Deleting an aluno is a real, reachable, irreversible action that erases
   academic history.** `removerAluno` (`cadastros.functions.ts:162`) is wired to a
   "Remover" button in `admin.alunos.tsx` behind a plain `confirm()` dialog,
   secretaria-only. Every FK from `alunos` (`alertas_status`, `aulas_licoes`,
   `aulas_notas`, `aulas_presenca`, and more) is `ON DELETE CASCADE` — clicking
   confirm on that dialog permanently erases the student's entire attendance,
   grades, and lição history, with no undo. `alunos` already has `ativo` +
   `situacao` columns that could represent "removed" without a hard delete.

## Goal

Credit adjustments cannot be lost to a race condition, and removing a student from
the roster no longer silently destroys their academic history — soft-delete (using
the existing `ativo`/`situacao` columns) replaces the hard `DELETE`, unless the
owner explicitly confirms hard delete is the intended behavior.

## Acceptance criteria (epic-level)

1. The credit adjustment in `presenca.functions.ts` becomes atomic — either a
   single `UPDATE alunos SET creditos = creditos + $delta WHERE id = $id` (no
   read-then-write round trip), or the read+write wrapped so a concurrent second
   write cannot silently overwrite the first's result.
2. **Product decision required before implementation** (see Dev Notes / Risks):
   confirm with the owner whether "Remover aluno" should become a soft-delete
   (set `ativo = false` / a new `situacao` value, keep all rows) instead of the
   current hard `DELETE ... CASCADE`. This changes user-visible behavior (a
   "removed" aluno's history stays queryable) — not a decision to make silently.
3. If soft-delete is confirmed: `removerAluno` updates `alunos` instead of
   deleting it; existing "inativos" list / filters already in the app
   (`docs/prd.md` FR-16) are checked for whether they need to also account for
   this new removal path, or already cover it.
4. `npm run typecheck` and `npm run lint` pass; no regression to the existing
   credit-adjustment behavior for the normal (non-concurrent) case, or to the
   "inativos" list.

## Stories

| ID  | Title                                                          | Executor | QA gate    |
| --- | -------------------------------------------------------------- | -------- | ---------- |
| 5.1 | Atomic credit adjustment (fix race condition)                  | @dev     | @architect |
| 5.2 | Soft-delete for "Remover aluno" (replaces hard CASCADE delete) | @dev     | @architect |

## Risks

- **Story 5.2 is blocked on an explicit owner decision**, not an engineering
  judgment call — hard-delete-with-cascade might be intentional (e.g. "this
  student was added by mistake, purge them entirely"), and soft-delete changes
  what "Remover" means for the secretaria day-to-day. Do not implement 5.2 until
  that's confirmed, same pattern as EPIC-006's cell-type-picker decision.
- Story 5.1 (atomic credit update) has no such ambiguity — it's a pure bug fix,
  safe to implement independently and first.
- If soft-delete is chosen, existing reports/queries that assume "a row in
  `alunos` = a real student" (e.g. `getLeads`'s `ehExperimental` filtering,
  `alunosMatriculados` count in `getRelatorioMatriculas`) need to be checked for
  whether they should exclude soft-deleted alunos — flag for 5.2's grounding.
