# Sistema de Horários - Escola de Idiomas

Sistema web em português (BR) com duas interfaces: painel da secretaria (edição) e tela da professora (leitura em tempo real), usando Lovable Cloud (Supabase) com realtime.

## Stack e infraestrutura

- **Lovable Cloud** (Supabase gerenciado) para banco + realtime.
- TanStack Start + React (já configurado).
- Realtime via `supabase.channel(...).on('postgres_changes', ...)` invalidando queries do TanStack Query.
- Sem autenticação Supabase: `/admin` protegido por senha simples via server function + cookie de sessão (padrão `tanstack-shared-password-gate`). `/professora` público, escolha da professora salva em `localStorage`.

## Modelo de dados (migrations)

Tabelas em `public`, com RLS aberta para `anon` (leitura) e escrita restrita ao service_role (todas as mutações passam por server functions autenticadas pelo gate). GRANTs explícitos.

- `professoras` (id uuid, nome text, cor text, ativa bool, created_at)
- `alunos` (id uuid, nome text, nivel text, ativo bool, created_at)
- `grade_base` (id, dia_semana int 1–6, periodo int 1–9, professora_id fk, aluno_id fk nullable, tipo text check in ('regular','vip','online'), horario_especifico text nullable, observacao text nullable)
- `blocos_especiais` (id, dia_semana int, periodo int, professora_id fk, tipo text check in ('break','preparacao_homework','vip'), titulo text, aluno_nome_destaque text nullable)
- `excecoes_semana` (id, data date, tipo_excecao text check in ('adicionar','remover','mover'), grade_base_id fk nullable, professora_id fk nullable, aluno_id fk nullable, periodo int nullable, dia_semana int nullable, horario_especifico text nullable, tipo text nullable, observacao text nullable)

Realtime habilitado nas 5 tabelas via `alter publication supabase_realtime add table ...`.

Seed: professoras (Duda, Eduarda, Júlia, Letícia, Zi) com cores distintas (rosa, verde, salmão, azul-claro, lilás). Níveis são apenas strings livres nos alunos — sem tabela.

## Server functions (`src/lib/*.functions.ts`)

- `gate.functions.ts`: `unlockAdmin(password)`, `lockAdmin()`, `isAdminUnlocked()` — cookie de sessão (`useSession`), senha via `ADMIN_PASSWORD` env, comparação timing-safe.
- `professoras.functions.ts`: `listProfessoras`, `createProfessora`, `updateProfessora`, `toggleAtiva` (mutações requerem gate).
- `alunos.functions.ts`: idem.
- `grade.functions.ts`:
  - `getGradeSemana({ dataInicio })` → retorna grade_base + blocos_especiais + excecoes da semana, aplicadas.
  - `upsertCelula({ escopo: 'semana'|'base', ... })` — grava em `excecoes_semana` ou `grade_base`.
  - `removerAluno`, `moverAluno`, `definirHorario`, `marcarTipo`, `setObservacao`.

Leitura pública via cliente publishable server-side (RLS SELECT to anon). Escritas exigem `requireAdminUnlocked` middleware.

## Rotas

```
src/routes/
  __root.tsx           (metadata BR, título "Grade — Escola")
  index.tsx            (landing: dois botões — Secretaria / Professora)
  admin.tsx            (layout: verifica gate; senão renderiza <UnlockForm/>)
  admin.index.tsx      (grade semanal editável)
  admin.professoras.tsx
  admin.alunos.tsx
  professora.tsx       (seleção + grade do dia, realtime)
```

## Componentes principais

- `GradeSemanal` (admin): seletor de semana (anterior/atual/próxima com datas), tabs dia da semana (Seg–Sáb), tabela colunas=professoras (bg da cor) × linhas=períodos 1–9. Cada célula lista alunos "Nome — Nível" + horário. Blocos especiais ocupam célula inteira com estilo próprio.
- `CelulaEditor` (Sheet lateral): busca aluno, remover, horário, tipo (regular/VIP/online), observação. Dialog de confirmação: "Aplicar só nesta semana ou em todas?".
- `GradeProfessora` (tela professora): coluna vertical dos períodos 1–9 do dia atual, fonte grande, alto contraste, cor da professora no header, botões de dias.
- Realtime hook `useRealtimeGrade(dataInicio)` — subscribe nas 5 tabelas e `queryClient.invalidateQueries`.

## Design system (`src/styles.css`)

- Paleta clara, tipografia legível grande na tela da professora.
- Tokens semânticos para cores das professoras (fundo dinâmico via inline style com a cor hex).
- Variants de destaque para blocos: `break` (cinza-escuro), `vip` (dourado/âmbar), `online` (azul), `preparacao_homework` (roxo suave).
- Cards de aluno grandes na tela da professora (min 18–20pt).

## Segredos

- `ADMIN_PASSWORD` → `add_secret` (usuário define).
- `SESSION_SECRET` → `generate_secret`.

## Ordem de implementação

1. Habilitar Lovable Cloud.
2. Criar secrets (ADMIN_PASSWORD, SESSION_SECRET).
3. Migration: tabelas + GRANTs + RLS + realtime publication + seed professoras.
4. Server functions (gate, professoras, alunos, grade).
5. Design system + rotas + componentes.
6. Realtime hook.
7. Verificar build.

## Pergunta única antes de começar

A senha do painel `/admin` — você quer definir agora (eu abro o campo seguro) ou prefere começar com uma senha padrão temporária que você troca depois?
