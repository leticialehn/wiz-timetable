import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { BoletimAluno } from "@/components/BoletimAluno";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/alunos_/$id")({ component: HistoricoAlunoPage });

function HistoricoAlunoPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "boletim-aluno-page"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 print:max-w-full print:px-8">
      <Link
        to="/admin/alunos"
        className="print:hidden text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Alunos
      </Link>
      <BoletimAluno alunoId={id} professoras={data?.professoras ?? []} />
    </main>
  );
}
