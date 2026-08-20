import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { atualizarAluno, getUltimasLicoesPorAluno } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate, formatarDataNascimentoBR } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { ROTULO_SITUACAO, type Aluno, type SituacaoAluno } from "@/lib/types";

export const Route = createFileRoute("/admin/alunos_/inativos")({ component: AlunosInativosPage });

function AlunosInativosPage() {
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

  const atualizar = useMutation({
    mutationFn: useServerFn(atualizarAluno),
    onSuccess: () => qc.invalidateQueries(),
  });

  const [busca, setBusca] = useState("");

  const inativos = (data?.alunos ?? [])
    .filter((a) => !a.ativo)
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const naoRematriculados = inativos.filter((a) => a.situacao === "nao_rematriculado");
  const cancelados = inativos.filter((a) => a.situacao === "cancelado");

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Alunos inativos</h1>
        <Link
          to="/admin/alunos"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          ← Voltar pros alunos ativos
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Histórico, notas e data de nascimento continuam guardados — marque "Ativo" de novo se o
        aluno voltar.
      </p>

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno inativo…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      <p className="text-sm text-muted-foreground mb-4">{inativos.length} alunos inativos</p>

      {inativos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum aluno inativo.</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Não Rematriculados ({naoRematriculados.length})
            </h2>
            {naoRematriculados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum.</p>
            ) : (
              <ul className="space-y-2">
                {naoRematriculados.map((a) => (
                  <LinhaInativo
                    key={a.id}
                    aluno={a}
                    ultimaLicao={ultimasLicoes?.[a.id]}
                    onAtualizar={(situacao) =>
                      atualizar.mutate({
                        data: {
                          id: a.id,
                          nome: a.nome,
                          nivel: a.nivel,
                          ativo: situacao === "matriculado",
                          situacao,
                          dataInicioNivel: a.data_inicio_nivel,
                          dataNascimento: a.data_nascimento,
                        },
                      })
                    }
                    onAbrir={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Cancelados ({cancelados.length})
            </h2>
            {cancelados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum.</p>
            ) : (
              <ul className="space-y-2">
                {cancelados.map((a) => (
                  <LinhaInativo
                    key={a.id}
                    aluno={a}
                    ultimaLicao={ultimasLicoes?.[a.id]}
                    onAtualizar={(situacao) =>
                      atualizar.mutate({
                        data: {
                          id: a.id,
                          nome: a.nome,
                          nivel: a.nivel,
                          ativo: situacao === "matriculado",
                          situacao,
                          dataInicioNivel: a.data_inicio_nivel,
                          dataNascimento: a.data_nascimento,
                        },
                      })
                    }
                    onAbrir={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function LinhaInativo({
  aluno,
  ultimaLicao,
  onAtualizar,
  onAbrir,
}: {
  aluno: Aluno;
  ultimaLicao: string | undefined;
  onAtualizar: (situacao: SituacaoAluno) => void;
  onAbrir: () => void;
}) {
  return (
    <li
      onClick={onAbrir}
      title="Clique para ver o histórico do aluno"
      className="rounded-lg border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50"
    >
      <div className="flex-1">
        <span className="font-medium">{aluno.nome}</span>
        <span className="text-muted-foreground text-sm"> — {aluno.nivel}</span>
        {ultimaLicao && <span className="text-muted-foreground text-sm"> · {ultimaLicao}</span>}
        {aluno.data_nascimento && (
          <span className="text-muted-foreground text-sm">
            {" "}
            · {formatarDataNascimentoBR(aluno.data_nascimento)}
          </span>
        )}
      </div>
      <select
        value={aluno.situacao}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onAtualizar(e.target.value as SituacaoAluno)}
        className="text-xs rounded-md border border-input bg-background px-2 py-1"
      >
        {(Object.keys(ROTULO_SITUACAO) as SituacaoAluno[]).map((s) => (
          <option key={s} value={s}>
            {ROTULO_SITUACAO[s]}
          </option>
        ))}
      </select>
    </li>
  );
}
