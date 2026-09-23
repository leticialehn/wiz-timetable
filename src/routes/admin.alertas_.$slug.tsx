import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertasLista, ROTULO_TIPO_ALERTA } from "@/components/AlertasLista";
import { TIPO_POR_SLUG } from "@/lib/alertas.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";

export const Route = createFileRoute("/admin/alertas_/$slug")({ component: AlertaTipoPage });

function AlertaTipoPage() {
  useRealtimeGrade();
  const { slug } = Route.useParams();
  const tipo = TIPO_POR_SLUG[slug];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/alertas"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Alertas
      </Link>
      {!tipo ? (
        <p className="text-muted-foreground text-sm">Tipo de alerta desconhecido.</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mb-4">{ROTULO_TIPO_ALERTA[tipo]}</h1>
          <AlertasLista resolvidoPor="Wizard" apenasTipos={[tipo]} mostrarAniversariantes={false} />
        </>
      )}
    </main>
  );
}
