import { createServerFn } from "@tanstack/react-start";
import type { Aluno, CampoNota, ConceitoNota, StatusPresenca } from "./types";
import { toISODate } from "./date-utils";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type HistoricoItem = {
  chave: string;
  data: string;
  periodo: number;
  professora_id: string;
  professora_nome: string;
  presenca: StatusPresenca | null;
  notas: Record<CampoNota, ConceitoNota | null> | null;
  observacao: string | null;
};

export type ResumoAluno = {
  aulasNoMes: number;
  presencas: number;
  faltas: number;
  sequenciaFaltas: number;
  distribuicaoConceitos: Record<CampoNota, Record<ConceitoNota, number>>;
};

export type HistoricoAluno = {
  aluno: Aluno;
  timeline: HistoricoItem[];
  resumo: ResumoAluno;
};

const CAMPOS: CampoNota[] = ["fala", "audicao", "leitura", "escrita"];
const CONCEITOS: ConceitoNota[] = ["O", "MB", "B", "R"];

function chaveDe(r: { data: string; periodo: number; professora_id: string }) {
  return `${r.data}-${r.periodo}-${r.professora_id}`;
}

// Ordena mais recente primeiro: data desc, depois período desc.
function porDataDesc<T extends { data: string; periodo: number }>(a: T, b: T) {
  if (a.data !== b.data) return a.data < b.data ? 1 : -1;
  return b.periodo - a.periodo;
}

export const getHistoricoAluno = createServerFn({ method: "GET" })
  .inputValidator((data: { aluno_id: string }) => data)
  .handler(async ({ data }): Promise<HistoricoAluno | null> => {
    const sb = await publicClient();
    const [alunoRes, presRes, notasRes, profRes] = await Promise.all([
      sb.from("alunos").select("*").eq("id", data.aluno_id).maybeSingle(),
      sb
        .from("aulas_presenca")
        .select("data,periodo,professora_id,status,observacao")
        .eq("aluno_id", data.aluno_id),
      sb
        .from("aulas_notas")
        .select("data,periodo,professora_id,fala,audicao,leitura,escrita")
        .eq("aluno_id", data.aluno_id),
      sb.from("professoras").select("id,nome"),
    ]);

    const aluno = alunoRes.data as Aluno | null;
    if (!aluno) return null;

    const presencas = (presRes.data ?? []) as {
      data: string;
      periodo: number;
      professora_id: string;
      status: StatusPresenca;
      observacao: string | null;
    }[];
    const notas = (notasRes.data ?? []) as {
      data: string;
      periodo: number;
      professora_id: string;
      fala: ConceitoNota | null;
      audicao: ConceitoNota | null;
      leitura: ConceitoNota | null;
      escrita: ConceitoNota | null;
    }[];
    const professoras = (profRes.data ?? []) as { id: string; nome: string }[];
    const nomeProf = new Map(professoras.map((p) => [p.id, p.nome]));

    const porChave = new Map<string, HistoricoItem>();
    for (const p of presencas) {
      const chave = chaveDe(p);
      porChave.set(chave, {
        chave,
        data: p.data,
        periodo: p.periodo,
        professora_id: p.professora_id,
        professora_nome: nomeProf.get(p.professora_id) ?? "?",
        presenca: p.status,
        notas: null,
        observacao: p.observacao,
      });
    }
    for (const n of notas) {
      const chave = chaveDe(n);
      const notasValores: Record<CampoNota, ConceitoNota | null> = {
        fala: n.fala,
        audicao: n.audicao,
        leitura: n.leitura,
        escrita: n.escrita,
      };
      const existente = porChave.get(chave);
      if (existente) {
        existente.notas = notasValores;
      } else {
        porChave.set(chave, {
          chave,
          data: n.data,
          periodo: n.periodo,
          professora_id: n.professora_id,
          professora_nome: nomeProf.get(n.professora_id) ?? "?",
          presenca: null,
          notas: notasValores,
          observacao: null,
        });
      }
    }

    const timeline = [...porChave.values()].sort(porDataDesc);

    const mesAtual = toISODate(new Date()).slice(0, 7);
    const aulasNoMes = timeline.filter((t) => t.data.startsWith(mesAtual)).length;
    const totalPresencas = presencas.filter((p) => p.status === "presente").length;
    const totalFaltas = presencas.filter((p) => p.status === "falta").length;

    const presencasOrdenadas = [...presencas].sort(porDataDesc);
    let sequenciaFaltas = 0;
    for (const p of presencasOrdenadas) {
      if (p.status === "falta") sequenciaFaltas++;
      else break;
    }

    const distribuicaoConceitos = Object.fromEntries(
      CAMPOS.map((c) => [
        c,
        Object.fromEntries(CONCEITOS.map((v) => [v, 0])) as Record<ConceitoNota, number>,
      ]),
    ) as Record<CampoNota, Record<ConceitoNota, number>>;
    for (const n of notas) {
      for (const c of CAMPOS) {
        const v = n[c];
        if (v) distribuicaoConceitos[c][v]++;
      }
    }

    return {
      aluno,
      timeline,
      resumo: {
        aulasNoMes,
        presencas: totalPresencas,
        faltas: totalFaltas,
        sequenciaFaltas,
        distribuicaoConceitos,
      },
    };
  });
