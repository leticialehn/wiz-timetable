import { createServerFn } from "@tanstack/react-start";
import type { ExcecaoSemana, GradeBaseRow, Professora, TipoAula } from "./types";
import { diaSemanaISO, parseISODate, toISODate } from "./date-utils";

async function publicClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type SupabaseLike = Awaited<ReturnType<typeof publicClient>>;

const TIPOS_AULA: TipoAula[] = ["regular", "online", "vip", "reforco", "conversacao"];

type AulaAgregada = {
  data: string;
  periodo: number;
  professora_id: string;
  tipo: TipoAula;
  alunoChave: string;
};

// Datas do intervalo (inclusivo), pulando domingo (não há aulas na grade).
function diasNoIntervalo(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  const atual = parseISODate(inicio);
  const limite = parseISODate(fim);
  while (atual.getTime() <= limite.getTime()) {
    if (atual.getDay() !== 0) datas.push(toISODate(atual));
    atual.setDate(atual.getDate() + 1);
  }
  return datas;
}

// Reconstitui as aulas (base + exceções da semana) para cada dia do intervalo,
// seguindo a mesma lógica de grade_base/excecoes_semana usada em getGradeSemana.
async function computarAulasNoPeriodo(
  sb: SupabaseLike,
  dataInicio: string,
  dataFim: string,
): Promise<AulaAgregada[]> {
  const [baseRes, excRes] = await Promise.all([
    sb.from("grade_base").select("*"),
    sb.from("excecoes_semana").select("*").gte("data", dataInicio).lte("data", dataFim),
  ]);
  const base = (baseRes.data ?? []) as GradeBaseRow[];
  const excecoes = (excRes.data ?? []) as ExcecaoSemana[];

  const aulas: AulaAgregada[] = [];
  for (const iso of diasNoIntervalo(dataInicio, dataFim)) {
    const dow = diaSemanaISO(iso);
    const excsDoDia = excecoes.filter((e) => e.data === iso);
    const removidos = new Set(
      excsDoDia
        .filter((e) => e.tipo_excecao === "remover" && e.grade_base_id)
        .map((e) => e.grade_base_id!),
    );
    const movidos = new Map(
      excsDoDia
        .filter((e) => e.tipo_excecao === "mover" && e.grade_base_id)
        .map((e) => [e.grade_base_id!, e]),
    );

    for (const row of base.filter((b) => b.dia_semana === dow)) {
      if (removidos.has(row.id)) continue;
      if (movidos.has(row.id)) {
        const m = movidos.get(row.id)!;
        const alunoId = m.aluno_id ?? row.aluno_id;
        const alunoNomeAvulso = m.aluno_nome_avulso ?? row.aluno_nome_avulso;
        if (!alunoId && !alunoNomeAvulso) continue;
        aulas.push({
          data: iso,
          periodo: m.periodo ?? row.periodo,
          professora_id: m.professora_id ?? row.professora_id,
          tipo: (m.tipo ?? row.tipo) as TipoAula,
          alunoChave: alunoId ?? `avulso:${alunoNomeAvulso}`,
        });
        continue;
      }
      if (!row.aluno_id && !row.aluno_nome_avulso) continue;
      aulas.push({
        data: iso,
        periodo: row.periodo,
        professora_id: row.professora_id,
        tipo: row.tipo,
        alunoChave: row.aluno_id ?? `avulso:${row.aluno_nome_avulso}`,
      });
    }

    for (const e of excsDoDia.filter((x) => x.tipo_excecao === "adicionar")) {
      if (!e.professora_id || !e.periodo) continue;
      if (!e.aluno_id && !e.aluno_nome_avulso) continue;
      aulas.push({
        data: iso,
        periodo: e.periodo,
        professora_id: e.professora_id,
        tipo: (e.tipo ?? "regular") as TipoAula,
        alunoChave: e.aluno_id ?? `avulso:${e.aluno_nome_avulso}`,
      });
    }
  }
  return aulas;
}

export type CargaProfessora = {
  professora_id: string;
  professora_nome: string;
  professora_cor: string;
  aulas: number;
  alunosDistintos: number;
  porTipo: Record<TipoAula, number>;
};

export const getCargaProfessoras = createServerFn({ method: "GET" })
  .inputValidator((data: { dataInicio: string; dataFim: string }) => data)
  .handler(async ({ data }): Promise<CargaProfessora[]> => {
    const sb = await publicClient();
    const profRes = await sb.from("professoras").select("*").order("ordem");
    const professoras = (profRes.data ?? []) as Professora[];
    const aulas = await computarAulasNoPeriodo(sb, data.dataInicio, data.dataFim);

    const porProfessora = new Map<string, AulaAgregada[]>();
    for (const a of aulas) {
      if (!porProfessora.has(a.professora_id)) porProfessora.set(a.professora_id, []);
      porProfessora.get(a.professora_id)!.push(a);
    }

    return professoras.map((p) => {
      const linhas = porProfessora.get(p.id) ?? [];
      const sessoes = new Map<string, AulaAgregada>();
      const alunosSet = new Set<string>();
      for (const l of linhas) {
        const chaveSessao = `${l.data}-${l.periodo}`;
        if (!sessoes.has(chaveSessao)) sessoes.set(chaveSessao, l);
        alunosSet.add(l.alunoChave);
      }
      const porTipo = Object.fromEntries(TIPOS_AULA.map((t) => [t, 0])) as Record<TipoAula, number>;
      for (const s of sessoes.values()) porTipo[s.tipo]++;

      return {
        professora_id: p.id,
        professora_nome: p.nome,
        professora_cor: p.cor,
        aulas: sessoes.size,
        alunosDistintos: alunosSet.size,
        porTipo,
      };
    });
  });
