# Project Brief — Wiz Timetable

> Reverse-engineered from the codebase and `.lovable/plan.md`. Confirm assumptions
> marked _[assumed]_ with the product owner.

## What it is

A weekly-timetable and class-management web app for **Wizard Brusque** _[assumed:
a Wizard by Pearson language-school franchise unit in Brusque, Santa Catarina, Brazil]_.
Page title: "Wiz Timetable" / "Wizard Brusque Horário Semanal".

It replaces a spreadsheet-based process for:

1. **Building the weekly grid** — which aluno sits in which professora's slot, at
   which período, doing which type of class (regular, online, reforço, VIP,
   conversação, break, preparação & homework, sem aula).
2. **Running class in the room (professora view)** — read-only grid + launching
   **presença**, **notas** (Fala / Audição / Leitura / Escrita, graded O/MB/B/R) and
   **lições** per aluno.
3. **Tracking students** — cadastro, níveis (33 pre-defined levels across English
   tracks K/NG/PreT/T/W and other languages E/A/I/F/J/C plus CONV), contracts,
   credits, active/inactive status with reason.
4. **Alerts** — derived, actionable: consecutive faltas, rematrícula due (reached R8
   or contract ended), lesson studied-but-not-practiced, behind the pedagogical
   calendar, birthdays.
5. **Reports & documents** — faltas, matrículas, níveis, carga por professora,
   aniversariantes, declaração de matrícula, aulas avulsas; plus a printable
   calendar.

## Who uses it

| Role _(papel)_ | Does                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Secretaria     | Full admin: grid, cadastros, reports, calendar, users                 |
| Professor(a)   | Room view only: presença / notas / lições, read-only grid, own alerts |
| Coordenador(a) | Professora view + extra alerts (e.g. consecutive-faltas oversight)    |

Roles and a `usuarios` login system exist in code and DB **but are not wired into the
UI** — the app currently runs with no login. Closing that gap is the top backlog item
(see `docs/prd.md` and `docs/DB-AUDIT.md`).

## Domain shape (one paragraph)

The **grade_base** is a recurring weekly template (dia_semana × período ×
professora → aluno). A specific calendar week can diverge from the template through
**excecoes_semana** (adicionar / remover / mover / fechar_vaga). **horarios_config**
sets the _type_ and permanent closed-seats of each cell. Feriados/recessos/férias live
in **calendario_excecoes**, scoped to the whole school or a group (kids/teens/adultos)
derived from the aluno's nível. "Aula online" cells split one hour into 3× 20-minute
slots and each aluno does 2 lesson-parts per session; every other type uses part 1.

## Product state

- **Live and in active use** _[assumed]_ — the git history shows a steady stream of
  bug fixes to production behaviour (online-class lançamentos, histórico, presença).
- Built with **Lovable** (AI app builder); the branch syncs back to Lovable, so
  history must not be rewritten.
- No formal PRD, architecture doc, tests, or CI existed before this document set.

## Constraints

- Single locale (`pt-BR`), single tenant (one school).
- Deploy: Vercel. Data: hosted Supabase.
- Small team _[assumed: 1–2 developers, ~5 professoras as end users]_.
- Must stay a working branch at all times (Lovable sync).

## Immediate priorities (proposed)

1. **Wire authentication** — the app is currently open to anyone with the URL.
2. **Reconcile DB migrations with production** — several tables/columns exist only in
   prod (`aulas_licoes`, `alertas_status`, `calendario_excecoes`, `alunos` extras).
3. **Introduce a test harness** for the pure domain math (níveis, alertas, grade).
4. **Add CI** to run typecheck + lint + tests on push.
