import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABELAS = [
  "professoras",
  "alunos",
  "grade_base",
  "horarios_config",
  "excecoes_semana",
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
