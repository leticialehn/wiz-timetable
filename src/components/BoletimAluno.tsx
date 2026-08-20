import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

// Uma linha de revisão (R1..R10): as 4 notas são sempre clicáveis, tenha ou
// não lançamento ainda. Se ainda não existe (comum em aluno que já estava no
// meio/fim do livro quando a escola começou a usar o site), o clique na 1ª
// nota já cria a presença+lição por trás (hoje, período "de mentira" livre
// naquele dia) — sem pedir data nem professora, é só um registro de apoio
// pro boletim, não uma aula de verdade marcada na grade.
function LinhaRevisao({
  alunoId,
  alunoNivel,
  revisao,
  registro,
  professoraPadraoId,
  timeline,
  onSalvo,
}: {
  alunoId: string;
  alunoNivel: string;
  revisao: number;
  registro: HistoricoItem | undefined;
  professoraPadraoId: string | undefined;
  timeline: HistoricoItem[];
  onSalvo: () => void;
}) {
  const presencaFn = useServerFn(setPresenca);
  const notaFn = useServerFn(setNota);
  const licaoFn = useServerFn(setLicao);
  const [salvandoCampo, setSalvandoCampo] = useState<CampoNota | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function periodoLivre(data: string, professoraId: string): number {
    const ocupados = new Set(
      timeline
        .filter((t) => t.data === data && t.professora_id === professoraId)
        .map((t) => t.periodo),
    );
    for (let p = 1; p <= 12; p++) if (!ocupados.has(p)) return p;
    return 12;
  }

  async function salvarCampo(campo: CampoNota, valor: ConceitoNota | null) {
    setErro(null);
    setSalvandoCampo(campo);
    try {
      if (registro) {
        await notaFn({
          data: {
            data: registro.data,
            professora_id: registro.professora_id,
            aluno_id: alunoId,
            periodo: registro.periodo,
            parte: registro.parte,
            campo,
            valor,
          },
        });
      } else {
        if (!professoraPadraoId) {
          setErro("Cadastre uma professora antes.");
          return;
        }
        const data = toISODate(new Date());
        const periodo = periodoLivre(data, professoraPadraoId);
        const base = {
          data,
          professora_id: professoraPadraoId,
          aluno_id: alunoId,
          periodo,
          parte: 1,
        };
        await presencaFn({ data: { ...base, dia_semana: diaSemanaISO(data), status: "presente" } });
        await licaoFn({
          data: { ...base, licao: `R${revisao}`, nivel_no_momento: alunoNivel, praticado: true },
        });
        await notaFn({ data: { ...base, campo, valor } });
      }
      onSalvo();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoCampo(null);
    }
  }

  return (
    <>
      <tr className="border-b border-border/60">
        <td className="py-2 pr-3 font-semibold whitespace-nowrap">R{revisao}</td>
        {CAMPOS_NOTA.map(({ key }) => (
          <td key={key} className="py-2 pr-3">
            <span className="print:inline hidden">{registro?.notas?.[key] ?? "—"}</span>
            <span className="print:hidden">
              <NotaEditavel
                valor={registro?.notas?.[key] ?? null}
                disabled={salvandoCampo === key}
                onSelecionar={(v) => salvarCampo(key, v)}
              />
            </span>
          </td>
        ))}
      </tr>
      {erro && (
        <tr className="print:hidden">
          <td colSpan={CAMPOS_NOTA.length + 1} className="pb-2 text-xs text-rose-600">
            {erro}
          </td>
        </tr>
      )}
    </>
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
  const { data, isLoading } = useQuery({
    queryKey: ["historico-aluno", alunoId],
    queryFn: () => getFn({ data: { aluno_id: alunoId } }),
  });

  // Livro sendo visto no boletim — começa no nível atual do aluno, mas dá
  // pra trocar pra um livro anterior (ex.: aluno que já trocou de nível e
  // você quer ver/completar o boletim do livro de antes).
  const [nivelEscolhido, setNivelEscolhido] = useState<string | null>(null);

  // Todo nível que já apareceu em alguma lição, mais o nível atual (mesmo que
  // ele ainda não tenha nenhuma lição lançada) — ordenado do mais recente
  // praticado pro mais antigo, com o atual sempre primeiro.
  const niveisComHistorico = useMemo(() => {
    if (!data) return [];
    const ultimaDataPorNivel = new Map<string, string>();
    for (const item of data.timeline) {
      if (!item.nivel_no_momento) continue;
      const atual = ultimaDataPorNivel.get(item.nivel_no_momento);
      if (!atual || item.data > atual) ultimaDataPorNivel.set(item.nivel_no_momento, item.data);
    }
    if (!ultimaDataPorNivel.has(data.aluno.nivel)) ultimaDataPorNivel.set(data.aluno.nivel, "");
    return [...ultimaDataPorNivel.entries()]
      .sort(([nivelA, dataA], [nivelB, dataB]) => {
        if (nivelA === data.aluno.nivel) return -1;
        if (nivelB === data.aluno.nivel) return 1;
        return dataB.localeCompare(dataA);
      })
      .map(([nivel]) => nivel);
  }, [data]);

  const nivelAtivo = nivelEscolhido ?? data?.aluno.nivel ?? "";

  const revisaoPorNumero = useMemo(() => {
    const mapa = new Map<number, HistoricoItem>();
    if (!data) return mapa;
    // timeline vem do mais recente pro mais antigo — a 1ª ocorrência de cada
    // número é a mais recente, então redos não sobrescrevem por engano.
    for (const item of data.timeline) {
      if (item.nivel_no_momento !== nivelAtivo) continue;
      const n = numeroRevisao(item.licao);
      if (n !== null && !mapa.has(n)) mapa.set(n, item);
    }
    return mapa;
  }, [data, nivelAtivo]);

  const aulasNesteLivro = useMemo(() => {
    if (!data) return 0;
    return data.timeline.filter(
      (t) => t.presenca === "presente" && t.nivel_no_momento === nivelAtivo,
    ).length;
  }, [data, nivelAtivo]);

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (!data) return <p className="text-muted-foreground text-sm">Aluno não encontrado.</p>;

  const { aluno, resumo, timeline } = data;
  const hojeBR = formatarDataBR(toISODate(new Date()));
  const onSalvo = () => qc.invalidateQueries({ queryKey: ["historico-aluno", alunoId] });

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
      <div className="flex items-center gap-2 mb-6">
        <p className="text-sm text-muted-foreground">
          Nível {nivelAtivo}
          {nivelAtivo === aluno.nivel ? " (atual)" : ""}
          {!aluno.ativo && " · Inativo"}
        </p>
        {niveisComHistorico.length > 1 && (
          <select
            value={nivelAtivo}
            onChange={(e) => setNivelEscolhido(e.target.value)}
            className="print:hidden text-xs rounded-md border border-input bg-background px-2 py-1"
          >
            {niveisComHistorico.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
                {nivel === aluno.nivel ? " (atual)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm">
        <ResumoCard label="Aulas no mês" valor={resumo.aulasNoMes} />
        <ResumoCard label="Aulas neste livro" valor={aulasNesteLivro} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Notas das revisões</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">Revisão</th>
              {CAMPOS_NOTA.map(({ key, label }) => (
                <th key={key} className="py-2 pr-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_REVISAO.map((n) => (
              <LinhaRevisao
                key={n}
                alunoId={alunoId}
                alunoNivel={nivelAtivo}
                revisao={n}
                registro={revisaoPorNumero.get(n)}
                professoraPadraoId={professoras[0]?.id}
                timeline={timeline}
                onSalvo={onSalvo}
              />
            ))}
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
