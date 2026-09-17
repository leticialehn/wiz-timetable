-- Contrato (mês/ano de início e término) e contagem de créditos por aluno —
-- o término do contrato passa a ser um segundo gatilho pro alerta de
-- rematrícula, independente de o aluno já ter chegado na R8. Créditos é só
-- preenchido pra alunos de conversação/VIP cobrados por número de aulas.
alter table public.alunos
  add column contrato_inicio date,
  add column contrato_fim date,
  add column creditos integer;

-- Distingue o desfecho de um alerta de rematrícula resolvido: rematriculado
-- (contrato novo/renovado), não rematriculado (motivo preenchido) ou
-- parcelas adicionais (não renovou, mas continua pagando à parte dentro do
-- mesmo contrato até terminar o livro atual).
alter table public.alertas_status
  add column desfecho text;
