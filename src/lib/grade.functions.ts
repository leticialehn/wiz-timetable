import { createServerFn } from "@tanstack/react-start";
import type {
  Aluno,
  CelulaAula,
  ExcecaoSemana,
  GradeBaseRow,
  GradeSemana,
  HorarioConfig,
  Professora,
  TipoAula,
  TipoHorario,
} from "./types";
import { CAPACIDADE, TIPO_FECHADO } from "./types";
import {
  datasDaSemana,
  parseISODate,
  diaSemanaISO,
  segundaDaSemana,
  toISODate,
} from "./date-utils";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function publicClient() {
  // Uses service role to bypass RLS; all callers are gated by auth server-side.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function nomeDoAluno(
  row: { aluno_id: string | null; aluno_nome_avulso: string | null },
  alunosById: Map<string, Aluno>,
) {
  if (row.aluno_id) {
    const a = alunosById.get(row.aluno_id);
    return { nome: a?.nome ?? "?", nivel: a?.nivel ?? "", avulso: false };
  }
  return { nome: row.aluno_nome_avulso ?? "?", nivel: "", avulso: true };
}

function celulaFromBase(row: GradeBaseRow, alunosById: Map<string, Aluno>): CelulaAula | null {
  if (!row.aluno_id && !row.aluno_nome_avulso) return null;
  const info = nomeDoAluno(row, alunosById);
  return {
    id: row.id,
    origem: "base",
    grade_base_id: row.id,
    excecao_id: null,
    dia_semana: row.dia_semana,
    periodo: row.periodo,
    professora_id: row.professora_id,
    aluno_id: row.aluno_id,
    aluno_nome: info.nome,
    aluno_nivel: info.nivel,
    aluno_avulso: info.avulso,
    tipo: row.tipo,
    horario_especifico: row.horario_especifico,
    observacao: row.observacao,
  };
}

export const getGradeSemana = createServerFn({ method: "GET" })
  .inputValidator((data: { dataSegunda: string }) => data)
  .handler(async ({ data }): Promise<GradeSemana> => {
    const sb = await publicClient();
    const datas = datasDaSemana(parseISODate(data.dataSegunda));
    const dataFim = datas[datas.length - 1];

    const [profRes, alunosRes, baseRes, cfgRes, excRes] = await Promise.all([
      sb.from("professoras").select("*").order("ordem"),
      sb.from("alunos").select("*").order("nome"),
      sb.from("grade_base").select("*"),
      sb.from("horarios_config").select("*"),
      sb.from("excecoes_semana").select("*").gte("data", datas[0]).lte("data", dataFim),
    ]);

    const professoras = (profRes.data ?? []) as Professora[];
    const alunos = (alunosRes.data ?? []) as Aluno[];
    const base = (baseRes.data ?? []) as GradeBaseRow[];
    const horariosConfig = (cfgRes.data ?? []) as HorarioConfig[];
    const excecoes = (excRes.data ?? []) as ExcecaoSemana[];

    const alunosById = new Map(alunos.map((a) => [a.id, a]));

    const celulasPorData: Record<string, CelulaAula[]> = {};
    for (const iso of datas) {
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

      const doDia: CelulaAula[] = [];
      for (const row of base.filter((b) => b.dia_semana === dow)) {
        if (removidos.has(row.id)) continue;
        if (movidos.has(row.id)) {
          const m = movidos.get(row.id)!;
          const info = nomeDoAluno(
            {
              aluno_id: m.aluno_id ?? row.aluno_id,
              aluno_nome_avulso: m.aluno_nome_avulso ?? row.aluno_nome_avulso,
            },
            alunosById,
          );
          doDia.push({
            id: `mov-${m.id}`,
            origem: "excecao",
            grade_base_id: row.id,
            excecao_id: m.id,
            dia_semana: m.dia_semana ?? row.dia_semana,
            periodo: m.periodo ?? row.periodo,
            professora_id: m.professora_id ?? row.professora_id,
            aluno_id: m.aluno_id ?? row.aluno_id,
            aluno_nome: info.nome,
            aluno_nivel: info.nivel,
            aluno_avulso: info.avulso,
            tipo: (m.tipo ?? row.tipo) as TipoAula,
            horario_especifico: m.horario_especifico ?? row.horario_especifico,
            observacao: m.observacao ?? row.observacao,
          });
          continue;
        }
        const c = celulaFromBase(row, alunosById);
        if (c) doDia.push(c);
      }

      for (const e of excsDoDia.filter((x) => x.tipo_excecao === "adicionar")) {
        if (!e.professora_id || !e.periodo) continue;
        if (!e.aluno_id && !e.aluno_nome_avulso) continue;
        const info = nomeDoAluno(
          { aluno_id: e.aluno_id, aluno_nome_avulso: e.aluno_nome_avulso },
          alunosById,
        );
        doDia.push({
          id: `add-${e.id}`,
          origem: "excecao",
          grade_base_id: null,
          excecao_id: e.id,
          dia_semana: e.dia_semana ?? dow,
          periodo: e.periodo,
          professora_id: e.professora_id,
          aluno_id: e.aluno_id,
          aluno_nome: info.nome,
          aluno_nivel: info.nivel,
          aluno_avulso: info.avulso,
          tipo: (e.tipo ?? "regular") as TipoAula,
          horario_especifico: e.horario_especifico,
          observacao: e.observacao,
        });
      }

      celulasPorData[iso] = doDia;
    }

    const celulas = Object.values(celulasPorData).flat();
    return { professoras, alunos, celulas, celulasPorData, horariosConfig, datasSemana: datas };
  });

