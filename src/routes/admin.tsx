import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAlertasFaltas } from "@/lib/alertas.functions";
import { formatarDataBR } from "@/lib/date-utils";

export const Route = createFileRoute("/admin")({
  component: AdminShell,
  head: () => ({
    meta: [{ title: "Wizard — Grade de Aulas" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminShell() {
  const alertasFn = useServerFn(getAlertasFaltas);
  const { data: alertas } = useQuery({ queryKey: ["alertas-faltas"], queryFn: () => alertasFn() });
  const [showAlertas, setShowAlertas] = useState(false);

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
              to="/admin/usuarios"
              activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Usuários
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {alertas && alertas.length > 0 && (
              <div className="relative" onMouseLeave={() => setShowAlertas(false)}>
                <button
                  onClick={() => setShowAlertas((v) => !v)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600"
                >
                  <span aria-hidden>⚠</span>
                  {alertas.length} em alerta
                </button>
                {showAlertas && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-xl z-30">
                    <div className="p-3 border-b border-border font-medium text-sm">
                      Alunos em alerta de faltas consecutivas
                    </div>
                    <ul className="divide-y divide-border">
                      {alertas.map((a) => (
                        <li key={a.aluno_id} className="p-3">
                          <Link
                            to="/admin/alunos/$id"
                            params={{ id: a.aluno_id }}
                            onClick={() => setShowAlertas(false)}
                            className="block hover:underline"
                          >
                            <span className="font-medium">{a.nome}</span>
                            <span className="text-muted-foreground"> — {a.nivel}</span>
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {a.faltas_seguidas} faltas seguidas · última presença:{" "}
                            {a.ultima_presenca ? formatarDataBR(a.ultima_presenca) : "nunca"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
