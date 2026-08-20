import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getHistoricoAluno, type HistoricoItem } from "@/lib/historico.functions";
import { setPresenca, setLicao, setNota } from "@/lib/presenca.functions";
import { formatarDataBR, toISODate, diaSemanaISO } from "@/lib/date-utils";
import { CAMPOS_NOTA, type CampoNota, type ConceitoNota, type Professora } from "@/lib/types";
import { NotaEditavel } from "./NotaEditavel";

const REGEX_REVISAO = /^R(\d+)$/;
const NUMEROS_REVISAO = Array.from({ length: 10 }, (_, i) => i + 1);

function numeroRevisao(licao: string | null): number | null {
  if (!licao) return null;
  const m = REGEX_REVISAO.exec(licao);
  return m ? parseInt(m[1], 10) : null;
}

function ResumoCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{valor}</div>
    </div>
  );
}

// Preenche do zero uma revisão que nunca foi lançada (comum em aluno que já
// estava no meio/fim do livro quando a escola começou a usar o site) —
// presença, lição (R1..R10) e as 4 notas, tudo num horário "de mentira"
// (período escolhido automaticamente pra não colidir com nada real do dia).
function EditorRevisaoFaltante({
  alunoId,
  alunoNivel,
  revisao,
  professoras,
  timeline,
  onSalvo,
}: {
  alunoId: string;
  alunoNivel: string;
  revisao: number;
  professoras: Professora[];
  timeline: HistoricoItem[];
  onSalvo: () => void;
}) {
  const presencaFn = useServerFn(setPresenca);
  const notaFn = useServerFn(setNota);
  const licaoFn = useServerFn(setLicao);
  const [aberto, setAberto] = useState(false);
  const [data, setDataCampo] = useState(() => toISODate(new Date()));
  const [professoraId, setProfessoraId] = useState(professoras[0]?.id ?? "");
  // professoras chega depois do 1º render (query separada) — sem isso o
  // select mostrava "Eduarda" na tela mas o estado continuava vazio por
  // baixo, e salvar dava "Escolha uma professora" mesmo com uma já visível.
  useEffect(() => {
    if (!professoraId && professoras[0]) setProfessoraId(professoras[0].id);
  }, [professoras, professoraId]);
  const [notas, setNotas] = useState<Record<CampoNota, ConceitoNota | null>>({
    fala: null,
    audicao: null,
    leitura: null,
    escrita: null,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Acha o 1º período (1..12) sem nenhum lançamento pra esse aluno+data+professora —
  // pra não sobrescrever por engano uma aula de verdade que já exista nesse dia.
  function periodoLivre(): number {
    const ocupados = new Set(
      timeline
        .filter((t) => t.data === data && t.professora_id === professoraId)
        .map((t) => t.periodo),
    );
    for (let p = 1; p <= 12; p++) if (!ocupados.has(p)) return p;
    return 12;
  }

  async function salvar() {
    if (!professoraId) {
      setErro("Escolha uma professora.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const periodo = periodoLivre();
      const base = { data, professora_id: professoraId, aluno_id: alunoId, periodo, parte: 1 };
      await presencaFn({ data: { ...base, dia_semana: diaSemanaISO(data), status: "presente" } });
      await licaoFn({
        data: { ...base, licao: `R${revisao}`, nivel_no_momento: alunoNivel, praticado: true },
      });
      for (const { key } of CAMPOS_NOTA) {
        const valor = notas[key];
        if (valor === null) continue;
        await notaFn({ data: { ...base, campo: key, valor } });
      }
      onSalvo();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="print:hidden text-xs px-2 py-1 rounded border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        + Adicionar nota
      </button>
    );
  }

  return (
    <div className="print:hidden flex flex-wrap items-end gap-3 bg-muted/40 rounded-md p-2">
      <label className="text-xs">
        <div className="text-muted-foreground mb-1">Data</div>
        <input
          type="date"
          value={data}
          onChange={(e) => setDataCampo(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        />
      </label>
      <label className="text-xs">
        <div className="text-muted-foreground mb-1">Professora</div>
        <select
          value={professoraId}
          onChange={(e) => setProfessoraId(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {professoras.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      {CAMPOS_NOTA.map(({ key, label }) => (
        <div key={key} className="text-xs">
          <div className="text-muted-foreground mb-1">{label}</div>
          <NotaEditavel
            valor={notas[key]}
            disabled={salvando}
            onSelecionar={(v) => setNotas((prev) => ({ ...prev, [key]: v }))}
          />
        </div>
      ))}
      <button
        onClick={salvar}
        disabled={salvando}
        className="text-xs px-2 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      <button
        onClick={() => setAberto(false)}
        disabled={salvando}
        className="text-xs px-2 py-1.5 rounded border border-border hover:bg-accent"
      >
        Cancelar
      </button>
      {erro && <p className="w-full text-xs text-rose-600">{erro}</p>}
    </div>
  );
}

// Boletim pra mandar pros pais: só as notas das revisões (não cada lição), sem
// nenhum dado de faltas/comportamento — foco em progresso no livro. Mostra
// sempre as 10 revisões do nível atual (mesmo as que ainda não têm nota),
// pra dar pra completar direto aqui um aluno que já vinha de antes do site.
export function BoletimAluno({
  alunoId,
  professoras,
}: {
  alunoId: string;
  professoras: Professora[];
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getHistoricoAluno);
  const notaFn = useServerFn(setNota);
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", alunoId],
    queryFn: () => getFn({ data: { aluno_id: alunoId } }),
  });

  const revisaoPorNumero = useMemo(() => {
    const mapa = new Map<number, HistoricoItem>();
    if (!data) return mapa;
    // timeline vem do mais recente pro mais antigo — a 1ª ocorrência de cada
    // número é a mais recente, então redos não sobrescrevem por engano.
    for (const item of data.timeline) {
      if (item.nivel_no_momento !== data.aluno.nivel) continue;
      const n = numeroRevisao(item.licao);
      if (n !== null && !mapa.has(n)) mapa.set(n, item);
    }
    return mapa;
  }, [data]);

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>;

  const { aluno, resumo, timeline } = data;
  const hojeBR = formatarDataBR(toISODate(new Date()));
  const onSalvo = () => qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });

  async function salvarNotaRevisao(r: HistoricoItem, campo: CampoNota, valor: ConceitoNota | null) {
    const chaveCelula = `${r.chave}-${campo}`;
    setSalvandoCelula(chaveCelula);
    try {
      await notaFn({
        data: {
          data: r.data,
          professora_id: r.professora_id,
          aluno_id: alunoId,
          periodo: r.periodo,
          parte: r.parte,
          campo,
          valor,
        },
      });
      onSalvo();
    } finally {
      setSalvandoCelula(null);
    }
  }

  return (
    <>
      <div className="print:hidden flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent bg-card"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="hidden print:flex items-center gap-3 mb-6">
        <img src="/wizard-logo.jpg" alt="Wizard" style={{ height: "16mm" }} />
        <div>
          <div className="text-lg font-semibold">Boletim do aluno</div>
          <div className="text-xs text-muted-foreground">Emitido em {hojeBR}</div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold mb-1">{aluno.nome}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Nível {aluno.nivel}
        {!aluno.ativo && " · Inativo"}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm">
        <ResumoCard label="Aulas no mês" valor={resumo.aulasNoMes} />
        <ResumoCard label="Aulas totais" valor={resumo.aulasNoLivroAtual} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Notas das revisões</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">Revisão</th>
              <th className="py-2 pr-3 font-medium">Data</th>
              {CAMPOS_NOTA.map(({ key, label }) => (
                <th key={key} className="py-2 pr-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_REVISAO.map((n) => {
              const r = revisaoPorNumero.get(n);
              return (
                <tr key={n} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap">R{n}</td>
                  {r ? (
                    <>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        {formatarDataBR(r.data)}
                      </td>
                      {CAMPOS_NOTA.map(({ key }) => (
                        <td key={key} className="py-2 pr-3">
                          <span className="print:inline hidden">{r.notas?.[key] ?? "—"}</span>
                          <span className="print:hidden">
                            <NotaEditavel
                              valor={r.notas?.[key] ?? null}
                              disabled={salvandoCelula === `${r.chave}-${key}`}
                              onSelecionar={(v) => salvarNotaRevisao(r, key, v)}
                            />
                          </span>
                        </td>
                      ))}
                    </>
                  ) : (
                    <td colSpan={5} className="py-2 pr-3">
                      <span className="print:inline hidden text-muted-foreground">—</span>
                      <EditorRevisaoFaltante
                        alunoId={alunoId}
                        alunoNivel={aluno.nivel}
                        revisao={n}
                        professoras={professoras}
                        timeline={timeline}
                        onSalvo={onSalvo}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          @page { margin: 12mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
