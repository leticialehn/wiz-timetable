import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAlertasAtivos } from "@/lib/alertas.functions";

export const Route = createFileRoute("/admin")({
  component: AdminShell,
  head: () => ({
    meta: [{ title: "Wizard — Grade de Aulas" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminShell() {
  const alertasFn = useServerFn(getAlertasAtivos);
  const { data: alertas } = useQuery({ queryKey: ["alertas-ativos"], queryFn: () => alertasFn() });
  const pendentes = (alertas ?? []).filter((a) => a.status === "pendente").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link to="/admin" className="font-bold text-lg">
            Wizard
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Grade
            </Link>
            <Link
              to="/admin/professoras"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Professoras
            </Link>
            <Link
              to="/admin/alunos"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Alunos
            </Link>
            <Link
              to="/admin/relatorios"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Relatórios
            </Link>
            <Link
              to="/admin/calendario"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Calendário
            </Link>
            <Link
              to="/admin/alertas"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent flex items-center gap-1"
            >
              Alertas
              {pendentes > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-medium">
                  {pendentes}
                </span>
              )}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/professora"
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >
              Ver tela da professora
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
