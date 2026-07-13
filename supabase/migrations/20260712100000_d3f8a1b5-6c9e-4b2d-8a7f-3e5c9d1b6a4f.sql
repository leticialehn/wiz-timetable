-- Permite fechar uma vaga só para a semana atual (varia semana a semana),
-- diferente de horarios_config.vagas_fechadas que é permanente/recorrente.

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.excecoes_semana'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%tipo_excecao%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.excecoes_semana DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.excecoes_semana
  ADD CONSTRAINT excecoes_semana_tipo_excecao_check
  CHECK (tipo_excecao IN ('adicionar', 'remover', 'mover', 'fechar_vaga'));
