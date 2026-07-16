import { createServerFn } from "@tanstack/react-start";
import type { Aluno, ConceitoNota, StatusPresenca } from "./types";
import { parseISODate, toISODate } from "./date-utils";
import { dataInicioInferida, mesesDeAtraso, posicoesAlemDaR8 } from "./licoes";
import { buscarTodasAsLinhas } from "./supabase-paginacao.server";

async function publicClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type RegistroPresenca = { aluno_id: string; data: string; periodo: number; status: StatusPresenca };

// Conta faltas seguidas a partir do registro mais recente (lista já ordenada, mais recente
// primeiro). Só "falta" conta e continua a sequência — "presente" e "falta_avisada" (aluno
// avisou que não vinha) encerram a contagem, já que não são motivo de alerta.
function calcularSequenciaFaltas(registros: RegistroPresenca[]): number {
  let streak = 0;
  for (const r of registros) {
    if (r.status === "falta") streak++;
    else break;
  }
  return streak;
}

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
    const [alunosRes, licoes, profRes] = await Promise.all([
      sb.from("alunos").select("*").eq("ativo", true),
      buscarTodasAsLinhas<RegistroLicao>(async (inicio, fim) => {
        const { data, error } = await sb
          .from("aulas_licoes")
          .select("aluno_id,data,periodo,parte,licao,nivel_no_momento,praticado,professora_id")
          .order("data", { ascending: false })
          .order("periodo", { ascending: false })
          .order("parte", { ascending: false })
          .range(inicio, fim);
        return { data: data as RegistroLicao[] | null, error };
      }),
      sb.from("professoras").select("id,nome"),
    ]);

    const alunos = (alunosRes.data ?? []) as Aluno[];
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

// ============ Alertas com fluxo de ação (faltas seguidas / nota baixa em Fala) ============
// Diferente do alerta de lição pendente acima (que qualquer professora vê), estes só
// aparecem numa aba própria pra Wizard e coordenação — as demais professoras não veem.

export type TipoAlerta = "faltas" | "nota_fala" | "sem_aula" | "rematricula" | "atrasado";

export type AlertaAtivo = {
  id: string;
  aluno_id: string;
  nome: string;
  nivel: string;
  tipo: TipoAlerta;
  contagem: number;
  status: "pendente" | "resolvido";
  resolvido_por: string | null;
  resolvido_em: string | null;
  contactado_por: string | null;
  contactado_em: string | null;
  created_at: string;
};

type AlertaStatusRow = {
  id: string;
  aluno_id: string;
  tipo: string;
  status: string;
  contagem: number;
  nivel: string | null;
  resolvido_por: string | null;
  resolvido_em: string | null;
  contactado_por: string | null;
  contactado_em: string | null;
  created_at: string;
  updated_at: string;
};

type RegistroNota = {
  aluno_id: string;
  data: string;
  periodo: number;
  parte: number;
  fala: ConceitoNota | null;
};

// Conta quantas das últimas vezes que Fala foi avaliada deram B ou pior (R), andando do
// mais recente pro mais antigo. Pula lançamentos sem Fala avaliada (não quebra a sequência).
function calcularSequenciaNotaFalaRuim(registros: RegistroNota[]): number {
  let streak = 0;
  for (const r of registros) {
    if (r.fala === null) continue;
    if (r.fala === "B" || r.fala === "R") streak++;
    else break;
  }
  return streak;
}

const LIMIAR_ALERTA: Record<TipoAlerta, number> = {
  faltas: 2,
  nota_fala: 4,
  sem_aula: 14,
  rematricula: 0,
  atrasado: 1,
};

function paraAlertaAtivo(row: AlertaStatusRow, aluno: Aluno): AlertaAtivo {
  return {
    id: row.id,
    aluno_id: aluno.id,
    nome: aluno.nome,
    nivel: aluno.nivel,
    tipo: row.tipo as TipoAlerta,
    contagem: row.contagem,
    status: row.status as "pendente" | "resolvido",
    resolvido_por: row.resolvido_por,
    resolvido_em: row.resolvido_em,
    contactado_por: row.contactado_por,
    contactado_em: row.contactado_em,
    created_at: row.created_at,
  };
}

