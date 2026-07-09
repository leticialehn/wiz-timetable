import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Grade de Aulas — Escola de Idiomas" },
      { name: "description", content: "Escolha entre painel da secretaria ou tela da professora." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Grade de Aulas
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Escola de idiomas — horários em tempo real
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/professora"
            className="group rounded-2xl border-2 border-border bg-card p-8 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="text-3xl mb-3">👩‍🏫</div>
            <h2 className="text-2xl font-semibold text-card-foreground">Sou professora</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ver a minha grade do dia, atualizada em tempo real.
            </p>
          </Link>

          <Link
            to="/admin"
            className="group rounded-2xl border-2 border-border bg-card p-8 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="text-3xl mb-3">🗂️</div>
            <h2 className="text-2xl font-semibold text-card-foreground">Secretaria</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Montar e ajustar a grade semanal. Requer senha.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
