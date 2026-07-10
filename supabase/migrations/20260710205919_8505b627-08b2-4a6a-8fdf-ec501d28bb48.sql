
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ aulas_presenca ============
CREATE TABLE public.aulas_presenca (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  professora_id uuid NOT NULL REFERENCES public.professoras(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  periodo int NOT NULL,
  dia_semana int NOT NULL,
  status text NOT NULL CHECK (status IN ('presente','falta')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data, professora_id, aluno_id, periodo)
);

GRANT SELECT, INSERT, UPDATE ON public.aulas_presenca TO anon;
GRANT SELECT, INSERT, UPDATE ON public.aulas_presenca TO authenticated;
GRANT ALL ON public.aulas_presenca TO service_role;

ALTER TABLE public.aulas_presenca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica presenca" ON public.aulas_presenca FOR SELECT TO public USING (true);
CREATE POLICY "inserir presenca publico" ON public.aulas_presenca FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "atualizar presenca publico" ON public.aulas_presenca FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_aulas_presenca_updated_at
BEFORE UPDATE ON public.aulas_presenca
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ aulas_notas ============
CREATE TABLE public.aulas_notas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  professora_id uuid NOT NULL REFERENCES public.professoras(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  periodo int NOT NULL,
  fala text CHECK (fala IN ('O','MB','B','R')),
  audicao text CHECK (audicao IN ('O','MB','B','R')),
  leitura text CHECK (leitura IN ('O','MB','B','R')),
  escrita text CHECK (escrita IN ('O','MB','B','R')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data, professora_id, aluno_id, periodo)
);

GRANT SELECT, INSERT, UPDATE ON public.aulas_notas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.aulas_notas TO authenticated;
GRANT ALL ON public.aulas_notas TO service_role;

ALTER TABLE public.aulas_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica notas" ON public.aulas_notas FOR SELECT TO public USING (true);
CREATE POLICY "inserir notas publico" ON public.aulas_notas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "atualizar notas publico" ON public.aulas_notas FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_aulas_notas_updated_at
BEFORE UPDATE ON public.aulas_notas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.aulas_presenca;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aulas_notas;
