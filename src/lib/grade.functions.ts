import { createServerFn } from "@tanstack/react-start";
import type {
  Aluno,
  BlocoEspecial,
  CelulaAula,
  ExcecaoSemana,
  GradeBaseRow,
  GradeSemana,
  Professora,
  TipoAula,
  TipoBloco,
} from "./types";
import { datasDaSemana, parseISODate, diaSemanaISO } from "./date-utils";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function celulaFromBase(row: GradeBaseRow, alunosById: Map<string, Aluno>): CelulaAula | null {
  if (!row.aluno_id) return null;
  const a = alunosById.get(row.aluno_id);
  return {
    id: row.id,
    origem: "base",
    grade_base_id: row.id,
    excecao_id: null,
    dia_semana: row.dia_semana,
    periodo: row.periodo,
    professora_id: row.professora_id,
    aluno_id: row.aluno_id,
    aluno_nome: a?.nome ?? "?",
    aluno_nivel: a?.nivel ?? "",
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

    const [profRes, alunosRes, baseRes, blocosRes, excRes] = await Promise.all([
      sb.from("professoras").select("*").order("ordem"),
      sb.from("alunos").select("*").order("nome"),
      sb.from("grade_base").select("*"),
      sb.from("blocos_especiais").select("*"),
      sb.from("excecoes_semana").select("*").gte("data", datas[0]).lte("data", dataFim),
    ]);

    const professoras = (profRes.data ?? []) as Professora[];
    const alunos = (alunosRes.data ?? []) as Aluno[];
    const base = (baseRes.data ?? []) as GradeBaseRow[];
    const blocos = (blocosRes.data ?? []) as BlocoEspecial[];
    const excecoes = (excRes.data ?? []) as ExcecaoSemana[];

    const alunosById = new Map(alunos.map((a) => [a.id, a]));

    const celulasPorData: Record<string, CelulaAula[]> = {};
    for (const iso of datas) {
      const dow = diaSemanaISO(iso);
      const excsDoDia = excecoes.filter((e) => e.data === iso);
      const removidos = new Set(
        excsDoDia.filter((e) => e.tipo_excecao === "remover" && e.grade_base_id).map((e) => e.grade_base_id!),
      );
      const movidos = new Map(
        excsDoDia.filter((e) => e.tipo_excecao === "mover" && e.grade_base_id).map((e) => [e.grade_base_id!, e]),
      );

      const doDia: CelulaAula[] = [];
      for (const row of base.filter((b) => b.dia_semana === dow)) {
        if (removidos.has(row.id)) continue;
        if (movidos.has(row.id)) {
          const m = movidos.get(row.id)!;
          const alunoId = m.aluno_id ?? row.aluno_id;
          const a = alunoId ? alunosById.get(alunoId) : undefined;
          doDia.push({
            id: `mov-${m.id}`,
            origem: "excecao",
            grade_base_id: row.id,
            excecao_id: m.id,
            dia_semana: m.dia_semana ?? row.dia_semana,
            periodo: m.periodo ?? row.periodo,
            professora_id: m.professora_id ?? row.professora_id,
            aluno_id: alunoId,
            aluno_nome: a?.nome ?? "?",
            aluno_nivel: a?.nivel ?? "",
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
        if (!e.aluno_id || !e.professora_id || !e.periodo) continue;
        const a = alunosById.get(e.aluno_id);
        doDia.push({
          id: `add-${e.id}`,
          origem: "excecao",
          grade_base_id: null,
          excecao_id: e.id,
          dia_semana: e.dia_semana ?? dow,
          periodo: e.periodo,
          professora_id: e.professora_id,
          aluno_id: e.aluno_id,
          aluno_nome: a?.nome ?? "?",
          aluno_nivel: a?.nivel ?? "",
          tipo: (e.tipo ?? "regular") as TipoAula,
          horario_especifico: e.horario_especifico,
          observacao: e.observacao,
        });
      }

      celulasPorData[iso] = doDia;
    }

    const celulas = Object.values(celulasPorData).flat();
    return { professoras, alunos, celulas, celulasPorData, blocos, datasSemana: datas };
  });

// ============ Mutações ============

type EscopoEdicao = "base" | "semana";

export const adicionarAluno = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      escopo: EscopoEdicao;
      data: string; // iso yyyy-mm-dd
      dia_semana: number;
      periodo: number;
      professora_id: string;
      aluno_id: string;
      tipo?: TipoAula;
      horario_especifico?: string | null;
      observacao?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdminUnlocked();
    const sb = await admin();
    if (data.escopo === "base") {
      const { error } = await sb.from("grade_base").insert({
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id,
        tipo: data.tipo ?? "regular",
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
        aluno_id: data.aluno_id,
        tipo: data.tipo ?? "regular",
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
      celulaId: string;
      origem: "base" | "excecao";
      grade_base_id: string | null;
      excecao_id: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdminUnlocked();
    const sb = await admin();
    if (data.origem === "excecao" && data.excecao_id) {
      // Apagar a exceção de "adicionar" ou "mover"
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

export const atualizarCelula = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      escopo: EscopoEdicao;
      data: string;
      dia_semana: number;
      periodo: number;
      professora_id: string;
      origem: "base" | "excecao";
      grade_base_id: string | null;
      excecao_id: string | null;
      aluno_id: string;
      tipo: TipoAula;
      horario_especifico: string | null;
      observacao: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdminUnlocked();
    const sb = await admin();
    const patch = {
      tipo: data.tipo,
      horario_especifico: data.horario_especifico,
      observacao: data.observacao,
      aluno_id: data.aluno_id,
    };

    if (data.origem === "excecao" && data.excecao_id) {
      const { error } = await sb.from("excecoes_semana").update(patch).eq("id", data.excecao_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.escopo === "base") {
      if (!data.grade_base_id) throw new Error("grade_base_id ausente");
      const { error } = await sb.from("grade_base").update(patch).eq("id", data.grade_base_id);
      if (error) throw new Error(error.message);
    } else {
      if (!data.grade_base_id) throw new Error("grade_base_id ausente");
      // Cria exceção "mover" para essa semana
      const { error } = await sb.from("excecoes_semana").insert({
        data: data.data,
        tipo_excecao: "mover",
        grade_base_id: data.grade_base_id,
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        aluno_id: data.aluno_id,
        tipo: data.tipo,
        horario_especifico: data.horario_especifico,
        observacao: data.observacao,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ================ Blocos especiais =================

export const upsertBloco = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      dia_semana: number;
      periodo: number;
      professora_id: string;
      tipo: TipoBloco;
      titulo: string;
      aluno_nome_destaque?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdminUnlocked();
    const sb = await admin();
    if (data.id) {
      const { error } = await sb
        .from("blocos_especiais")
        .update({
          tipo: data.tipo,
          titulo: data.titulo,
          aluno_nome_destaque: data.aluno_nome_destaque ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("blocos_especiais").insert({
        dia_semana: data.dia_semana,
        periodo: data.periodo,
        professora_id: data.professora_id,
        tipo: data.tipo,
        titulo: data.titulo,
        aluno_nome_destaque: data.aluno_nome_destaque ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removerBloco = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("blocos_especiais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
