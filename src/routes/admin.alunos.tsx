import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { criarAluno, atualizarAluno, removerAluno } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { NIVEIS, type Aluno } from "@/lib/types";

export const Route = createFileRoute("/admin/alunos")({ component: AlunosPage });

function AlunosPage() {
  useRealtimeGrade();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "alunos-page"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  const criar = useMutation({
    mutationFn: useServerFn(criarAluno),
    onSuccess: () => qc.invalidateQueries(),
  });
  const atualizar = useMutation({
    mutationFn: useServerFn(atualizarAluno),
    onSuccess: () => qc.invalidateQueries(),
  });
  const remover = useMutation({
    mutationFn: useServerFn(removerAluno),
    onSuccess: () => qc.invalidateQueries(),
  });

  const [nome, setNome] = useState("");
  const [nivel, setNivel] = useState("T2");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"nome" | "nivel">("nome");

  const filtrados = (data?.alunos ?? [])
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) =>
      ordem === "nome"
        ? a.nome.localeCompare(b.nome)
        : a.nivel.localeCompare(b.nivel) || a.nome.localeCompare(b.nome),
    );

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Alunos</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          criar.mutate({ data: { nome, nivel } });
          setNome("");
        }}
        className="rounded-lg border border-border p-4 mb-6 flex flex-wrap gap-2 items-end"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="text-sm block mb-1">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm block mb-1">Nível</label>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
          Adicionar
        </button>
      </form>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2"
      />

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Ordenar por:</span>
        <button
          onClick={() => setOrdem("nome")}
          className={`text-xs px-2.5 py-1 rounded border ${
            ordem === "nome"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-accent"
          }`}
        >
          Nome (A-Z)
        </button>
        <button
          onClick={() => setOrdem("nivel")}
          className={`text-xs px-2.5 py-1 rounded border ${
            ordem === "nivel"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-accent"
          }`}
        >
          Nível
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {busca.trim()
          ? `${filtrados.length} de ${data?.alunos.length ?? 0} alunos encontrados`
          : `${data?.alunos.length ?? 0} alunos no total`}
      </p>

      <ul className="space-y-2">
        {filtrados.map((a) => (
          <LinhaAluno
            key={a.id}
            aluno={a}
            onAtualizar={(nome, nivel, ativo) =>
              atualizar.mutate({ data: { id: a.id, nome, nivel, ativo } })
            }
            onRemover={() => remover.mutate({ data: { id: a.id } })}
            onAbrirHistorico={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
          />
        ))}
      </ul>
    </main>
  );
}

function LinhaAluno({
  aluno,
  onAtualizar,
  onRemover,
  onAbrirHistorico,
}: {
  aluno: Aluno;
  onAtualizar: (nome: string, nivel: string, ativo: boolean) => void;
  onRemover: () => void;
  onAbrirHistorico: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(aluno.nome);
  const [nivel, setNivel] = useState(aluno.nivel);

  function abrirEdicao() {
    setNome(aluno.nome);
    setNivel(aluno.nivel);
    setEditando(true);
  }

  function salvar() {
    if (!nome.trim()) return;
    onAtualizar(nome.trim(), nivel.trim(), aluno.ativo);
    setEditando(false);
  }

  function cancelar() {
    setNome(aluno.nome);
    setNivel(aluno.nivel);
    setEditando(false);
  }

  return (
    <li
      onClick={editando ? undefined : onAbrirHistorico}
      title={editando ? undefined : "Clique para ver o histórico do aluno"}
      className={`rounded-lg border border-border p-3 flex items-center gap-3 ${
        editando ? "" : "cursor-pointer hover:bg-accent/50"
      }`}
    >
      {editando ? (
        <>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") cancelar();
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1"
          />
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") cancelar();
            }}
            className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              salvar();
            }}
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
          >
            Salvar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              cancelar();
            }}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <span className="font-medium">{aluno.nome}</span>
            <span className="text-muted-foreground text-sm"> — {aluno.nivel}</span>
          </div>
          <label className="text-xs flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={aluno.ativo}
              onChange={(e) => onAtualizar(aluno.nome, aluno.nivel, e.target.checked)}
            />
            Ativo
          </label>
          <button
            onClick={(e) => {
              e.stopPropagation();
              abrirEdicao();
            }}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
          >
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remover ${aluno.nome}?`)) onRemover();
            }}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive hover:text-destructive-foreground"
          >
            Remover
          </button>
        </>
      )}
    </li>
  );
}
