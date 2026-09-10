import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { criarPrimeiroUsuario } from "@/lib/auth.functions";

// Primeiro acesso: não existe nenhum usuário no banco ainda. Cria a primeira
// conta (papel "secretaria") e já deixa logado. Depois disso o
// `criarPrimeiroUsuario` recusa (checa count > 0), então esta tela some.
export function BootstrapForm({ onSuccess }: { onSuccess: () => void }) {
  const criarFn = useServerFn(criarPrimeiroUsuario);
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
      const r = await criarFn({ data: { nome, username, senha } });
      if (r.ok) onSuccess();
      else setErro(r.erro ?? "Erro ao criar o primeiro usuário");
    } catch (err) {
      setErro((err as Error).message || "Erro ao criar o usuário. Tente novamente.");
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
        <h1 className="text-2xl font-semibold text-card-foreground">Primeiro acesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie a conta da secretaria para começar.
        </p>
        <input
          type="text"
          autoFocus
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-6 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Nome"
        />
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          placeholder="Usuário"
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
          disabled={loading}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Criando…" : "Criar e entrar"}
        </button>
      </form>
    </main>
  );
}
