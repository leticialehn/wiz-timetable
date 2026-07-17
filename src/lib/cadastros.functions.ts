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
  .inputValidator((data: { id: string; nome: string; cor: string; coordenadora: boolean }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("professoras")
      .update({
        nome: data.nome,
        cor: data.cor,
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
  .inputValidator(
    (data: {
      id: string;
      nome: string;
      nivel: string;
      ativo: boolean;
      dataInicioNivel: string | null;
      dataNascimento: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: atual } = await sb.from("alunos").select("nivel").eq("id", data.id).single();
    // Trocou de nível: a data de início manual era do livro anterior, não vale
    // mais — some sozinha (o próximo lançamento de lição já marca o início do
    // novo nível automaticamente).
    const mudouNivel = atual !== null && atual.nivel !== data.nivel;
    const { error } = await sb
      .from("alunos")
      .update({
        nome: capitalizarNome(data.nome),
        nivel: validarNivel(data.nivel),
        ativo: data.ativo,
        data_inicio_nivel: mudouNivel ? null : data.dataInicioNivel,
        data_nascimento: data.dataNascimento,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Última lição registrada de cada aluno (de qualquer nível/data), pra exibir
// na lista de alunos. Pagina pra não cair no limite de 1000 linhas do
// Supabase conforme aulas_licoes for crescendo.
export const getUltimasLicoesPorAluno = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string>> => {
    const sb = await admin();
    const { buscarTodasAsLinhas } = await import("./supabase-paginacao.server");
    const linhas = await buscarTodasAsLinhas<{ aluno_id: string; licao: string }>(
      async (inicio, fim) => {
        const { data, error } = await sb
          .from("aulas_licoes")
          .select("aluno_id,licao,data,periodo,parte")
          .order("data", { ascending: false })
          .order("periodo", { ascending: false })
          .order("parte", { ascending: false })
          .range(inicio, fim);
        return { data: data as { aluno_id: string; licao: string }[] | null, error };
      },
    );
    const resultado: Record<string, string> = {};
    for (const l of linhas) {
      if (!(l.aluno_id in resultado)) resultado[l.aluno_id] = l.licao;
    }
    return resultado;
  },
);

export const removerAluno = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("alunos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
