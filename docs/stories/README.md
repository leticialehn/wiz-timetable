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
| 1.5   | [Verify `SESSION_SECRET` in Vercel; ops doc](1.5.verify-session-secret-vercel.md)  | **Done** (CONCERNS) | @devops  |

## EPIC-002 — Reconcile Database with Production (P1)

| Story | Title                                                                           | Status        | Executor       |
| ----- | ------------------------------------------------------------------------------- | ------------- | -------------- |
| 2.1   | [Baseline migration from production](2.1.baseline-migration-from-production.md) | Draft         | @data-engineer |
| 2.2   | Realtime strategy decision + implementation                                     | _not drafted_ | @data-engineer |
| 2.3   | Verify + document RLS/GRANT/constraints for all tables                          | _not drafted_ | @data-engineer |

## EPIC-003 — Test harness + CI (P1, not yet drafted)

Add `vitest`; cover `src/lib/` pure modules (`licoes.ts`, `alertas` helpers,
`types.ts` calendar/grid, credit transitions). GitHub Actions: typecheck + lint + test
on PR and on push to the connected branch.

## EPIC-004 / EPIC-005 — Hardening (P2, not yet drafted)

Realtime/perf (targeted invalidation) and data-integrity guards (credit trigger,
soft-delete, cascade review). See `docs/TECHNICAL-DEBT-REPORT.md`.

---

Next: all five EPIC-001 stories are **Done** as of 2026-09-14 (`@architect` gates on
1.4 and 1.5, both CONCERNS — see `docs/qa/gates/`). The epic is **not** closed:
epic AC8 still needs a human to verify/rotate `SESSION_SECRET` in Vercel
(QA-1.5-01, high severity), and epic AC9 needs both a working repo-wide
`npm run lint` (QA-1.4-02 — tech debt, needs its own story) and the auth walkthrough
that has been blocked by browser tooling since 1.1. See `docs/estado.md` for the
closure checklist. 2.x remain to be drafted with `@sm *draft`.
