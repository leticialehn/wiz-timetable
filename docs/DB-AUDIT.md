# Database Audit — Wiz Timetable

> Supabase Postgres, project `eaebeymijwkzfoozerzw`, single `public` schema.
> Audited 2026-09-10 from `supabase/migrations/*.sql` (12 files, 423 lines) and
> `src/integrations/supabase/types.ts` (generated types = ground truth for shape).
> **Updated 2026-09-17** (Stories 2.1-2.3): baseline pulled from prod, drift resolved,
> a live RLS/GRANT regression found and fixed (§2/§3), Realtime strategy decided
> (§3), full constraint inventory verified live with zero drift (§5a). EPIC-002 is
> now feature-complete pending only the `tipo` CHECK reconciliation for EPIC-006.
> **Owner action required** on the items marked 🔴.

## 0. Story 2.1 — baseline migration (2026-09-17)

- `supabase db pull` run against prod (`eaebeymijwkzfoozerzw`); committed as
  `supabase/migrations/20260915134213_baseline_from_prod.sql`. The 12 old
  migration files are archived under `supabase/migrations/_legacy/` — they no
  longer reproduce prod (Studio edits drifted past them) and are kept only for
  history.
- `supabase migration list` shows **no drift** (local == remote) after the
  baseline.
- `aulas_licoes`, `calendario_excecoes`, `alertas_status`, and
  `alunos.data_inicio_nivel` / `alunos.data_nascimento` are now all present in
  the baseline DDL — the §1/§2 gaps below are resolved as of this migration.
- Confirmed: the real UNIQUE constraint on `aulas_presenca` and `aulas_notas`
  is `(data, professora_id, aluno_id, periodo, parte, horario_especifico)` —
  includes `parte` and `horario_especifico`, matching what the code writes.
  §5's open question is resolved.
- `src/integrations/supabase/types.ts` regenerated from the linked project;
  diff against the previous committed version is whitespace/formatting only
  (Prettier semicolons) — no shape drift.
