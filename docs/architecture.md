# Architecture — Wiz Timetable (Brownfield)

> Reverse-engineered from the codebase on 2026-09-10 (aiox-core install baseline,
> commit `7115fb7`). This describes the system **as built**, then flags the gaps.
> Companion docs: `docs/framework/*`, `docs/DB-AUDIT.md`, `docs/prd.md`.

## 1. System overview

Single-page + SSR web app on **TanStack Start** (React 19), deployed to **Vercel**
(Nitro `vercel` preset), backed by a hosted **Supabase Postgres** with Realtime.
There is no separate backend service — server logic lives in TanStack **server
functions** co-located with the frontend.

```
┌──────────────┐     HTTPS      ┌──────────────────────────┐
│   Browser    │◄─────────────►│  Vercel (Nitro SSR)      │
│  React 19    │  server fns    │  TanStack Start          │
│  React Query │  (RPC)         │  - src/server.ts entry   │
│  Realtime WS │                │  - *.functions.ts (RPC)  │
└──────┬───────┘                │  - *.server.ts helpers   │
       │                        └───────────┬──────────────┘
       │ anon key (Realtime only)           │ service_role key
       │                                    │ (bypasses RLS)
       ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (Postgres)                     │
│  12 tables, single `public` schema, RLS enabled          │
│  Realtime publication on 9 tables                        │
└─────────────────────────────────────────────────────────┘
```

## 2. Request / data flow

1. Route component (`src/routes/*.tsx`) calls `useServerFn(someFn)` and wraps it in
   `useQuery`.
2. The server function (`src/lib/*.functions.ts`) runs on Vercel, lazily imports
   `supabaseAdmin` (**service role**), does the work, returns plain JSON.
3. React Query caches by `queryKey`.
4. `useRealtimeGrade` opens one Supabase Realtime channel (anon key) on 8 tables;
   any `postgres_changes` event calls `queryClient.invalidateQueries()`, refetching
   everything.

**Consequence:** the browser never queries business data directly. All authority is
server-side — which is why RLS is effectively unused for app traffic (see §6).

## 3. Runtime & build

