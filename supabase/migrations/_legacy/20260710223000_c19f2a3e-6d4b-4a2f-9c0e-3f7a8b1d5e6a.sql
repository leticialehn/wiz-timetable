-- ============ usuarios / usuario_papeis ============
-- Sistema de login por usuario com papeis (secretaria / professor / coordenador).
-- Substitui a senha unica compartilhada (ADMIN_PASSWORD). Guarda hash de senha,
-- entao NAO tem nenhuma leitura publica (diferente de professoras/alunos).

CREATE TABLE public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  username text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  professora_id uuid UNIQUE REFERENCES public.professoras(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.usuarios FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.usuarios TO service_role;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usuario_papeis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('secretaria', 'professor', 'coordenador')),
  UNIQUE (usuario_id, papel)
);

REVOKE ALL ON public.usuario_papeis FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.usuario_papeis TO service_role;

ALTER TABLE public.usuario_papeis ENABLE ROW LEVEL SECURITY;
