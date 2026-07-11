import { createServerFn } from "@tanstack/react-start";
import type { Aluno, StatusPresenca } from "./types";

async function publicClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type AlunoEmAlerta = {
  aluno_id: string;
  nome: string;
  nivel: string;
  faltas_seguidas: number;
  ultima_presenca: string | null;
};

type RegistroPresenca = { aluno_id: string; data: string; periodo: number; status: StatusPresenca };

// Conta faltas seguidas a partir do registro mais recente (lista já ordenada, mais recente primeiro).
function calcularSequenciaFaltas(registros: RegistroPresenca[]): number {
  let streak = 0;
  for (const r of registros) {
    if (r.status === "falta") streak++;
    else break;
  }
  return streak;
}

export const getAlertasFaltas = createServerFn({ method: "GET" }).handler(
  async (): Promise<AlunoEmAlerta[]> => {
    await (await import("./auth.server")).requireRole(["secretaria", "coordenador"]);
    const sb = await publicClient();
    const [alunosRes, presRes] = await Promise.all([
      sb.from("alunos").select("*").eq("ativo", true),
      sb
        .from("aulas_presenca")
        .select("aluno_id,data,periodo,status")
        .order("data", { ascending: false })
        .order("periodo", { ascending: false }),
    ]);

    const alunos = (alunosRes.data ?? []) as Aluno[];
    const registros = (presRes.data ?? []) as RegistroPresenca[];

    const porAluno = new Map<string, RegistroPresenca[]>();
    for (const r of registros) {
      if (!porAluno.has(r.aluno_id)) porAluno.set(r.aluno_id, []);
      porAluno.get(r.aluno_id)!.push(r);
    }

    const alertas: AlunoEmAlerta[] = [];
    for (const aluno of alunos) {
      const regs = porAluno.get(aluno.id);
      if (!regs || regs.length === 0) continue;
      const faltas_seguidas = calcularSequenciaFaltas(regs);
      if (faltas_seguidas < 2) continue;
      const ultima_presenca = regs.find((r) => r.status === "presente")?.data ?? null;
      alertas.push({
        aluno_id: aluno.id,
        nome: aluno.nome,
        nivel: aluno.nivel,
        faltas_seguidas,
        ultima_presenca,
      });
    }

    alertas.sort((a, b) => b.faltas_seguidas - a.faltas_seguidas || a.nome.localeCompare(b.nome));
    return alertas;
  },
);