- **🔴 Found during this story: the EPIC-001 DB lockdown had been reverted in
  prod.** The baseline pull showed the public "leitura publica"/"inserir
  publico"/"atualizar publico" policies and `GRANT ALL ... TO anon` back on
  `alunos`, `aulas_notas`, `aulas_presenca`, `excecoes_semana`, `grade_base`,
  `horarios_config`, `professoras` (originally revoked by the now-legacy
  `20260711121505` migration), plus `GRANT ALL ... TO anon` on
  `alertas_status` and `calendario_excecoes` (never locked down — no
  policies, so RLS still denied access in practice). Root cause not
  confirmed, but the most likely explanation is a direct Supabase Studio
  edit — exactly what this story's baseline/migration-only workflow exists
  to prevent going forward.
  - **Fixed same day**: `supabase/migrations/20260917103416_relock_public_tables.sql`
    re-drops the public policies and re-revokes anon/authenticated on all 9
    tables, applied via `supabase db push`.
  - **Verified** with the real anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`)
    against prod: all 9 tables return `permission denied`; `aulas_licoes`
    (intentional Realtime exception, SELECT-only) still readable.
  - **Impact window unknown** — anyone with the public anon key (shipped in
    every browser bundle) could read/write student PII (names, birthdays,
    attendance, grades, contracts) directly via the Supabase REST API,
    bypassing the app and its auth entirely, for however long this was
    reverted. No way to determine when the revert happened without prod
    audit logs (not checked as part of this story).
  - **Follow-up gap found in QA review**: the relock migration above revoked
    access on the _existing_ 9 tables, but the baseline also carries a
    standing `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ... TO anon, authenticated` rule. Left alone, the next table
    created by a migration (or a Studio edit) would silently reproduce the
    exact same regression with zero policy change needed. **Fixed same
    day**: `supabase/migrations/20260917110000_revoke_default_privileges_anon.sql`
    revokes the default-privilege grants to `anon`/`authenticated` on future
    tables/sequences/functions. **Verified live**: created a throwaway table
    on prod after the fix and confirmed `information_schema.role_table_grants`
    shows only `postgres`/`service_role`, no `anon`/`authenticated`; table
    dropped immediately after.

## 1. Tables (12)

| Table                 | Purpose                                                              | In migrations?            | Realtime        |
| --------------------- | -------------------------------------------------------------------- | ------------------------- | --------------- |
| `professoras`         | Teachers; `cor`, `ordem`, `ativa`                                    | ✅                        | ✅              |
| `alunos`              | Students; nível, situação, contrato, créditos, nascimento            | ⚠️ partial                | ✅              |
| `usuarios`            | Login accounts; `senha_hash` (PBKDF2)                                | ✅                        | ❌              |
| `usuario_papeis`      | Role assignments (`secretaria`/`professor`/`coordenador`)            | ✅                        | ❌              |
| `grade_base`          | Recurring weekly template cell → aluno                               | ✅                        | ✅              |
| `horarios_config`     | Cell type + permanent closed seats; `UNIQUE(dia,período,professora)` | ✅                        | ✅              |
| `excecoes_semana`     | Per-week deviations (`adicionar`/`remover`/`mover`/`fechar_vaga`)    | ✅                        | ✅              |
| `aulas_presenca`      | Attendance; `UNIQUE(data,professora,aluno,período)`                  | ✅                        | ✅              |
| `aulas_notas`         | Grades Fala/Audição/Leitura/Escrita (`O`/`MB`/`B`/`R`)               | ✅                        | ✅              |
| `aulas_licoes`        | Lesson log; `praticado` flag, `nivel_no_momento`                     | ✅ (baseline, 2026-09-17) | ✅ (added late) |
| `calendario_excecoes` | Feriado/recesso/férias by group                                      | ✅ (baseline, 2026-09-17) | ✅              |
| `alertas_status`      | Alert resolution state; `motivo`, `desfecho`                         | ✅ (baseline, 2026-09-17) | ✅              |

## 2. Migration drift — resolved 2026-09-17 (Story 2.1)

`supabase/migrations/` now reproduces production: `20260915134213_baseline_from_prod.sql`
was pulled straight from prod and `supabase migration list` shows no drift. The 12
pre-baseline migrations are archived under `supabase/migrations/_legacy/` (history
only — they don't reproduce current prod on their own).

Previously untracked, now covered by the baseline: `CREATE TABLE aulas_licoes`,
`CREATE TABLE calendario_excecoes`, `CREATE TABLE alertas_status`,
`alunos.data_inicio_nivel`, `alunos.data_nascimento`.

Going forward: every schema change is a new migration + `supabase db push` +
`types.ts` regen. **No Studio edits** — see §0 for what happened the last time that
rule wasn't followed (the RLS lockdown got silently reverted).

## 3. RLS & GRANT matrix — reverified against live prod, 2026-09-17

| Table                 | RLS | anon/authenticated GRANT  | Policies                                          | Effective anon access (tested with real anon key) |
| --------------------- | --- | ------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `professoras`         | on  | `SELECT` only (Story 2.2) | `SELECT USING (true)` (Realtime, low-sensitivity) | SELECT only — confirmed readable, INSERT denied   |
| `alunos`              | on  | **revoked** (re-applied)  | none                                              | none — confirmed `permission denied`              |
| `grade_base`          | on  | `SELECT` only (Story 2.2) | `SELECT USING (true)` (Realtime, low-sensitivity) | SELECT only — confirmed readable, INSERT denied   |
| `horarios_config`     | on  | `SELECT` only (Story 2.2) | `SELECT USING (true)` (Realtime, low-sensitivity) | SELECT only — confirmed readable, INSERT denied   |
| `excecoes_semana`     | on  | `SELECT` only (Story 2.2) | `SELECT USING (true)` (Realtime, low-sensitivity) | SELECT only — confirmed readable, INSERT denied   |
| `aulas_presenca`      | on  | **revoked** (re-applied)  | none (dropped)                                    | none — confirmed `permission denied`              |
| `aulas_notas`         | on  | **revoked** (re-applied)  | none (dropped)                                    | none — confirmed `permission denied`              |
| `aulas_licoes`        | on  | not granted               | `SELECT USING (true)` (deliberate, Realtime)      | SELECT only — confirmed readable, no write policy |
| `calendario_excecoes` | on  | **revoked** (re-applied)  | none                                              | none — confirmed `permission denied`              |
| `alertas_status`      | on  | **revoked** (re-applied)  | none                                              | none — confirmed `permission denied`              |
| `usuarios`            | on  | **revoked**               | none                                              | none                                              |
| `usuario_papeis`      | on  | **revoked**               | none                                              | none                                              |

**2026-09-17 finding:** this table was accurate as of the original 2026-07-11
lockdown (migration `20260711121505`, now in `_legacy/` — not `20260812180211` as a
prior version of this doc said), but a `db pull` on 2026-09-15 showed the
"revoked"/"dropped" state for the 7 original tables had been **reverted in prod**
(public policies and `GRANT ALL TO anon` were back), and the 2 newer tables had
never gotten the lockdown at all. Fixed via
`20260917103416_relock_public_tables.sql` and reverified with the real anon key —
see §0 for the full incident writeup.

Historically, the `20260711121505` "lock down all schoolwide tables" migration dropped every `leitura publica` policy and
revoked anon/authenticated on the 7 original tables. **Good** for the DB layer: the
browser's anon key can no longer read or write business data directly.

### Realtime strategy — decided and implemented 2026-09-17 (Story 2.2)

`useRealtimeGrade` subscribed with the **anon key** to 8 tables. Realtime only
delivers a change event if the subscriber's RLS lets it `SELECT` the row, so after
Story 2.1's relock, only `aulas_licoes` (which keeps a deliberate public `SELECT`
policy) actually received live updates — the other 7 were silently dead.

**Decision (confirmed with the owner 2026-09-17), split by student-PII sensitivity:**

- **Low-sensitivity** (`professoras`, `grade_base`, `horarios_config`,
  `excecoes_semana` — schedule/config only, no student PII): granted narrow public
  `SELECT USING (true)` + `GRANT SELECT` (never `INSERT`/`UPDATE`/`DELETE`), same
  pattern as `aulas_licoes`. Migration:
  `supabase/migrations/20260917134453_public_select_low_sensitivity_tables.sql`.
  **Verified live** with the real anon key: `SELECT` works, `INSERT` denied, on all 4.
- **High-sensitivity** (`alunos`, `aulas_presenca`, `aulas_notas` — PII of minors,
  attendance, grades): stay locked down, no public policy added. No Realtime for
  these; screens depending on them fall back to react-query's default
  refetch-on-focus/mount (no `refetchInterval` polling was added — explicitly out of
  scope unless the owner asks for it later).
- **Authenticated Realtime** (the third option from epic AC6): evaluated and
  rejected as out of scope for this story. This app's login is a custom
  cookie-session system (`src/lib/auth.server.ts`), not Supabase Auth — the browser's
  Supabase client only ever holds the anon key, so there is no per-user Supabase
  session to authenticate a Realtime channel with. Would require a broader auth
  architecture change to revisit.
- `src/hooks/use-realtime-grade.ts`'s `TABELAS` list updated to match: `alunos`,
  `aulas_presenca`, `aulas_notas` removed (they never received events anyway).

## 4. Application-layer authorization 🔴 (the real hole)

The DB lockdown does **not** protect anything, because the application does not use the
anon key for data — it uses the **service-role key** inside server functions, which
**bypasses RLS entirely**, and those server functions **do not check the session**.

- `requireAuthenticated()` / `requireRole()` exist in `auth.server.ts` — **called by
  zero server functions.**
- `LoginForm.tsx` — **mounted by zero routes.**
- Only guard in the app: `index.tsx` redirects `/` → `/professora` (not a guard).

Therefore **every** endpoint below is a public, unauthenticated RPC with full
service-role DB power:

| File                      | Exposes                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `presenca.functions.ts`   | read/write all presença, notas, lições; mutate `alunos.creditos` |
| `grade.functions.ts`      | full weekly grid, all alunos, all professoras                    |
| `cadastros.functions.ts`  | create/edit/delete alunos and professoras                        |
| `alertas.functions.ts`    | all students' attendance/contract/birthday data                  |
| `relatorios.functions.ts` | every report (matrículas, declarações, faltas…)                  |
| `calendario.functions.ts` | read/write school calendar                                       |
| `usuarios.functions.ts`   | **create/edit users and roles**                                  |
| `auth.functions.ts`       | `criarPrimeiroUsuario` is guarded by "0 users" only              |

This is **PII of minors** (names, birthdays, attendance, grades, contracts) exposed to
anyone who can reach the deployment URL and knows/guesses the RPC path.

**Remediation = PRD Epic 1** (below). Minimum viable fix:

1. Mount `LoginForm` behind a `beforeLoad` on the `professora` and `admin` layout
   routes that calls `getSessaoAtual()` and redirects to login when unauthenticated.
2. Add `await requireAuthenticated()` as the first line of every server-function
   handler that reads or writes school data.
3. Add `await requireRole(["secretaria"])` to admin-only mutations (cadastros,
   calendário, usuários, grade edits).
4. Remove or fix the no-op `attachSupabaseAuth` middleware.
5. Verify `SESSION_SECRET` is set in Vercel and strong.

## 5. Data-integrity notes

- See §5a for the full constraint inventory (Story 2.3, 2026-09-17). Highlights:
  `aulas_presenca`/`aulas_notas`/`aulas_licoes` share the same 6-column UNIQUE key;
  `usuarios.professora_id → professoras.id` is the one FK that's `ON DELETE SET
