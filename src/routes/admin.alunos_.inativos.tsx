import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { atualizarAluno, getUltimasLicoesPorAluno } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate, formatarDataNascimentoBR } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import type { Aluno } from "@/lib/types";

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

      <p className="text-sm text-muted-foreground mb-2">{inativos.length} alunos inativos</p>

      {inativos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum aluno inativo.</p>
      ) : (
        <ul className="space-y-2">
          {inativos.map((a: Aluno) => (
            <li
              key={a.id}
              onClick={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
              title="Clique para ver o histórico do aluno"
              className="rounded-lg border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50"
            >
              <div className="flex-1">
                <span className="font-medium">{a.nome}</span>
                <span className="text-muted-foreground text-sm"> — {a.nivel}</span>
                {ultimasLicoes?.[a.id] && (
                  <span className="text-muted-foreground text-sm"> · {ultimasLicoes[a.id]}</span>
                )}
                {a.data_nascimento && (
                  <span className="text-muted-foreground text-sm">
                    {" "}
                    · {formatarDataNascimentoBR(a.data_nascimento)}
                  </span>
                )}
              </div>
              <label
                className="text-xs flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={a.ativo}
                  onChange={(e) =>
                    atualizar.mutate({
                      data: {
                        id: a.id,
                        nome: a.nome,
                        nivel: a.nivel,
                        ativo: e.target.checked,
                        dataInicioNivel: a.data_inicio_nivel,
                        dataNascimento: a.data_nascimento,
                      },
                    })
                  }
                />
                Ativo
              </label>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
