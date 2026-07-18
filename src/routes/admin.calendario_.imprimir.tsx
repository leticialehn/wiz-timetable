import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getCalendarioExcecoes } from "@/lib/calendario.functions";
import {
  ROTULO_TIPO_CALENDARIO,
  type TipoCalendarioExcecao,
  type GrupoCalendario,
  type CalendarioExcecao,
} from "@/lib/types";
import { toISODate } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/calendario_/imprimir")({
  component: ImprimirCalendarioPage,
});

const DIAS_SEMANA_CURTO = ["D", "S", "T", "Q", "Q", "S", "S"];
const NOMES_MESES = [
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

// Cores claras o bastante pra não escurecer o número do dia, mas visíveis na
// impressão/PDF — exige "imprimir cores de fundo" ligado, por isso o CSS de
// print força isso via print-color-adjust.
const COR_TIPO: Record<TipoCalendarioExcecao, string> = {
  feriado: "#fda4af",
  recesso: "#fcd34d",
  ferias: "#7dd3fc",
};

const AZUL_WIZARD = "#0a1e5c";

// Ordem fixa das 3 faixinhas embaixo do número do dia.
const GRUPOS_MINI: { grupo: GrupoCalendario; letra: string }[] = [
  { grupo: "kids", letra: "K" },
  { grupo: "teens", letra: "T" },
  { grupo: "adultos", letra: "A" },
];

// Cor da faixinha de um grupo nesse dia — "todos" cobre os 3, senão só o
// grupo específico daquela exceção.
function corDoGrupoNoDia(
  existentes: CalendarioExcecao[],
  grupo: GrupoCalendario,
): string | undefined {
  const excecao = existentes.find((e) => e.grupo === "todos" || e.grupo === grupo);
  return excecao ? COR_TIPO[excecao.tipo] : undefined;
}

function ImprimirCalendarioPage() {
  const getFn = useServerFn(getCalendarioExcecoes);
  const { data: excecoes } = useQuery({
    queryKey: ["calendario-excecoes"],
    queryFn: () => getFn(),
  });

  // Sempre abre no ano atual — nada de ano fixo pra lembrar de trocar.
  const [ano, setAno] = useState(() => new Date().getFullYear());

  const excecoesPorData = useMemo(() => {
    const m = new Map<string, CalendarioExcecao[]>();
    for (const e of excecoes ?? []) {
      if (!m.has(e.data)) m.set(e.data, []);
      m.get(e.data)!.push(e);
    }
    return m;
  }, [excecoes]);

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between px-4 print:hidden">
        <Link
          to="/admin/calendario"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          ← Voltar pro calendário
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAno((a) => a - 1)}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-sm"
          >
            ← {ano - 1}
          </button>
          <span className="font-semibold w-12 text-center">{ano}</span>
          <button
            onClick={() => setAno((a) => a + 1)}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-sm"
          >
            {ano + 1} →
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <div
        className="mx-auto bg-white shadow-lg print:shadow-none flex flex-col"
        style={{ width: "210mm", minHeight: "297mm", padding: "10mm" }}
      >
        <div className="flex items-center gap-4 mb-4">
          <img src="/wizard-logo.jpg" alt="Wizard" style={{ height: "16mm" }} />
          <h1 className="text-2xl font-bold" style={{ color: AZUL_WIZARD }}>
            Calendário Pedagógico {ano}
          </h1>
        </div>

        <div className="grid grid-cols-3 grid-rows-4 gap-3 flex-1">
          {NOMES_MESES.map((nome, mesIndex) => (
            <MesMiniatura
              key={mesIndex}
              ano={ano}
              mesIndex={mesIndex}
              nome={nome}
              excecoesPorData={excecoesPorData}
            />
          ))}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[9px] text-gray-600">
          {(Object.keys(COR_TIPO) as TipoCalendarioExcecao[]).map((t) => (
            <div key={t} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: COR_TIPO[t] }}
              />
              {ROTULO_TIPO_CALENDARIO[t]}
            </div>
          ))}
          <span className="ml-auto">
            As 3 faixinhas embaixo do número indicam quem é afetado: <strong>K</strong>ids ·{" "}
            <strong>T</strong>eens · <strong>A</strong>dultos
          </span>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function MesMiniatura({
  ano,
  mesIndex,
  nome,
  excecoesPorData,
}: {
  ano: number;
  mesIndex: number;
  nome: string;
  excecoesPorData: Map<string, CalendarioExcecao[]>;
}) {
  const dias = useMemo(() => {
    const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
    const primeiroDow = new Date(ano, mesIndex, 1).getDay();
    const lista: (string | null)[] = Array(primeiroDow).fill(null);
    for (let d = 1; d <= ultimoDia; d++) {
      lista.push(toISODate(new Date(ano, mesIndex, d)));
    }
    return lista;
  }, [ano, mesIndex]);

  return (
    <div className="border border-gray-300 rounded p-1.5 flex flex-col">
      <div className="text-center text-[11px] font-bold mb-1" style={{ color: AZUL_WIZARD }}>
        {nome}
      </div>
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DIAS_SEMANA_CURTO.map((d, i) => (
          <div key={i} className="text-center text-[7px] text-gray-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px flex-1" style={{ gridAutoRows: "1fr" }}>
        {dias.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const existentes = excecoesPorData.get(iso) ?? [];
          const afetados = GRUPOS_MINI.filter(({ grupo }) => corDoGrupoNoDia(existentes, grupo));
          return (
            <div
              key={iso}
              title={afetados.length > 0 ? afetados.map((g) => g.letra).join("+") : undefined}
              className="relative flex items-center justify-center overflow-hidden rounded-sm"
            >
              <div className="absolute inset-0 flex">
                {GRUPOS_MINI.map(({ grupo }) => (
                  <div
                    key={grupo}
                    className="flex-1"
                    style={{ backgroundColor: corDoGrupoNoDia(existentes, grupo) ?? "transparent" }}
                  />
                ))}
              </div>
              <span className="relative text-[7px] text-gray-800">
                {parseInt(iso.slice(-2), 10)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
