import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { NIVEIS, ROTULO_GRUPO, grupoDoNivel, type GrupoCalendario } from "@/lib/types";

export const Route = createFileRoute("/admin/relatorios_/niveis")({ component: NiveisPage });

function NiveisPage() {
  useRealtimeGrade();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "relatorio-niveis"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  const alunos = (data?.alunos ?? []).filter((a) => a.ativo);

  const porNivel = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const a of alunos) contagem.set(a.nivel, (contagem.get(a.nivel) ?? 0) + 1);
    return NIVEIS.map((n) => ({ nivel: n, total: contagem.get(n) ?? 0 })).filter((n) => n.total > 0);
  }, [alunos]);

  const porGrupo = useMemo(() => {
    const contagem = new Map<GrupoCalendario, number>();
    for (const a of alunos) {
      const g = grupoDoNivel(a.nivel);
      contagem.set(g, (contagem.get(g) ?? 0) + 1);
    }
    return (["kids", "teens", "adultos"] as const).map((g) => ({ grupo: g, total: contagem.get(g) ?? 0 }));
  }, [alunos]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/relatorios"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="text-2xl font-semibold mb-4">Alunos por nível</h1>

      {!data ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
            {porGrupo.map(({ grupo, total }) => (
              <div key={grupo} className="rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-semibold">{total}</div>
                <div className="text-xs text-muted-foreground">{ROTULO_GRUPO[grupo]}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border max-w-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase">
                  <th className="p-2 text-left">Nível</th>
                  <th className="p-2 text-right">Alunos</th>
                </tr>
              </thead>
              <tbody>
                {porNivel.map(({ nivel, total }) => (
                  <tr key={nivel} className="border-t border-border">
                    <td className="p-2 font-medium">{nivel}</td>
                    <td className="p-2 text-right">{total}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/50 font-semibold">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{alunos.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
