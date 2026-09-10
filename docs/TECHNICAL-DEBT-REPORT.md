# Technical Debt Report — Wiz Timetable

> Executive summary of the brownfield discovery (2026-09-10). Full detail in
> `docs/architecture.md`, `docs/DB-AUDIT.md`, `docs/prd.md`.

## Verdict

The application is **functionally healthy and actively maintained** — dense, well-
commented domain code, a coherent data model, real bug-fixing discipline in git. But
it carries **one critical security gap** and several structural risks that will make
future change error-prone. None require a rewrite.

## Findings by severity

### 🔴 Critical — act now

| #   | Finding                                                                                                                                                                                                                                                                        | Evidence                                                                                                                | Fix                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| C1  | **App has no authentication wired.** Every screen and every server-function RPC is public; endpoints use the Supabase service-role key with no session check. Full read/write access to minors' PII (names, birthdays, attendance, grades, contracts) for anyone with the URL. | `LoginForm` imported nowhere; `requireAuthenticated`/`requireRole` called nowhere; only "guard" is `index.tsx` redirect | EPIC-001 (stories 1.1–1.5 drafted) |
| C2  | **Migrations don't reproduce production.** `aulas_licoes`, `calendario_excecoes`, `alertas_status` and 2 `alunos` columns exist only in prod (created in Studio). Cannot safely reset/branch the DB or reason about future migrations.                                         | `supabase/migrations/*.sql` vs generated `types.ts`; migration comments admit it                                        | EPIC-002 (stories 2.1–2.3 drafted) |

### 🟠 High — schedule soon

| #   | Finding                                                                                                                                                         | Fix                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| H1  | **Zero automated tests** over dense domain math (alertas, grade computation, lesson progression, credit transitions). Regressions ship silently.                | EPIC-003: add vitest, cover `src/lib/` pure modules                    |
| H2  | **No CI.** Broken code can reach the Lovable-synced branch. Only local husky hooks exist.                                                                       | EPIC-003: GitHub Actions (typecheck + lint + test)                     |
| H3  | **Realtime partly broken.** After the DB lockdown, the browser's anon key can't `SELECT` most tables, so cross-user live refresh only works for `aulas_licoes`. | EPIC-002 story 2.2: decide policy re-add vs polling vs authed realtime |

### 🟡 Medium — track

| #   | Finding                                                                                                                       | Fix                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| M1  | `queryClient.invalidateQueries()` on **every** Realtime event → refetch storms as data grows.                                 | EPIC-004: targeted invalidation                                  |
| M2  | Credit accounting is app-side only; a crash mid-write corrupts `alunos.creditos`.                                             | EPIC-005: DB trigger or transaction                              |
| M3  | `ON DELETE CASCADE` from `alunos`/`professoras` erases academic history on delete.                                            | EPIC-005: enforce soft-delete (`ativo`/`situacao` already exist) |
| M4  | Dead/no-op code: `attachSupabaseAuth` middleware, `usuarios.functions` (no UI), `LoginForm`. Creates false sense of security. | folded into EPIC-001                                             |
| M5  | Deploy-target comments contradict reality (Cloudflare Workers vs Vercel preset).                                              | doc fix during EPIC-001 story 1.5                                |

## Recommended sequence

1. **EPIC-001** — auth wiring (P0, ~1 week of stories)
2. **EPIC-002** — DB reconciliation (P1, right after)
3. **EPIC-003** — tests + CI (P1, parallelisable with 002)
4. **EPIC-004 / 005** — hardening (P2)

## What is NOT debt (leave alone)

- The `@lovable.dev/vite-tanstack-config` preset and its bundled plugins.
- The service-role-server model (it's a valid pattern; per-role RLS is a _later_
  option, not a fix).
- Portuguese domain vocabulary everywhere.
- The comment density in `src/lib/` — it's a strength; keep it.
