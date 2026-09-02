import { createFileRoute, Link } from "@tanstack/react-router";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { HistoricoEditavel } from "@/components/HistoricoEditavel";

export const Route = createFileRoute("/admin/alunos_/$id_/historico")({
  component: HistoricoAlunoAdminPage,
});

function HistoricoAlunoAdminPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <Link
        to="/admin/alunos"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Alunos
      </Link>
      <HistoricoEditavel alunoId={id} />
    </main>
  );
}
