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

export function useRealtimeGrade() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("grade-realtime");
    for (const t of TABELAS) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () =>
        qc.invalidateQueries(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
