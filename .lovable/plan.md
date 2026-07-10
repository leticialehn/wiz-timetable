## Objetivo

1. Simplificar o painel da secretaria para o fluxo "clico no horário → escolho o tipo de aula".
2. Adicionar tela da professora com **lançamento de presença e notas** (sem qualquer poder de agendar/alterar horários).

---

## 1. Painel da secretaria (`/admin`)

O editor de célula já permite trocar o tipo — a mudança é apenas de UX:

- Ao clicar em uma célula **ainda sem tipo definido**, a primeira coisa que aparece é a **grade de escolha do tipo** (Regular, Online, Reforço, VIP, Conversação, Break, Preparação & Homework). Só depois de salvar o tipo é que a seção de "adicionar aluno" aparece.
- Ao clicar em uma célula **já configurada**, mostra o tipo atual no topo com botão "Trocar tipo" (recolhe a lista de aulas e mostra os botões de tipo de novo). Isso evita mudar tipo por engano.
- Reforçar visualmente qual tipo cada célula tem na grade (já é por cor + rótulo — só ajuste fino).
- **Nada muda no banco** para esta parte: já usamos `horarios_config` com `setHorarioConfig` / `removerHorarioConfig`.

## 2. Tela da professora (`/professora`) — presença e notas

Passa a ser a tela de trabalho da professora em sala, **só leitura da grade + lançamento de presença/notas**. Nenhum botão de agendar, remover aluno, trocar tipo, adicionar avulso, etc.

### Navegação
- Seletor de professora (já existe, salvo em `localStorage`).
- Abas dos dias: **hoje + próximos dias da mesma semana** (segunda até sábado, dias passados da semana ficam visíveis mas com marcação "concluído").
- Botão "ver histórico" abre um seletor de semanas anteriores em modo somente-leitura.

### Cada aula (célula do dia da professora)
Cabeçalho: período, horário, tipo da aula, tema (se houver).
Lista de alunos daquela aula. Para cada aluno:
- Chip **Presença**: `Presente` / `Falta` (toggle de 2 estados; default "não lançado").
- Quatro campos de **nota**: `Fala`, `Audição`, `Leitura`, `Escrita`. Cada um é um seletor com os conceitos **O, MB, B, R** (ou "—" para não lançado).
- Campo livre opcional "observação da aula" por aluno.
- Estado "salvo" com data/hora do último lançamento, e a professora pode reeditar depois (histórico é semana atual + anteriores).

### Histórico
Rota `/professora/historico` (ou aba dentro de `/professora`): lista de semanas anteriores; ao abrir uma semana, mostra a mesma visualização dos dias, com presença/notas em modo edição também (a professora pode corrigir depois).

## 3. Modelo de dados (nova migration)

Duas tabelas novas em `public`, com realtime ligado, GRANTs completos e RLS pública (o app não tem auth de usuário — o gate protege apenas escritas do admin, mas presença/notas precisam ser gravadas pela professora sem senha):

```
aulas_presenca
  id uuid pk
  data date                       -- data específica da aula
  professora_id uuid fk professoras
  aluno_id uuid fk alunos          -- só alunos matriculados; avulsos ficam de fora (não fazem sentido acompanhar)
  dia_semana int, periodo int      -- redundante mas facilita consulta
  status text check in ('presente','falta')
  observacao text nullable
  created_at, updated_at
  unique (data, professora_id, aluno_id, periodo)

aulas_notas
  id uuid pk
  data date
  professora_id uuid fk professoras
  aluno_id uuid fk alunos
  periodo int
  fala text check in ('O','MB','B','R') nullable
  audicao  ...
  leitura  ...
  escrita  ...
  created_at, updated_at
  unique (data, professora_id, aluno_id, periodo)
```

- GRANT `SELECT, INSERT, UPDATE` para `anon` (a professora não tem login; escrever presença/notas é a única exceção à regra "só admin escreve"). Escopo é a professora selecionada no client — não há como impedir maliciosamente sem auth, e o usuário aceitou esse trade-off ao pedir "sem login para professora".
- RLS aberta para leitura; sem DELETE público.
- `ALTER PUBLICATION supabase_realtime ADD TABLE` para as duas.
- Trigger `update_updated_at_column`.

## 4. Server functions novas (`src/lib/presenca.functions.ts`)

- `setPresenca({ data, professora_id, aluno_id, periodo, dia_semana, status })` — upsert em `aulas_presenca`. **Sem** `requireAdminUnlocked` (a professora não passa pelo gate).
- `setNota({ data, professora_id, aluno_id, periodo, campo: 'fala'|'audicao'|'leitura'|'escrita', valor })` — upsert em `aulas_notas`.
- `getLancamentosSemana({ dataSegunda, professora_id })` — retorna presença + notas de todos os dias da semana daquela professora, para pré-preencher a tela.
- `getLancamentosHistorico({ dataSegunda, professora_id })` — mesmo, para semanas anteriores.

Realtime hook (`use-realtime-grade.ts`) passa a incluir as duas tabelas.

## 5. Reforço explícito na professora

- Remover qualquer botão de editar grade na `/professora` (garantir que o componente `GradeProfessora` só mostra leitura + as ações de presença/notas).
- Toda mudança de grade continua exclusivamente no `/admin` (protegido por senha, como já está).

## 6. Ordem de implementação

1. Migration com as tabelas `aulas_presenca` e `aulas_notas`, GRANTs, RLS, trigger, publication.
2. `src/lib/presenca.functions.ts` (server fns sem gate) e tipos em `src/lib/types.ts`.
3. `src/hooks/use-realtime-grade.ts` — incluir as duas tabelas novas.
4. Refazer `src/routes/professora.tsx`: cabeçalho por dia da semana atual, lista de aulas do dia, presença + 4 notas por aluno, com salvamento otimista e realtime.
5. Aba/rota de histórico de semanas.
6. Pequeno ajuste no `CelulaEditor` do admin: quando célula ainda não tem tipo salvo, esconder a seção de "adicionar aluno" até o tipo ser salvo; caso já tenha, mostrar o tipo atual com botão "Trocar tipo".
7. Verificar build.

## Detalhes técnicos rápidos

- Conceitos O/MB/B/R como enum de string simples (check constraint), sem tabela auxiliar.
- Avulsos (aluno_nome_avulso) ficam **fora** de presença/notas — só alunos com `aluno_id` real são lançáveis (limitação técnica: sem id, não há chave). A UI mostra o avulso na lista mas com badge "avulso" e sem controles.
- Presença "não lançada" = ausência de linha em `aulas_presenca` para aquela combinação. A UI mostra três estados visuais: presente, falta, não lançado.
