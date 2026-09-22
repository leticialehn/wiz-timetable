import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// alunos, aulas_presenca e aulas_notas ficaram de fora (Story 2.2): carregam
// PII de aluno e não têm política pública de leitura, então nunca receberiam
// evento de qualquer forma — decisão registrada em docs/DB-AUDIT.md §3.
const TABELAS = [
  "professoras",
  "grade_base",
  "horarios_config",
  "excecoes_semana",
  "aulas_licoes",
] as const;

// Story 4.1: cada tabela só invalida as queries que de fato leem dela — antes,
// qualquer evento de qualquer uma das 5 tabelas chamava qc.invalidateQueries()
// sem argumento, o que reconsultava TODA query ativa na tela, mesmo as sem
// relação nenhuma com a tabela que mudou (ex.: editar a grade refazia o
// relatório de aniversariantes aberto em outra aba). O mapeamento abaixo foi
// levantado lendo, pra cada um dos 19 call sites de useRealtimeGrade()
// (grep -rln "useRealtimeGrade()" src/routes/), qual server function alimenta
// cada queryKey e quais tabelas essa function de fato consulta — não é um
// chute. queryKey de 1 elemento casa por prefixo no React Query, então
// invalidar ["grade-semana"] também invalida ["grade-semana", dataSegunda]
// etc — mesmo padrão já usado em professora.tsx:925-926.
export const QUERY_KEYS_POR_TABELA: Record<(typeof TABELAS)[number], string[]> = {
  // getGradeSemana (grade.functions.ts) lê professoras/grade_base/
  // horarios_config/excecoes_semana (+ alunos, que não é Realtime aqui).
  // leads/prospectos-comerciais entram aqui também — buscarAvulsosPorTipo
  // (relatorios.functions.ts) consulta "professoras" pra montar o
  // professora_nome de cada ocorrência (achado numa re-verificação
  // independente durante o QA gate desta story — não estava no draft inicial).
  professoras: [
    "grade-semana",
    "grade-semana-prof",
    "carga-professoras",
    "licoes-pendentes",
    "leads",
    "prospectos-comerciais",
  ],
  grade_base: [
    "grade-semana",
    "grade-semana-prof",
    "prospectos-comerciais",
    "leads",
    "carga-professoras",
    "alertas-ativos",
  ],
  horarios_config: ["grade-semana", "grade-semana-prof"],
  excecoes_semana: [
    "grade-semana",
    "grade-semana-prof",
    "prospectos-comerciais",
    "leads",
    "carga-professoras",
    "alertas-ativos",
  ],
  // aulas_licoes: getUltimasLicoesPorAluno, getAlertasLicaoPendente,
  // getLancamentosSemana e getHistoricoLicoes leem essa tabela.
  aulas_licoes: [
    "ultimas-licoes-por-aluno",
    "alertas-ativos",
    "lancamentos-semana",
    "historico-licoes",
    "licoes-pendentes",
  ],
};

export function useRealtimeGrade() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("grade-realtime");
    for (const t of TABELAS) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
        for (const prefix of QUERY_KEYS_POR_TABELA[t]) {
          qc.invalidateQueries({ queryKey: [prefix] });
        }
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
