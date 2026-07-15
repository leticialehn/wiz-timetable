import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getHistoricoAluno, type HistoricoItem } from "@/lib/historico.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR } from "@/lib/date-utils";
import { HORARIO_INICIO_PERIODO } from "@/lib/types";

export const Route = createFileRoute("/professora_/aluno/$id")({
  component: HistoricoAlunoProfessoraPage,
  head: () => ({ meta: [{ title: "Histórico do aluno" }] }),
});

function resumoDoItem(item: HistoricoItem): string {
  if (item.presenca === "falta") return "Faltou";
  if (item.licao) return item.notas ? `${item.licao} + notas` : item.licao;
  if (item.notas) return "Notas lançadas";
  if (item.presenca === "presente") return "Presente";
  return "Sem lançamento";
}

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
          <h1 className="text-xl font-bold mb-1">{data.aluno.nome}</h1>
          <p className="text-sm text-muted-foreground mb-4">Nível {data.aluno.nivel}</p>

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
            <ul className="space-y-1">
              {data.timeline.map((item) => (
                <li
                  key={item.chave}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="font-semibold">{formatarDataBR(item.data)}</span>
                    {" — "}
                    {HORARIO_INICIO_PERIODO[item.periodo] ?? item.periodo}
                    {item.parte === 2 && " (2ª aula)"}
                  </span>
                  <span
                    className={
                      item.presenca === "falta" ? "text-rose-600 font-medium" : "text-foreground"
                    }
                  >
                    {resumoDoItem(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
