# Database Audit — Wiz Timetable

> Supabase Postgres, project `eaebeymijwkzfoozerzw`, single `public` schema.
> Audited 2026-09-10 from `supabase/migrations/*.sql` (12 files, 423 lines) and
> `src/integrations/supabase/types.ts` (generated types = ground truth for shape).
> **Owner action required** on the items marked 🔴.

## 1. Tables (12)

| Table                 | Purpose                                                              | In migrations?                   | Realtime        |
| --------------------- | -------------------------------------------------------------------- | -------------------------------- | --------------- |
| `professoras`         | Teachers; `cor`, `ordem`, `ativa`                                    | ✅                               | ✅              |
| `alunos`              | Students; nível, situação, contrato, créditos, nascimento            | ⚠️ partial                       | ✅              |
| `usuarios`            | Login accounts; `senha_hash` (PBKDF2)                                | ✅                               | ❌              |
| `usuario_papeis`      | Role assignments (`secretaria`/`professor`/`coordenador`)            | ✅                               | ❌              |
| `grade_base`          | Recurring weekly template cell → aluno                               | ✅                               | ✅              |
| `horarios_config`     | Cell type + permanent closed seats; `UNIQUE(dia,período,professora)` | ✅                               | ✅              |
| `excecoes_semana`     | Per-week deviations (`adicionar`/`remover`/`mover`/`fechar_vaga`)    | ✅                               | ✅              |
| `aulas_presenca`      | Attendance; `UNIQUE(data,professora,aluno,período)`                  | ✅                               | ✅              |
| `aulas_notas`         | Grades Fala/Audição/Leitura/Escrita (`O`/`MB`/`B`/`R`)               | ✅                               | ✅              |
| `aulas_licoes`        | Lesson log; `praticado` flag, `nivel_no_momento`                     | 🔴 **not created in migrations** | ✅ (added late) |
| `calendario_excecoes` | Feriado/recesso/férias by group                                      | 🔴 **not created in migrations** | ?               |
| `alertas_status`      | Alert resolution state; `motivo`, `desfecho`                         | 🔴 **not created in migrations** | ?               |

## 2. Migration drift 🔴

`supabase/migrations/` **cannot rebuild production.** Missing from tracked history:

- `CREATE TABLE aulas_licoes` — only later `ALTER`s (realtime, RLS policy) exist. A
  migration comment says so explicitly: _"foi criada fora do histórico de migrations
  rastreado"_.
- `CREATE TABLE calendario_excecoes` — referenced by `calendario.functions.ts` and
  generated types, no DDL anywhere.
- `CREATE TABLE alertas_status` — only `ALTER TABLE ... ADD COLUMN motivo/desfecho`.
- `alunos.data_inicio_nivel` and `alunos.data_nascimento` columns — in generated types
  and `types.ts`, not in any migration. (`situacao`, `contrato_*`, `creditos` **are**
  in migrations.)

Also: several migration `tipo`/`periodo` CHECK constraints were edited in place via
anonymous `DO $$` blocks that look up the constraint name — fragile but functional.

**Remediation (Story 2.1):**

```bash
supabase db pull            # generate a baseline from prod
# commit as supabase/migrations/<ts>_baseline_from_prod.sql
supabase migration list     # must show local == remote
```

Then every future schema change is a new migration + `types.ts` regen. No more Studio
edits.

## 3. RLS & GRANT matrix (as of latest migration)

| Table                 | RLS | anon/authenticated GRANT  | Policies                                      | Effective anon access                      |
| --------------------- | --- | ------------------------- | --------------------------------------------- | ------------------------------------------ |
| `professoras`         | on  | **revoked** (lockdown)    | none                                          | none                                       |
| `alunos`              | on  | **revoked**               | none                                          | none                                       |
| `grade_base`          | on  | **revoked**               | none                                          | none                                       |
| `horarios_config`     | on  | **revoked**               | none                                          | none                                       |
| `excecoes_semana`     | on  | **revoked**               | none                                          | none                                       |
| `aulas_presenca`      | on  | **revoked**               | none (dropped)                                | none                                       |
| `aulas_notas`         | on  | **revoked**               | none (dropped)                                | none                                       |
| `aulas_licoes`        | on  | not granted in migrations | `SELECT USING (true)` (re-added for Realtime) | SELECT only, **if** a GRANT exists in prod |
| `calendario_excecoes` | ?   | ?                         | ?                                             | unknown — verify in prod                   |
| `alertas_status`      | ?   | ?                         | ?                                             | unknown — verify in prod                   |
| `usuarios`            | on  | **revoked**               | none                                          | none                                       |
| `usuario_papeis`      | on  | **revoked**               | none                                          | none                                       |

The `20260812180211` "lockdown" migration dropped every `leitura publica` policy and
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

- `aulas_presenca` / `aulas_notas` unique key is `(data, professora, aluno, período)`
  — **no `parte` / `horario_especifico`** in the constraint, but the code writes those
  columns and online classes use `parte` 1 & 2. Confirm the prod constraint matches
  the code (the generated types show `parte`, `horario_especifico`; a recent commit
  "Fix online-class lançamentos overwriting each other across time slots" suggests the
  constraint was widened in prod but not in a tracked migration). 🔴 verify + capture.
- `alunos.creditos` adjustment is application-side only; a crash between the presença
  write and the `alunos` update leaves credits wrong. Consider a DB trigger or a
  transaction (Story 3.x).
- `ON DELETE CASCADE` from `alunos`/`professoras` into presença/notas/lições/grade —
  deleting an aluno erases their academic history. Consider soft-delete only (there is
  already `ativo` + `situacao`).

## 6. Priority checklist for the owner

- [ ] 🔴 Confirm `SESSION_SECRET` set + strong in Vercel
- [ ] 🔴 `supabase db pull` → commit baseline migration; `migration list` clean
- [ ] 🔴 Capture DDL for `aulas_licoes`, `calendario_excecoes`, `alertas_status`,
      `alunos.data_*` as explicit migrations
- [ ] 🔴 Verify the real unique constraint on `aulas_presenca` / `aulas_notas`
- [ ] 🔴 Decide + implement auth wiring (Epic 1)
- [ ] 🟠 Decide Realtime strategy (Story 2.2)
- [ ] 🟠 Verify RLS/GRANT state of the 3 untracked tables directly in prod
- [ ] 🟡 Review `ON DELETE CASCADE` vs soft-delete for `alunos`
