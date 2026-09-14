# Estado do Projeto — Wiz Timetable

> Documento vivo de acompanhamento de progresso. Atualizar sempre que uma story
> mudar de status. Fonte de verdade para status individual continua sendo o
> campo `## Status` de cada story file — este documento é um resumo agregado.

**Última atualização:** 2026-09-14

## PRD

- `docs/prd.md` — v4 (AIOX), status: brownfield reconstruction.
- Ainda não sharded (`docs/prd/` não existe).

## EPIC-001 — Wire Authentication & Authorization (P0, blocker)

`docs/stories/epics/EPIC-001-auth-wiring.md`

| Story | Título                                                                                     | Status                                                         | Gate                                                    |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| 1.1   | Mount login + route guards                                                                 | ✅ Done                                                        | CONCERNS (7, não bloqueantes) + fix pós-QA aplicado     |
| 1.2   | Guard all data server functions (`requireAuthenticated`)                                   | ✅ Done                                                        | CONCERNS (4, não bloqueantes)                           |
| 1.3   | Role checks on admin-only endpoints (`requireRole`)                                        | ✅ Done                                                        | ver `docs/qa/gates/`                                    |
| 1.4   | [Remove `attachSupabaseAuth`; session hygiene](stories/1.4.remove-attach-supabase-auth.md) | 🔍 InReview (@architect)                                       | @dev: 2 arquivos mortos removidos; typecheck + build ✅ |
| 1.5   | [Verify `SESSION_SECRET` in Vercel; ops doc](stories/1.5.verify-session-secret-vercel.md)  | 🔶 InReview (@devops) — AC3/AC4/AC6 feitos; AC1/AC2 bloqueados | aguardando @architect                                   |

**Bloqueia fechamento do epic:** AC7 (remover middleware no-op) e AC8
(`SESSION_SECRET` confirmado) dependem de 1.4/1.5, ambas validadas em 2026-09-14 e
ambas agora em **InReview** — 1.4 implementada por `@dev` (AC7 satisfeito no código),
1.5 por `@devops`. AC9
(typecheck/lint + walkthrough manual em nível de epic) ainda não consolidado.

**Escopo adicional aprovado em 1.4:** além de `attachSupabaseAuth` (nomeado no AC7 do
epic), a story também remove `src/integrations/supabase/auth-middleware.ts`
(`requireSupabaseAuth`), segundo artefato morto de Supabase Auth encontrado durante o
grounding e verificado pelo @po (zero importadores no repo). Atualizar o texto do
AC7 em `EPIC-001-auth-wiring.md` no fechamento do epic.

**Correção registrada em 1.5:** o draft afirmava que
`docs/framework/tech-stack.md` já citava `SESSION_SECRET`; não cita (0 ocorrências).
A linha existente está em `docs/architecture.md:53`. AC4 corrigido pelo @po.

**Bloqueio aberto em 1.5 (2026-09-14, @devops):** AC3 (`.env.example`), AC4
(`tech-stack.md` § Secrets) e AC6 concluídos e commitados. **AC1 e AC2 continuam
bloqueados por ação humana** — o CLI `vercel` não está instalado e o repo não está
linkado (`.vercel/` só tem `output/`, sem `project.json`); o login é interativo.
Comandos exatos para rodar em uma passada estão nas Completion Notes da story.
⚠️ Sinal relevante: o `SESSION_SECRET` do `.env.local` tem 52 caracteres mas só 17
distintos, todos minúsculos — formato de passphrase, não de 32 bytes aleatórios. Se
o valor na Vercel veio da mesma origem, **AC2 deve falhar e exigir rotação**, o que
desloga todos os usuários ativos.

**Nota:** `docs/stories/README.md` está sincronizado com este arquivo.

## EPIC-002 — Reconcile Database with Production (P1)

`docs/stories/epics/EPIC-002-db-reconciliation.md`

| Story | Título                                                 | Status      |
| ----- | ------------------------------------------------------ | ----------- |
| 2.1   | Baseline migration from production                     | Draft       |
| 2.2   | Realtime strategy decision + implementation            | Não drafted |
| 2.3   | Verify + document RLS/GRANT/constraints for all tables | Não drafted |

## EPIC-003 — Test harness + CI (P1, não drafted)

Sem stories criadas ainda.

## EPIC-004 / EPIC-005 — Hardening (P2, não drafted)

Sem stories criadas ainda.

---

## Log de progresso

| Data       | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-14 | Criação deste documento; snapshot do estado real (1.1/1.2/1.3 Done)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-14 | @sm drafted 1.4 (`1.4.remove-attach-supabase-auth.md`) e 1.5 (`1.5.verify-session-secret-vercel.md`); README.md sincronizado                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-14 | @po `*validate-story-draft`: 1.4 GO 9/10 e 1.5 GO 8/10 → ambas Draft → Ready. `[AUTO-DECISION]`s de 1.4 verificados contra o código-fonte; 1 claim incorreto em 1.5 corrigido                                                                                                                                                                                                                                                                                                                |
| 2026-09-14 | @devops implementou 1.5 parcialmente → InReview. `.env.example` + `docs/framework/tech-stack.md` (§ Secrets) atualizados; AC1/AC2 (verificação na Vercel) bloqueados por falta de CLI/link — instruções na story                                                                                                                                                                                                                                                                             |
| 2026-09-14 | @dev implementou 1.4 → InReview. Removidos `src/integrations/supabase/auth-attacher.ts` (`attachSupabaseAuth`) e `auth-middleware.ts` (`requireSupabaseAuth`); `src/start.ts` agora com `functionMiddleware: []`. Grep pós-mudança = 0 referências; typecheck e build verdes (exit 0), lint limpo em `start.ts` (falhas de `eslint .` são CRLF pré-existentes em todo o repo: `core.autocrlf=true` vs `.gitattributes eol=lf`). AC5 por verificação estática (blocker de browser-automation) |
