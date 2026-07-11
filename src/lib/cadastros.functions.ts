import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// -------- Professoras --------

export const criarProfessora = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string; cor: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("professoras").insert({ nome: data.nome, cor: data.cor });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarProfessora = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; nome: string; cor: string; ativa: boolean }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("professoras")
      .update({ nome: data.nome, cor: data.cor, ativa: data.ativa })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerProfessora = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("professoras").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Alunos --------

export const criarAluno = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string; nivel: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("alunos").insert({ nome: data.nome, nivel: data.nivel });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarAluno = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; nome: string; nivel: string; ativo: boolean }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("alunos")
      .update({ nome: data.nome, nivel: data.nivel, ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerAluno = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("alunos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
