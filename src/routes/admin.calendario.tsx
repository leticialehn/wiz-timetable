import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getCalendarioExcecoes,
  criarCalendarioExcecoes,
  removerCalendarioExcecao,
} from "@/lib/calendario.functions";
import {
  ROTULO_TIPO_CALENDARIO,
  ROTULO_GRUPO,
  type TipoCalendarioExcecao,
  type GrupoCalendario,
} from "@/lib/types";
import { toISODate, formatarDataBR, inicioDoMes } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/calendario")({ component: CalendarioPage });

const TIPOS: TipoCalendarioExcecao[] = ["feriado", "recesso", "ferias"];
const GRUPOS: GrupoCalendario[] = ["todos", "kids", "teens", "adultos"];
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
    },
  });
  const remover = useMutation({
    mutationFn: useServerFn(removerCalendarioExcecao),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendario-excecoes"] }),
  });

  const [mesAtual, setMesAtual] = useState(() => inicioDoMes());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [tipo, setTipo] = useState<TipoCalendarioExcecao>("feriado");
  const [grupo, setGrupo] = useState<GrupoCalendario>("todos");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const excecoesPorData = useMemo(() => {
    const m = new Map<string, typeof excecoes>();
    for (const e of excecoes ?? []) {
      if (!m.has(e.data)) m.set(e.data, []);
      m.get(e.data)!.push(e);
    }
    return m;
  }, [excecoes]);

  const dias = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const primeiroDow = new Date(ano, mes, 1).getDay();
    const lista: (string | null)[] = Array(primeiroDow).fill(null);
    for (let d = 1; d <= ultimoDia; d++) {
      lista.push(toISODate(new Date(ano, mes, d)));
    }
    return lista;
  }, [mesAtual]);

  function alternarDia(iso: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(iso)) novo.delete(iso);
      else novo.add(iso);
      return novo;
    });
  }

  function aplicar() {
    setErro(null);
    if (selecionados.size === 0) {
      setErro("Clique em pelo menos um dia no calendário.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Descreva o motivo (ex.: Corpus Christi, Recesso de julho…).");
      return;
    }
    criar.mutate({
      data: { datas: [...selecionados], tipo, descricao: descricao.trim(), grupo },
    });
  }

  const proximas = (excecoes ?? [])
    .filter((e) => e.data >= toISODate(new Date()))
    .sort((a, b) => a.data.localeCompare(b.data));

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-1">Calendário escolar</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Clique nos dias sem aula, escolha quem é afetado e descreva o motivo. Esses dias não contam
        faltas nem "sem aula" nos alertas, e aparecem avisados na tela da professora.
      </p>

      <div className="rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="px-2 py-1 rounded border border-border hover:bg-accent text-sm"
          >
            ← Mês anterior
          </button>
          <div className="font-semibold">
            {mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="px-2 py-1 rounded border border-border hover:bg-accent text-sm"
          >
            Próximo mês →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA_CURTO.map((d, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const existentes = excecoesPorData.get(iso) ?? [];
            const selecionado = selecionados.has(iso);
            return (
              <button
                key={iso}
                onClick={() => alternarDia(iso)}
                title={existentes.map((e) => e.descricao).join(", ")}
                className={`aspect-square rounded text-xs flex flex-col items-center justify-center gap-0.5 border ${
                  selecionado
                    ? "bg-primary text-primary-foreground border-primary"
                    : existentes.length > 0
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400"
                      : "border-border hover:bg-accent"
                }`}
              >
                <span>{parseInt(iso.slice(-2), 10)}</span>
                {existentes.length > 0 && <span className="text-[9px]">🎉</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-primary">
          {selecionados.size === 0
            ? "Selecione os dias no calendário acima"
            : `${selecionados.size} dia${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`text-xs px-2.5 py-1.5 rounded border ${
                tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {ROTULO_TIPO_CALENDARIO[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {GRUPOS.map((g) => (
            <button
              key={g}
              onClick={() => setGrupo(g)}
              className={`text-xs px-2.5 py-1.5 rounded border ${
                grupo === g
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
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <button
          onClick={aplicar}
          disabled={criar.isPending}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
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
              key={e.id}
              className="rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap"
            >
              <div>
                <span className="font-medium">{formatarDataBR(e.data)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {ROTULO_TIPO_CALENDARIO[e.tipo]} · {ROTULO_GRUPO[e.grupo]} · {e.descricao}
                </span>
              </div>
              <button
                onClick={() => remover.mutate({ data: { id: e.id } })}
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
