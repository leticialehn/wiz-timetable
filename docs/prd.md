# PRD — Wiz Timetable

> Version: v4 (AIOX). Status: **brownfield reconstruction** — the product already
> exists and is in use; this PRD documents current scope and the near-term backlog
> to make it healthy. Sharded location: `docs/prd/` (not yet sharded).
> Companion: `docs/brief.md`, `docs/architecture.md`, `docs/DB-AUDIT.md`.

## 1. Goal

A single-tenant web app that lets a Wizard language-school unit run its weekly
timetable and in-class record-keeping without spreadsheets: build the grid, launch
presença / notas / lições in the room, track students and contracts, and surface
actionable alerts and reports.

## 2. Users & roles

| Papel         | Capabilities                                                                            |
| ------------- | --------------------------------------------------------------------------------------- |
| `secretaria`  | Everything: grid editor, cadastros, calendário, relatórios, usuários                    |
| `professor`   | Read-only grid + launch presença/notas/lições for own classes; own alerts; aluno detail |
| `coordenador` | Professora capabilities + oversight alerts (consecutive faltas, etc.)                   |

## 3. Current functional scope (implemented)

Traceability tags `FR-*` are assigned here for future stories to reference.

### Grid & scheduling

- **FR-1** Recurring weekly template (`grade_base`): assign an aluno (or avulso name)
  to a dia_semana × período × professora cell.
- **FR-2** Per-cell type + theme + permanent closed seats (`horarios_config`): regular,
  online, reforço, VIP, conversação, break, preparação & homework, sem aula.
- **FR-3** Per-week exceptions (`excecoes_semana`): adicionar, remover, mover, fechar
  vaga for one calendar week only.
- **FR-4** Capacity enforcement per type (regular 7, online 3, VIP 2, reforço 4,
  conversação 6).
- **FR-5** Online classes: split each hour into 3× 20-min slots; each aluno does 2
  lesson-parts per session.
- **FR-6** School calendar (`calendario_excecoes`): feriado / recesso / férias, scoped
  to whole school or group (kids / teens / adultos derived from nível).
- **FR-7** Printable weekly calendar (`/admin/calendario/imprimir`).

### In-class record-keeping (professora view)

- **FR-8** Read-only day tabs (today + rest of week; past days marked concluído);
  history browser for prior weeks (editable).
- **FR-9** Presença per aluno: presente / falta / falta_avisada.
- **FR-10** Notas per aluno: Fala, Audição, Leitura, Escrita — each O / MB / B / R.
- **FR-11** Lições per aluno: free-text lição + `nivel_no_momento` + `praticado` flag.
- **FR-12** Per-aluno class observação.
- **FR-13** Correcting a previously launched presença/nota/lição (un-click, fix nível).
- **FR-14** Credit accounting: `alunos.creditos` −1 on transition into `presente`,
  +1 on transition out (never per save).

### Students

- **FR-15** Cadastro: nome, nível (from 33-value `NIVEIS`), data_nascimento,
  data_inicio_nivel, contrato_inicio/fim, creditos, situação.
- **FR-16** Active vs inactive with reason (`matriculado` / `nao_rematriculado` /
  `cancelado`); inativos list.
- **FR-17** Histórico do aluno: presença + notas + lições timeline, editable.
- **FR-18** Bulk nível correction from the aluno header.

### Alerts (derived)

- **FR-19** Consecutive `falta` streak.
- **FR-20** Rematrícula due: reached position beyond R8 **or** `contrato_fim` passed;
  resolution captured in `alertas_status` with `desfecho` (rematriculado /
  não rematriculado / parcelas adicionais) + `motivo`.
- **FR-21** Lição studied but not practiced (`praticado = false`) → pending for any
  professora until resolved.
- **FR-22** Behind pedagogical calendar (`mesesDeAtraso`).
- **FR-23** Birthdays.
- **FR-24** Alert triage screen (pendente / resolvido) with badge count in admin nav.

### Reports & documents

- **FR-25..32** faltas, matrículas, níveis, carga por professora, aniversariantes,
  declaração de matrícula (print), aulas avulsas, relatório por aluno.

### Auth (built, NOT wired — see NFR-1)

- **FR-33** Username + password login (`usuarios`), PBKDF2 hashing, session cookie.
- **FR-34** First-user bootstrap (`criarPrimeiroUsuario`).
- **FR-35** User & role management (`/admin/usuarios`).

## 4. Non-functional requirements

| ID        | Requirement                                                                              | Current state                                    |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **NFR-1** | Only authenticated users may access any screen or endpoint; role checks on admin actions | 🔴 **not met** — app is fully open (DB-AUDIT §4) |
| **NFR-2** | Production DB schema must be reproducible from `supabase/migrations/`                    | 🔴 **not met** — drift (DB-AUDIT §2)             |
| **NFR-3** | Domain math (níveis, alertas, grade, créditos) covered by automated tests                | 🔴 **not met** — 0 tests                         |
| **NFR-4** | Typecheck + lint + tests run automatically before code reaches the connected branch      | 🟠 partial — local husky only, no CI             |
| **NFR-5** | PII of minors handled confidentially; no public exposure                                 | 🔴 blocked by NFR-1                              |
| **NFR-6** | Single locale pt-BR; deploy on Vercel; data on Supabase                                  | ✅ met                                           |
| **NFR-7** | Connected branch always in working state (Lovable sync); no history rewrites             | ✅ met (process)                                 |
| **NFR-8** | Print layouts correct for calendário / declaração / relatórios                           | ✅ met                                           |
| **NFR-9** | Cross-user live updates on the professora screen                                         | 🟠 partially broken (DB-AUDIT §3)                |

## 5. Constraints (CON-*)

- **CON-1** No rewrite. Incremental change only; branch stays deployable.
- **CON-2** Lovable owns git history — never force-push / rebase / amend pushed commits.
- **CON-3** `git push` and PRs are @devops-only (AIOX Constitution Art. II).
- **CON-4** Keep the `@lovable.dev/vite-tanstack-config` preset; don't re-add its plugins.
- **CON-5** Small team; prefer boring, low-maintenance solutions.

## 6. Backlog — epics (priority order)

| Epic         | Title                                                 | Addresses                | Size |
| ------------ | ----------------------------------------------------- | ------------------------ | ---- |
| **EPIC-001** | Wire authentication & authorization                   | NFR-1, NFR-5, FR-33..35  | M    |
| **EPIC-002** | Reconcile database with production                    | NFR-2, DB-AUDIT §2/§3/§5 | S–M  |
| **EPIC-003** | Test harness + CI for the domain core                 | NFR-3, NFR-4             | M    |
| **EPIC-004** | Realtime & performance hardening                      | NFR-9, arch risks #5/#6  | S    |
| **EPIC-005** | Data-integrity guards (credits, soft-delete, cascade) | DB-AUDIT §5              | S    |

Stories for EPIC-001 and EPIC-002 are drafted in `docs/stories/`. EPIC-003+ to be
drafted by `@sm` after EPIC-001 lands.

## 7. Out of scope (for now)

Multi-tenant, multi-locale, Supabase Auth migration, mobile app, parent/aluno portal,
billing integration, per-role DB RLS (revisit after EPIC-001).

## 8. Article IV compliance note

Every FR/NFR above traces to observed code or `.lovable/plan.md`. Items marked
_[assumed]_ in `docs/brief.md` (school identity, team size, "live in production") need
product-owner confirmation and are not treated as settled requirements.
