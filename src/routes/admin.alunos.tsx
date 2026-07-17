import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import {
  criarAluno,
  atualizarAluno,
  removerAluno,
  getUltimasLicoesPorAluno,
} from "@/lib/cadastros.functions";
import {
  segundaDaSemana,
  toISODate,
  formatarDataNascimentoBR,
  dataNascimentoParaDigitos,
  dataNascimentoDeDigitos,
  mascaraDataDigitando,
  estaNaSemanaDoAniversario,
} from "@/lib/date-utils";
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

  const getUltimasLicoesFn = useServerFn(getUltimasLicoesPorAluno);
  const { data: ultimasLicoes } = useQuery({
    queryKey: ["ultimas-licoes-por-aluno"],
    queryFn: () => getUltimasLicoesFn(),
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

  const ativos = (data?.alunos ?? []).filter((a) => a.ativo);
  const inativos = (data?.alunos ?? []).filter((a) => !a.ativo);
  const filtrados = ativos
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) =>
      ordem === "nome"
        ? a.nome.localeCompare(b.nome)
        : a.nivel.localeCompare(b.nivel) || a.nome.localeCompare(b.nome),
    );

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Alunos</h1>
        <Link
          to="/admin/alunos/inativos"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Ver alunos inativos ({inativos.length})
        </Link>
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
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite nome do aluno novo"
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
          ? `${filtrados.length} de ${ativos.length} alunos encontrados`
          : `${ativos.length} alunos no total`}
      </p>

      <ul className="space-y-2">
        {filtrados.map((a) => (
          <LinhaAluno
            key={a.id}
            aluno={a}
            ultimaLicao={ultimasLicoes?.[a.id]}
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
  dataNascimento: string | null;
};

function LinhaAluno({
  aluno,
  ultimaLicao,
  onAtualizar,
  onRemover,
  onAbrirHistorico,
}: {
  aluno: Aluno;
  ultimaLicao: string | undefined;
  onAtualizar: (campos: CamposAluno) => void;
  onRemover: () => void;
  onAbrirHistorico: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(aluno.nome);
  const [nivel, setNivel] = useState(aluno.nivel);
  const [dataInicioNivel, setDataInicioNivel] = useState(aluno.data_inicio_nivel ?? "");
  const [nascimentoDigitos, setNascimentoDigitos] = useState(
    aluno.data_nascimento ? dataNascimentoParaDigitos(aluno.data_nascimento) : "",
  );

  const aniversario = estaNaSemanaDoAniversario(aluno.data_nascimento, toISODate(new Date()));

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
      dataNascimento: aluno.data_nascimento,
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
      className={`rounded-lg border p-3 ${aniversario ? "border-2 border-rose-500" : "border-border"} ${
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
            {ultimaLicao && <span className="text-muted-foreground text-sm"> · {ultimaLicao}</span>}
            <span
              className="text-muted-foreground text-sm inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {" "}
              ·{" "}
              <input
                value={mascaraDataDigitando(nascimentoDigitos)}
                onChange={(e) =>
                  setNascimentoDigitos(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onBlur={() => {
                  const novaData = dataNascimentoDeDigitos(nascimentoDigitos);
                  if (novaData !== aluno.data_nascimento) {
                    onAtualizar({
                      nome: aluno.nome,
                      nivel: aluno.nivel,
                      ativo: aluno.ativo,
                      dataInicioNivel: aluno.data_inicio_nivel,
                      dataNascimento: novaData,
                    });
                  }
                }}
                placeholder="dd/mm/aa"
                inputMode="numeric"
                title="Data de nascimento — digite só os 6 números (ex.: 190312)"
                size={8}
                className="w-min max-w-[4.5rem] rounded border border-input bg-background px-1 py-0.5 text-xs"
              />
            </span>
            {aniversario && <span className="text-sm">🎂</span>}
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
                  dataNascimento: aluno.data_nascimento,
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
