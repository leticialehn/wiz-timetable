import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getHistoricoAluno } from "@/lib/historico.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR } from "@/lib/date-utils";
import { HORARIO_INICIO_PERIODO, CAMPOS_NOTA } from "@/lib/types";

export const Route = createFileRoute("/professora_/aluno/$id")({
  component: HistoricoAlunoProfessoraPage,
  head: () => ({ meta: [{ title: "Histórico do aluno" }] }),
});

function HistoricoAlunoProfessoraPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();
  const getFn = useServerFn(getHistoricoAluno);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", id],
    queryFn: () => getFn({ data: { aluno_id: id } }),
  });

  return (
    <main className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-4">
      <Link to="/professora" className="text-sm text-muted-foreground underline mb-4 inline-block">
        ← Voltar
      </Link>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}

      {!isLoading && !data && (
        <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>
      )}

      {data && (
        <>
          <h1 className="text-xl font-bold mb-1">
            {data.aluno.nome} - {data.aluno.nivel}
          </h1>
          <p className="text-[10px] text-muted-foreground mb-4">
            O - Ótimo &nbsp; MB - Muito Bom &nbsp; B - Bom &nbsp; R - Regular
          </p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.presencas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Presenças</div>
            </div>
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.faltas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Faltas</div>
            </div>
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.sequenciaFaltas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Faltas seguidas</div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Histórico de aulas</h2>
          {data.timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Data</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Hora</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Lição</th>
                    {CAMPOS_NOTA.map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((item) => {
                    const periodoExibido = item.parte === 2 ? item.periodo + 1 : item.periodo;
                    return (
                      <tr key={item.chave} className="border-t border-border">
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {formatarDataBR(item.data)}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {HORARIO_INICIO_PERIODO[periodoExibido] ?? periodoExibido}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {item.presenca === "falta" ? (
                            <span className="text-rose-600 font-medium">Faltou</span>
                          ) : (
                            (item.licao ?? "—")
                          )}
                        </td>
                        {CAMPOS_NOTA.map(({ key }) => (
                          <td key={key} className="px-2 py-1.5">
                            {item.notas?.[key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
