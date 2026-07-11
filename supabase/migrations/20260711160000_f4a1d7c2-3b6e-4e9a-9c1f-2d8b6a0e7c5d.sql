-- Adiciona o tipo "sem_aula" (horário fechado, sem aluno) e permite fechar
-- um número de vagas específico numa célula, mesmo sem mudar o tipo.

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.horarios_config'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%tipo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.horarios_config DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.horarios_config
  ADD CONSTRAINT horarios_config_tipo_check
  CHECK (tipo IN ('regular','online','break','preparacao_homework','reforco','vip','conversacao','sem_aula'));

ALTER TABLE public.horarios_config
  ADD COLUMN vagas_fechadas int NOT NULL DEFAULT 0 CHECK (vagas_fechadas >= 0);
