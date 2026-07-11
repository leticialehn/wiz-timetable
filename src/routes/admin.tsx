import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSessaoAtual, logout, criarPrimeiroUsuario } from "@/lib/auth.functions";
import { getAlertasFaltas } from "@/lib/alertas.functions";
import { formatarDataBR } from "@/lib/date-utils";
import { LoginForm } from "@/components/LoginForm";
import type { UsuarioAutenticado } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const sessao = await getSessaoAtual();
    if (sessao.autenticado && sessao.usuario) {
      const podeAdmin = sessao.usuario.papeis.some(
        (p) => p === "secretaria" || p === "coordenador",
      );
      if (!podeAdmin) throw redirect({ to: "/professora" });
    }
    return { sessao };
  },
  component: AdminLayout,
  head: () => ({
    meta: [{ title: "Secretaria — Grade de Aulas" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminLayout() {
  const { sessao } = Route.useRouteContext();
  const router = useRouter();

  if (!sessao.autenticado) {
    if (sessao.precisaBootstrap) {
      return <PrimeiraContaForm onCriado={() => router.invalidate()} />;
    }
    return (
      <LoginForm
        title="Painel da Secretaria"
        subtitle="Entre com seu usuário e senha."
        onSuccess={() => router.invalidate()}
      />
    );
  }
  return <AdminShell usuario={sessao.usuario!} />;
}

function PrimeiraContaForm({ onCriado }: { onCriado: () => void }) {
  const criar = useServerFn(criarPrimeiroUsuario);
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const r = await criar({ data: { nome, username, senha } });
      if (r.ok) onCriado();
      else setErro(r.erro ?? "Erro ao criar conta");
    } catch (err) {
      setErro((err as Error).message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-card-foreground">Bem-vinda!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum usuário cadastrado ainda. Crie a sua conta (será a secretaria/admin).
        </p>
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-6 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Seu nome"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Usuário (login)"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Senha"
        />
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
        <button
          type="submit"
          disabled={loading || !nome.trim() || !username.trim() || !senha}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-primary-foreground font-medium disabled:opacity-50"
        >
          {loading ? "Criando…" : "Criar conta e entrar"}
        </button>
      </form>
    </main>
  );
}

function AdminShell({ usuario }: { usuario: UsuarioAutenticado }) {
  const router = useRouter();
  const sair = useServerFn(logout);
  const alertasFn = useServerFn(getAlertasFaltas);
  const { data: alertas } = useQuery({ queryKey: ["alertas-faltas"], queryFn: () => alertasFn() });
  const [showAlertas, setShowAlertas] = useState(false);
  const ehSecretaria = usuario.papeis.includes("secretaria");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link to="/admin" className="font-bold text-lg">
            Secretaria
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
            {ehSecretaria && (
              <Link
                to="/admin/usuarios"
                activeProps={{ className: "bg-accent" }}
                className="px-3 py-1.5 rounded-md hover:bg-accent"
              >
                Usuários
              </Link>
            )}
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
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, {usuario.nome}
            </span>
            <Link
              to="/professora"
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >
              Ver tela da professora
            </Link>
            <button
              onClick={async () => {
                await sair();
                router.invalidate();
              }}
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
