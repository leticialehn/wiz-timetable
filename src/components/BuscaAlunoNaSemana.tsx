import { useState } from "react";
import {
  DIAS_SEMANA,
  HORARIO_INICIO_PERIODO,
  ROTULO_TIPO,
  type Aluno,
  type CelulaAula,
  type Professora,
} from "@/lib/types";
import { formatarDataBR } from "@/lib/date-utils";

// Busca por nome pra achar rapidamente em que dia/horário um aluno tem aula
// na semana que está sendo exibida na grade — não muda a semana nem o dia
// selecionados, só ajuda a encontrar (clicar num resultado pula pro dia).
export function BuscaAlunoNaSemana({
  alunos,
  celulasPorData,
  datasSemana,
  professoras,
  onIrParaDia,
}: {
  alunos: Aluno[];
  celulasPorData: Record<string, CelulaAula[]>;
  datasSemana: string[];
  professoras: Professora[];
  onIrParaDia: (dia: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Aluno | null>(null);

  const nomeProf = new Map(professoras.map((p) => [p.id, p.nome]));

  const filtrados = busca.trim()
    ? alunos
        .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .slice(0, 8)
    : [];

  const aulasDaSemana = selecionado
    ? datasSemana
        .map((data, i) => ({
          dia: i + 1,
          data,
          celulas: (celulasPorData[data] ?? []).filter((c) => c.aluno_id === selecionado.id),
        }))
        .filter((d) => d.celulas.length > 0)
    : [];

  return (
    <div className="print:hidden relative">
      <input
        value={selecionado ? selecionado.nome : busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setSelecionado(null);
        }}
        placeholder="🔍 Achar horário de um aluno…"
        className="w-56 rounded-md border border-input bg-card px-3 py-1.5 text-sm"
      />
      {filtrados.length > 0 && !selecionado && (
        <ul className="absolute z-20 mt-1 w-64 rounded-md border border-border bg-card shadow-md">
          {filtrados.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => {
                  setSelecionado(a);
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
      {selecionado && (
        <div className="absolute z-20 mt-1 w-72 rounded-md border border-border bg-card shadow-md p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">{selecionado.nome}</span>
            <button
              onClick={() => setSelecionado(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {aulasDaSemana.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-1">
              Sem aula agendada nesta semana.
            </p>
          ) : (
            <ul className="space-y-1">
              {aulasDaSemana.map(({ dia, data, celulas }) =>
                celulas.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        onIrParaDia(dia);
                        setSelecionado(null);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent"
                    >
                      <span className="font-medium">{DIAS_SEMANA[dia - 1].nome}</span>{" "}
                      <span className="text-muted-foreground">{formatarDataBR(data)}</span>
                      {" · "}
                      {c.horario_especifico ?? HORARIO_INICIO_PERIODO[c.periodo]}
                      {" · "}
                      {nomeProf.get(c.professora_id) ?? "?"}
                      {" · "}
                      {ROTULO_TIPO[c.tipo]}
                    </button>
                  </li>
                )),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
