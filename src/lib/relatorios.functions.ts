import { createServerFn } from "@tanstack/react-start";
import type { Aluno, ExcecaoSemana, GradeBaseRow, Professora, TipoAula } from "./types";
import { DIAS_SEMANA } from "./types";
import { diaSemanaISO, formatarDataBR, parseISODate, toISODate } from "./date-utils";
import { normalizarNomeParaComparacao } from "./utils";

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
      if (!porAluno.has(p.aluno_id))
        porAluno.set(p.aluno_id, { aulas: 0, faltas: 0, faltasAvisadas: 0 });
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

export type Aniversariante = {
  aluno_id: string;
  nome: string;
  nivel: string;
  mes: number;
  dia: number;
};

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
        return {
          aluno_id: a.id,
          nome: a.nome,
          nivel: a.nivel,
          mes: d.getMonth(),
          dia: d.getDate(),
        };
      })
      .sort((a, b) => a.mes - b.mes || a.dia - b.dia);
  },
);

export type OcorrenciaLead = {
  // null = horário fixo recorrente (veio de grade_base, não tem uma data específica).
  data: string | null;
  dia_semana: number;
  tipo: TipoAula;
  professora_nome: string;
};

export type Lead = {
  nome: string;
  ocorrencias: OcorrenciaLead[];
  ultimaData: string | null;
};

// Nomes avulsos (aula marcada só com o nome, sem virar cadastro de aluno) —
// pra achar quem fez uma aula experimental e nunca chegou a matricular. No
// relatório isso aparece como "Lead", não como aluno.
// Agrupa por nome sem acento/maiúsculas ([[normalizarNomeParaComparacao]]),
// então "Joao" e "João" caem na mesma pessoa — a grafia exibida é a mais usada
// entre as variações digitadas (empate: a mais recente).
export const getLeads = createServerFn({ method: "GET" }).handler(async (): Promise<Lead[]> => {
  const sb = await publicClient();
  const [baseRes, excRes, profRes] = await Promise.all([
    sb
      .from("grade_base")
      .select("dia_semana,periodo,professora_id,tipo,aluno_nome_avulso")
      .not("aluno_nome_avulso", "is", null),
    sb
      .from("excecoes_semana")
      .select("data,dia_semana,periodo,professora_id,tipo,tipo_excecao,aluno_nome_avulso")
      .not("aluno_nome_avulso", "is", null)
      .neq("tipo_excecao", "remover"),
    sb.from("professoras").select("id,nome"),
  ]);
  const professoras = (profRes.data ?? []) as { id: string; nome: string }[];
  const nomeProf = new Map(professoras.map((p) => [p.id, p.nome]));

  type Grupo = {
    ocorrencias: OcorrenciaLead[];
    variantes: Map<string, { contagem: number; ultimaData: string | null }>;
  };
  const porChave = new Map<string, Grupo>();
  function add(nomeDigitado: string, oc: OcorrenciaLead) {
    const chave = normalizarNomeParaComparacao(nomeDigitado);
    if (!porChave.has(chave)) porChave.set(chave, { ocorrencias: [], variantes: new Map() });
    const grupo = porChave.get(chave)!;
    grupo.ocorrencias.push(oc);
    const variante = grupo.variantes.get(nomeDigitado) ?? { contagem: 0, ultimaData: null };
    variante.contagem++;
    if (oc.data && (!variante.ultimaData || oc.data > variante.ultimaData)) {
      variante.ultimaData = oc.data;
    }
    grupo.variantes.set(nomeDigitado, variante);
  }

  for (const row of (baseRes.data ?? []) as GradeBaseRow[]) {
    if (!row.aluno_nome_avulso) continue;
    add(row.aluno_nome_avulso, {
      data: null,
      dia_semana: row.dia_semana,
      tipo: row.tipo,
      professora_nome: nomeProf.get(row.professora_id) ?? "?",
    });
  }
  for (const row of (excRes.data ?? []) as ExcecaoSemana[]) {
    if (!row.aluno_nome_avulso || row.dia_semana === null) continue;
    add(row.aluno_nome_avulso, {
      data: row.data,
      dia_semana: row.dia_semana,
      tipo: row.tipo ?? "regular",
      professora_nome: nomeProf.get(row.professora_id ?? "") ?? "?",
    });
  }

  return [...porChave.values()]
    .map(({ ocorrencias, variantes }) => {
      // Grafia mais usada vence; empate desfeito pela mais usada recentemente.
      const nome = [...variantes.entries()].sort(
        ([, a], [, b]) =>
          b.contagem - a.contagem || (b.ultimaData ?? "").localeCompare(a.ultimaData ?? ""),
      )[0][0];
      const datas = ocorrencias
        .map((o) => o.data)
        .filter((d): d is string => d !== null)
        .sort();
      return {
        nome,
        ocorrencias: [...ocorrencias].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
        ultimaData: datas.length > 0 ? datas[datas.length - 1] : null,
      };
    })
    .sort(
      (a, b) =>
        (b.ultimaData ?? "").localeCompare(a.ultimaData ?? "") || a.nome.localeCompare(b.nome),
    );
});

