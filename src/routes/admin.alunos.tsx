import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { criarAluno, atualizarAluno, removerAluno } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { NIVEIS, type Aluno } from "@/lib/types";
import { temTrackingDeLicao } from "@/lib/licoes";

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

      <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 mb-6">
        <h2 className="text-sm font-semibold text-primary mb-3">+ Cadastrar aluno novo</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return;
            criar.mutate({ data: { nome, nivel } });
            setNome("");
          }}
          className="flex flex-wrap gap-2 items-end"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm block mb-1">Nome do aluno novo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite aqui só se for cadastrar alguém novo"
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
      </div>

      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno já cadastrado…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

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
            onAtualizar={(campos) => atualizar.mutate({ data: { id: a.id, ...campos } })}
            onRemover={() => remover.mutate({ data: { id: a.id } })}
            onAbrirHistorico={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
          />
        ))}
      </ul>
    </main>
  );
}

type CamposAluno = {
  nome: string;
  nivel: string;
  ativo: boolean;
  dataInicioNivel: string | null;
};

function LinhaAluno({
  aluno,
  onAtualizar,
  onRemover,
  onAbrirHistorico,
}: {
  aluno: Aluno;
  onAtualizar: (campos: CamposAluno) => void;
  onRemover: () => void;
  onAbrirHistorico: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(aluno.nome);
  const [nivel, setNivel] = useState(aluno.nivel);
  const [dataInicioNivel, setDataInicioNivel] = useState(aluno.data_inicio_nivel ?? "");

  function abrirEdicao() {
    setNome(aluno.nome);
    setNivel(aluno.nivel);
    setDataInicioNivel(aluno.data_inicio_nivel ?? "");
    setEditando(true);
  }

  function salvar() {
    if (!nome.trim()) return;
    onAtualizar({
      nome: nome.trim(),
      nivel: nivel.trim(),
      ativo: aluno.ativo,
      dataInicioNivel: dataInicioNivel || null,
    });
    setEditando(false);
  }

  function cancelar() {
    setNome(aluno.nome);
    setNivel(aluno.nivel);
    setDataInicioNivel(aluno.data_inicio_nivel ?? "");
    setEditando(false);
  }

  return (
    <li
      onClick={editando ? undefined : onAbrirHistorico}
      title={editando ? undefined : "Clique para ver o histórico do aluno"}
      className={`rounded-lg border border-border p-3 ${
        editando ? "space-y-2" : "flex items-center gap-3 cursor-pointer hover:bg-accent/50"
      }`}
    >
      {editando ? (
        <>
          <div className="flex items-center gap-3">
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
              onChange={(e) => {
                setNivel(e.target.value);
                // Trocou de nível: a data de início manual era do livro anterior.
                setDataInicioNivel("");
              }}
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
          </div>
          {temTrackingDeLicao(nivel) && (
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              Início deste nível (só preencher se ele já estava no meio do livro antes do site)
              <input
                type="date"
                value={dataInicioNivel}
                onChange={(e) => setDataInicioNivel(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
            </label>
          )}
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
              onChange={(e) =>
                onAtualizar({
                  nome: aluno.nome,
                  nivel: aluno.nivel,
                  ativo: e.target.checked,
                  dataInicioNivel: aluno.data_inicio_nivel,
                })
              }
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
