-- Re-lock down schoolwide tables. The lockdown from migration
-- 20260711121505 ("Lock down all schoolwide tables: revoke anon access") was
-- found reverted in production on 2026-09-15 during Story 2.1 (baseline
-- pull): public "leitura publica"/"inserir publico"/"atualizar publico"
-- policies and GRANT ALL to anon/authenticated had reappeared on these
-- tables, most likely from a direct Supabase Studio edit. This migration
-- restores that lockdown so app data is only reachable through server
-- functions using the service-role key.
--
-- aulas_licoes is intentionally excluded: its public SELECT policy
-- ("leitura publica licoes") is a deliberate, documented exception for
-- Realtime (see docs/DB-AUDIT.md §3), not part of this regression.

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
  public.professoras, public.alertas_status, public.calendario_excecoes
  FROM anon, authenticated;

GRANT ALL ON public.alunos, public.aulas_notas, public.aulas_presenca,
  public.excecoes_semana, public.grade_base, public.horarios_config,
  public.professoras, public.alertas_status, public.calendario_excecoes
  TO service_role;

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excecoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_excecoes ENABLE ROW LEVEL SECURITY;