| Aspect              | Detail                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build               | `vite build` via `@lovable.dev/vite-tanstack-config`; Nitro emits `.vercel/output/`                                                               |
| SSR entry           | `src/server.ts` — custom `fetch` that catches h3-swallowed 500s and renders `renderErrorPage()`                                                   |
| Middleware          | `src/start.ts` registers `attachSupabaseAuth` (function middleware, attaches bearer token client-side) + `errorMiddleware` (request middleware)   |
| Env                 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SESSION_SECRET` (+ `VITE_*` mirrors for client). `.env` is git-ignored. |
| Client bundle guard | `*.functions.ts` files ship to the browser — service-role client must be `await import()`-ed inside handlers only                                 |

## 4. Routing & screens

File-based routes under `src/routes/` (naming rules in `docs/framework/source-tree.md`).

| Area               | Routes                                                                                        | Purpose                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Entry              | `/` → redirect `/professora`                                                                  | no landing page                                                                            |
| Professora         | `professora.tsx`, `professora_.alertas.tsx`, `professora_.aluno.$id.tsx`                      | room view: presença/notas/lições, own alerts, aluno detail                                 |
| Admin shell        | `admin.tsx` (+ `admin.index.tsx`)                                                             | nav + `<Outlet/>`, **no auth guard**                                                       |
| Admin — alunos     | `admin.alunos`, `admin.alunos_.inativos`, `admin.alunos_.$id`, `admin.alunos_.$id_.historico` | cadastro, histórico do aluno                                                               |
| Admin — grade      | `admin.calendario`, `admin.calendario_.imprimir`                                              | weekly grid editor + print                                                                 |
| Admin — pessoas    | `admin.professoras`, `admin.usuarios`                                                         | professora CRUD; user mgmt (unreachable via nav)                                           |
| Admin — alertas    | `admin.alertas`                                                                               | alert triage (pendente/resolvido)                                                          |
| Admin — relatórios | `admin.relatorios` + 8 `admin.relatorios_.*`                                                  | faltas, matrículas, níveis, carga-professoras, aniversariantes, declaração, avulsos, aluno |

## 5. Domain model (code)

`src/lib/types.ts` is the single source of truth for shared types + constants. Key
concepts:

- **Grid computation** (`grade.functions.ts`): `grade_base` (recurring) overlaid with
  `excecoes_semana` (per-week: adicionar / remover / mover / fechar_vaga), typed by
  `horarios_config`, producing `CelulaAula[]` and `celulasPorData`.
- **Capacities** per type (`CAPACIDADE`): regular 7, online 3, vip 2, reforço 4,
  conversação 6.
- **Online classes**: each 1h period = 3 slots of 20min (`slotsOnlinePorPeriodo`);
  each aluno does 2 lesson-parts (`parte` 1 & 2); `horario_especifico` disambiguates.
- **Níveis** (`NIVEIS`, 33 values): first letter → language track / group
  (kids/teens/adultos) for calendar scoping.
- **Alerts** (`alertas.functions.ts`, all derived — not stored except resolution
  state in `alertas_status`):
  - consecutive `falta` streak (only `falta` continues; `presente` / `falta_avisada`
    reset)
  - rematrícula: reached position beyond R8 **or** `contrato_fim` passed
  - lesson `praticado = false` → pending for any professora until a new practiced
    lesson is logged
  - behind pedagogical calendar: `mesesDeAtraso` from `data_inicio_nivel` (explicit or
    inferred from first logged lesson)
  - birthdays
- **Credits**: `alunos.creditos` (nullable). Decrements by 1 only on the presence
  _transition_ into/out of `presente`, never per save — so history edits stay correct.

## 6. Authentication & authorization — **as built (INCOMPLETE)**

What exists:

- `usuarios` + `usuario_papeis` tables (papéis: `secretaria`, `professor`,
  `coordenador`), service-role only, no anon access.
- `auth.server.ts`: encrypted session cookie via `@tanstack/react-start/server`
  `useSession` (`SESSION_SECRET`, 7-day, httpOnly/secure/lax), PBKDF2-SHA256 password
  hashing (Web Crypto), `requireAuthenticated()` / `requireRole([...])`.
- `auth.functions.ts`: `login`, `logout`, `getSessaoAtual`, `criarPrimeiroUsuario`
  (bootstrap first secretaria).
- `LoginForm.tsx` component.

**What is missing (critical):**

1. `LoginForm` is **not mounted** in any route — grep confirms zero imports outside
   its own file.
2. No route has an auth `beforeLoad` guard except `index.tsx` (which only redirects).
3. `requireAuthenticated` / `requireRole` are **never called** by any server function
   — every RPC endpoint (`setPresenca`, alunos CRUD, `getAlertasAtivos`, all reports,
   `criarUsuario`, …) is an unauthenticated public endpoint running with service-role
   DB access.
4. `attachSupabaseAuth` attaches a Supabase-Auth bearer token that the app never
   issues (auth is custom, not Supabase Auth) — it is a no-op.

Net effect: **anyone with the URL has full read/write access to all school data.**
See `docs/DB-AUDIT.md` for the DB-layer view and the remediation story.

The original design (`.lovable/plan.md`) used a shared `ADMIN_PASSWORD` gating admin
writes while presença/notas stayed public. The `usuarios` system was built to replace
that but the wiring was never finished.

## 7. Database

12 tables in `public`; details, RLS matrix, and migration drift in `docs/DB-AUDIT.md`.
Summary:

| Group         | Tables                                                |
| ------------- | ----------------------------------------------------- |
| People        | `professoras`, `alunos`, `usuarios`, `usuario_papeis` |
| Grid          | `grade_base`, `horarios_config`, `excecoes_semana`    |
| Class records | `aulas_presenca`, `aulas_notas`, `aulas_licoes`       |
| Calendar      | `calendario_excecoes`                                 |
| Alerts        | `alertas_status`                                      |

`update_updated_at_column()` trigger on tables with `updated_at`. Realtime publication
includes the grid + class-record + calendar tables.

## 8. Cross-cutting concerns

| Concern        | Implementation                                                                                                        | Notes                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error handling | `error-capture.ts` (SSR last-error), `error-page.ts` (HTML fallback), `lovable-error-reporting.ts` (client → Lovable) |                                                                                                                                                            |
| Pagination     | `supabase-paginacao.server.ts` `buscarTodasAsLinhas`                                                                  | works around Supabase 1000-row cap                                                                                                                         |
| Realtime       | one channel, invalidate-all                                                                                           | coarse but simple; several tables' Realtime is silently broken for anon after the lockdown migration (only `aulas_licoes` re-added a public SELECT policy) |
| Print          | `print:hidden` utilities, dedicated `_.imprimir` routes                                                               | calendário, declaração, relatórios                                                                                                                         |
| Observability  | `console.error` + Lovable reporting                                                                                   | no structured logging, no metrics, no error tracker (Sentry etc.)                                                                                          |

## 9. Known architectural risks (ranked)

| #   | Risk                                                                                                                | Impact                                                                    | Ref                                  |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| 1   | No authentication wired — all endpoints public                                                                      | Data breach / tampering of minors' records                                | DB-AUDIT, PRD Epic 1                 |
| 2   | Migration history ≠ production schema                                                                               | Cannot rebuild DB; risky future migrations                                | DB-AUDIT §Drift                      |
| 3   | Zero automated tests                                                                                                | Regressions in dense domain math (alertas, grade, créditos) ship silently | PRD Epic 3                           |
| 4   | No CI                                                                                                               | Broken pushes reach the Lovable-synced branch                             | PRD Epic 3                           |
| 5   | `invalidateQueries()` on every Realtime event                                                                       | Refetch storms as data grows                                              | backlog                              |
| 6   | Realtime partially broken post-lockdown (anon can't see most tables)                                                | Professora screens don't auto-refresh across users                        | DB-AUDIT                             |
| 7   | Single `SUPABASE_SERVICE_ROLE_KEY` for everything, no request-scoped auth context in DB                             | No defense-in-depth; a bug in one endpoint exposes all data               | Epic 1 (consider per-role RLS later) |
| 8   | Dead code paths (`LoginForm`, `usuarios.functions`, `attachSupabaseAuth`, `data_inicio_nivel` inference edge cases) | Confusion, false sense of security                                        | Epic 1                               |

## 10. Target architecture (incremental)

No rewrite. The delta from "as built" to "healthy":

1. **Auth**: mount `LoginForm` behind a root/`admin`/`professora` `beforeLoad` that
   calls `getSessaoAtual`; add `requireAuthenticated()` (and `requireRole` where a
   papel matters) to the top of every mutating/data-returning server function; delete
   `attachSupabaseAuth` or repurpose it to forward the session cookie.
2. **Schema truth**: introduce a squashed baseline migration generated from
   production (`supabase db pull`), commit it, and gate future changes on
   `supabase migration list` being clean. Add the missing tables/columns as explicit
   migrations.
3. **Tests**: add `vitest`; cover `licoes.ts`, `alertas.functions.ts` pure helpers,
   `types.ts` calendar/grid helpers, credit-transition logic. Extract any remaining
   inline math into pure functions first.
4. **CI**: GitHub Actions running `typecheck` + `lint` + `test` on PR and on push to
   the connected branch.
5. **Later / optional**: request-scoped Supabase client with real RLS per papel;
   replace invalidate-all with targeted invalidation; add an error tracker.
