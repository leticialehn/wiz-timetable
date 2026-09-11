import { createServerFn } from "@tanstack/react-start";
import type { CalendarioExcecao, GrupoCalendario, TipoCalendarioExcecao } from "./types";

async function admin() {
  // Story 1.2: exige sessão antes de qualquer acesso ao banco.
  const { requireAuthenticated } = await import("./auth.server");
  await requireAuthenticated();
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

// Cria uma exceção pra cada combinação de data selecionada × grupo marcado
// (um clique por dia no calendário, um ou mais grupos) — sempre com o mesmo
// tipo. Marcar os 3 grupos de uma vez equivale a "toda a escola".
export const criarCalendarioExcecoes = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { datas: string[]; tipo: TipoCalendarioExcecao; grupos: GrupoCalendario[] }) => data,
  )
  .handler(async ({ data }) => {
    // Story 1.3: secretaria-only.
    const { requireRole } = await import("./auth.server");
    await requireRole(["secretaria"]);
    const sb = await admin();
    const linhas = data.datas.flatMap((dataIso) =>
      data.grupos.map((grupo) => ({
        data: dataIso,
        tipo: data.tipo,
        descricao: "",
        grupo,
      })),
    );
    const { error } = await sb.from("calendario_excecoes").insert(linhas);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerCalendarioExcecoes = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    // Story 1.3: secretaria-only.
    const { requireRole } = await import("./auth.server");
    await requireRole(["secretaria"]);
    const sb = await admin();
    const { error } = await sb.from("calendario_excecoes").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
