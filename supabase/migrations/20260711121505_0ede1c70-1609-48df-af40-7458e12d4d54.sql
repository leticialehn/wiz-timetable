
-- Lock down all schoolwide tables: revoke anon access; server functions use service role.
DROP POLICY IF EXISTS "leitura publica alunos" ON public.alunos;
DROP POLICY IF EXISTS "leitura publica notas" ON public.aulas_notas;
DROP POLICY IF EXISTS "inserir notas publico" ON public.aulas_notas;
DROP POLICY IF EXISTS "atualizar notas publico" ON public.aulas_notas;
DROP POLICY IF EXISTS "leitura publica presenca" ON public.aulas_presenca;
DROP POLICY IF EXISTS "inserir presenca publico" ON public.aulas_presenca;
DROP POLICY IF EXISTS "atualizar presenca publico" ON public.aulas_presenca;
DROP POLICY IF EXISTS "leitura publica excecoes" ON public.excecoes_semana;
DROP POLICY IF EXISTS "leitura publica grade_base" ON public.grade_base;
DROP POLICY IF EXISTS "leitura publica horarios_config" ON public.horarios_config;
DROP POLICY IF EXISTS "leitura publica professoras" ON public.professoras;

REVOKE ALL ON public.alunos, public.aulas_notas, public.aulas_presenca,
  public.excecoes_semana, public.grade_base, public.horarios_config,
  public.professoras FROM anon, authenticated;

GRANT ALL ON public.alunos, public.aulas_notas, public.aulas_presenca,
  public.excecoes_semana, public.grade_base, public.horarios_config,
  public.professoras TO service_role;

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excecoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professoras ENABLE ROW LEVEL SECURITY;
