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
    const sb = await publicClient();
    const [alunosRes, presRes] = await Promise.all([
      sb.from("alunos").select("*").eq("ativo", true),
      sb
        .from("aulas_presenca")
        // Alunos online lançam 2 partes por horário — usamos só a parte 1 aqui pra
        // cada dia contar como 1 falta (e não 2) na sequência de faltas seguidas.
        .select("aluno_id,data,periodo,status")
        .eq("parte", 1)
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

export type AlunoLicaoPendente = {
  aluno_id: string;
  nome: string;
  nivel: string;
  licao: string;
  data: string;
  professora_nome: string;
};

type RegistroLicao = {
  aluno_id: string;
  data: string;
  periodo: number;
  parte: number;
  licao: string;
  nivel_no_momento: string;
  praticado: boolean;
  professora_id: string;
};

// Aluno que só fez o estudo individual (praticado=false) fica "pendente" pra
// qualquer professora, em qualquer dia, até alguém lançar uma lição nova nele
// marcando praticado — o que naturalmente vira o registro mais recente e some
// com o alerta.
export const getAlertasLicaoPendente = createServerFn({ method: "GET" }).handler(
  async (): Promise<AlunoLicaoPendente[]> => {
    const sb = await publicClient();
    const [alunosRes, licoesRes, profRes] = await Promise.all([
      sb.from("alunos").select("*").eq("ativo", true),
      sb
        .from("aulas_licoes")
        .select("aluno_id,data,periodo,parte,licao,nivel_no_momento,praticado,professora_id")
        .order("data", { ascending: false })
        .order("periodo", { ascending: false })
        .order("parte", { ascending: false }),
      sb.from("professoras").select("id,nome"),
    ]);

    const alunos = (alunosRes.data ?? []) as Aluno[];
    const licoes = (licoesRes.data ?? []) as RegistroLicao[];
    const professoras = (profRes.data ?? []) as { id: string; nome: string }[];
    const nomeProf = new Map(professoras.map((p) => [p.id, p.nome]));

    const maisRecentePorAluno = new Map<string, RegistroLicao>();
    for (const l of licoes) {
      if (!maisRecentePorAluno.has(l.aluno_id)) maisRecentePorAluno.set(l.aluno_id, l);
    }

    const pendentes: AlunoLicaoPendente[] = [];
    for (const aluno of alunos) {
      const ultima = maisRecentePorAluno.get(aluno.id);
      // Só conta se o nível não mudou desde então — mudança de nível já reinicia
      // a trilha, então uma pendência do nível anterior deixa de fazer sentido.
      if (!ultima || ultima.praticado || ultima.nivel_no_momento !== aluno.nivel) continue;
      pendentes.push({
        aluno_id: aluno.id,
        nome: aluno.nome,
        nivel: aluno.nivel,
        licao: ultima.licao,
        data: ultima.data,
        professora_nome: nomeProf.get(ultima.professora_id) ?? "?",
      });
    }

    pendentes.sort((a, b) => a.nome.localeCompare(b.nome));
    return pendentes;
  },
);
