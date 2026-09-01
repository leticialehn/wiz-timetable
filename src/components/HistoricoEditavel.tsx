import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHistoricoAluno, type HistoricoItem } from "@/lib/historico.functions";
import { setNota, setPresenca, setLicao } from "@/lib/presenca.functions";
import { formatarDataBR, diaSemanaISO } from "@/lib/date-utils";
import { normalizarLicao } from "@/lib/licoes";
import {
  HORARIO_INICIO_PERIODO,
  CAMPOS_NOTA,
  NIVEIS,
  type CampoNota,
  type ConceitoNota,
  type StatusPresenca,
} from "@/lib/types";
import { NotaEditavel } from "./NotaEditavel";

const OPCOES_PRESENCA: { valor: StatusPresenca; rotulo: string; curto: string }[] = [
  { valor: "presente", rotulo: "Presente", curto: "P" },
  { valor: "falta", rotulo: "Faltou", curto: "F" },
  { valor: "falta_avisada", rotulo: "Faltou (avisou)", curto: "FA" },
];

// Corrige um erro de lançamento (ex.: professora marcou falta sem querer num
// aluno que veio de verdade, ou uma presença/nota foi lançada no livro
// errado) direto na tabela, igual já dá pra fazer com as notas — sem
// precisar refazer o lançamento do zero. Clicar na opção já marcada desclica
// e apaga o lançamento de presença dessa aula.
function PresencaEditavel({
  valor,
  disabled,
  onSelecionar,
}: {
  valor: StatusPresenca | null;
  disabled: boolean;
  onSelecionar: (v: StatusPresenca | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {OPCOES_PRESENCA.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={valor === o.valor ? `${o.rotulo} (clique de novo pra desmarcar)` : o.rotulo}
          disabled={disabled}
          onClick={() => onSelecionar(valor === o.valor ? null : o.valor)}
          className={`px-1.5 h-6 rounded text-[10px] font-bold border disabled:opacity-50 ${
            valor === o.valor
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          {o.curto}
        </button>
      ))}
    </div>
  );
}

// Corrige o número da lição lançado errado — salva ao sair do campo ou
// apertar Enter, não a cada tecla. Esc desfaz o que ainda não foi salvo.
function LicaoEditavel({
  valor,
  disabled,
  onSalvar,
}: {
  valor: string;
  disabled: boolean;
  onSalvar: (v: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => {
    setTexto(valor);
  }, [valor]);

  function confirmar() {
    const normalizado = normalizarLicao(texto.trim());
    if (normalizado && normalizado !== valor) onSalvar(normalizado);
    else setTexto(valor);
  }

  return (
    <input
      type="text"
      value={texto}
      disabled={disabled}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setTexto(valor);
      }}
      placeholder="—"
      className="w-16 rounded border border-input bg-background px-1 py-0.5 text-xs disabled:opacity-50"
    />
  );
}

// Histórico completo de aulas do aluno (todas as lições, não só revisões), com
// presença, lição e notas editáveis clicando direto na tabela — usado tanto
// pela professora quanto pelo admin, inclusive pra corrigir uma falta ou uma
// lição lançada errado, ou pra lançar a nota de Escrita de uma tarefa que
// chegou atrasada, em qualquer aula anterior, não só na de hoje.
export function HistoricoEditavel({ alunoId }: { alunoId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getHistoricoAluno);
  const notaFn = useServerFn(setNota);
  const presencaFn = useServerFn(setPresenca);
  const licaoFn = useServerFn(setLicao);
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", alunoId],
    queryFn: () => getFn({ data: { aluno_id: alunoId } }),
  });

  async function salvarNota(item: HistoricoItem, campo: CampoNota, valor: ConceitoNota | null) {
    const chaveCelula = `${item.chave}-${campo}`;
    setSalvandoCelula(chaveCelula);
    try {
      await notaFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: alunoId,
          periodo: item.periodo,
          parte: item.parte,
          campo,
          valor,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  async function salvarPresenca(item: HistoricoItem, status: StatusPresenca | null) {
    const chaveCelula = `${item.chave}-presenca`;
    setSalvandoCelula(chaveCelula);
    try {
      await presencaFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: alunoId,
          periodo: item.periodo,
          parte: item.parte,
          dia_semana: diaSemanaISO(item.data),
          status,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  async function salvarLicao(item: HistoricoItem, novaLicao: string, nivelAtualDoAluno: string) {
    const chaveCelula = `${item.chave}-licao`;
    setSalvandoCelula(chaveCelula);
    try {
      await licaoFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: alunoId,
          periodo: item.periodo,
          parte: item.parte,
          licao: novaLicao,
          nivel_no_momento: item.nivel_no_momento ?? nivelAtualDoAluno,
          praticado: item.praticado ?? true,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  // Corrige o nível gravado numa lição já lançada — pro caso de terem
  // esquecido de trocar o livro do aluno na aba Alunos antes de dar aula, e o
  // sistema ter gravado a lição no nível antigo por engano.
  async function salvarNivel(item: HistoricoItem, novoNivel: string) {
    if (!item.licao) return;
    const chaveCelula = `${item.chave}-nivel`;
    setSalvandoCelula(chaveCelula);
    try {
      await licaoFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: alunoId,
          periodo: item.periodo,
          parte: item.parte,
          licao: item.licao,
          nivel_no_momento: novoNivel,
          praticado: item.praticado ?? true,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  // Marca "praticado" sem precisar a professora reabrir a aula do dia — pro
  // caso de uma lição ter ficado pendente de confirmação (aluno só fez
  // estudo individual) e a coordenação já saber que foi de fato dada.
  async function confirmarLicao(item: HistoricoItem) {
    if (!item.licao || !item.nivel_no_momento) return;
    const chaveCelula = `${item.chave}-licao`;
    setSalvandoCelula(chaveCelula);
    try {
      await licaoFn({
        data: {
          data: item.data,
          professora_id: item.professora_id,
          aluno_id: alunoId,
          periodo: item.periodo,
          parte: item.parte,
          licao: item.licao,
          nivel_no_momento: item.nivel_no_momento,
          praticado: true,
        },
      });
      qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });
    } finally {
      setSalvandoCelula(null);
    }
  }

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>;

  return (
    <>
      <h1 className="text-xl font-bold mb-1">
        {data.aluno.nome} - {data.aluno.nivel}
      </h1>
      <p className="text-[10px] text-muted-foreground mb-4">
        O - Ótimo &nbsp; MB - Muito Bom &nbsp; B - Bom &nbsp; R - Regular &nbsp;&nbsp; P - Presente
        &nbsp; F - Faltou &nbsp; FA - Faltou (avisou)
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
                <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Presença</th>
                <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Lição</th>
                <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Nível</th>
                {CAMPOS_NOTA.map(({ key, label }) => (
                  <th key={key} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.timeline.map((item) => {
                return (
                  <tr key={item.chave} className="border-t border-border">
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatarDataBR(item.data)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {HORARIO_INICIO_PERIODO[item.periodo] ?? item.periodo}
                      {item.parte > 1 && (
                        <span className="text-muted-foreground"> ({item.parte}ª lição)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <PresencaEditavel
                        valor={item.presenca}
                        disabled={salvandoCelula === `${item.chave}-presenca`}
                        onSelecionar={(v) => salvarPresenca(item, v)}
                      />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <LicaoEditavel
                        valor={item.licao ?? ""}
                        disabled={salvandoCelula === `${item.chave}-licao`}
                        onSalvar={(v) => salvarLicao(item, v, data.aluno.nivel)}
                      />
                      {item.praticado === false && (
                        <button
                          type="button"
                          title="Pendente de confirmação — clique para marcar como praticada"
                          disabled={salvandoCelula === `${item.chave}-licao`}
                          onClick={() => confirmarLicao(item)}
                          className="text-amber-600 dark:text-amber-400 disabled:opacity-50"
                        >
                          {" "}
                          ⏳
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {item.nivel_no_momento ? (
                        <select
                          value={item.nivel_no_momento}
                          disabled={salvandoCelula === `${item.chave}-nivel`}
                          onChange={(e) => salvarNivel(item, e.target.value)}
                          title="Corrigir o nível gravado nesta lição (ex.: esqueceram de trocar o livro do aluno antes de lançar)"
                          className="rounded border border-input bg-background px-1 py-0.5 text-xs disabled:opacity-50"
                        >
                          {NIVEIS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
  );
}