type RegistroLicaoAlerta = {
  aluno_id: string;
  data: string;
  licao: string;
  nivel_no_momento: string;
  praticado: boolean;
};

export const getAlertasAtivos = createServerFn({ method: "GET" }).handler(
  async (): Promise<AlertaAtivo[]> => {
    const sb = await publicClient();
    const hojeIso = toISODate(new Date());
    const [alunosRes, presencas, notas, statusRes, baseRes, excFuturasRes, licoesTodas] =
      await Promise.all([
        sb.from("alunos").select("*").eq("ativo", true),
        buscarTodasAsLinhas<RegistroPresenca>(async (inicio, fim) => {
          const { data, error } = await sb
            .from("aulas_presenca")
            .select("aluno_id,data,periodo,status")
            .eq("parte", 1)
            .order("data", { ascending: false })
            .order("periodo", { ascending: false })
            .range(inicio, fim);
          return { data: data as RegistroPresenca[] | null, error };
        }),
        buscarTodasAsLinhas<RegistroNota>(async (inicio, fim) => {
          const { data, error } = await sb
            .from("aulas_notas")
            .select("aluno_id,data,periodo,parte,fala")
            .order("data", { ascending: false })
            .order("periodo", { ascending: false })
            .order("parte", { ascending: false })
            .range(inicio, fim);
          return { data: data as RegistroNota[] | null, error };
        }),
        sb.from("alertas_status").select("*"),
        sb.from("grade_base").select("id,aluno_id"),
        sb
          .from("excecoes_semana")
          .select("id,data,tipo_excecao,aluno_id,grade_base_id")
          .gte("data", hojeIso)
          .in("tipo_excecao", ["adicionar", "mover"]),
        buscarTodasAsLinhas<RegistroLicaoAlerta>(async (inicio, fim) => {
          const { data, error } = await sb
            .from("aulas_licoes")
            .select("aluno_id,data,periodo,parte,licao,nivel_no_momento,praticado")
            .order("data", { ascending: false })
            .order("periodo", { ascending: false })
            .order("parte", { ascending: false })
            .range(inicio, fim);
          return { data: data as RegistroLicaoAlerta[] | null, error };
        }),
      ]);

    const alunos = (alunosRes.data ?? []) as (Aluno & { created_at: string })[];
    const statusExistente = (statusRes.data ?? []) as AlertaStatusRow[];
    const baseRows = (baseRes.data ?? []) as { id: string; aluno_id: string | null }[];
    const excFuturas = (excFuturasRes.data ?? []) as {
      data: string;
      tipo_excecao: string;
      aluno_id: string | null;
      grade_base_id: string | null;
    }[];
    const licoesPorAluno = new Map<string, RegistroLicaoAlerta[]>();
    for (const l of licoesTodas) {
      if (!licoesPorAluno.has(l.aluno_id)) licoesPorAluno.set(l.aluno_id, []);
      licoesPorAluno.get(l.aluno_id)!.push(l);
    }

    const presPorAluno = new Map<string, RegistroPresenca[]>();
    for (const r of presencas) {
      if (!presPorAluno.has(r.aluno_id)) presPorAluno.set(r.aluno_id, []);
      presPorAluno.get(r.aluno_id)!.push(r);
    }
    const notasPorAluno = new Map<string, RegistroNota[]>();
    for (const n of notas) {
      if (!notasPorAluno.has(n.aluno_id)) notasPorAluno.set(n.aluno_id, []);
      notasPorAluno.get(n.aluno_id)!.push(n);
    }

    // Aluno "tem aula agendada" se aparece hoje/no futuro num horário fixo (grade_base)
    // ou numa exceção que o adiciona/move — daí não conta dias sem aula.
    const alunoIdPorGradeBaseId = new Map(baseRows.map((r) => [r.id, r.aluno_id]));
    const alunoIdsComAulaAgendada = new Set<string>();
    for (const r of baseRows) {
      if (r.aluno_id) alunoIdsComAulaAgendada.add(r.aluno_id);
    }
    for (const e of excFuturas) {
      const alunoId =
        e.aluno_id ?? (e.grade_base_id ? alunoIdPorGradeBaseId.get(e.grade_base_id) : null);
      if (alunoId) alunoIdsComAulaAgendada.add(alunoId);
    }

    // Dias desde a última aula de fato (presença registrada) — ou, se nunca teve
    // nenhuma, desde o cadastro. Zero se o aluno tem aula marcada hoje ou no futuro.
    function diasSemAula(aluno: Aluno & { created_at: string }): number {
      if (alunoIdsComAulaAgendada.has(aluno.id)) return 0;
      const ultimaAula = presPorAluno.get(aluno.id)?.[0]?.data ?? aluno.created_at.slice(0, 10);
      return Math.round(
        (parseISODate(hojeIso).getTime() - parseISODate(ultimaAula).getTime()) / 86400000,
      );
    }

    // Última linha de status por (aluno, tipo) — pode ter mais de um episódio no histórico.
    const statusPorChave = new Map<string, AlertaStatusRow>();
    for (const s of statusExistente) {
      const chave = `${s.aluno_id}-${s.tipo}`;
      const atual = statusPorChave.get(chave);
      if (!atual || s.created_at > atual.created_at) statusPorChave.set(chave, s);
    }

    const atualizacoes: PromiseLike<unknown>[] = [];
    const resultado: AlertaAtivo[] = [];

    function sincronizar(aluno: Aluno, tipo: TipoAlerta, contagemAtual: number) {
      const chave = `${aluno.id}-${tipo}`;
      const existente = statusPorChave.get(chave);

      if (contagemAtual < LIMIAR_ALERTA[tipo]) {
        if (existente?.status === "pendente") {
          // Situação corrigida antes de alguém ter agido (ex.: falta virou
          // "avisou que não vem", ou dado foi corrigido) — não precisava de
          // contato, então some sozinho em vez de ficar pendente pra sempre.
          atualizacoes.push(sb.from("alertas_status").delete().eq("id", existente.id));
          return;
        }
        // Já resolvido: mantém no histórico como está — não mexe.
        if (existente) resultado.push(paraAlertaAtivo(existente, aluno));
        return;
      }

      if (!existente) {
        atualizacoes.push(
          sb
            .from("alertas_status")
            .insert({ aluno_id: aluno.id, tipo, status: "pendente", contagem: contagemAtual })
            .select()
            .single()
            .then(({ data }) => {
              if (data) resultado.push(paraAlertaAtivo(data as AlertaStatusRow, aluno));
            }),
        );
        return;
      }

      if (existente.status === "pendente") {
        if (contagemAtual !== existente.contagem) {
          atualizacoes.push(
            sb.from("alertas_status").update({ contagem: contagemAtual }).eq("id", existente.id),
          );
        }
        resultado.push(paraAlertaAtivo({ ...existente, contagem: contagemAtual }, aluno));
        return;
      }

      // Já resolvido: só reabre se a situação piorou desde a resolução.
      if (contagemAtual > existente.contagem) {
        const reaberto = {
          ...existente,
          status: "pendente",
          contagem: contagemAtual,
          resolvido_por: null,
          resolvido_em: null,
        };
        atualizacoes.push(
          sb
            .from("alertas_status")
            .update({
              status: "pendente",
              contagem: contagemAtual,
              resolvido_por: null,
              resolvido_em: null,
            })
            .eq("id", existente.id),
        );
        resultado.push(paraAlertaAtivo(reaberto, aluno));
      } else {
        resultado.push(paraAlertaAtivo(existente, aluno));
      }
    }

    // Rematrícula (R8) tem um episódio por NÍVEL, não só por aluno — trocar de
    // nível é um livro novo, então uma pendência de rematrícula de um nível
    // anterior nunca é mexida por engano (fica intacta até ser resolvida à
    // parte). Diferente do sincronizar genérico acima, aqui uma pendência
    // nunca some sozinha — só quando "Rematriculado" for clicado de fato,
    // já que às vezes o aluno diz que "vai pensar" e não queremos esquecer.
    const statusRematriculaPorAluno = new Map<string, AlertaStatusRow>();
    for (const s of statusExistente) {
      if (s.tipo !== "rematricula") continue;
      const atual = statusRematriculaPorAluno.get(s.aluno_id);
      if (!atual || s.created_at > atual.created_at) statusRematriculaPorAluno.set(s.aluno_id, s);
    }

    function sincronizarRematricula(aluno: Aluno, posicoesAlem: number | null) {
      const existente = statusRematriculaPorAluno.get(aluno.id);

      if (posicoesAlem === null) {
        if (existente) resultado.push(paraAlertaAtivo(existente, aluno));
        return;
      }

      if (existente && existente.nivel === aluno.nivel) {
        if (existente.status === "pendente") {
          if (posicoesAlem !== existente.contagem) {
            atualizacoes.push(
              sb.from("alertas_status").update({ contagem: posicoesAlem }).eq("id", existente.id),
            );
          }
          resultado.push(paraAlertaAtivo({ ...existente, contagem: posicoesAlem }, aluno));
        } else {
          // Já rematriculado neste mesmo nível — não reabre mesmo que ele
          // continue avançando (R9, R10…): a decisão já foi tomada.
          resultado.push(paraAlertaAtivo(existente, aluno));
        }
        return;
      }

      // Primeira vez chegando na R8 neste nível (ou o episódio salvo é de um
      // nível anterior já superado) — abre um novo episódio.
      atualizacoes.push(
        sb
          .from("alertas_status")
          .insert({
            aluno_id: aluno.id,
            tipo: "rematricula",
            status: "pendente",
            contagem: posicoesAlem,
            nivel: aluno.nivel,
          })
          .select()
          .single()
          .then(({ data }) => {
            if (data) resultado.push(paraAlertaAtivo(data as AlertaStatusRow, aluno));
          }),
      );
    }

    for (const aluno of alunos) {
      sincronizar(aluno, "faltas", calcularSequenciaFaltas(presPorAluno.get(aluno.id) ?? []));
      sincronizar(
        aluno,
        "nota_fala",
        calcularSequenciaNotaFalaRuim(notasPorAluno.get(aluno.id) ?? []),
      );
      sincronizar(aluno, "sem_aula", diasSemAula(aluno));

      const historicoLicao = licoesPorAluno.get(aluno.id) ?? [];
      sincronizarRematricula(aluno, posicoesAlemDaR8(aluno.nivel, historicoLicao));

      const dataInicio =
        aluno.data_inicio_nivel ?? dataInicioInferida(aluno.nivel, [...historicoLicao].reverse());
      const atraso = mesesDeAtraso(aluno.nivel, dataInicio, hojeIso, historicoLicao);
      sincronizar(aluno, "atrasado", atraso !== null ? Math.round(atraso) : -1);
    }

    await Promise.all(atualizacoes);

    resultado.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
      if (a.status === "pendente") return b.contagem - a.contagem;
      return (b.resolvido_em ?? "").localeCompare(a.resolvido_em ?? "");
    });
    return resultado;
  },
);

export const resolverAlerta = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; resolvido_por: string }) => data)
  .handler(async ({ data }) => {
    const sb = await publicClient();
    const { error } = await sb
      .from("alertas_status")
      .update({
        status: "resolvido",
        resolvido_por: data.resolvido_por,
        resolvido_em: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Etapa intermediária do fluxo de rematrícula: já conversamos com o aluno,
// mas ele ainda não deu uma resposta — continua "pendente" até alguém marcar
// "Rematriculado" de fato (resolverAlerta), pra não esquecer de cobrar.
export const marcarContactado = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; contactado_por: string }) => data)
  .handler(async ({ data }) => {
    const sb = await publicClient();
    const { error } = await sb
      .from("alertas_status")
      .update({
        contactado_por: data.contactado_por,
        contactado_em: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
