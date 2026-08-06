import { createFileRoute, Link } from "@tanstack/react-router";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { HistoricoEditavel } from "@/components/HistoricoEditavel";

export const Route = createFileRoute("/professora_/aluno/$id")({
  component: HistoricoAlunoProfessoraPage,
  head: () => ({ meta: [{ title: "Histórico do aluno" }] }),
});

function HistoricoAlunoProfessoraPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();

  return (
    <main className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-4">
      <Link to="/professora" className="text-sm text-muted-foreground underline mb-4 inline-block">
        ← Voltar
      </Link>
      <HistoricoEditavel alunoId={id} />
    </main>
  );
}
