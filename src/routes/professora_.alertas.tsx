import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { AlertasLista } from "@/components/AlertasLista";

export const Route = createFileRoute("/professora_/alertas")({
  component: AlertasProfessoraPage,
  head: () => ({ meta: [{ title: "Alertas" }] }),
});

const STORAGE_KEY = "escola:professora-id";

function AlertasProfessoraPage() {
  const [professoraId, setProfessoraId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProfessoraId(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
  }, []);

  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana-prof", toISODate(segundaDaSemana())],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  if (!mounted) return null;

  const professora = data?.professoras.find((p) => p.id === professoraId);

  if (!professora || !professora.coordenadora) {
    return (
      <main className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-4">
        <Link
          to="/professora"
          className="text-sm text-muted-foreground underline mb-4 inline-block"
        >
          ← Voltar
        </Link>
        <p className="text-muted-foreground text-sm">Essa página é só para coordenação.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-4">
      <Link to="/professora" className="text-sm text-muted-foreground underline mb-4 inline-block">
        ← Voltar
      </Link>
      <h1 className="text-xl font-bold mb-4">Alertas</h1>
      <AlertasLista resolvidoPor={professora.nome} />
    </main>
  );
}
