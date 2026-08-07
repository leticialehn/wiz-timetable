import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getHistoricoAluno } from "@/lib/historico.functions";
import { formatarDataBR, toISODate } from "@/lib/date-utils";

export function DeclaracaoAluno({ alunoId }: { alunoId: string }) {
  const getFn = useServerFn(getHistoricoAluno);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", alunoId],
    queryFn: () => getFn({ data: { aluno_id: alunoId } }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>;

  const { aluno, resumo } = data;
  const hojeBR = formatarDataBR(toISODate(new Date()));
  const totalAulas = resumo.presencas + resumo.faltas;
  const frequenciaPct = totalAulas > 0 ? Math.round((resumo.presencas / totalAulas) * 100) : null;

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

      <div className="flex items-start gap-3 mb-10">
        <img src="/wizard-logo.jpg" alt="Wizard" style={{ height: "18mm" }} />
      </div>

      <h1 className="text-xl font-semibold text-center mb-10 uppercase tracking-wide">
        Declaração de Matrícula e Frequência
      </h1>

      <p className="text-sm leading-relaxed mb-6">
        Declaramos, para os devidos fins, que <strong>{aluno.nome}</strong> está regularmente
        matriculado(a) e frequentando as aulas de inglês na Wizard, atualmente no nível{" "}
        <strong>{aluno.nivel}</strong>
        {resumo.dataInicioNivel
          ? `, iniciado em ${formatarDataBR(resumo.dataInicioNivel)}.`
          : "."}
      </p>

      {frequenciaPct !== null && (
        <p className="text-sm leading-relaxed mb-10">
          Nos registros de presença desta escola, o(a) aluno(a) teve frequência de{" "}
          <strong>{frequenciaPct}%</strong> ({resumo.presencas} de {totalAulas} aulas registradas).
        </p>
      )}

      <p className="text-sm mb-16">Por ser verdade, firmamos a presente declaração.</p>

      <p className="text-sm mb-16">Emitida em {hojeBR}.</p>

      <div className="max-w-xs mx-auto text-center">
        <div className="border-t border-foreground pt-1 text-sm">Wizard</div>
      </div>
    </>
  );
}
