import { createServerFn } from "@tanstack/react-start";
import type { Aluno, ExcecaoSemana, GradeBaseRow, Professora, TipoAula } from "./types";
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

export type FrequenciaAluno = {
  aluno_id: string;
  nome: string;
  nivel: string;
  aulas: number;
  faltas: number;
  faltasAvisadas: number;
};

// Faltas por aluno num período (mês/semana) — só conta a parte 1 de cada dia,
// pra um dia inteiro de aula online faltada não valer como 2 faltas. Só
// devolve quem teve alguma falta (sem aviso) no período, ordenado das mais
// faltas pras menos — é isso que interessa pra decisão de retenção.
export const getFrequenciaAlunos = createServerFn({ method: "GET" })
  .inputValidator((data: { dataInicio: string; dataFim: string }) => data)
  .handler(async ({ data }): Promise<FrequenciaAluno[]> => {
    const sb = await publicClient();
    const [alunosRes, presRes] = await Promise.all([
      sb.from("alunos").select("id,nome,nivel").eq("ativo", true),
      sb
        .from("aulas_presenca")
        .select("aluno_id,status")
        .eq("parte", 1)
        .gte("data", data.dataInicio)
        .lte("data", data.dataFim),
    ]);
    const alunos = (alunosRes.data ?? []) as { id: string; nome: string; nivel: string }[];
    const presencas = (presRes.data ?? []) as { aluno_id: string; status: string }[];
    const nomeENivel = new Map(alunos.map((a) => [a.id, a]));

    const porAluno = new Map<string, { aulas: number; faltas: number; faltasAvisadas: number }>();
    for (const p of presencas) {
      if (!nomeENivel.has(p.aluno_id)) continue;
      if (!porAluno.has(p.aluno_id)) porAluno.set(p.aluno_id, { aulas: 0, faltas: 0, faltasAvisadas: 0 });
      const contagem = porAluno.get(p.aluno_id)!;
      contagem.aulas++;
      if (p.status === "falta") contagem.faltas++;
      if (p.status === "falta_avisada") contagem.faltasAvisadas++;
    }

    return [...porAluno.entries()]
      .filter(([, c]) => c.faltas > 0)
      .map(([aluno_id, c]) => {
        const aluno = nomeENivel.get(aluno_id)!;
        return { aluno_id, nome: aluno.nome, nivel: aluno.nivel, ...c };
      })
      .sort((a, b) => b.faltas - a.faltas || a.nome.localeCompare(b.nome));
  });

export type Aniversariante = { aluno_id: string; nome: string; nivel: string; mes: number; dia: number };

// Todos os alunos ativos com data de nascimento cadastrada, ordenados por
// mês e dia (não por nome) — a lista de aniversariantes do ano ou de um mês
// específico é sempre um recorte/agrupamento desta mesma lista já ordenada.
export const getAniversariantes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Aniversariante[]> => {
    const sb = await publicClient();
    const { data } = await sb
      .from("alunos")
      .select("id,nome,nivel,data_nascimento")
      .eq("ativo", true);
    const alunos = (data ?? []) as Aluno[];

    return alunos
      .filter((a) => a.data_nascimento)
      .map((a) => {
        const d = parseISODate(a.data_nascimento!);
        return { aluno_id: a.id, nome: a.nome, nivel: a.nivel, mes: d.getMonth(), dia: d.getDate() };
      })
      .sort((a, b) => a.mes - b.mes || a.dia - b.dia);
  },
);
