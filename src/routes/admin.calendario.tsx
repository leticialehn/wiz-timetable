import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getCalendarioExcecoes,
  criarCalendarioExcecoes,
  removerCalendarioExcecoes,
} from "@/lib/calendario.functions";
import {
  ROTULO_TIPO_CALENDARIO,
  ROTULO_GRUPO,
  type TipoCalendarioExcecao,
  type GrupoCalendario,
  type CalendarioExcecao,
} from "@/lib/types";
import {
  toISODate,
  parseISODate,
  formatarDataBR,
  inicioDoMes,
  feriadosNacionais,
} from "@/lib/date-utils";

export const Route = createFileRoute("/admin/calendario")({ component: CalendarioPage });

const TIPOS: TipoCalendarioExcecao[] = ["feriado", "recesso", "ferias"];
const GRUPOS: GrupoCalendario[] = ["kids", "teens", "adultos"];
const DIAS_SEMANA_CURTO = ["D", "S", "T", "Q", "Q", "S", "S"];

function CalendarioPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getCalendarioExcecoes);
  const { data: excecoes } = useQuery({
    queryKey: ["calendario-excecoes"],
    queryFn: () => getFn(),
  });

  const criar = useMutation({
    mutationFn: useServerFn(criarCalendarioExcecoes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario-excecoes"] });
      setSelecionados(new Set());
      setDescricao("");
      setGruposSelecionados(new Set());
    },
  });
  const remover = useMutation({
    mutationFn: useServerFn(removerCalendarioExcecoes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendario-excecoes"] }),
  });

  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [mesAtual, setMesAtual] = useState(() => inicioDoMes());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [tipo, setTipo] = useState<TipoCalendarioExcecao>("feriado");
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<GrupoCalendario>>(new Set());
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const excecoesPorData = useMemo(() => {
    const m = new Map<string, CalendarioExcecao[]>();
    for (const e of excecoes ?? []) {
      if (!m.has(e.data)) m.set(e.data, []);
      m.get(e.data)!.push(e);
    }
    return m;
  }, [excecoes]);

  const proximoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1);

  function alternarDia(iso: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(iso)) novo.delete(iso);
      else novo.add(iso);
      return novo;
    });
  }

  function alternarGrupo(g: GrupoCalendario) {
    setGruposSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(g)) novo.delete(g);
      else novo.add(g);
      return novo;
    });
  }

  function aplicar() {
    setErro(null);
    if (selecionados.size === 0) {
      setErro("Clique em pelo menos um dia no calendário.");
      return;
    }
    if (gruposSelecionados.size === 0) {
      setErro("Marque pelo menos um grupo (Kids, Teens ou Adultos).");
      return;
    }
    if (!descricao.trim()) {
      setErro("Descreva o motivo (ex.: Corpus Christi, Recesso de julho…).");
      return;
    }
    criar.mutate({
      data: {
        datas: [...selecionados],
        tipo,
        descricao: descricao.trim(),
        grupos: [...gruposSelecionados],
      },
    });
  }

  // Junta exceções com a mesma data+tipo+descrição numa linha só (ex.: marcar
  // Kids e Teens de uma vez gera 2 linhas no banco, mas aparece "Kids, Teens"
  // junto aqui em vez de duas linhas iguais).
  const proximas = useMemo(() => {
    const grupos = new Map<
      string,
      {
        data: string;
        tipo: TipoCalendarioExcecao;
        descricao: string;
        grupos: GrupoCalendario[];
        ids: string[];
      }
    >();
    for (const e of (excecoes ?? []).filter((e) => e.data >= toISODate(new Date()))) {
      const chave = `${e.data}|${e.tipo}|${e.descricao}`;
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          data: e.data,
          tipo: e.tipo,
          descricao: e.descricao,
          grupos: [],
          ids: [],
        });
      }
      const grupo = grupos.get(chave)!;
      grupo.grupos.push(e.grupo as GrupoCalendario);
      grupo.ids.push(e.id);
    }
    return [...grupos.values()].sort((a, b) => a.data.localeCompare(b.data));
  }, [excecoes]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-1.5 mb-3">
        <h1 className="text-xl font-semibold">Calendário escolar</h1>
        <button
          type="button"
          onClick={() => setMostrarAjuda((v) => !v)}
          title="Como funciona"
          className="w-5 h-5 rounded-full border border-border text-[11px] text-muted-foreground hover:bg-accent flex items-center justify-center"
        >
          ?
        </button>
      </div>
      {mostrarAjuda && (
        <p className="text-xs text-muted-foreground mb-3 -mt-2">
          Clique nos dias sem aula, marque quem é afetado e descreva o motivo. Esses dias não contam
          faltas nem "sem aula" nos alertas, e aparecem avisados na tela da professora.
        </p>
      )}

      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="px-2 py-1 rounded border border-border hover:bg-accent text-xs"
        >
          ← Mês anterior
        </button>
        <button
          onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="px-2 py-1 rounded border border-border hover:bg-accent text-xs"
        >
          Próximo mês →
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <MesCalendario
          mes={mesAtual}
          excecoesPorData={excecoesPorData}
          selecionados={selecionados}
          onAlternarDia={alternarDia}
        />
        <MesCalendario
          mes={proximoMes}
          excecoesPorData={excecoesPorData}
          selecionados={selecionados}
          onAlternarDia={alternarDia}
        />
      </div>

      <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3 mb-4 space-y-2">
        <h2 className="text-xs font-semibold text-primary">
          {selecionados.size === 0
            ? "Selecione os dias no calendário acima"
            : `${selecionados.size} dia${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`text-xs px-2 py-1 rounded border ${
                tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {ROTULO_TIPO_CALENDARIO[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GRUPOS.map((g) => (
            <button
              key={g}
              onClick={() => alternarGrupo(g)}
              className={`text-xs px-2 py-1 rounded border ${
                gruposSelecionados.has(g)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {ROTULO_GRUPO[g]}
            </button>
          ))}
        </div>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (ex.: Corpus Christi — antecipado)"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        />
        {erro && <p className="text-xs text-destructive">{erro}</p>}
        <button
          onClick={aplicar}
          disabled={criar.isPending}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {criar.isPending ? "Salvando…" : "Adicionar"}
        </button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-2">Próximas datas</h2>
      {proximas.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma data marcada.</p>
      ) : (
        <ul className="space-y-1.5">
          {proximas.map((e) => (
            <li
              key={`${e.data}|${e.tipo}|${e.descricao}`}
              className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap"
            >
              <div>
                <span className="font-medium">{formatarDataBR(e.data)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {ROTULO_TIPO_CALENDARIO[e.tipo]} ·{" "}
                  {e.grupos.map((g) => ROTULO_GRUPO[g]).join(", ")} · {e.descricao}
                </span>
              </div>
              <button
                onClick={() => remover.mutate({ data: { ids: e.ids } })}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive hover:text-destructive-foreground"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function MesCalendario({
  mes,
  excecoesPorData,
  selecionados,
  onAlternarDia,
}: {
  mes: Date;
  excecoesPorData: Map<string, CalendarioExcecao[]>;
  selecionados: Set<string>;
  onAlternarDia: (iso: string) => void;
}) {
  const dias = useMemo(() => {
    const ano = mes.getFullYear();
    const m = mes.getMonth();
    const ultimoDia = new Date(ano, m + 1, 0).getDate();
    const primeiroDow = new Date(ano, m, 1).getDay();
    const lista: (string | null)[] = Array(primeiroDow).fill(null);
    for (let d = 1; d <= ultimoDia; d++) {
      lista.push(toISODate(new Date(ano, m, d)));
    }
    return lista;
  }, [mes]);

  const feriados = useMemo(() => {
    const ano = mes.getFullYear();
    const m = mes.getMonth();
    return feriadosNacionais(ano).filter((f) => parseISODate(f.data).getMonth() === m);
  }, [mes]);

  return (
    <div className="rounded-lg border border-border p-2 w-[190px]">
      <div className="text-center text-xs font-semibold mb-1.5">
        {(() => {
          const rotulo = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
          return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
        })()}
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DIAS_SEMANA_CURTO.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const existentes = excecoesPorData.get(iso) ?? [];
          const selecionado = selecionados.has(iso);
          return (
            <button
              key={iso}
              onClick={() => onAlternarDia(iso)}
              title={[...new Set(existentes.map((e) => e.descricao))].join(", ")}
              className={`aspect-square rounded text-[10px] flex items-center justify-center border ${
                selecionado
                  ? "bg-primary text-primary-foreground border-primary"
                  : existentes.length > 0
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400"
                    : "border-border hover:bg-accent"
              }`}
            >
              {parseInt(iso.slice(-2), 10)}
            </button>
          );
        })}
      </div>
      {feriados.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-border space-y-0.5">
          {feriados.map((f) => (
            <div key={f.data} className="text-[9px] text-muted-foreground leading-tight">
              {formatarDataBR(f.data)} — {f.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