export function rotuloOcorrenciaLead(o: OcorrenciaLead): string {
  const dia = DIAS_SEMANA.find((d) => d.n === o.dia_semana)?.nome ?? `dia ${o.dia_semana}`;
  return o.data ? `${formatarDataBR(o.data)} (${dia})` : `${dia} (horário fixo)`;
}

// "Exp Fulana" — aluno experimental, ainda não é matrícula de verdade. Não
// existe um campo próprio pra isso hoje, só essa convenção no nome.
function ehExperimental(nome: string): boolean {
  return /^exp\s/i.test(nome.trim());
}

export type SituacaoRematricula =
  "rematriculado" | "nao_rematriculado" | "contato_feito" | "sem_contato";

export type RegistroRematriculaPeriodo = {
  aluno_id: string;
  nome: string;
  nivel: string;
  entrouEm: string;
  situacao: SituacaoRematricula;
  resolvidoEm: string | null;
  motivo: string | null;
};

export type RelatorioMatriculas = {
  alunosMatriculados: number;
  novasMatriculas: { aluno_id: string; nome: string; nivel: string; data: string }[];
  aRematricular: RegistroRematriculaPeriodo[];
  rematriculados: RegistroRematriculaPeriodo[];
};

function situacaoRematricula(row: {
  status: string;
  motivo: string | null;
  contactado_em: string | null;
}): SituacaoRematricula {
  if (row.status === "resolvido") return row.motivo ? "nao_rematriculado" : "rematriculado";
  return row.contactado_em ? "contato_feito" : "sem_contato";
}

export const ROTULO_SITUACAO_REMATRICULA: Record<SituacaoRematricula, string> = {
  rematriculado: "Rematriculado",
  nao_rematriculado: "Não rematriculado",
  contato_feito: "Contato feito, aguardando decisão",
  sem_contato: "Ainda sem contato",
};

// Relatório pra franqueadora: matriculados hoje (sem os "Exp", que são só
// experimentais), novas matrículas cadastradas no período, e o fluxo de
// rematrícula do período — tanto quem ENTROU na fase de rematrícula quanto
// quem de fato REMATRICULOU, cada um contado pela sua própria data (entrada
// vs. resolução), então um aluno pode aparecer nas duas listas ou só numa.
export const getRelatorioMatriculas = createServerFn({ method: "GET" })
  .inputValidator((data: { dataInicio: string; dataFim: string }) => data)
  .handler(async ({ data }): Promise<RelatorioMatriculas> => {
    const sb = await publicClient();
    const [alunosRes, rematriculasRes] = await Promise.all([
      sb.from("alunos").select("id,nome,nivel,ativo,situacao,created_at"),
      sb.from("alertas_status").select("*").eq("tipo", "rematricula"),
    ]);
    const alunos = (alunosRes.data ?? []) as (Aluno & { created_at: string })[];
    const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
    const rematriculas = (rematriculasRes.data ?? []) as {
      id: string;
      aluno_id: string;
      nivel: string | null;
      status: string;
      created_at: string;
      resolvido_em: string | null;
      contactado_em: string | null;
      motivo: string | null;
    }[];

    const alunosMatriculados = alunos.filter(
      (a) => a.ativo && a.situacao === "matriculado" && !ehExperimental(a.nome),
    ).length;

    const novasMatriculas = alunos
      .filter((a) => !ehExperimental(a.nome))
      .map((a) => ({ aluno: a, data: a.created_at.slice(0, 10) }))
      .filter((x) => x.data >= data.dataInicio && x.data <= data.dataFim)
      .map((x) => ({
        aluno_id: x.aluno.id,
        nome: x.aluno.nome,
        nivel: x.aluno.nivel,
        data: x.data,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    function paraRegistro(r: (typeof rematriculas)[number]): RegistroRematriculaPeriodo | null {
      const aluno = alunoPorId.get(r.aluno_id);
      if (!aluno) return null;
      return {
        aluno_id: r.aluno_id,
        nome: aluno.nome,
        nivel: r.nivel ?? aluno.nivel,
        entrouEm: r.created_at.slice(0, 10),
        situacao: situacaoRematricula(r),
        resolvidoEm: r.resolvido_em ? r.resolvido_em.slice(0, 10) : null,
        motivo: r.motivo,
      };
    }

    const aRematricular = rematriculas
      .filter((r) => {
        const d = r.created_at.slice(0, 10);
        return d >= data.dataInicio && d <= data.dataFim;
      })
      .map(paraRegistro)
      .filter((x): x is RegistroRematriculaPeriodo => x !== null)
      .sort((a, b) => a.entrouEm.localeCompare(b.entrouEm));

    const rematriculados = rematriculas
      .filter((r) => {
        if (r.status !== "resolvido" || r.motivo || !r.resolvido_em) return false;
        const d = r.resolvido_em.slice(0, 10);
        return d >= data.dataInicio && d <= data.dataFim;
      })
      .map(paraRegistro)
      .filter((x): x is RegistroRematriculaPeriodo => x !== null)
      .sort((a, b) => (a.resolvidoEm ?? "").localeCompare(b.resolvidoEm ?? ""));

    return { alunosMatriculados, novasMatriculas, aRematricular, rematriculados };
  });
