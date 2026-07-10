import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  redefinirSenha,
  removerUsuario,
  type UsuarioListado,
} from "@/lib/usuarios.functions";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { PAPEIS, type Papel } from "@/lib/types";

export const Route = createFileRoute("/admin/usuarios")({
  beforeLoad: ({ context }) => {
    if (!context.sessao.usuario?.papeis.includes("secretaria")) {
      throw redirect({ to: "/admin" });
    }
  },
  component: UsuariosPage,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const listarFn = useServerFn(listarUsuarios);
  const { data: usuarios } = useQuery({ queryKey: ["usuarios"], queryFn: () => listarFn() });

  const getGradeFn = useServerFn(getGradeSemana);
  const { data: grade } = useQuery({
    queryKey: ["grade-semana", "usuarios-page"],
    queryFn: () => getGradeFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });
  const professoras = grade?.professoras ?? [];

  const criar = useMutation({
    mutationFn: useServerFn(criarUsuario),
    onSuccess: () => qc.invalidateQueries(),
  });
  const atualizar = useMutation({
    mutationFn: useServerFn(atualizarUsuario),
    onSuccess: () => qc.invalidateQueries(),
  });
  const redefinir = useMutation({
    mutationFn: useServerFn(redefinirSenha),
    onSuccess: () => qc.invalidateQueries(),
  });
  const remover = useMutation({
    mutationFn: useServerFn(removerUsuario),
    onSuccess: () => qc.invalidateQueries(),
  });

  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [professoraId, setProfessoraId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function togglePapelNovo(p: Papel, checked: boolean) {
    setPapeis((atual) => (checked ? [...atual, p] : atual.filter((x) => x !== p)));
  }

  async function criarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim() || !username.trim() || !senha) return;
    const r = await criar.mutateAsync({
      data: { nome, username, senha, papeis, professora_id: professoraId || null },
    });
    if (!r.ok) {
      setErro(r.erro ?? "Erro ao criar usuário");
      return;
    }
    setNome("");
    setUsername("");
    setSenha("");
    setPapeis([]);
    setProfessoraId("");
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-1">Usuários</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Quem pode acessar o sistema e o que cada um pode fazer.
      </p>

      <form onSubmit={criarSubmit} className="rounded-lg border border-border p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            className="flex-1 min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuário (login)"
            className="flex-1 min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            className="flex-1 min-w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {PAPEIS.map((p) => (
            <label key={p.key} className="text-sm flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={papeis.includes(p.key)}
                onChange={(e) => togglePapelNovo(p.key, e.target.checked)}
              />
              {p.label}
            </label>
          ))}
          {papeis.includes("professor") && (
            <select
              value={professoraId}
              onChange={(e) => setProfessoraId(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Vincular a qual professora?</option>
              {professoras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
          Adicionar usuário
        </button>
      </form>

      <ul className="space-y-2">
        {(usuarios ?? []).map((u) => (
          <UsuarioLinha
            key={u.id}
            usuario={u}
            professoras={professoras}
            onSalvar={(campos) =>
              atualizar.mutate({
                data: {
                  id: u.id,
                  nome: u.nome,
                  papeis: u.papeis,
                  professora_id: u.professora_id,
                  ativo: u.ativo,
                  ...campos,
                },
              })
            }
            onRedefinirSenha={(novaSenha) => redefinir.mutate({ data: { id: u.id, novaSenha } })}
            onRemover={() => remover.mutate({ data: { id: u.id } })}
          />
        ))}
      </ul>
    </main>
  );
}

type CamposUsuario = Partial<{
  nome: string;
  papeis: Papel[];
  professora_id: string | null;
  ativo: boolean;
}>;

function UsuarioLinha({
  usuario,
  professoras,
  onSalvar,
  onRedefinirSenha,
  onRemover,
}: {
  usuario: UsuarioListado;
  professoras: { id: string; nome: string }[];
  onSalvar: (campos: CamposUsuario) => void;
  onRedefinirSenha: (novaSenha: string) => void;
  onRemover: () => void;
}) {
  function togglePapel(p: Papel, checked: boolean) {
    const novosPapeis = checked ? [...usuario.papeis, p] : usuario.papeis.filter((x) => x !== p);
    onSalvar({
      papeis: novosPapeis,
      professora_id: novosPapeis.includes("professor") ? usuario.professora_id : null,
    });
  }

  return (
    <li className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          defaultValue={usuario.nome}
          onBlur={(e) => e.target.value !== usuario.nome && onSalvar({ nome: e.target.value })}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1 min-w-[140px]"
        />
        <span className="text-xs text-muted-foreground">@{usuario.username}</span>
        <label className="text-xs flex items-center gap-1">
          <input
            type="checkbox"
            checked={usuario.ativo}
            onChange={(e) => onSalvar({ ativo: e.target.checked })}
          />
          Ativo
        </label>
        <button
          onClick={() => {
            const novaSenha = prompt(`Nova senha para ${usuario.nome}:`);
            if (novaSenha) onRedefinirSenha(novaSenha);
          }}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
        >
          Redefinir senha
        </button>
        <button
          onClick={() => confirm(`Remover ${usuario.nome}?`) && onRemover()}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive hover:text-destructive-foreground"
        >
          Remover
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {PAPEIS.map((p) => (
          <label key={p.key} className="text-xs flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={usuario.papeis.includes(p.key)}
              onChange={(e) => togglePapel(p.key, e.target.checked)}
            />
            {p.label}
          </label>
        ))}
        {usuario.papeis.includes("professor") && (
          <select
            value={usuario.professora_id ?? ""}
            onChange={(e) => onSalvar({ professora_id: e.target.value || null })}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Vincular a qual professora?</option>
            {professoras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}
      </div>
    </li>
  );
}
