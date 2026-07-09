
-- Professoras
CREATE TABLE public.professoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#f3f4f6',
  ativa boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professoras TO anon, authenticated;
GRANT ALL ON public.professoras TO service_role;
ALTER TABLE public.professoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica professoras" ON public.professoras FOR SELECT USING (true);

-- Alunos
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nivel text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alunos TO anon, authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica alunos" ON public.alunos FOR SELECT USING (true);

-- Grade base (modelo semanal recorrente)
CREATE TABLE public.grade_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  periodo int NOT NULL CHECK (periodo BETWEEN 1 AND 9),
  professora_id uuid NOT NULL REFERENCES public.professoras(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'regular' CHECK (tipo IN ('regular','vip','online')),
  horario_especifico text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_grade_base_lookup ON public.grade_base(dia_semana, professora_id, periodo);
GRANT SELECT ON public.grade_base TO anon, authenticated;
GRANT ALL ON public.grade_base TO service_role;
ALTER TABLE public.grade_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica grade_base" ON public.grade_base FOR SELECT USING (true);

-- Blocos especiais (Break, Preparação, VIP fixo)
CREATE TABLE public.blocos_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  periodo int NOT NULL CHECK (periodo BETWEEN 1 AND 9),
  professora_id uuid NOT NULL REFERENCES public.professoras(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('break','preparacao_homework','vip')),
  titulo text NOT NULL DEFAULT '',
  aluno_nome_destaque text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocos_lookup ON public.blocos_especiais(dia_semana, professora_id, periodo);
GRANT SELECT ON public.blocos_especiais TO anon, authenticated;
GRANT ALL ON public.blocos_especiais TO service_role;
ALTER TABLE public.blocos_especiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica blocos" ON public.blocos_especiais FOR SELECT USING (true);

-- Exceções de semana (adições, remoções e mudanças de uma semana específica)
CREATE TABLE public.excecoes_semana (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  tipo_excecao text NOT NULL CHECK (tipo_excecao IN ('adicionar','remover','mover')),
  grade_base_id uuid REFERENCES public.grade_base(id) ON DELETE CASCADE,
  professora_id uuid REFERENCES public.professoras(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  dia_semana int CHECK (dia_semana BETWEEN 1 AND 6),
  periodo int CHECK (periodo BETWEEN 1 AND 9),
  tipo text CHECK (tipo IN ('regular','vip','online')),
  horario_especifico text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_excecoes_data ON public.excecoes_semana(data);
GRANT SELECT ON public.excecoes_semana TO anon, authenticated;
GRANT ALL ON public.excecoes_semana TO service_role;
ALTER TABLE public.excecoes_semana ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica excecoes" ON public.excecoes_semana FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.professoras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alunos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_base;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocos_especiais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.excecoes_semana;

-- Seed professoras
INSERT INTO public.professoras (nome, cor, ordem) VALUES
  ('Duda',     '#f9c6d3', 1),  -- rosa
  ('Eduarda',  '#c6e8c6', 2),  -- verde
  ('Júlia',    '#ffd4b8', 3),  -- salmão
  ('Letícia',  '#c6dcf5', 4),  -- azul claro
  ('Zi',       '#e3d0f5', 5);  -- lilás
