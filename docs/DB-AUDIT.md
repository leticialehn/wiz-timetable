# Database Audit — Wiz Timetable

> Supabase Postgres, project `eaebeymijwkzfoozerzw`, single `public` schema.
> Audited 2026-09-10 from `supabase/migrations/*.sql` (12 files, 423 lines) and
> `src/integrations/supabase/types.ts` (generated types = ground truth for shape).
> **Updated 2026-09-17** (Story 2.1): baseline pulled from prod, drift resolved,
> a live RLS/GRANT regression found and fixed — see §2 and §3.
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

| Table                 | RLS | anon/authenticated GRANT | Policies                                     | Effective anon access (tested with real anon key) |
| --------------------- | --- | ------------------------ | -------------------------------------------- | ------------------------------------------------- |
| `professoras`         | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `alunos`              | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `grade_base`          | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `horarios_config`     | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `excecoes_semana`     | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `aulas_presenca`      | on  | **revoked** (re-applied) | none (dropped)                               | none — confirmed `permission denied`              |
| `aulas_notas`         | on  | **revoked** (re-applied) | none (dropped)                               | none — confirmed `permission denied`              |
| `aulas_licoes`        | on  | not granted              | `SELECT USING (true)` (deliberate, Realtime) | SELECT only — confirmed readable, no write policy |
| `calendario_excecoes` | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `alertas_status`      | on  | **revoked** (re-applied) | none                                         | none — confirmed `permission denied`              |
| `usuarios`            | on  | **revoked**              | none                                         | none                                              |
| `usuario_papeis`      | on  | **revoked**              | none                                         | none                                              |

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

### Side effect: Realtime is partially broken 🟠

`useRealtimeGrade` subscribes with the **anon key** to 8 tables. Realtime delivers a
change event only if the subscriber's RLS lets it `SELECT` the row. After the
lockdown, only `aulas_licoes` has a public SELECT policy. So cross-user live refresh
works for lesson logging and is silently dead for `professoras`, `alunos`,
`grade_base`, `horarios_config`, `excecoes_semana`, `aulas_presenca`, `aulas_notas`.

Decide (Story 2.2): either

- add narrow `SELECT USING (true)` policies + `GRANT SELECT` back on the tables the
  professora screen must see live (they contain no secrets — names, schedule, grades
  of a single school), **or**
- drop Realtime and use polling / manual refresh, **or**
- move to authenticated Realtime with a request-scoped client.

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

- ✅ **Resolved 2026-09-17 (Story 2.1):** `aulas_presenca` / `aulas_notas` unique key
  is confirmed as `(data, professora_id, aluno_id, periodo, parte, horario_especifico)`
  in the baseline — it does include `parte` and `horario_especifico`, matching what
  the code writes.
- `alunos.creditos` adjustment is application-side only; a crash between the presença
  write and the `alunos` update leaves credits wrong. Consider a DB trigger or a
  transaction (Story 3.x).
- `ON DELETE CASCADE` from `alunos`/`professoras` into presença/notas/lições/grade —
  deleting an aluno erases their academic history. Consider soft-delete only (there is
  already `ativo` + `situacao`).

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
- [ ] 🟠 Decide Realtime strategy (Story 2.2)
- [x] ✅ Verify RLS/GRANT state of the 3 untracked tables directly in prod (Story 2.1,
      2026-09-17 — all 3 confirmed and, for `alertas_status`/`calendario_excecoes`,
      locked down for the first time)
- [ ] 🟡 Review `ON DELETE CASCADE` vs soft-delete for `alunos`
