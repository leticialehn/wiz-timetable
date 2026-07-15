import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getHistoricoAluno, type HistoricoItem } from "@/lib/historico.functions";
import { setNota } from "@/lib/presenca.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR } from "@/lib/date-utils";
import {
  HORARIO_INICIO_PERIODO,
  CAMPOS_NOTA,
  CONCEITOS,
  type CampoNota,
  type ConceitoNota,
} from "@/lib/types";

export const Route = createFileRoute("/professora_/aluno/$id")({
  component: HistoricoAlunoProfessoraPage,
  head: () => ({ meta: [{ title: "Histórico do aluno" }] }),
});

function NotaEditavel({
  valor,
  disabled,
  onSelecionar,
}: {
  valor: ConceitoNota | null;
  disabled: boolean;
  onSelecionar: (v: ConceitoNota | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {CONCEITOS.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onSelecionar(valor === c ? null : c)}
          className={`w-6 h-6 rounded text-[10px] font-bold border disabled:opacity-50 ${
            valor === c
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function HistoricoAlunoProfessoraPage() {
  useRealtimeGrade();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getHistoricoAluno);
  const notaFn = useServerFn(setNota);
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", id],
    queryFn: () => getFn({ data: { aluno_id: id } }),
  });

  async function salvarNota(item: HistoricoItem, campo: CampoNota, valor: ConceitoNota | null) {
    const chaveCelula = `${item.chave}-${campo}`;
    setSalvandoCelula(chaveCelula);
    try {
      await notaFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: id,
          periodo: item.periodo,
          parte: item.parte,
          campo,
          valor,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", id] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  return (
    <main className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-4">
      <Link to="/professora" className="text-sm text-muted-foreground underline mb-4 inline-block">
        ← Voltar
      </Link>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}

      {!isLoading && !data && (
        <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>
      )}

      {data && (
        <>
          <h1 className="text-xl font-bold mb-1">
            {data.aluno.nome} - {data.aluno.nivel}
          </h1>
          <p className="text-[10px] text-muted-foreground mb-4">
            O - Ótimo &nbsp; MB - Muito Bom &nbsp; B - Bom &nbsp; R - Regular
          </p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.presencas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Presenças</div>
            </div>
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.faltas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Faltas</div>
            </div>
            <div className="rounded-lg border border-border p-2 text-center">
              <div className="text-lg font-bold">{data.resumo.sequenciaFaltas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Faltas seguidas</div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Histórico de aulas</h2>
          {data.timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Data</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Hora</th>
                    <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Lição</th>
                    {CAMPOS_NOTA.map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((item) => {
                    // Parte 2 de aula online é um horário seguinte de verdade (mostra a
                    // hora cheia seguinte). Parte 2 sem presença é uma 2ª lição feita na
                    // mesma hora (aluno adiantado) — mesma hora, só uma marcação ao lado.
                    const segundaLicaoMesmaHora = item.parte === 2 && item.presenca === null;
                    const periodoExibido =
                      item.parte === 2 && !segundaLicaoMesmaHora ? item.periodo + 1 : item.periodo;
                    return (
                      <tr key={item.chave} className="border-t border-border">
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {formatarDataBR(item.data)}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {HORARIO_INICIO_PERIODO[periodoExibido] ?? periodoExibido}
                          {segundaLicaoMesmaHora && (
                            <span className="text-muted-foreground"> (2ª lição)</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {item.presenca === "falta" ? (
                            <span className="text-rose-600 font-medium">Faltou</span>
                          ) : item.presenca === "falta_avisada" ? (
                            <span className="text-muted-foreground font-medium">
                              Faltou (avisou)
                            </span>
                          ) : (
                            (item.licao ?? "—")
                          )}
                          {item.praticado === false && (
                            <span className="text-amber-600 dark:text-amber-400"> ⏳</span>
                          )}
                        </td>
                        {CAMPOS_NOTA.map(({ key }) => (
                          <td key={key} className="px-2 py-1.5">
                            <NotaEditavel
                              valor={item.notas?.[key] ?? null}
                              disabled={salvandoCelula === `${item.chave}-${key}`}
                              onSelecionar={(v) => salvarNota(item, key, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
