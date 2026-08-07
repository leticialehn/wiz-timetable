import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getHistoricoAluno } from "@/lib/historico.functions";
import { formatarDataBR, toISODate } from "@/lib/date-utils";
import { CAMPOS_NOTA } from "@/lib/types";

const REGEX_REVISAO = /^R(\d+)$/;

function numeroRevisao(licao: string | null): number | null {
  if (!licao) return null;
  const m = REGEX_REVISAO.exec(licao);
  return m ? parseInt(m[1], 10) : null;
}

function ResumoCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{valor}</div>
    </div>
  );
}

// Boletim pra mandar pros pais: só as notas das revisões (não cada lição), sem
// nenhum dado de faltas/comportamento — foco em progresso no livro.
export function BoletimAluno({ alunoId }: { alunoId: string }) {
  const getFn = useServerFn(getHistoricoAluno);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", alunoId],
    queryFn: () => getFn({ data: { aluno_id: alunoId } }),
  });

  const revisoes = useMemo(
    () =>
      (data?.timeline ?? [])
        .filter((item) => numeroRevisao(item.licao) !== null)
        .sort((a, b) => numeroRevisao(a.licao)! - numeroRevisao(b.licao)!),
    [data],
  );

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>;

  const { aluno, resumo } = data;
  const hojeBR = formatarDataBR(toISODate(new Date()));

  return (
    <>
      <div className="print:hidden flex justify-end mb-4">
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

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm">
        <ResumoCard label="Aulas no mês" valor={resumo.aulasNoMes} />
        <ResumoCard label="Aulas totais" valor={resumo.aulasNoLivroAtual} />
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
    </>
  );
}
