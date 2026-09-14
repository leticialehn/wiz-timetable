# Stories Index — Wiz Timetable

Status legend: **Draft** (@sm) → **Ready** (@po) → **InProgress** (@dev) →
**InReview** (@qa) → **Done**.

## EPIC-001 — Wire Authentication & Authorization (P0)

| Story | Title                                                                              | Status              | Executor |
| ----- | ---------------------------------------------------------------------------------- | ------------------- | -------- |
| 1.1   | [Mount login and route guards](1.1.mount-login-and-route-guards.md)                | **Done** (CONCERNS) | @dev     |
| 1.2   | [Guard all data server functions](1.2.guard-server-functions.md)                   | **Done** (CONCERNS) | @dev     |
| 1.3   | [Role checks on admin-only endpoints](1.3.role-checks-admin-endpoints.md)          | **Done** (CONCERNS) | @dev     |
| 1.4   | [Remove `attachSupabaseAuth`; session hygiene](1.4.remove-attach-supabase-auth.md) | **Done** (CONCERNS) | @dev     |
| 1.5   | [Verify `SESSION_SECRET` in Vercel; ops doc](1.5.verify-session-secret-vercel.md)  | **Done** (all ACs)  | @devops  |
| 1.6   | [Fix repo-wide `npm run lint`](1.6.fix-repo-wide-lint.md)                          | **Done** (PASS)     | @dev     |

## EPIC-002 — Reconcile Database with Production (P1)

| Story | Title                                                                           | Status        | Executor       |
| ----- | ------------------------------------------------------------------------------- | ------------- | -------------- |
| 2.1   | [Baseline migration from production](2.1.baseline-migration-from-production.md) | Draft         | @data-engineer |
| 2.2   | Realtime strategy decision + implementation                                     | _not drafted_ | @data-engineer |
| 2.3   | Verify + document RLS/GRANT/constraints for all tables                          | _not drafted_ | @data-engineer |

## EPIC-006 — "Comercial" Class Type & Prospect Tracking (P2)

`docs/stories/epics/EPIC-006-comercial-tipo-aula.md` — **blocked on EPIC-002 Story
2.1 landing first** (needs a clean migration history before widening `tipo` CHECK
constraints).

| Story | Title                                                           | Status | Executor |
| ----- | --------------------------------------------------------------- | ------ | -------- |
| 6.1   | [Add "Comercial" horario type](6.1.add-comercial-tipo-aula.md)  | Draft  | @dev     |
| 6.2   | ["Comercial" nav tab + prospect list](6.2.comercial-nav-tab.md) | Draft  | @dev     |

## EPIC-003 — Test harness + CI (P1, not yet drafted)

Add `vitest`; cover `src/lib/` pure modules (`licoes.ts`, `alertas` helpers,
`types.ts` calendar/grid, credit transitions). GitHub Actions: typecheck + lint + test
on PR and on push to the connected branch.

## EPIC-004 / EPIC-005 — Hardening (P2, not yet drafted)

Realtime/perf (targeted invalidation) and data-integrity guards (credit trigger,
soft-delete, cascade review). See `docs/TECHNICAL-DEBT-REPORT.md`.

---

Next: **all nine EPIC-001 acceptance criteria are satisfied as of 2026-09-14.** All
six stories are **Done** — 1.6 closed with the epic's first **PASS** (no CONCERNS).
The manual auth walkthrough was resolved via direct HTTP calls to the dev server's
server-fn RPC endpoints (Chrome automation is blocked at the extension level on
plain-HTTP navigation). AC7's text was amended by `@po` to name both removed
middlewares. AC8 was resolved with the user's live permission: `SESSION_SECRET` was
missing from every Vercel environment (not weak — absent); a fresh high-entropy value
was generated and added to Production and Preview (an add, not a rotation — no user
was logged out). See `docs/estado.md` for full detail. EPIC-001's formal closure
(flipping the epic `Status` field) is `@po`/`@pm`'s call. All commits are now
pushed to `origin/main`.

EPIC-006 ("Comercial" class type) was drafted 2026-09-14 from a user feature
request — two stories, both Draft, both **blocked on EPIC-002 Story 2.1** landing
first (a clean migration baseline before widening any `tipo` CHECK constraint).
2.1 itself needs Supabase credentials from a human before `@data-engineer` can run
it. 2.2/2.3 remain to be drafted with `@sm *draft`.
