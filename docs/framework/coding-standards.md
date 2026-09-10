# Coding Standards — Wiz Timetable

> Conventions extracted from the existing codebase. `@dev` loads this on every story.
> Rule of thumb: **match the file you are editing**. The standards below are what
> the code already does consistently — keep doing it.

## Language & naming

- **Domain vocabulary stays in Portuguese.** Identifiers, types, DB columns, route
  segments, comments: `aluno`, `professora`, `presença`, `nível`, `grade_base`,
  `excecoes_semana`, `licao`, `rematrícula`. Do not anglicize.
- Framework/util plumbing may be English (`errorMiddleware`, `createSupabaseFetch`).
- `camelCase` for variables/functions, `PascalCase` for types and React components,
  `SCREAMING_SNAKE_CASE` for module-level constant maps (`NIVEIS`, `CAPACIDADE`,
  `ROTULO_TIPO`, `DIAS_SEMANA`).
- Types are `type` aliases, not `interface` (codebase is 100% `type`).

## Comments

The codebase has a strong, deliberate style: **comments explain _why_, and describe
business rules — never restate the code.** Examples that set the bar:

```ts
// Alunos de "Aula online" fazem 2 lições no mesmo horário — parte 1 e parte 2.
// Todo outro tipo usa sempre parte 1.

// Desconta/devolve 1 crédito quando a presença ... transiciona de/para "presente"
// — não a cada save, só na transição, senão corrigir uma presença já lançada
// descontaria de novo ou ficaria sem descontar.
```

When you encode a school rule (capacities, alert thresholds, contract logic, the R8
milestone), write the rule in a comment next to it. Keep the density you find in
`src/lib/types.ts` and `src/lib/alertas.functions.ts`.

## Imports

- Absolute imports via the `@/` alias for anything outside the current folder:
  `import { getGradeSemana } from "@/lib/grade.functions"`. Relative (`./`, `../`)
  only for same-folder siblings.
- **Server-client boundary (critical):**
  - In `*.functions.ts` (bundles to the browser): never import `client.server` at the
    top level. Load it lazily inside the handler:
    ```ts
    async function sb() {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return supabaseAdmin;
    }
    ```
  - Top-level `import ... from ".../client.server"` is allowed **only** in `*.server.ts`.
- Do not import from `src/integrations/supabase/*` generated files' internals — use the
  exported `supabase` / `supabaseAdmin` proxies.
- Never re-add plugins that `@lovable.dev/vite-tanstack-config` already provides
  (see `tech-stack.md`).

## Server functions (TanStack Start)

Standard shape — follow it exactly:

```ts
export const setPresenca = createServerFn({ method: "POST" })
  .inputValidator((data: { aluno_id: string; status: StatusPresenca | null /* ... */ }) => data)
  .handler(async ({ data }) => {
    const client = await sb();
    // ... business logic, return a plain serializable object
  });
```

- `method: "GET"` for reads, `"POST"` for writes.
- `.inputValidator` currently just types the payload (identity function). If you add
  real validation, use `zod` and throw on failure.
- Handlers return plain JSON-serializable values. For expected failures, return a
  discriminated result (`{ ok: false as const, erro: string }`) as `auth.functions.ts`
  does; throw only for truly exceptional cases.
- **Auth:** `requireAuthenticated()` / `requireRole([...])` exist in `auth.server.ts`.
  They are **not currently called anywhere** (tracked as tech debt — see
  `docs/DB-AUDIT.md`). Any new endpoint that exposes or mutates school data SHOULD
  call the appropriate guard at the top of the handler. Do not add a new unguarded
  mutation endpoint without flagging it in the story.

## Data access

- All application reads/writes go through **server functions using `supabaseAdmin`**
  (service role, bypasses RLS). The browser only touches Supabase for Realtime.
- Supabase caps result sets at 1000 rows. For any query that can exceed that
  (presença/lições history, full aluno lists over time), use
  `buscarTodasAsLinhas` from `supabase-paginacao.server.ts`.
- Upserts use the table's `UNIQUE` constraint; check for an existing row first when
  you need the previous value (e.g. credit-adjustment transition logic).
- A DB change = a new `supabase/migrations/*.sql` file **plus** regenerating
  `src/integrations/supabase/types.ts`. Never edit the generated types by hand.

## React & UI

- React 19: no `forwardRef` needed, prefer the `use` hook and Actions where natural.
- Data fetching: `useServerFn(fn)` + `useQuery({ queryKey: [...], queryFn })`. Keep
  `queryKey`s stable and descriptive (`["alertas-ativos"]`, `["grade", semanaIso]`).
- Mutations: `useMutation` + `queryClient.invalidateQueries` (or rely on
  `useRealtimeGrade` where the screen already subscribes).
- Styling: Tailwind v4 utility classes inline. Use semantic tokens
  (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary`) — they are defined in `src/styles.css`. Avoid raw hex except where the
  data is a color (professora `cor`), and pair it with `corTextoLegivel()`.
- Compose class names with `cn()` from `@/lib/utils`.
- Print views matter (calendário, declaração, relatórios): guard chrome with
  `print:hidden` and test the printed layout.
- Prefer shadcn `ui/` primitives over hand-rolled equivalents.

## Formatting & lint

- Prettier is authoritative: `printWidth: 100`, double quotes, semicolons, trailing
  commas. Do not fight it; `npm run format` fixes everything.
- `@typescript-eslint/no-unused-vars` is **off** and `noUnusedLocals/Parameters` are
  `false` — but don't rely on that; keep code clean.
- `noFallthroughCasesInSwitch` is on — every `case` needs `break`/`return`.
- The pre-commit hook runs eslint + prettier on staged files and `tsc --noEmit`.
  A red hook means fix the code, never `--no-verify` (exception: pure vendored/docs
  commits, and only with explicit sign-off).

## Errors

- SSR: throw inside handlers is caught by `errorMiddleware` / `server.ts` and turned
  into an HTML 500 (`renderErrorPage`). Client errors hit the `__root` `ErrorComponent`
  and are reported via `reportLovableError`.
- Follow the CLAUDE.md pattern for wrapping operations:
  ```ts
  try {
    /* op */
  } catch (error) {
    console.error(`Error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }
  ```

## Testing

There is no test infrastructure yet. Until it exists (tracked in the PRD backlog):

- Keep domain math in **pure functions** in `src/lib/` (no I/O) so it is testable
  later without a harness — this is already the pattern (`licoes.ts`, `types.ts`,
  `date-utils.ts`).
- Manually verify the flows your story touches and record what you checked in the
  story's Dev Notes.

## Git

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`), reference the story
  (`feat: wire login guard [Story 1.2]`), keep them atomic.
- **Never rewrite pushed history** (force-push, rebase/amend/squash pushed commits) —
  the branch syncs to Lovable and history loss is unrecoverable (`AGENTS.md`).
- `git push` / `gh pr create|merge` are **@devops-only** (AIOX Constitution Art. II,
  enforced by `.claude` hook). `@dev` commits locally and hands off.
- Keep the connected branch in a working state at all times.
