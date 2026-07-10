import { createServerFn } from "@tanstack/react-start";
import type { CampoNota, ConceitoNota, StatusPresenca, PresencaRow, NotaRow } from "./types";

async function sb() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const setPresenca = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      data: string;
      professora_id: string;
      aluno_id: string;
      periodo: number;
      dia_semana: number;
      status: StatusPresenca | null;
      observacao?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const client = await sb();
    if (data.status === null) {
      // "não lançado" -> apagar (sem policy delete pública, então fazemos um update
      // apagando via service? Não temos service aqui; então: não deletamos, mas
      // permitimos alternar entre presente/falta apenas)
      throw new Error("Status inválido");
    }
    const { error } = await client.from("aulas_presenca").upsert(
      {
        data: data.data,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id,
        periodo: data.periodo,
        dia_semana: data.dia_semana,
        status: data.status,
        observacao: data.observacao ?? null,
      },
      { onConflict: "data,professora_id,aluno_id,periodo" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setNota = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      data: string;
      professora_id: string;
      aluno_id: string;
      periodo: number;
      campo: CampoNota;
      valor: ConceitoNota | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const client = await sb();
    // upsert setando apenas o campo alvo
    const row: Record<string, unknown> = {
      data: data.data,
      professora_id: data.professora_id,
      aluno_id: data.aluno_id,
      periodo: data.periodo,
    };
    row[data.campo] = data.valor;
    const { error } = await client
      .from("aulas_notas")
      .upsert(row, { onConflict: "data,professora_id,aluno_id,periodo" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLancamentosSemana = createServerFn({ method: "GET" })
  .inputValidator((data: { dataSegunda: string; professora_id: string; dataFim: string }) => data)
  .handler(async ({ data }): Promise<{ presencas: PresencaRow[]; notas: NotaRow[] }> => {
    const client = await sb();
    const [presRes, notasRes] = await Promise.all([
      client
        .from("aulas_presenca")
        .select("*")
        .eq("professora_id", data.professora_id)
        .gte("data", data.dataSegunda)
        .lte("data", data.dataFim),
      client
        .from("aulas_notas")
        .select("*")
        .eq("professora_id", data.professora_id)
        .gte("data", data.dataSegunda)
        .lte("data", data.dataFim),
    ]);
    return {
      presencas: (presRes.data ?? []) as PresencaRow[],
      notas: (notasRes.data ?? []) as NotaRow[],
    };
  });
