import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { segundaDaSemana, toISODate } from "@/lib/date-utils";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { BoletimAluno } from "@/components/BoletimAluno";
import { HistoricoEditavel } from "@/components/HistoricoEditavel";

export const Route = createFileRoute("/admin/relatorios_/aluno")({ component: RelatorioAlunoPage });

function RelatorioAlunoPage() {
  useRealtimeGrade();
  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", "relatorio-aluno"],
    queryFn: () => getFn({ data: { dataSegunda: toISODate(segundaDaSemana()) } }),
  });

  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState<string | null>(null);

  const alunos = (data?.alunos ?? []).filter((a) => a.ativo);
  const alunoSelecionado = alunos.find((a) => a.id === alunoId);
  const filtrados = busca.trim()
    ? alunos
        .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .slice(0, 8)
    : [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 print:max-w-full print:px-8">
      <Link
        to="/admin/relatorios"
        className="print:hidden text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="print:hidden text-2xl font-semibold mb-4">Boletim e histórico do aluno</h1>

      <div className="print:hidden relative mb-8 max-w-md">
        <input
          value={alunoSelecionado ? alunoSelecionado.nome : busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setAlunoId(null);
          }}
          placeholder="Buscar aluno pelo nome…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {filtrados.length > 0 && !alunoSelecionado && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md">
            {filtrados.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => {
                    setAlunoId(a.id);
                    setBusca("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                >
                  {a.nome} <span className="text-muted-foreground">— {a.nivel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {alunoSelecionado && (
        <>
          <BoletimAluno alunoId={alunoSelecionado.id} />
          <div className="print:hidden mt-10 pt-8 border-t border-border">
            <HistoricoEditavel alunoId={alunoSelecionado.id} />
          </div>
        </>
      )}
    </main>
  );
}
