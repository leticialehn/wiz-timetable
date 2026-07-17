import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { criarProfessora, atualizarProfessora, removerProfessora } from "@/lib/cadastros.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";

export const Route = createFileRoute("/admin/professoras")({ component: ProfessorasPage });

function ProfessorasPage() {
  useRealtimeGrade();
  const qc = useQueryClient();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "prof-page"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  const criar = useMutation({
    mutationFn: useServerFn(criarProfessora),
    onSuccess: () => qc.invalidateQueries(),
  });
  const atualizar = useMutation({
    mutationFn: useServerFn(atualizarProfessora),
    onSuccess: () => qc.invalidateQueries(),
  });
  const remover = useMutation({
    mutationFn: useServerFn(removerProfessora),
    onSuccess: () => qc.invalidateQueries(),
  });

  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#f9c6d3");

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Professoras</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          criar.mutate({ data: { nome, cor } });
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
          <label className="text-sm block mb-1">Cor</label>
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-16 rounded border border-input"
          />
        </div>
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
          Adicionar
        </button>
      </form>

      <ul className="space-y-2">
        {data?.professoras.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-border p-3 flex items-center gap-3"
            style={{ backgroundColor: p.cor + "40" }}
          >
            <input
              defaultValue={p.nome}
              onBlur={(e) =>
                e.target.value !== p.nome &&
                atualizar.mutate({
                  data: {
                    id: p.id,
                    nome: e.target.value,
                    cor: p.cor,
                    coordenadora: p.coordenadora,
                  },
                })
              }
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1"
            />
            <input
              type="color"
              defaultValue={p.cor}
              onBlur={(e) =>
                e.target.value !== p.cor &&
                atualizar.mutate({
                  data: {
                    id: p.id,
                    nome: p.nome,
                    cor: e.target.value,
                    coordenadora: p.coordenadora,
                  },
                })
              }
              className="h-9 w-12 rounded border border-input"
            />
            <label
              className="text-xs flex items-center gap-1"
              title="Vê funções extras, como o alerta de faltas consecutivas"
            >
              <input
                type="checkbox"
                defaultChecked={p.coordenadora}
                onChange={(e) =>
                  atualizar.mutate({
                    data: {
                      id: p.id,
                      nome: p.nome,
                      cor: p.cor,
                      coordenadora: e.target.checked,
                    },
                  })
                }
              />
              Coordenadora
            </label>
            <button
              onClick={() =>
                confirm(`Remover ${p.nome}?`) && remover.mutate({ data: { id: p.id } })
              }
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
