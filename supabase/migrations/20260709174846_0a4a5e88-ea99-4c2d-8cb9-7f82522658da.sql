
-- 1) Nova tabela de configuração por célula
CREATE TABLE public.horarios_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  periodo int NOT NULL CHECK (periodo BETWEEN 1 AND 9),
  professora_id uuid NOT NULL REFERENCES public.professoras(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('regular','online','break','preparacao_homework','reforco','vip','conversacao')),
  tema text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dia_semana, periodo, professora_id)
);

GRANT SELECT ON public.horarios_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_config TO authenticated;
GRANT ALL ON public.horarios_config TO service_role;

ALTER TABLE public.horarios_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica horarios_config"
  ON public.horarios_config FOR SELECT
  TO public
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.horarios_config;

-- 2) Novas colunas para aluno avulso
ALTER TABLE public.grade_base ADD COLUMN aluno_nome_avulso text;
ALTER TABLE public.excecoes_semana ADD COLUMN aluno_nome_avulso text;

-- 3) Amplia tipos aceitos
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.grade_base'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%tipo%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.grade_base DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.grade_base
  ADD CONSTRAINT grade_base_tipo_check
  CHECK (tipo IN ('regular','online','vip','reforco','conversacao'));

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'public.excecoes_semana'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%tipo%' AND pg_get_constraintdef(oid) NOT ILIKE '%tipo_excecao%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.excecoes_semana DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.excecoes_semana
  ADD CONSTRAINT excecoes_semana_tipo_check
  CHECK (tipo IS NULL OR tipo IN ('regular','online','vip','reforco','conversacao'));

-- 4) Migrar blocos_especiais -> horarios_config
INSERT INTO public.horarios_config (dia_semana, periodo, professora_id, tipo, tema)
SELECT dia_semana, periodo, professora_id,
  CASE WHEN tipo = 'vip' THEN 'vip'
       WHEN tipo = 'break' THEN 'break'
       WHEN tipo = 'preparacao_homework' THEN 'preparacao_homework'
       ELSE 'break' END,
  NULLIF(titulo, '')
FROM public.blocos_especiais
ON CONFLICT (dia_semana, periodo, professora_id) DO NOTHING;

-- 5) Remove tabela antiga
ALTER PUBLICATION supabase_realtime DROP TABLE public.blocos_especiais;
DROP TABLE public.blocos_especiais;
