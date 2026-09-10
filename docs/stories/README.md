# Stories Index — Wiz Timetable

Status legend: **Draft** → **Approved** (@po) → **InProgress** (@dev) → **Review**
(@qa) → **Done**.

## EPIC-001 — Wire Authentication & Authorization (P0)

| Story | Title                                                                     | Status        | Executor |
| ----- | ------------------------------------------------------------------------- | ------------- | -------- |
| 1.1   | [Mount login and route guards](1.1.mount-login-and-route-guards.md)       | Draft         | @dev     |
| 1.2   | [Guard all data server functions](1.2.guard-server-functions.md)          | Draft         | @dev     |
| 1.3   | [Role checks on admin-only endpoints](1.3.role-checks-admin-endpoints.md) | Draft         | @dev     |
| 1.4   | Remove/repurpose `attachSupabaseAuth`; session hygiene                    | _not drafted_ | @dev     |
| 1.5   | Verify `SESSION_SECRET` in Vercel; ops doc                                | _not drafted_ | @devops  |

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

Next: `@po *validate-story-draft` on 1.1, then `@dev` implements. Draft 1.4/1.5/2.x
with `@sm *draft` when 1.1–1.3 are underway.
