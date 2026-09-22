# EPIC-004: Realtime & Performance Hardening

**Status:** Draft
**Priority:** P2
**Addresses:** NFR-9 (partially already resolved — see Re-grounding below), `docs/architecture.md` §9 (risks #5, #6)

## Re-grounding (2026-09-18)

The PRD's original framing (`NFR-9: 🟠 partially broken`, risk #6 "Realtime
partially broken post-lockdown") predates **Story 2.2** (EPIC-002, Done
2026-09-17), which already decided and implemented the Realtime strategy: 4
low-sensitivity tables (`professoras`, `grade_base`, `horarios_config`,
`excecoes_semana`) keep a public `SELECT`-only RLS policy for Realtime;
high-sensitivity tables (`alunos`, `aulas_presenca`, `aulas_notas`) intentionally
have no Realtime and fall back to react-query's refetch-on-focus/mount — a
deliberate, documented trade-off (`docs/DB-AUDIT.md` §3), not a bug.

**So NFR-9 / risk #6 is effectively closed already.** What's left, confirmed by
reading `src/hooks/use-realtime-grade.ts` directly, is **risk #5**: every
`postgres_changes` event on any of the 5 subscribed tables calls
`qc.invalidateQueries()` with **no query-key argument**, which invalidates
**every** active React Query in the app, not just the grade-related ones. This
epic is re-scoped to that one concern.

## Problem

```ts
channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () =>
  qc.invalidateQueries(),
);
```

Any change to `professoras`, `grade_base`, `horarios_config`, `excecoes_semana`,
or `aulas_licoes` — by any user, anywhere in the app — triggers a full refetch of
every active query on every connected client's screen, not just the grade/professora
views that actually depend on that data. This is currently invisible (small data,
few concurrent users) but will show up as unnecessary network chatter and refetch
flicker as usage grows — exactly the risk the architecture doc flags.

## Goal

Realtime invalidation is scoped to the query keys that actually depend on the
changed table, so an edit to the grade only refetches grade-related queries, not
every screen's data.

## Acceptance criteria (epic-level)

1. `useRealtimeGrade`'s `postgres_changes` handlers invalidate only the query keys
   that consume the changed table's data (e.g. `["grade-semana", ...]`,
   `["professoras"]`), not `invalidateQueries()` with no arguments.
2. Every screen currently relying on `useRealtimeGrade` for live updates (grep
   confirms 17 call sites per Story 2.2's Dev Notes) is re-verified to still
   receive updates after the scoping change — no regression to "professora screen
   updates live when secretaria edits the grade."
3. `npm run typecheck` and `npm run lint` pass; no behavior change to which tables
   are subscribed (that's Story 2.2's decision, out of scope here — this epic only
   narrows what gets invalidated per event, not what's subscribed).

## Stories

| ID  | Title                                                          | Executor | QA gate    |
| --- | -------------------------------------------------------------- | -------- | ---------- |
| 4.1 | Scope `useRealtimeGrade`'s invalidation to affected query keys | @dev     | @architect |

## Risks

- Under-scoping (missing a query key that should be invalidated) silently breaks
  live updates for one screen — Story 4.1 must enumerate all 17 call sites'
  query keys from Story 2.2's Dev Notes / a fresh grep, not guess.
- This epic assumes React Query's query-key structure is stable/enumerable across
  the app; if keys are constructed dynamically in ways that are hard to enumerate,
  the story may need to fall back to a coarser but still-scoped invalidation
  (e.g. by query-key prefix) rather than a blanket `invalidateQueries()`.
