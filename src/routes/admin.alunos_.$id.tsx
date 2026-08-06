import { createFileRoute, Link } from "@tanstack/react-router";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { BoletimAluno } from "@/components/BoletimAluno";

export const Route = createFileRoute("/admin/alunos_/$id")({ component: HistoricoAlunoPage });

function HistoricoAlunoPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 print:max-w-full print:px-8">
      <Link
        to="/admin/alunos"
        className="print:hidden text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Alunos
      </Link>
      <BoletimAluno alunoId={id} />
    </main>
  );
}
