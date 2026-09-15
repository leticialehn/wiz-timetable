import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAlertasAtivos } from "@/lib/alertas.functions";
import { LogoutButton } from "@/components/LogoutButton";

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
      <header className="print:hidden border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-20 shadow-[0_1px_2px_-1px_rgb(0_0_0_/_0.06)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-6 flex-wrap">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="font-bold text-lg tracking-tight text-foreground shrink-0"
          >
            Wizard Timetable
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/admin/alunos"
              activeProps={{ className: "bg-accent text-foreground" }}
              className="px-3.5 py-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Alunos
            </Link>
            <Link
              to="/admin/relatorios"
              activeProps={{ className: "bg-accent text-foreground" }}
              className="px-3.5 py-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Relatórios
            </Link>
            <Link
              to="/admin/calendario"
              activeProps={{ className: "bg-accent text-foreground" }}
              className="px-3.5 py-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Calendário
            </Link>
            <Link
              to="/admin/professoras"
              activeProps={{ className: "bg-accent text-foreground" }}
              className="px-3.5 py-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Professoras
            </Link>
            <Link
              to="/admin/alertas"
              activeProps={{ className: "bg-accent text-foreground" }}
              className="px-3.5 py-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground flex items-center gap-1.5"
            >
              Alertas
              {pendentes > 0 && (
                <span className="text-[11px] leading-none px-1.5 py-1 rounded-full bg-orange-500 text-white font-semibold">
                  {pendentes}
                </span>
              )}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              to="/professora"
              className="text-sm font-medium px-3.5 py-2 rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Ver tela da professora
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
