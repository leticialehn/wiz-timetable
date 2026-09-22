# Stories Index — Wiz Timetable

Status legend: **Draft** (@sm) → **Ready** (@po) → **InProgress** (@dev) →
**InReview** (@qa) → **Done**.

> Fonte de verdade agregada: `docs/estado.md`. Este arquivo é um índice rápido por
> epic/story — se divergir de `docs/estado.md`, o outro documento prevalece.

## EPIC-001 — Wire Authentication & Authorization (P0) — ✅ Done

| Story | Title                                                                              | Status          | Executor |
| ----- | ---------------------------------------------------------------------------------- | --------------- | -------- |
| 1.1   | [Mount login and route guards](1.1.mount-login-and-route-guards.md)                | Done (CONCERNS) | @dev     |
| 1.2   | [Guard all data server functions](1.2.guard-server-functions.md)                   | Done (CONCERNS) | @dev     |
| 1.3   | [Role checks on admin-only endpoints](1.3.role-checks-admin-endpoints.md)          | Done (CONCERNS) | @dev     |
| 1.4   | [Remove `attachSupabaseAuth`; session hygiene](1.4.remove-attach-supabase-auth.md) | Done (CONCERNS) | @dev     |
| 1.5   | [Verify `SESSION_SECRET` in Vercel; ops doc](1.5.verify-session-secret-vercel.md)  | Done (all ACs)  | @devops  |
| 1.6   | [Fix repo-wide `npm run lint`](1.6.fix-repo-wide-lint.md)                          | Done (PASS)     | @dev     |

## EPIC-002 — Reconcile Database with Production (P1) — ✅ Done (closed 2026-09-17)

| Story | Title                                                                                  | Status                                                        | Executor       |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------- |
| 2.1   | [Baseline migration from production](2.1.baseline-migration-from-production.md)        | Done (`/code-review` + Supabase advisor, no formal gate file) | @data-engineer |
| 2.2   | [Realtime strategy decision + implementation](2.2.realtime-strategy.md)                | Done (PASS)                                                   | @data-engineer |
| 2.3   | [Verify + document RLS/GRANT/constraints for all tables](2.3.constraints-inventory.md) | Done (PASS)                                                   | @data-engineer |

## EPIC-006 — "Comercial" Class Type & Prospect Tracking (P2) — ✅ Done (closed 2026-09-18)

| Story | Title                                                           | Status          | Executor |
| ----- | --------------------------------------------------------------- | --------------- | -------- |
| 6.1   | [Add "Comercial" horario type](6.1.add-comercial-tipo-aula.md)  | Done (CONCERNS) | @dev     |
| 6.2   | ["Comercial" nav tab + prospect list](6.2.comercial-nav-tab.md) | Done (CONCERNS) | @dev     |

## EPIC-003 — Test Harness + CI (P1) — Draft, created 2026-09-18

`docs/stories/epics/EPIC-003-test-harness-ci.md`

| Story | Title                                                                          | Status          | Executor |
| ----- | ------------------------------------------------------------------------------ | --------------- | -------- |
| 3.1   | [Install Vitest + unit tests for domain math](3.1.vitest-domain-unit-tests.md) | Done (PASS)     | @dev     |
| 3.2   | [GitHub Actions CI (typecheck+lint+test)](3.2.github-actions-ci.md)            | Done (CONCERNS) | @devops  |

## EPIC-004 — Realtime & Performance Hardening (P2) — Draft, created 2026-09-18

`docs/stories/epics/EPIC-004-realtime-performance-hardening.md` — re-scoped during
grounding: the original NFR-9 access-breakage concern was already resolved by
Story 2.2; what's left is `useRealtimeGrade`'s blanket `invalidateQueries()`.

| Story | Title                                                                                    | Status          | Executor |
| ----- | ---------------------------------------------------------------------------------------- | --------------- | -------- |
| 4.1   | [Scope realtime invalidation to affected query keys](4.1.scope-realtime-invalidation.md) | Ready (GO 9/10) | @dev     |

## EPIC-005 — Data-Integrity Guards (P2) — ✅ Done (closed 2026-09-22)

`docs/stories/epics/EPIC-005-data-integrity-guards.md`

| Story | Title                                                                                                | Status      | Executor |
| ----- | ---------------------------------------------------------------------------------------------------- | ----------- | -------- |
| 5.1   | [Atomic credit adjustment (fix race condition)](5.1.atomic-credit-adjustment.md)                     | Done (PASS) | @dev     |
| 5.2   | [Soft-delete for "Remover aluno"](5.2.soft-delete-aluno.md) — owner confirmed soft-delete 2026-09-18 | Done (PASS) | @dev     |

---

Todas as 5 stories de EPIC-003/004/005 foram validadas pelo `@po` em 2026-09-22 —
todas **GO**, **Ready**, prontas pro `@dev *develop`. Nenhuma tem dependência
bloqueante entre si (epics independentes), exceto 3.2 → 3.1 (CI precisa do
`npm test` que 3.1 cria) dentro do próprio EPIC-003. A validação encontrou e
corrigiu 3 imprecisões reais nos drafts (nenhuma bloqueante): 3.1 precisava de
um `vitest.config.ts` standalone em vez de mexer em `vite.config.ts` (risco de
CON-4); 4.1 tinha um off-by-one no grep dos call sites; 5.2 tinha uma referência
de linha desatualizada.

Ver `docs/estado.md` para o histórico completo de progresso e decisões.
