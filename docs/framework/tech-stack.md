# Tech Stack — Wiz Timetable

> Authoritative list of technologies, versions, and the rules that come with each.
> Extracted from the running codebase (`package.json`, `vite.config.ts`, `supabase/`).
> `@dev` loads this file on every story. Do not introduce a technology that is not
> listed here without an architecture decision.

## Runtime targets

| Concern           | Choice                                                                                    | Notes                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Language          | TypeScript 5.8, `strict: true`                                                            | `target` ES2022, `moduleResolution: "Bundler"`, `noEmit`                                                                |
| Package manager   | **bun** (`bun.lock`, `bunfig.toml`)                                                       | `npm` also works locally; never commit `package-lock.json` (`.gitignore` + `.gitattributes` enforce this)               |
| Node (tooling)    | >= 18, tested on v24                                                                      | husky / lint-staged / eslint run under Node                                                                             |
| Deploy target     | **Vercel** (`nitro: { preset: "vercel" }` in `vite.config.ts`)                            | Nitro builds the server bundle; `.vercel/output/` is the build artifact                                                 |
| SSR server entry  | `src/server.ts` (custom `fetch` wrapper over `@tanstack/react-start/server-entry`)        | Wraps catastrophic SSR errors into an HTML 500 page                                                                     |
| Env vars (server) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SESSION_SECRET` | Set in Vercel **Production + Preview** and in local `.env`/`.env.local`. See § Secrets below and `docs/architecture.md` |

> Historical note: comments in `src/lib/auth.server.ts` still reference Cloudflare
> Workers / PBKDF2 100k-iteration limit. The active deploy preset is Vercel. Keep
> password hashing within the Web Crypto API (works on both) but treat Vercel as
> the source of truth for runtime constraints.

## Framework layer

| Package                             | Version (range) | Role                                                                                                                                                                     |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@tanstack/react-start`             | ~1.168          | Full-stack framework: SSR, server functions (`createServerFn`), middleware, sessions                                                                                     |
| `@tanstack/react-router`            | ~1.170          | File-based routing (`src/routes/`), type-safe links, `beforeLoad` guards                                                                                                 |
| `@tanstack/router-plugin`           | ~1.168          | Generates `src/routeTree.gen.ts` (committed, never hand-edited)                                                                                                          |
| `@tanstack/react-query`             | ~5.101          | All client data fetching / caching; one `QueryClient` in router context                                                                                                  |
| `react` / `react-dom`               | 19.2            | React 19 (Actions, `use`, no `forwardRef` needed)                                                                                                                        |
| `vite`                              | 8               | Bundler, via `@lovable.dev/vite-tanstack-config` wrapper                                                                                                                 |
| `@lovable.dev/vite-tanstack-config` | ~2.7            | **Opinionated preset** — bundles devtools, tanstackStart, viteReact, tailwind, tsConfigPaths, nitro, `@` alias, env injection. Do **not** re-add these plugins manually. |

## Data layer

| Package                 | Version                                 | Role                              |
| ----------------------- | --------------------------------------- | --------------------------------- |
| `@supabase/supabase-js` | ~2.110                                  | Postgres access + Realtime        |
| Supabase Postgres       | hosted (project `eaebeymijwkzfoozerzw`) | Single `public` schema, 12 tables |

Two clients, strictly separated:

- **`@/integrations/supabase/client`** — anon / publishable key (`sb_publishable_…`).
  Ships to the browser. Used only by `useRealtimeGrade`. Generated file, do not edit.
- **`@/integrations/supabase/client.server`** — **service role** key, bypasses RLS.
  Server-only. Must be `await import(...)`-ed _inside_ a handler in any `*.functions.ts`
  file (those bundle to the client). Top-level import is allowed only in `*.server.ts`.

Realtime: `useRealtimeGrade` subscribes to 8 tables on one channel and calls
`queryClient.invalidateQueries()` on any change.

## UI layer

