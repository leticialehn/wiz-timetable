-- Motivo em texto livre pra quando um alerta de rematrícula é fechado como
-- "não rematriculado" (aluno terminou o livro mas não vai continuar) — sem
-- isso não dava pra distinguir esse caso de uma rematrícula normal no
-- histórico de alertas resolvidos.
ALTER TABLE public.alertas_status
  ADD COLUMN motivo text;

-- Situação do aluno além de ativo/inativo: por que ele ficou inativo.
-- "matriculado" sempre que ativo=true; "nao_rematriculado" (terminou o curso,
-- não vai pro próximo livro) ou "cancelado" (parou no meio do curso/livro)
-- quando ativo=false.
ALTER TABLE public.alunos
  ADD COLUMN situacao text NOT NULL DEFAULT 'matriculado';

ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_situacao_check
  CHECK (situacao IN ('matriculado', 'nao_rematriculado', 'cancelado'));

UPDATE public.alunos SET situacao = 'cancelado' WHERE ativo = false;
