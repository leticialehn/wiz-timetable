import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isAdminUnlocked, unlockAdmin, lockAdmin } from "@/lib/gate.functions";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Secretaria — Grade de Aulas" }, { name: "robots", content: "noindex" }] }),
});

function AdminLayout() {
  const checkFn = useServerFn(isAdminUnlocked);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-gate"],
    queryFn: () => checkFn(),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (!data?.unlocked) return <UnlockForm onUnlocked={() => refetch()} />;
  return <AdminShell />;
}

function UnlockForm({ onUnlocked }: { onUnlocked: () => void }) {
  const unlock = useServerFn(unlockAdmin);
  const [pwd, setPwd] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const r = await unlock({ data: { password: pwd } });
    setLoading(false);
    if (r.ok) onUnlocked();
    else setErro(r.erro ?? "Senha incorreta");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-card-foreground">Painel da Secretaria</h1>
        <p className="mt-1 text-sm text-muted-foreground">Digite a senha para entrar.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="mt-6 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Senha"
        />
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-primary-foreground font-medium disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-muted-foreground underline">
          Voltar
        </Link>
      </form>
    </main>
  );
}

function AdminShell() {
  const router = useRouter();
  const lock = useServerFn(lockAdmin);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link to="/admin" className="font-bold text-lg">Secretaria</Link>
          <nav className="flex gap-1 text-sm">
            <Link to="/admin" activeOptions={{ exact: true }} activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent">Grade</Link>
            <Link to="/admin/professoras" activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent">Professoras</Link>
            <Link to="/admin/alunos" activeProps={{ className: "bg-accent" }}
              className="px-3 py-1.5 rounded-md hover:bg-accent">Alunos</Link>
          </nav>
          <div className="ml-auto flex gap-2">
            <Link to="/professora" className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent">
              Ver tela da professora
            </Link>
            <button
              onClick={async () => { await lock(); router.invalidate(); }}
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
