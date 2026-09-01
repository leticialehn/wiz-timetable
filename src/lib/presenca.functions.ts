import { createServerFn } from "@tanstack/react-start";
import type {
  CampoNota,
  ConceitoNota,
  StatusPresenca,
  PresencaRow,
  NotaRow,
  LicaoRow,
} from "./types";

async function sb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Desconta/devolve 1 crédito quando a presença de um aluno de crédito
// (conversação/VIP cobrado por aula, creditos != null) transiciona de/para
// "presente" — não a cada save, só na transição, senão corrigir uma presença
// já lançada (algo que agora dá pra fazer direto no histórico do aluno)
// descontaria de novo ou ficaria sem descontar.
async function ajustarCreditos(
  client: Awaited<ReturnType<typeof sb>>,
  alunoId: string,
  delta: number,
) {
  const { data: aluno } = await client.from("alunos").select("creditos").eq("id", alunoId).single();
  if (!aluno || aluno.creditos === null) return;
  await client
    .from("alunos")
    .update({ creditos: aluno.creditos + delta })
    .eq("id", alunoId);
}

export const setPresenca = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      data: string;
      professora_id: string;
      aluno_id: string;
      periodo: number;
      parte: number;
      dia_semana: number;
      status: StatusPresenca | null;
      observacao?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const client = await sb();
    const { data: existente } = await client
      .from("aulas_presenca")
      .select("status")
      .eq("data", data.data)
      .eq("professora_id", data.professora_id)
      .eq("aluno_id", data.aluno_id)
      .eq("periodo", data.periodo)
      .eq("parte", data.parte)
      .maybeSingle();
    const statusAnterior = existente?.status ?? null;

    if (data.status === null) {
      // Desclicar/limpar um lançamento errado (ex.: presença marcada por
      // engano num livro/dia que não devia) — apaga a linha de vez.
      const { error } = await client
        .from("aulas_presenca")
        .delete()
        .eq("data", data.data)
        .eq("professora_id", data.professora_id)
        .eq("aluno_id", data.aluno_id)
        .eq("periodo", data.periodo)
        .eq("parte", data.parte);
      if (error) throw new Error(error.message);
      if (statusAnterior === "presente") {
        await ajustarCreditos(client, data.aluno_id, 1);
      }
      return { ok: true };
    }

    const { error } = await client.from("aulas_presenca").upsert(
      {
        data: data.data,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id,
        periodo: data.periodo,
        parte: data.parte,
        dia_semana: data.dia_semana,
        status: data.status,
        observacao: data.observacao ?? null,
      },
      { onConflict: "data,professora_id,aluno_id,periodo,parte" },
    );
    if (error) throw new Error(error.message);

    if (statusAnterior !== "presente" && data.status === "presente") {
      await ajustarCreditos(client, data.aluno_id, -1);
    } else if (statusAnterior === "presente" && data.status !== "presente") {
      await ajustarCreditos(client, data.aluno_id, 1);
    }

    return { ok: true };
  });

export const setNota = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      data: string;
      professora_id: string;
      aluno_id: string;
      periodo: number;
      parte: number;
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
      parte: data.parte,
    };
    row[data.campo] = data.valor;
    const { error } = await client
      .from("aulas_notas")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any, { onConflict: "data,professora_id,aluno_id,periodo,parte" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLancamentosSemana = createServerFn({ method: "GET" })
  .inputValidator((data: { dataSegunda: string; professora_id: string; dataFim: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{ presencas: PresencaRow[]; notas: NotaRow[]; licoes: LicaoRow[] }> => {
      const client = await sb();
      const [presRes, notasRes, licoesRes] = await Promise.all([
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
        client
          .from("aulas_licoes")
          .select("*")
          .eq("professora_id", data.professora_id)
          .gte("data", data.dataSegunda)
          .lte("data", data.dataFim),
      ]);
      return {
        presencas: (presRes.data ?? []) as PresencaRow[],
        notas: (notasRes.data ?? []) as NotaRow[],
        licoes: (licoesRes.data ?? []) as LicaoRow[],
      };
    },
  );

export const setLicao = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      data: string;
      professora_id: string;
      aluno_id: string;
      periodo: number;
      parte: number;
      licao: string;
      nivel_no_momento: string;
      praticado: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const client = await sb();
    const { error } = await client.from("aulas_licoes").upsert(
      {
        data: data.data,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id,
        periodo: data.periodo,
        parte: data.parte,
        licao: data.licao,
        nivel_no_momento: data.nivel_no_momento,
        praticado: data.praticado,
      },
      { onConflict: "data,professora_id,aluno_id,periodo,parte" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Corrige o nível do aluno de uma vez, quando esqueceram de trocar o livro
// antes de lançar aulas — atualiza o nível atual dele e relabela todo o
// histórico de lições já gravado, pra não ficar um pedaço marcado no livro
// antigo por engano.
export const corrigirNivelHistorico = createServerFn({ method: "POST" })
  .inputValidator((data: { aluno_id: string; nivel: string }) => data)
  .handler(async ({ data }) => {
    const client = await sb();
    const { error: erroAluno } = await client
      .from("alunos")
      .update({ nivel: data.nivel })
      .eq("id", data.aluno_id);
    if (erroAluno) throw new Error(erroAluno.message);
    const { error: erroLicoes } = await client
      .from("aulas_licoes")
      .update({ nivel_no_momento: data.nivel })
      .eq("aluno_id", data.aluno_id);
    if (erroLicoes) throw new Error(erroLicoes.message);
    return { ok: true };
  });

// Histórico de lições de cada aluno (de qualquer data anterior a hoje), do
// mais recente pro mais antigo — usado pra sugerir automaticamente a próxima
// lição a partir da maior posição já atingida (não só a mais recente).
export const getHistoricoLicoes = createServerFn({ method: "GET" })
  .inputValidator((data: { aluno_ids: string[]; antesDe: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      Record<string, { licao: string; nivel_no_momento: string; praticado: boolean }[]>
    > => {
      if (data.aluno_ids.length === 0) return {};
      const client = await sb();
      const { data: rows, error } = await client
        .from("aulas_licoes")
        .select("aluno_id, licao, nivel_no_momento, praticado, data, parte")
        .in("aluno_id", data.aluno_ids)
        .lt("data", data.antesDe)
        .order("data", { ascending: false })
        .order("parte", { ascending: false });
      if (error) throw new Error(error.message);
      const resultado: Record<
        string,
        { licao: string; nivel_no_momento: string; praticado: boolean }[]
      > = {};
      for (const row of rows ?? []) {
        if (!resultado[row.aluno_id]) resultado[row.aluno_id] = [];
        resultado[row.aluno_id].push({
          licao: row.licao,
          nivel_no_momento: row.nivel_no_momento,
          praticado: row.praticado,
        });
      }
      return resultado;
    },
  );
