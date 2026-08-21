import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getRelatorioMatriculas,
  ROTULO_SITUACAO_REMATRICULA,
  type RegistroRematriculaPeriodo,
} from "@/lib/relatorios.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR, inicioDoMes, fimDoMes, toISODate } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/relatorios_/matriculas")({
  component: MatriculasPage,
});

function mesAtual(): string {
  return toISODate(new Date()).slice(0, 7);
}

function csvEscape(v: unknown): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function baixarCSV(nomeArquivo: string, header: string[], linhas: unknown[][]) {
  const csv = [header, ...linhas].map((l) => l.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

function ResumoCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{valor}</div>
    </div>
  );
}

function TabelaRematricula({
  titulo,
  registros,
  dataLabel,
  dataKey,
  vazio,
  onExportar,
}: {
  titulo: string;
  registros: RegistroRematriculaPeriodo[];
  dataLabel: string;
  dataKey: "entrouEm" | "resolvidoEm";
  vazio: string;
  onExportar: () => void;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">
          {titulo} ({registros.length})
        </h2>
        <button
          onClick={onExportar}
          disabled={registros.length === 0}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>
      {registros.length === 0 ? (
        <p className="text-muted-foreground text-sm">{vazio}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase">
                <th className="p-2 text-left">Aluno</th>
                <th className="p-2 text-left">Nível</th>
                <th className="p-2 text-left">{dataLabel}</th>
                <th className="p-2 text-left">Situação</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.aluno_id + r.entrouEm} className="border-t border-border">
                  <td className="p-2 font-medium">{r.nome}</td>
                  <td className="p-2 text-muted-foreground">{r.nivel}</td>
                  <td className="p-2 text-muted-foreground">{formatarDataBR(r[dataKey]!)}</td>
                  <td className="p-2">
                    {ROTULO_SITUACAO_REMATRICULA[r.situacao]}
                    {r.motivo && <span className="text-muted-foreground"> — {r.motivo}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MatriculasPage() {
  useRealtimeGrade();
  const [mesInicio, setMesInicio] = useState(mesAtual);
  const [mesFim, setMesFim] = useState(mesAtual);

  const dataInicio = toISODate(inicioDoMes(`${mesInicio}-01`));
  const dataFim = toISODate(fimDoMes(`${mesFim}-01`));

  const getFn = useServerFn(getRelatorioMatriculas);
  const { data } = useQuery({
    queryKey: ["relatorio-matriculas", dataInicio, dataFim],
    queryFn: () => getFn({ data: { dataInicio, dataFim } }),
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/relatorios"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Matrículas por período</h1>
      <p className="text-sm text-muted-foreground mb-4">
        "Alunos matriculados" é sempre a contagem de hoje. Os demais números são do período
        escolhido. Alunos com nome começando em "Exp" (experimentais) não entram na contagem de
        matriculados nem de novas matrículas.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="text-sm">
          <div className="text-xs text-muted-foreground mb-1">De</div>
          <input
            type="month"
            value={mesInicio}
            onChange={(e) => setMesInicio(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <div className="text-xs text-muted-foreground mb-1">Até</div>
          <input
            type="month"
            value={mesFim}
            onChange={(e) => setMesFim(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {!data ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <ResumoCard label="Alunos matriculados (hoje)" valor={data.alunosMatriculados} />
            <ResumoCard label="Novas matrículas" valor={data.novasMatriculas.length} />
            <ResumoCard label="Rematriculados" valor={data.rematriculados.length} />
          </div>

          <TabelaRematricula
            titulo="A rematricular no período"
            registros={data.aRematricular}
            dataLabel="Entrou no alerta em"
            dataKey="entrouEm"
            vazio="Nenhum aluno entrou na fase de rematrícula nesse período."
            onExportar={() =>
              baixarCSV(
                `a-rematricular-${dataInicio}-a-${dataFim}.csv`,
                ["Aluno", "Nível", "Entrou no alerta em", "Situação", "Motivo"],
                data.aRematricular.map((r) => [
                  r.nome,
                  r.nivel,
                  formatarDataBR(r.entrouEm),
                  ROTULO_SITUACAO_REMATRICULA[r.situacao],
                  r.motivo ?? "",
                ]),
              )
            }
          />

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                Novas matrículas ({data.novasMatriculas.length})
              </h2>
              <button
                onClick={() =>
                  baixarCSV(
                    `novas-matriculas-${dataInicio}-a-${dataFim}.csv`,
                    ["Aluno", "Nível", "Data de cadastro"],
                    data.novasMatriculas.map((n) => [n.nome, n.nivel, formatarDataBR(n.data)]),
                  )
                }
                disabled={data.novasMatriculas.length === 0}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
              >
                Exportar CSV
              </button>
            </div>
            {data.novasMatriculas.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma matrícula nova cadastrada nesse período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground text-xs uppercase">
                      <th className="p-2 text-left">Aluno</th>
                      <th className="p-2 text-left">Nível</th>
                      <th className="p-2 text-left">Data de cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.novasMatriculas.map((n) => (
                      <tr key={n.aluno_id} className="border-t border-border">
                        <td className="p-2 font-medium">{n.nome}</td>
                        <td className="p-2 text-muted-foreground">{n.nivel}</td>
                        <td className="p-2 text-muted-foreground">{formatarDataBR(n.data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TabelaRematricula
            titulo="Rematriculados no período"
            registros={data.rematriculados}
            dataLabel="Rematriculado em"
            dataKey="resolvidoEm"
            vazio="Nenhuma rematrícula concluída nesse período."
            onExportar={() =>
              baixarCSV(
                `rematriculados-${dataInicio}-a-${dataFim}.csv`,
                ["Aluno", "Nível", "Rematriculado em"],
                data.rematriculados.map((r) => [r.nome, r.nivel, formatarDataBR(r.resolvidoEm!)]),
              )
            }
          />
        </>
      )}
    </main>
  );
}
