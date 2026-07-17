import { createServerFn } from "@tanstack/react-start";
import type { CalendarioExcecao, GrupoCalendario, TipoCalendarioExcecao } from "./types";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getCalendarioExcecoes = createServerFn({ method: "GET" }).handler(
  async (): Promise<CalendarioExcecao[]> => {
    const sb = await admin();
    const { data, error } = await sb.from("calendario_excecoes").select("*").order("data");
    if (error) throw new Error(error.message);
    return (data ?? []) as CalendarioExcecao[];
  },
);

// Cria uma exceção pra cada data selecionada (um clique por dia no
// calendário) — sempre com o mesmo tipo/descrição/grupo.
export const criarCalendarioExcecoes = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      datas: string[];
      tipo: TipoCalendarioExcecao;
      descricao: string;
      grupo: GrupoCalendario;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const linhas = data.datas.map((dataIso) => ({
      data: dataIso,
      tipo: data.tipo,
      descricao: data.descricao,
      grupo: data.grupo,
    }));
    const { error } = await sb.from("calendario_excecoes").insert(linhas);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerCalendarioExcecao = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("calendario_excecoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