// ============ Configuração de tipo de horário (por célula) ============

export const setHorarioConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      dia_semana: number;
      periodo: number;
      professora_id: string;
      tipo: TipoHorario;
      tema?: string | null;
      vagas_fechadas?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("horarios_config").upsert(
      {
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        tipo: data.tipo,
        tema: data.tema ?? null,
        vagas_fechadas: data.vagas_fechadas ?? 0,
      },
      { onConflict: "dia_semana,periodo,professora_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerHorarioConfig = createServerFn({ method: "POST" })
  .inputValidator((data: { dia_semana: number; periodo: number; professora_id: string }) => data)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("horarios_config")
      .delete()
      .eq("dia_semana", data.dia_semana)
      .eq("periodo", data.periodo)
      .eq("professora_id", data.professora_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Mutações de alunos ============

type EscopoEdicao = "base" | "semana";

export const adicionarAluno = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      escopo: EscopoEdicao;
      data: string;
      dia_semana: number;
      periodo: number;
      professora_id: string;
      aluno_id?: string | null;
      aluno_nome_avulso?: string | null;
      tipo?: TipoAula;
      horario_especifico?: string | null;
      observacao?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();

    if (!data.aluno_id && !data.aluno_nome_avulso) {
      throw new Error("Informe um aluno ou o nome do aluno avulso.");
    }

    // Descobre tipo do horário e valida capacidade
    const { data: cfgRow } = await sb
      .from("horarios_config")
      .select("*")
      .eq("dia_semana", data.dia_semana)
      .eq("periodo", data.periodo)
      .eq("professora_id", data.professora_id)
      .maybeSingle();
    const tipoHorario: TipoHorario = (cfgRow?.tipo as TipoHorario) ?? "regular";

    if (TIPO_FECHADO[tipoHorario]) {
      throw new Error("Este horário está fechado (break / preparação).");
    }
    if (tipoHorario !== "reforco" && data.aluno_nome_avulso && !data.aluno_id) {
      throw new Error("Aluno avulso só é permitido em horário de Reforço.");
    }

    const dataSegunda = toISODate(segundaDaSemana(parseISODate(data.data)));
    const grade = await getGradeSemana({ data: { dataSegunda } });
    const ocupadas = (grade.celulasPorData[data.data] ?? []).filter(
      (c) => c.professora_id === data.professora_id && c.periodo === data.periodo,
    ).length;
    const cap = Math.max(CAPACIDADE[tipoHorario] - (cfgRow?.vagas_fechadas ?? 0), 0);
    if (ocupadas >= cap) {
      throw new Error(`Capacidade máxima atingida (${cap} para ${tipoHorario}).`);
    }

    const tipoAula = (
      tipoHorario === "break" || tipoHorario === "preparacao_homework" ? "regular" : tipoHorario
    ) as TipoAula;

    if (data.escopo === "base") {
      const { error } = await sb.from("grade_base").insert({
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id ?? null,
        aluno_nome_avulso: data.aluno_nome_avulso ?? null,
        tipo: tipoAula,
        horario_especifico: data.horario_especifico ?? null,
        observacao: data.observacao ?? null,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("excecoes_semana").insert({
        data: data.data,
        tipo_excecao: "adicionar",
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id ?? null,
        aluno_nome_avulso: data.aluno_nome_avulso ?? null,
        tipo: tipoAula,
        horario_especifico: data.horario_especifico ?? null,
        observacao: data.observacao ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removerCelula = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      escopo: EscopoEdicao;
      data: string;
      origem: "base" | "excecao";
      grade_base_id: string | null;
      excecao_id: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    if (data.origem === "excecao" && data.excecao_id) {
      const { error } = await sb.from("excecoes_semana").delete().eq("id", data.excecao_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (data.escopo === "base") {
      if (!data.grade_base_id) throw new Error("grade_base_id ausente");
      const { error } = await sb.from("grade_base").delete().eq("id", data.grade_base_id);
      if (error) throw new Error(error.message);
    } else {
      if (!data.grade_base_id) throw new Error("grade_base_id ausente");
      const { error } = await sb.from("excecoes_semana").insert({
        data: data.data,
        tipo_excecao: "remover",
        grade_base_id: data.grade_base_id,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ Trancar/destrancar vaga individual (permanente, até destrancar) ============

export const alternarVagaFechada = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { dia_semana: number; periodo: number; professora_id: string; fechar: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: cfgRow } = await sb
      .from("horarios_config")
      .select("tipo, tema, vagas_fechadas")
      .eq("dia_semana", data.dia_semana)
      .eq("periodo", data.periodo)
      .eq("professora_id", data.professora_id)
      .maybeSingle();
    const atual = cfgRow?.vagas_fechadas ?? 0;
    const novoValor = data.fechar ? atual + 1 : Math.max(atual - 1, 0);
    const { error } = await sb.from("horarios_config").upsert(
      {
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        tipo: cfgRow?.tipo ?? "regular",
        tema: cfgRow?.tema ?? null,
        vagas_fechadas: novoValor,
      },
      { onConflict: "dia_semana,periodo,professora_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
