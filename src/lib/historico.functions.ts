import { createServerFn } from "@tanstack/react-start";
import type { Aluno, CampoNota, ConceitoNota, StatusPresenca } from "./types";
import { toISODate } from "./date-utils";
import { buscarTodasAsLinhas } from "./supabase-paginacao.server";
import { dataInicioInferida } from "./licoes";

async function publicClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type HistoricoItem = {
  chave: string;
  data: string;
  periodo: number;
  parte: number;
  professora_id: string;
  professora_nome: string;
  presenca: StatusPresenca | null;
  notas: Record<CampoNota, ConceitoNota | null> | null;
  licao: string | null;
  // Nível do aluno na época dessa lição — só existe quando há lição lançada
  // nessa linha (presença/nota sozinhas não carregam nível). Usado pra não
  // misturar revisões de um livro antigo com as do livro atual no boletim.
  nivel_no_momento: string | null;
  praticado: boolean | null;
  observacao: string | null;
};

export type ResumoAluno = {
  aulasNoMes: number;
  aulasNoLivroAtual: number;
  dataInicioNivel: string | null;
  presencas: number;
  faltas: number;
  sequenciaFaltas: number;
};

export type HistoricoAluno = {
  aluno: Aluno;
  timeline: HistoricoItem[];
  resumo: ResumoAluno;
};

function chaveDe(r: { data: string; periodo: number; professora_id: string; parte: number }) {
  return `${r.data}-${r.periodo}-${r.professora_id}-${r.parte}`;
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
    type RegistroPresencaHist = {
      data: string;
      periodo: number;
      parte: number;
      professora_id: string;
      status: StatusPresenca;
      observacao: string | null;
    };
    type RegistroNotaHist = {
      data: string;
      periodo: number;
      parte: number;
      professora_id: string;
      fala: ConceitoNota | null;
      audicao: ConceitoNota | null;
      leitura: ConceitoNota | null;
      escrita: ConceitoNota | null;
    };
    type RegistroLicaoHist = {
      data: string;
      periodo: number;
      parte: number;
      professora_id: string;
      licao: string;
      nivel_no_momento: string;
      praticado: boolean;
    };
    const [alunoRes, presencas, notas, licoes, profRes] = await Promise.all([
      sb.from("alunos").select("*").eq("id", data.aluno_id).maybeSingle(),
      buscarTodasAsLinhas<RegistroPresencaHist>(async (inicio, fim) => {
        const { data: rows, error } = await sb
          .from("aulas_presenca")
          .select("data,periodo,parte,professora_id,status,observacao")
          .eq("aluno_id", data.aluno_id)
          .range(inicio, fim);
        return { data: rows as RegistroPresencaHist[] | null, error };
      }),
      buscarTodasAsLinhas<RegistroNotaHist>(async (inicio, fim) => {
        const { data: rows, error } = await sb
          .from("aulas_notas")
          .select("data,periodo,parte,professora_id,fala,audicao,leitura,escrita")
          .eq("aluno_id", data.aluno_id)
          .range(inicio, fim);
        return { data: rows as RegistroNotaHist[] | null, error };
      }),
      buscarTodasAsLinhas<RegistroLicaoHist>(async (inicio, fim) => {
        const { data: rows, error } = await sb
          .from("aulas_licoes")
          .select("data,periodo,parte,professora_id,licao,nivel_no_momento,praticado")
          .eq("aluno_id", data.aluno_id)
          .range(inicio, fim);
        return { data: rows as RegistroLicaoHist[] | null, error };
      }),
      sb.from("professoras").select("id,nome"),
    ]);

    const aluno = alunoRes.data as Aluno | null;
    if (!aluno) return null;

    const professoras = (profRes.data ?? []) as { id: string; nome: string }[];
    const nomeProf = new Map(professoras.map((p) => [p.id, p.nome]));

    const porChave = new Map<string, HistoricoItem>();
    for (const p of presencas) {
      const chave = chaveDe(p);
      porChave.set(chave, {
        chave,
        data: p.data,
        periodo: p.periodo,
        parte: p.parte,
        professora_id: p.professora_id,
        professora_nome: nomeProf.get(p.professora_id) ?? "?",
        presenca: p.status,
        notas: null,
        licao: null,
        nivel_no_momento: null,
        praticado: null,
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
          parte: n.parte,
          professora_id: n.professora_id,
          professora_nome: nomeProf.get(n.professora_id) ?? "?",
          presenca: null,
          notas: notasValores,
          licao: null,
          nivel_no_momento: null,
          praticado: null,
          observacao: null,
        });
      }
    }
    for (const l of licoes) {
      const chave = chaveDe(l);
      const existente = porChave.get(chave);
      if (existente) {
        existente.licao = l.licao;
        existente.nivel_no_momento = l.nivel_no_momento;
        existente.praticado = l.praticado;
      } else {
        porChave.set(chave, {
          chave,
          data: l.data,
          periodo: l.periodo,
          parte: l.parte,
          professora_id: l.professora_id,
          professora_nome: nomeProf.get(l.professora_id) ?? "?",
          presenca: null,
          notas: null,
          licao: l.licao,
          nivel_no_momento: l.nivel_no_momento,
          praticado: l.praticado,
          observacao: null,
        });
      }
    }

    const timeline = [...porChave.values()].sort(porDataDesc);

    const mesAtual = toISODate(new Date()).slice(0, 7);
    const aulasNoMes = timeline.filter((t) => t.data.startsWith(mesAtual)).length;
    const totalPresencas = presencas.filter((p) => p.status === "presente").length;
    const totalFaltas = presencas.filter((p) => p.status === "falta").length;

    // Sequência de faltas seguidas conta por dia (parte 1), pra um dia inteiro de
    // aula online faltada não valer como 2 faltas seguidas.
    const presencasOrdenadas = [...presencas.filter((p) => p.parte === 1)].sort(porDataDesc);
    let sequenciaFaltas = 0;
    for (const p of presencasOrdenadas) {
      if (p.status === "falta") sequenciaFaltas++;
      else break;
    }

    // Aulas realizadas desde que o aluno começou o livro/nível atual — usa a data
    // manual se tiver, senão infere pela 1ª lição registrada neste nível.
    const licoesAscendente = [...licoes].sort((a, b) => a.data.localeCompare(b.data));
    const dataInicioNivel =
      aluno.data_inicio_nivel ?? dataInicioInferida(aluno.nivel, licoesAscendente);
    // Presença sozinha não sabe o nível (só a lição carrega isso) — se essa
    // aula tem lição lançada de outro nível (ex.: livro anterior, antes da
    // troca), não conta aqui mesmo caindo dentro da faixa de datas.
    const nivelPorChave = new Map(licoes.map((l) => [chaveDe(l), l.nivel_no_momento]));
    const aulasNoLivroAtual = presencas.filter((p) => {
      if (p.status !== "presente") return false;
      if (dataInicioNivel && p.data < dataInicioNivel) return false;
      const nivelDaAula = nivelPorChave.get(chaveDe(p));
      return nivelDaAula === undefined || nivelDaAula === aluno.nivel;
    }).length;

    return {
      aluno,
      timeline,
      resumo: {
        aulasNoMes,
        aulasNoLivroAtual,
        dataInicioNivel,
        presencas: totalPresencas,
        faltas: totalFaltas,
        sequenciaFaltas,
      },
    };
  });
