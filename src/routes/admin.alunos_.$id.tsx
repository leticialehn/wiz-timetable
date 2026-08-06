import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getHistoricoAluno } from "@/lib/historico.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR, toISODate } from "@/lib/date-utils";
import { CAMPOS_NOTA, CONCEITOS, type CampoNota, type ConceitoNota } from "@/lib/types";

const REGEX_REVISAO = /^R(\d+)$/;

function numeroRevisao(licao: string | null): number | null {
  if (!licao) return null;
  const m = REGEX_REVISAO.exec(licao);
  return m ? parseInt(m[1], 10) : null;
}

export const Route = createFileRoute("/admin/alunos_/$id")({ component: HistoricoAlunoPage });

function HistoricoAlunoPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();
  const getFn = useServerFn(getHistoricoAluno);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", id],
    queryFn: () => getFn({ data: { aluno_id: id } }),
  });

  const revisoes = useMemo(
    () =>
      (data?.timeline ?? [])
        .filter((item) => numeroRevisao(item.licao) !== null)
        .sort((a, b) => numeroRevisao(a.licao)! - numeroRevisao(b.licao)!),
    [data],
  );

  const distribuicaoRevisoes = useMemo(() => {
    const dist = Object.fromEntries(
      CAMPOS_NOTA.map(({ key }) => [key, Object.fromEntries(CONCEITOS.map((c) => [c, 0]))]),
    ) as Record<CampoNota, Record<ConceitoNota, number>>;
    for (const r of revisoes) {
      if (!r.notas) continue;
      for (const { key } of CAMPOS_NOTA) {
        const v = r.notas[key];
        if (v) dist[key][v]++;
      }
    }
    return dist;
  }, [revisoes]);

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

  const { aluno, resumo } = data;
  const hojeBR = formatarDataBR(toISODate(new Date()));

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 print:max-w-full print:px-8">
      <div className="print:hidden flex items-center justify-between mb-4">
        <Link to="/admin/alunos" className="text-sm text-muted-foreground underline">
          ← Voltar a Alunos
        </Link>
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent bg-card"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="hidden print:flex items-center gap-3 mb-6">
        <img src="/wizard-logo.jpg" alt="Wizard" style={{ height: "16mm" }} />
        <div>
          <div className="text-lg font-semibold">Boletim do aluno</div>
          <div className="text-xs text-muted-foreground">Emitido em {hojeBR}</div>
        </div>
      </div>

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
          Distribuição de conceitos por habilidade (revisões)
        </h2>
        <div className="space-y-2">
          {CAMPOS_NOTA.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="w-20 text-muted-foreground">{label}</span>
              <div className="flex gap-2">
                {CONCEITOS.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded bg-muted text-xs font-medium">
                    {c}: {distribuicaoRevisoes[key][c]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Notas das revisões</h2>
      {revisoes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma revisão registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-medium">Revisão</th>
                <th className="py-2 pr-3 font-medium">Data</th>
                {CAMPOS_NOTA.map(({ key, label }) => (
                  <th key={key} className="py-2 pr-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revisoes.map((r) => (
                <tr key={r.chave} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-semibold">{r.licao}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{formatarDataBR(r.data)}</td>
                  {CAMPOS_NOTA.map(({ key }) => (
                    <td key={key} className="py-2 pr-3">
                      {r.notas?.[key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media print {
          @page { margin: 12mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
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
