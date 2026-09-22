# EPIC-003: Test Harness + CI for the Domain Core

**Status:** Draft
**Priority:** P1
**Addresses:** NFR-3, NFR-4 · `docs/prd.md` §4, `docs/architecture.md` §9 (risks #3, #4)

## Problem

Zero automated tests exist in the repo (`docs/prd.md` NFR-3: 🔴 not met). The domain
has dense, easy-to-regress math — nível progression, alerta derivation (rematrícula
threshold, falta streaks, "atraso" calculation), grade capacity/slot logic, credit
accounting — none of it covered. Quality gates today are local-only: `npm run
lint`/`typecheck` run via husky pre-commit/pre-push (Story 1.6 fixed the repo-wide
hang), but nothing runs in CI (NFR-4: 🟠 partial), so a broken push still reaches
the Lovable-synced branch if hooks are bypassed or a contributor's local hooks
aren't installed.

## Goal

A test runner is wired into the project, the highest-risk pure domain functions have
unit test coverage, and GitHub Actions runs typecheck + lint + tests on every push/PR
to `main` — so a regression in alerta/grade/credit math is caught before it reaches
production, not after.

## Acceptance criteria (epic-level)

1. A test runner is installed and configured (Vitest, matching the Vite-based
   TanStack Start stack — no new bundler/build-tool dependency).
2. `npm test` runs the suite locally in a reasonable time (no dev-server / Supabase
   connection required for unit tests — pure functions only, per CON-5 "boring,
   low-maintenance").
3. Unit tests exist for the domain's pure calculation functions — at minimum: nível
   progression/ordering (`types.ts`), alerta derivation (rematrícula threshold,
   `mesesDeAtraso`, falta-streak), grade capacity/slot math
   (`slotsFixosPorPeriodo`, capacity checks), and credit delta logic
   (`presenca.functions.ts`'s creditos adjustment) — scoped to what's pure/testable
   without mocking Supabase; server functions that only orchestrate DB calls are out
   of scope for unit coverage here.
4. A GitHub Actions workflow runs on push/PR to `main`: `npm run typecheck`, `npm run
lint`, `npm test`. A failing step blocks the check (visible in the PR, does not
   silently pass).
5. `docs/framework/tech-stack.md` (or equivalent) documents the test runner choice
   and how to run tests locally.
6. No regression to existing `npm run dev`/`build`/`lint`/`typecheck` behavior —
   adding the test runner must not change any existing script's behavior.

## Stories

| ID  | Title                                                  | Executor | QA gate    |
| --- | ------------------------------------------------------ | -------- | ---------- |
| 3.1 | Install Vitest + unit tests for domain math            | @dev     | @architect |
| 3.2 | GitHub Actions CI (typecheck + lint + test on push/PR) | @devops  | @architect |

## Risks

- Scope creep into integration/E2E tests (browser automation, live Supabase) — this
  epic is unit-test coverage for pure functions + CI wiring only. Broader test
  strategy (integration, E2E) is a separate, larger decision (CON-5: prefer boring,
  low-maintenance — start narrow).
- GitHub Actions needs no new secrets for typecheck/lint/unit-test (no Supabase
  connection required per AC2/AC3) — if a future story wants integration tests
  against a real/test Supabase project, that's new scope requiring credential
  management, not assumed here.
- `data_inicio_nivel` inference edge cases (`docs/architecture.md` §9 risk #8, "dead
  code paths... false sense of security") were flagged as a known trouble spot —
  good candidate for the nível-progression tests in Story 3.1, not a blocker.
