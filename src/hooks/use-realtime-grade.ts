import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeGrade() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("grade-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "professoras" }, () =>
        qc.invalidateQueries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "alunos" }, () =>
        qc.invalidateQueries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "grade_base" }, () =>
        qc.invalidateQueries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "blocos_especiais" }, () =>
        qc.invalidateQueries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "excecoes_semana" }, () =>
        qc.invalidateQueries(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
