import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { getCargaProfessoras } from "@/lib/relatorios.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

export const Route = createFileRoute("/admin/relatorios")({ component: RelatoriosPage });

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

const chartConfig: ChartConfig = {
  aulas: { label: "Aulas na grade" },
};

type Periodo = "semana" | "mes";

function csvEscape(v: unknown): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function RelatoriosPage() {
  useRealtimeGrade();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
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

  const getFn = useServerFn(getCargaProfessoras);
  const { data } = useQuery({
    queryKey: ["carga-professoras", dataInicio, dataFim],
    queryFn: () => getFn({ data: { dataInicio, dataFim } }),
  });

  function navegar(direcao: -1 | 1) {
    setReferencia((r) =>
      periodo === "semana" ? somarSemanas(r, direcao) : somarMeses(r, direcao),
    );
  }

  function exportarCSV() {
    if (!data || data.length === 0) return;
    const header = [
      "Professora",
      "Aulas na grade",
      "Alunos distintos",
      "Regular",
      "Online",
      "VIP",
      "Reforço",
      "Conversação",
    ];
    const linhas = data.map((c) => [
      c.professora_nome,
      c.aulas,
      c.alunosDistintos,
      c.porTipo.regular,
      c.porTipo.online,
      c.porTipo.vip,
      c.porTipo.reforco,
      c.porTipo.conversacao,
    ]);
    const csv = [header, ...linhas].map((l) => l.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carga-professoras-${dataInicio}-a-${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Relatórios</h1>

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
        <>
          <div className="overflow-x-auto rounded-lg border border-border mb-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase">
                  <th className="p-2 text-left">Professora</th>
                  <th className="p-2 text-right">Aulas na grade</th>
                  <th className="p-2 text-right">Alunos distintos</th>
                  <th className="p-2 text-right">Regular</th>
                  <th className="p-2 text-right">Online</th>
                  <th className="p-2 text-right">VIP</th>
                  <th className="p-2 text-right">Reforço</th>
                  <th className="p-2 text-right">Conversação</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.professora_id} className="border-t border-border">
                    <td className="p-2 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block mr-2"
                        style={{ backgroundColor: c.professora_cor }}
                      />
                      {c.professora_nome}
                    </td>
                    <td className="p-2 text-right">{c.aulas}</td>
                    <td className="p-2 text-right">{c.alunosDistintos}</td>
                    <td className="p-2 text-right">{c.porTipo.regular}</td>
                    <td className="p-2 text-right">{c.porTipo.online}</td>
                    <td className="p-2 text-right">{c.porTipo.vip}</td>
                    <td className="p-2 text-right">{c.porTipo.reforco}</td>
                    <td className="p-2 text-right">{c.porTipo.conversacao}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      Nenhuma professora ativa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Aulas na grade por professora
              </h2>
              <ChartContainer config={chartConfig} className="max-h-80 w-full">
                <BarChart
                  data={data.map((c) => ({
                    nome: c.professora_nome,
                    aulas: c.aulas,
                    cor: c.professora_cor,
                  }))}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="aulas" radius={4}>
                    {data.map((c) => (
                      <Cell key={c.professora_id} fill={c.professora_cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </>
      )}
    </main>
  );
}