NULL` instead of `CASCADE`; three different `tipo` CHECK constraints disagree on
  allowed values (§5a, blocks EPIC-006).
- `alunos.creditos` adjustment is application-side only; a crash between the presença
  write and the `alunos` update leaves credits wrong. Consider a DB trigger or a
  transaction (Story 3.x).
- `ON DELETE CASCADE` from `alunos`/`professoras` into presença/notas/lições/grade —
  deleting an aluno erases their academic history. Consider soft-delete only (there is
  already `ativo` + `situacao`).

## 5a. Constraint inventory — verified live, 2026-09-17 (Story 2.3)

Queried directly from prod (`pg_constraint`/`pg_get_constraintdef`), not read off the
migration file — cross-checked against
`supabase/migrations/20260915134213_baseline_from_prod.sql` line by line: **zero
drift**, the file and prod agree on every one of the 56 constraints below.

**Primary keys**: every one of the 12 tables has `{table}_pkey` on `id` (uuid). No
exceptions.

**Unique constraints**:

| Table             | Columns                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `aulas_licoes`    | `(data, professora_id, aluno_id, periodo, parte, horario_especifico)` |
| `aulas_notas`     | `(data, professora_id, aluno_id, periodo, parte, horario_especifico)` |
| `aulas_presenca`  | `(data, professora_id, aluno_id, periodo, parte, horario_especifico)` |
| `horarios_config` | `(dia_semana, periodo, professora_id)`                                |
| `usuario_papeis`  | `(usuario_id, papel)`                                                 |
| `usuarios`        | `professora_id` (unique); `username` (unique)                         |

**Foreign keys** (all `ON DELETE CASCADE` except one):

| Table (column)                  | References       | On delete    |
| ------------------------------- | ---------------- | ------------ |
| `alertas_status.aluno_id`       | `alunos.id`      | CASCADE      |
| `aulas_licoes.aluno_id`         | `alunos.id`      | CASCADE      |
| `aulas_licoes.professora_id`    | `professoras.id` | CASCADE      |
| `aulas_notas.aluno_id`          | `alunos.id`      | CASCADE      |
| `aulas_notas.professora_id`     | `professoras.id` | CASCADE      |
| `aulas_presenca.aluno_id`       | `alunos.id`      | CASCADE      |
| `aulas_presenca.professora_id`  | `professoras.id` | CASCADE      |
| `excecoes_semana.aluno_id`      | `alunos.id`      | CASCADE      |
| `excecoes_semana.grade_base_id` | `grade_base.id`  | CASCADE      |
| `excecoes_semana.professora_id` | `professoras.id` | CASCADE      |
| `grade_base.aluno_id`           | `alunos.id`      | CASCADE      |
| `grade_base.professora_id`      | `professoras.id` | CASCADE      |
| `horarios_config.professora_id` | `professoras.id` | CASCADE      |
| `usuario_papeis.usuario_id`     | `usuarios.id`    | CASCADE      |
| `usuarios.professora_id`        | `professoras.id` | **SET NULL** |

`calendario_excecoes`, `alunos`, and `professoras` have no outgoing FKs (they're
referenced, not referencing).

**CHECK constraints**:

| Table.column                                        | Allowed values                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `alertas_status.status`                             | `pendente`, `resolvido`                                                                                            |
| `alertas_status.tipo`                               | `faltas`, `nota_fala`, `sem_aula`, `rematricula`, `atrasado`, `escrita_pendente`, `gravacao_r3r4`, `gravacao_r7r8` |
| `alunos.situacao`                                   | `matriculado`, `nao_rematriculado`, `cancelado`                                                                    |
| `aulas_notas.{audicao,escrita,fala,leitura}` (each) | `O`, `MB`, `B`, `R`                                                                                                |
| `aulas_presenca.status`                             | `presente`, `falta`, `falta_avisada`                                                                               |
| `calendario_excecoes.grupo`                         | `todos`, `kids`, `teens`, `adultos`                                                                                |
| `calendario_excecoes.tipo`                          | `feriado`, `recesso`, `ferias`                                                                                     |
| `excecoes_semana.{dia_semana,periodo}`              | `1..6`, `1..12`                                                                                                    |
| `excecoes_semana.tipo`                              | `NULL` or `regular`, `online`, `vip`, `reforco`, `conversacao` (5 values + null)                                   |
| `excecoes_semana.tipo_excecao`                      | `adicionar`, `remover`, `mover`, `ausente`                                                                         |
| `grade_base.{dia_semana,periodo}`                   | `1..6`, `1..12`                                                                                                    |
| `grade_base.tipo`                                   | `regular`, `online`, `vip`, `reforco`, `conversacao` (5 values)                                                    |
| `horarios_config.{dia_semana,periodo}`              | `1..6`, `1..12`                                                                                                    |
| `horarios_config.tipo`                              | `regular`, `online`, `break`, `preparacao_homework`, `reforco`, `vip`, `conversacao`, `sem_aula` (**8 values**)    |
| `horarios_config.vagas_fechadas`                    | `>= 0`                                                                                                             |
| `usuario_papeis.papel`                              | `secretaria`, `professor`, `coordenador`                                                                           |

`professoras`, `usuarios`, and `aulas_licoes` (beyond its unique key) have no CHECK
constraints.

### 🟡 `tipo` CHECK inconsistency — blocks EPIC-006

`horarios_config_tipo_check` allows **8** values; `grade_base_tipo_check` and
`excecoes_semana_tipo_check` only allow the same **5** (the latter also allows
`NULL`). A cell's `tipo` is copied from `horarios_config`/`grade_base` into
`excecoes_semana` whenever a week deviates from the template — so today, only the 5
common values (`regular`, `online`, `vip`, `reforco`, `conversacao`) can safely
round-trip through all three tables; `break`, `preparacao_homework`, and `sem_aula`
only exist in `horarios_config`.

**This blocks EPIC-006** ("Comercial" class type, `docs/stories/epics/EPIC-006-comercial-tipo-aula.md`):
adding `comercial` to only one of these three CHECK constraints will make the
exception/copy path fail its own constraint the moment a "Comercial" cell gets an
exception. EPIC-006 Story 6.1 must widen all three CHECK constraints together (or
decide `excecoes_semana`/`grade_base` should stay narrower and handle "Comercial"
without ever needing an exception — a real design choice, not just a migration).
This story (2.3) documents the gap; it does not resolve it.

## 6. Priority checklist for the owner

- [x] ✅ Confirm `SESSION_SECRET` set + strong in Vercel (EPIC-001, story 1.5)
- [x] ✅ `supabase db pull` → commit baseline migration; `migration list` clean (Story 2.1, 2026-09-17)
- [x] ✅ Capture DDL for `aulas_licoes`, `calendario_excecoes`, `alertas_status`,
      `alunos.data_*` as explicit migrations (Story 2.1, 2026-09-17)
- [x] ✅ Verify the real unique constraint on `aulas_presenca` / `aulas_notas` (Story 2.1, 2026-09-17)
- [x] ✅ Decide + implement auth wiring (EPIC-001) — **note:** owner has since set
      `AUTH_DISABLED=true` locally (see `docs/estado.md`), bypassing this
      intentionally for local dev; not set in Vercel.
- [ ] 🔴 **New (2026-09-17):** confirm with the team/collaborators when/how the RLS
      lockdown got reverted in prod, so it doesn't happen again silently
- [x] ✅ Decide Realtime strategy (Story 2.2, 2026-09-17) — split by PII
      sensitivity, see §3
- [x] ✅ Verify RLS/GRANT state of the 3 untracked tables directly in prod (Story 2.1,
      2026-09-17 — all 3 confirmed and, for `alertas_status`/`calendario_excecoes`,
      locked down for the first time)
- [x] ✅ Document full constraint inventory (PK/UNIQUE/FK/CHECK) for all 12 tables,
      verified live against prod (Story 2.3, 2026-09-17) — see §5a; zero drift found
- [ ] 🟡 **New (2026-09-17):** reconcile the 3 disagreeing `tipo` CHECK constraints
      (`horarios_config` 8 values vs `grade_base`/`excecoes_semana` 5 values) before
      EPIC-006 can add `comercial` — see §5a
- [ ] 🟡 Review `ON DELETE CASCADE` vs soft-delete for `alunos`
