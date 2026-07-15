import { createServerFn } from "@tanstack/react-start";
import { capitalizarNome } from "./utils";
import { NIVEIS } from "./types";

function validarNivel(nivel: string): string {
  if (!NIVEIS.includes(nivel as (typeof NIVEIS)[number])) {
    throw new Error(`Nível inválido. Use um destes: ${NIVEIS.join(", ")}.`);
  }
  return nivel;
}

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
  .inputValidator(
    (data: { id: string; nome: string; cor: string; ativa: boolean; coordenadora: boolean }) =>
      data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("professoras")
      .update({
        nome: data.nome,
        cor: data.cor,
        ativa: data.ativa,
        coordenadora: data.coordenadora,
      })
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
    const { data: novoAluno, error } = await sb
      .from("alunos")
      .insert({ nome: capitalizarNome(data.nome), nivel: validarNivel(data.nivel) })
      .select("id")
      .single();
    if (error || !novoAluno) throw new Error(error?.message ?? "Erro ao criar aluno");
    return { ok: true, id: novoAluno.id };
  });

export const atualizarAluno = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; nome: string; nivel: string; ativo: boolean }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("alunos")
      .update({
        nome: capitalizarNome(data.nome),
        nivel: validarNivel(data.nivel),
        ativo: data.ativo,
      })
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
