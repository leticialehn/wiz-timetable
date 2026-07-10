import { createServerFn } from "@tanstack/react-start";
import type { Papel } from "./types";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type UsuarioListado = {
  id: string;
  nome: string;
  username: string;
  ativo: boolean;
  professora_id: string | null;
  papeis: Papel[];
};

export const listarUsuarios = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsuarioListado[]> => {
    await (await import("./auth.server")).requireRole(["secretaria"]);
    const sb = await admin();
    const [usuariosRes, papeisRes] = await Promise.all([
      sb.from("usuarios").select("id, nome, username, ativo, professora_id").order("nome"),
      sb.from("usuario_papeis").select("usuario_id, papel"),
    ]);
    const usuarios = usuariosRes.data ?? [];
    const papeisPorUsuario = new Map<string, Papel[]>();
    for (const p of (papeisRes.data ?? []) as { usuario_id: string; papel: Papel }[]) {
      if (!papeisPorUsuario.has(p.usuario_id)) papeisPorUsuario.set(p.usuario_id, []);
      papeisPorUsuario.get(p.usuario_id)!.push(p.papel);
    }
    return usuarios.map((u) => ({
      id: u.id,
      nome: u.nome,
      username: u.username,
      ativo: u.ativo,
      professora_id: u.professora_id,
      papeis: papeisPorUsuario.get(u.id) ?? [],
    }));
  },
);

export const criarUsuario = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      nome: string;
      username: string;
      senha: string;
      papeis: Papel[];
      professora_id?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole(["secretaria"]);
    if (data.papeis.length === 0) {
      return { ok: false as const, erro: "Selecione ao menos um papel." };
    }
    const { hashPassword } = await import("./auth.server");
    const sb = await admin();
    const senha_hash = await hashPassword(data.senha);
    const professora_id = data.papeis.includes("professor") ? (data.professora_id ?? null) : null;
    const { data: novoUsuario, error } = await sb
      .from("usuarios")
      .insert({ nome: data.nome, username: data.username.trim(), senha_hash, professora_id })
      .select("id")
      .single();
    if (error || !novoUsuario) {
      return { ok: false as const, erro: error?.message ?? "Erro ao criar usuário" };
    }
    const { error: papeisError } = await sb
      .from("usuario_papeis")
      .insert(data.papeis.map((papel) => ({ usuario_id: novoUsuario.id, papel })));
    if (papeisError) {
      return { ok: false as const, erro: papeisError.message };
    }
    return { ok: true as const };
  });

export const atualizarUsuario = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      nome: string;
      papeis: Papel[];
      professora_id?: string | null;
      ativo: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole(["secretaria"]);
    if (data.papeis.length === 0) {
      return { ok: false as const, erro: "Selecione ao menos um papel." };
    }
    const sb = await admin();
    const professora_id = data.papeis.includes("professor") ? (data.professora_id ?? null) : null;
    const { error: updError } = await sb
      .from("usuarios")
      .update({ nome: data.nome, ativo: data.ativo, professora_id })
      .eq("id", data.id);
    if (updError) {
      return { ok: false as const, erro: updError.message };
    }
    const { error: delError } = await sb.from("usuario_papeis").delete().eq("usuario_id", data.id);
    if (delError) {
      return { ok: false as const, erro: delError.message };
    }
    const { error: insError } = await sb
      .from("usuario_papeis")
      .insert(data.papeis.map((papel) => ({ usuario_id: data.id, papel })));
    if (insError) {
      return { ok: false as const, erro: insError.message };
    }
    return { ok: true as const };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; novaSenha: string }) => data)
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole(["secretaria"]);
    const { hashPassword } = await import("./auth.server");
    const sb = await admin();
    const senha_hash = await hashPassword(data.novaSenha);
    const { error } = await sb.from("usuarios").update({ senha_hash }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole(["secretaria"]);
    const sb = await admin();
    const { error } = await sb.from("usuarios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
