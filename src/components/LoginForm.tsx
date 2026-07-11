import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { login } from "@/lib/auth.functions";

export function LoginForm({
  title,
  subtitle,
  onSuccess,
}: {
  title: string;
  subtitle?: string;
  onSuccess: () => void;
}) {
  const loginFn = useServerFn(login);
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const r = await loginFn({ data: { username, senha } });
      if (r.ok) onSuccess();
      else setErro(r.erro ?? "Usuário ou senha incorretos");
    } catch (err) {
      setErro((err as Error).message || "Erro ao entrar. Tente novamente.");
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
        <h1 className="text-2xl font-semibold text-card-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <input
          type="text"
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-6 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Usuário"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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
      </form>
    </main>
  );
}
