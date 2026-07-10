import { createServerFn } from "@tanstack/react-start";
import type { Papel, UsuarioAutenticado } from "./types";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; senha: string }) => data)
  .handler(async ({ data }) => {
    const { getAuthSession, verifyPassword } = await import("./auth.server");
    const sb = await admin();
    const { data: usuario } = await sb
      .from("usuarios")
      .select("id, senha_hash, ativo")
      .eq("username", data.username.trim())
      .maybeSingle();
    if (!usuario || !usuario.ativo) {
      return { ok: false as const, erro: "Usuário ou senha incorretos" };
    }
    const senhaOk = await verifyPassword(data.senha, usuario.senha_hash);
    if (!senhaOk) {
      return { ok: false as const, erro: "Usuário ou senha incorretos" };
    }
    const session = await getAuthSession();
    await session.update({ usuarioId: usuario.id });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAuthSession } = await import("./auth.server");
  const session = await getAuthSession();
  await session.clear();
  return { ok: true };
});

export const getSessaoAtual = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    autenticado: boolean;
    usuario: UsuarioAutenticado | null;
    precisaBootstrap: boolean;
  }> => {
    const { usuarioDaSessao } = await import("./auth.server");
    const usuario = await usuarioDaSessao();
    if (usuario) {
      return { autenticado: true, usuario, precisaBootstrap: false };
    }
    const sb = await admin();
    const { count } = await sb.from("usuarios").select("*", { count: "exact", head: true });
    return { autenticado: false, usuario: null, precisaBootstrap: (count ?? 0) === 0 };
  },
);

export const criarPrimeiroUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string; username: string; senha: string }) => data)
  .handler(async ({ data }) => {
    const { getAuthSession, hashPassword } = await import("./auth.server");
    const sb = await admin();
    const { count } = await sb.from("usuarios").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return { ok: false as const, erro: "Já existe pelo menos um usuário cadastrado." };
    }
    const senha_hash = await hashPassword(data.senha);
    const { data: novoUsuario, error } = await sb
      .from("usuarios")
      .insert({ nome: data.nome, username: data.username.trim(), senha_hash })
      .select("id")
      .single();
    if (error || !novoUsuario) {
      return { ok: false as const, erro: error?.message ?? "Erro ao criar usuário" };
    }
    const papel: Papel = "secretaria";
    const { error: papelError } = await sb
      .from("usuario_papeis")
      .insert({ usuario_id: novoUsuario.id, papel });
    if (papelError) {
      return { ok: false as const, erro: papelError.message };
    }
    const session = await getAuthSession();
    await session.update({ usuarioId: novoUsuario.id });
    return { ok: true as const };
  });
