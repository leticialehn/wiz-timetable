import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { BoletimAluno } from "@/components/BoletimAluno";
import { HistoricoEditavel } from "@/components/HistoricoEditavel";
import { BuscaAluno } from "@/components/BuscaAluno";

export const Route = createFileRoute("/admin/relatorios_/aluno")({ component: RelatorioAlunoPage });

function RelatorioAlunoPage() {
  useRealtimeGrade();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "relatorio-aluno"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  const [alunoId, setAlunoId] = useState<string | null>(null);
  const alunos = (data?.alunos ?? []).filter((a) => a.ativo);
  const alunoSelecionado = alunos.find((a) => a.id === alunoId);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 print:max-w-full print:px-8">
      <Link
        to="/admin/relatorios"
        className="print:hidden text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="print:hidden text-2xl font-semibold mb-4">Boletim e histórico do aluno</h1>

      <BuscaAluno alunos={alunos} selecionado={alunoSelecionado} onSelecionar={setAlunoId} />

      {alunoSelecionado && (
        <>
          <BoletimAluno alunoId={alunoSelecionado.id} professoras={data?.professoras ?? []} />
          <div className="print:hidden mt-10 pt-8 border-t border-border">
            <HistoricoEditavel alunoId={alunoSelecionado.id} />
          </div>
        </>
      )}
    </main>
  );
}
