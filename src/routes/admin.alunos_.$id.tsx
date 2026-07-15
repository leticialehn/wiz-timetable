import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getHistoricoAluno } from "@/lib/historico.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR } from "@/lib/date-utils";
import { CAMPOS_NOTA, CONCEITOS } from "@/lib/types";

export const Route = createFileRoute("/admin/alunos_/$id")({ component: HistoricoAlunoPage });

function HistoricoAlunoPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();
  const getFn = useServerFn(getHistoricoAluno);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", id],
    queryFn: () => getFn({ data: { aluno_id: id } }),
  });

  if (isLoading) {
    return <main className="max-w-3xl mx-auto px-4 py-6 text-muted-foreground">Carregando…</main>;
  }

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-muted-foreground mb-3">Aluno não encontrado.</p>
        <Link to="/admin/alunos" className="text-sm underline">
          ← Voltar a Alunos
        </Link>
      </main>
    );
  }

  const { aluno, timeline, resumo } = data;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/alunos"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Alunos
      </Link>
      <h1 className="text-2xl font-semibold mb-1">{aluno.nome}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Nível {aluno.nivel}
        {!aluno.ativo && " · Inativo"}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ResumoCard label="Aulas no mês" valor={resumo.aulasNoMes} />
        <ResumoCard label="Presenças" valor={resumo.presencas} />
        <ResumoCard label="Faltas" valor={resumo.faltas} />
        <ResumoCard
          label="Sequência atual de faltas"
          valor={resumo.sequenciaFaltas}
          destaque={resumo.sequenciaFaltas >= 2}
        />
      </div>

      <div className="rounded-lg border border-border p-4 mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Distribuição de conceitos por habilidade
        </h2>
        <div className="space-y-2">
          {CAMPOS_NOTA.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="w-20 text-muted-foreground">{label}</span>
              <div className="flex gap-2">
                {CONCEITOS.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded bg-muted text-xs font-medium">
                    {c}: {resumo.distribuicaoConceitos[key][c]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Linha do tempo</h2>
      {timeline.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum registro encontrado.</p>
      ) : (
        <ol className="space-y-3">
          {timeline.map((item) => (
            <li key={item.chave} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-medium">
                  {formatarDataBR(item.data)} · Período {item.periodo} · {item.professora_nome}
                  {item.parte === 2 && " · 2ª aula"}
                </div>
                {item.presenca && (
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      item.presenca === "presente"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {item.presenca}
                  </span>
                )}
              </div>
              {item.notas && (
                <div className="flex gap-2 mt-2 flex-wrap text-xs">
                  {CAMPOS_NOTA.map(
                    ({ key, label }) =>
                      item.notas![key] && (
                        <span key={key} className="px-2 py-0.5 rounded bg-muted font-medium">
                          {label}: {item.notas![key]}
                        </span>
                      ),
                  )}
                </div>
              )}
              {item.observacao && (
                <div className="text-xs text-muted-foreground italic mt-2">{item.observacao}</div>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function ResumoCard({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${destaque ? "border-orange-400 bg-orange-500/10" : "border-border"}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${destaque ? "text-orange-600" : ""}`}>{valor}</div>
    </div>
  );
}