| Package                                                                                           | Version               | Role                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tailwindcss` + `@tailwindcss/vite`                                                               | 4.2                   | **Tailwind v4** — config is CSS-first in `src/styles.css`, not `tailwind.config.js`                                      |
| `tw-animate-css`                                                                                  | 1.3                   | Animation utilities                                                                                                      |
| Radix UI primitives (`@radix-ui/react-*`)                                                         | 1.x–2.x               | Headless primitives behind the `ui/` components                                                                          |
| shadcn/ui                                                                                         | (vendored, not a dep) | Components generated into `src/components/ui/` — `components.json` drives the CLI                                        |
| `class-variance-authority` + `clsx` + `tailwind-merge`                                            | —                     | `cn()` helper in `src/lib/utils.ts`                                                                                      |
| `lucide-react`                                                                                    | 0.575                 | Icon set                                                                                                                 |
| `sonner`                                                                                          | 2.0                   | Toasts                                                                                                                   |
| `react-hook-form` + `@hookform/resolvers` + `zod`                                                 | —                     | Forms + validation                                                                                                       |
| `recharts`                                                                                        | 2.15                  | Charts (reports)                                                                                                         |
| `date-fns`                                                                                        | 4.1                   | Date math — but see `src/lib/date-utils.ts` for the project's ISO-string helpers, which are preferred for schedule logic |
| `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `vaul` | —                     | Used by specific `ui/` components                                                                                        |

## Tooling

| Tool                     | Config                                                                                        | Command                              |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| ESLint 9 (flat config)   | `eslint.config.js` — lints `**/*.{ts,tsx}` only; ignores vendored dirs                        | `npm run lint`                       |
| Prettier 3               | `.prettierrc` — `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"` | `npm run format`                     |
| TypeScript               | `tsconfig.json`                                                                               | `npm run typecheck` (`tsc --noEmit`) |
| husky 9 + lint-staged 15 | `.husky/`, `package.json#lint-staged`                                                         | auto on commit/push                  |
| `typescript-eslint`      | type-aware rules                                                                              | (part of lint)                       |

Pre-commit: `lint-staged` (eslint --fix + prettier on staged app files) then `tsc --noEmit`.
Pre-push: `tsc --noEmit` then full `eslint`.

## Secrets

### `SESSION_SECRET`

**What it is.** The encryption password for the `escola-auth` session cookie. It is
read by `sessionConfig()` in `src/lib/auth.server.ts` and handed to
`useSession()` from `@tanstack/react-start/server`, which derives a key from it
(PBKDF2) and encrypts/decrypts the cookie on **every** request. Cookie flags:
`httpOnly`, `secure`, `sameSite: "lax"`, `maxAge` 7 days.

Because auth is hand-rolled (see "Not in the stack" below), this single value is
what makes a session cookie unforgeable. A weak, guessable or leaked
`SESSION_SECRET` lets an attacker mint a valid cookie for any `usuarioId` and walk
straight past every guard added in Stories 1.1–1.3 (`beforeLoad` route guards,
`requireAuthenticated`, `requireRole`). Treat it like a private key.

**Where it must be set.**

| Location            | Required | How                                                                                       |
| ------------------- | -------- | ----------------------------------------------------------------------------------------- |
| Vercel — Production | Yes      | Project → Settings → Environment Variables, or `vercel env add SESSION_SECRET production` |
| Vercel — Preview    | Yes      | Same, scope `preview`. A missing value here breaks login on every PR preview deploy       |
| Local dev           | Yes      | `.env` / `.env.local` (both git-ignored). `.env.example` carries a blank placeholder only |

Never commit the real value — not to `.env.example`, not to a story file, not to
git history.

**Strength requirement.** At minimum 32 bytes of high-entropy randomness:

```bash
openssl rand -base64 32
```

A human-readable passphrase does not qualify, however long it looks. If the current
value does not meet this bar, rotate it (`vercel env rm SESSION_SECRET production`
then `vercel env add SESSION_SECRET production`, and the same for `preview`).
**Rotating invalidates every existing session** — all logged-in
secretaria/professor/coordenador users are forced to log in again on their next
request. Announce it before rolling out. No code change or redeploy of application
code is needed; the value is read from `process.env` at runtime.

**What happens if it's missing.** `sessionConfig()` throws
`"SESSION_SECRET não configurado"`. Per the fail-closed fix from Story 1.1,
`src/routes/__root.tsx`'s `beforeLoad` catches the throw and renders the login
screen instead of a 500 — so the app does not crash, but **no one can authenticate**
until the variable is set. The symptom is a login page that never lets anyone in,
not an error page, which makes this failure mode easy to misdiagnose.

## Not in the stack (do not add without a decision)

- **No test runner** (no vitest / jest / playwright). There are zero tests today.
- **No Supabase Auth** — auth is hand-rolled (`usuarios` table + session cookie). See `docs/architecture.md`.
- **No CI** (`.github/workflows/` does not exist).
- **No state manager** beyond React Query + `localStorage` (professora selection).
- **No i18n** — the product is single-locale `pt-BR`.
