# EPIC-001: Wire Authentication & Authorization

**Status:** Draft
**Priority:** P0 (blocker — production data exposure)
**Addresses:** NFR-1, NFR-5, FR-33..35 · `docs/DB-AUDIT.md` §4 · `docs/architecture.md` §6

## Problem

The app ships a complete custom auth system (`usuarios` table, PBKDF2 hashing,
session cookies, `requireAuthenticated`/`requireRole`, `LoginForm`) that is **not
connected to anything**. No route guards it, no server function checks it. Every RPC
endpoint runs with the Supabase **service-role** key and no session check, so anyone
with the deployment URL has full read/write access to students' (minors') names,
birthdays, attendance, grades, and contracts.

## Goal

Every screen requires a logged-in user; every data-returning or mutating server
function verifies the session; admin-only actions verify the `secretaria` role. No
behaviour change for a legitimately logged-in user.

## Non-goals

- Migrating to Supabase Auth (stays custom).
- Per-role Postgres RLS (revisit as a later epic; service-role server model stays).
- Password reset / email flows (add later if needed; secretaria can reset via
  `/admin/usuarios`).

## Acceptance criteria (epic-level)

1. Visiting any route while unauthenticated redirects to a login screen.
2. After successful `login`, the user lands on the screen they requested.
3. On first run (0 `usuarios`), the bootstrap flow (`criarPrimeiroUsuario`) is
   reachable and creates a `secretaria`.
4. Every server function in `presenca/grade/cadastros/alertas/relatorios/calendario/
usuarios.functions.ts` calls `requireAuthenticated()` before touching data.
5. Admin-only mutations (cadastros, calendário, grade edits, usuários) additionally
   call `requireRole(["secretaria"])`.
6. `professor` / `coordenador` can use the professora screens and their own alerts but
   receive an authorization error from admin-only endpoints.
7. The no-op `attachSupabaseAuth` middleware is removed or repurposed to forward the
   session cookie.
8. `SESSION_SECRET` is confirmed set and strong in Vercel; documented in
   `docs/framework/tech-stack.md`.
9. `npm run typecheck` and `npm run lint` pass; manual auth walkthrough recorded.

## Stories

| ID  | Title                                                    | Executor | QA gate    |
| --- | -------------------------------------------------------- | -------- | ---------- |
| 1.1 | Mount login + route guards                               | @dev     | @architect |
| 1.2 | Guard all data server functions (`requireAuthenticated`) | @dev     | @architect |
| 1.3 | Role checks on admin-only endpoints (`requireRole`)      | @dev     | @architect |
| 1.4 | Remove/repurpose `attachSupabaseAuth`; session hygiene   | @dev     | @architect |
| 1.5 | Verify `SESSION_SECRET` in Vercel; ops doc               | @devops  | @architect |

## Risks

- A missed endpoint stays open → mitigate with a checklist enumerating every exported
  `createServerFn` (Story 1.2 task 1) and a lint/grep check in CI later.
- Locking out the only user → keep `criarPrimeiroUsuario` bootstrap working and test
  it on a throwaway DB first.
