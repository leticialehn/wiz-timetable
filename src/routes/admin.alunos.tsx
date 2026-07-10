import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { criarAluno, atualizarAluno, removerAluno } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";

const NIVEIS = ["T2", "T4", "T6", "K2", "K6", "W2", "W4", "W6", "W10", "W12"];

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

  const filtrados =
    data?.alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())) ?? [];

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
          <input
            list="niveis"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <datalist id="niveis">
            {NIVEIS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
          Adicionar
        </button>
      </form>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
      />

      <ul className="space-y-2">
        {filtrados.map((a) => (
          <li
            key={a.id}
            onClick={() => navigate({ to: "/admin/alunos/$id", params: { id: a.id } })}
            title="Clique para ver o histórico do aluno"
            className="rounded-lg border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50"
          >
            <input
              defaultValue={a.nome}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) =>
                e.target.value !== a.nome &&
                atualizar.mutate({
                  data: { id: a.id, nome: e.target.value, nivel: a.nivel, ativo: a.ativo },
                })
              }
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1"
            />
            <input
              defaultValue={a.nivel}
              list="niveis"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) =>
                e.target.value !== a.nivel &&
                atualizar.mutate({
                  data: { id: a.id, nome: a.nome, nivel: e.target.value, ativo: a.ativo },
                })
              }
              className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <label className="text-xs flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                defaultChecked={a.ativo}
                onChange={(e) =>
                  atualizar.mutate({
                    data: { id: a.id, nome: a.nome, nivel: a.nivel, ativo: e.target.checked },
                  })
                }
              />
              Ativo
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remover ${a.nome}?`)) remover.mutate({ data: { id: a.id } });
              }}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive hover:text-destructive-foreground"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
