import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getFrequenciaAlunos } from "@/lib/relatorios.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import {
  datasDaSemana,
  fimDoMes,
  formatarDataBR,
  inicioDoMes,
  parseISODate,
  segundaDaSemana,
  somarMeses,
  somarSemanas,
  toISODate,
} from "@/lib/date-utils";

export const Route = createFileRoute("/admin/relatorios_/faltas")({ component: FaltasPage });

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type Periodo = "semana" | "mes";

function csvEscape(v: unknown): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function FaltasPage() {
  useRealtimeGrade();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [referencia, setReferencia] = useState(() => toISODate(new Date()));

  const { dataInicio, dataFim, rotulo } = useMemo(() => {
    if (periodo === "semana") {
      const seg = segundaDaSemana(referencia);
      const datas = datasDaSemana(seg);
      return {
        dataInicio: datas[0],
        dataFim: datas[5],
        rotulo: `Semana de ${formatarDataBR(datas[0])} a ${formatarDataBR(datas[5])}`,
      };
    }
    const ini = toISODate(inicioDoMes(referencia));
    const fim = toISODate(fimDoMes(referencia));
    const d = parseISODate(referencia);
    return {
      dataInicio: ini,
      dataFim: fim,
      rotulo: `${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    };
  }, [periodo, referencia]);

  const getFn = useServerFn(getFrequenciaAlunos);
  const { data } = useQuery({
    queryKey: ["frequencia-alunos", dataInicio, dataFim],
    queryFn: () => getFn({ data: { dataInicio, dataFim } }),
  });

  function navegar(direcao: -1 | 1) {
    setReferencia((r) => (periodo === "semana" ? somarSemanas(r, direcao) : somarMeses(r, direcao)));
  }

  function exportarCSV() {
    if (!data || data.length === 0) return;
    const header = ["Aluno", "Nível", "Aulas no período", "Faltas", "Faltas avisadas"];
    const linhas = data.map((f) => [f.nome, f.nivel, f.aulas, f.faltas, f.faltasAvisadas]);
    const csv = [header, ...linhas].map((l) => l.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faltas-${dataInicio}-a-${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/relatorios"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="text-2xl font-semibold mb-4">Faltas por aluno</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 rounded-md border border-border p-1">
          <button
            onClick={() => setPeriodo("semana")}
            className={`px-3 py-1 rounded text-sm ${periodo === "semana" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriodo("mes")}
            className={`px-3 py-1 rounded text-sm ${periodo === "mes" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            Mês
          </button>
        </div>
        <button
          onClick={() => navegar(-1)}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setReferencia(toISODate(new Date()))}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
        >
          Hoje
        </button>
        <button
          onClick={() => navegar(1)}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
        >
          Próximo →
        </button>
        <div className="text-sm text-muted-foreground">{rotulo}</div>
        <button
          onClick={exportarCSV}
          disabled={!data || data.length === 0}
          className="ml-auto px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      {!data ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase">
                <th className="p-2 text-left">Aluno</th>
                <th className="p-2 text-left">Nível</th>
                <th className="p-2 text-right">Aulas no período</th>
                <th className="p-2 text-right">Faltas</th>
                <th className="p-2 text-right">Avisadas</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.aluno_id} className="border-t border-border">
                  <td className="p-2 font-medium">{f.nome}</td>
                  <td className="p-2 text-muted-foreground">{f.nivel}</td>
                  <td className="p-2 text-right">{f.aulas}</td>
                  <td className="p-2 text-right font-semibold text-rose-600">{f.faltas}</td>
                  <td className="p-2 text-right text-muted-foreground">{f.faltasAvisadas}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    Nenhuma falta (sem aviso) registrada neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
