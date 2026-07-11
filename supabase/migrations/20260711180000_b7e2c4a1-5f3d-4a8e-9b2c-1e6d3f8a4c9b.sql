-- Amplia o intervalo de períodos de 1-9 para 1-12 (8h-12h e 13h-21h de 2ª a 6ª).

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.grade_base'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%periodo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.grade_base DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.grade_base
  ADD CONSTRAINT grade_base_periodo_check CHECK (periodo BETWEEN 1 AND 12);

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.excecoes_semana'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%periodo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.excecoes_semana DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.excecoes_semana
  ADD CONSTRAINT excecoes_semana_periodo_check CHECK (periodo BETWEEN 1 AND 12);

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.horarios_config'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%periodo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.horarios_config DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.horarios_config
  ADD CONSTRAINT horarios_config_periodo_check CHECK (periodo BETWEEN 1 AND 12);
