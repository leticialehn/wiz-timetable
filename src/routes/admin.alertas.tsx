import { createFileRoute } from "@tanstack/react-router";
import { AlertasLista } from "@/components/AlertasLista";

export const Route = createFileRoute("/admin/alertas")({ component: AlertasPage });

function AlertasPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Alertas</h1>
      <AlertasLista resolvidoPor="Wizard" />
    </main>
  );
}
