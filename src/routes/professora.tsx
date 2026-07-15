import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import {
  getLancamentosSemana,
  getHistoricoLicoes,
  setPresenca,
  setNota,
  setLicao,
} from "@/lib/presenca.functions";
import { temTrackingDeLicao, licaoSugerida, normalizarLicao } from "@/lib/licoes";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import {
  DIAS_SEMANA,
  ROTULO_TIPO,
  TIPO_FECHADO,
  TIPO_MOSTRA_LIVRO,
  CONCEITOS,
  CAMPOS_NOTA,
  HORARIO_INICIO_PERIODO,
  configDe,
  type CampoNota,
  type CelulaAula,
  type ConceitoNota,
  type HorarioConfig,
  type LicaoRow,
  type NotaRow,
  type PresencaRow,
  type Professora,
  type StatusPresenca,
  type TipoHorario,
} from "@/lib/types";
import {
  datasDaSemana,
  formatarDataBR,
  parseISODate,
  segundaDaSemana,
  somarSemanas,
  toISODate,
} from "@/lib/date-utils";

export const Route = createFileRoute("/professora")({
  component: ProfessoraPage,
  head: () => ({ meta: [{ title: "Minha grade — Professora" }] }),
});

const STORAGE_KEY = "escola:professora-id";

function ProfessoraPage() {
  useRealtimeGrade();
  const [professoraId, setProfessoraId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProfessoraId(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
  }, []);

  const [dataSegunda, setDataSegunda] = useState(() => toISODate(segundaDaSemana()));
  const datas = useMemo(() => datasDaSemana(parseISODate(dataSegunda)), [dataSegunda]);
  const hojeIso = toISODate(new Date());
  const [diaAtivo, setDiaAtivo] = useState<number>(() => {
    const dow = new Date().getDay();
    return dow >= 1 && dow <= 6 ? dow : 1;
  });
  const dataDoDia = datas[diaAtivo - 1];

  const getGradeFn = useServerFn(getGradeSemana);
  const { data: grade } = useQuery({
    queryKey: ["grade-semana-prof", dataSegunda],
    queryFn: () => getGradeFn({ data: { dataSegunda } }),
  });

  const getLancFn = useServerFn(getLancamentosSemana);
  const { data: lanc } = useQuery({
    queryKey: ["lancamentos-semana", dataSegunda, professoraId],
    enabled: !!professoraId,
    queryFn: () =>
      getLancFn({
        data: {
          dataSegunda,
          dataFim: datas[datas.length - 1],
          professora_id: professoraId!,
        },
      }),
  });

  const cels = (grade?.celulasPorData[dataDoDia] ?? []).filter(
    (c) => c.professora_id === professoraId,
  );
  const alunoIdsHoje = useMemo(
    () => [...new Set(cels.filter((c) => c.aluno_id).map((c) => c.aluno_id as string))],
    [cels],
  );

  const getHistoricoLicoesFn = useServerFn(getHistoricoLicoes);
  const { data: historicoLicoes } = useQuery({
    queryKey: ["historico-licoes", dataDoDia, alunoIdsHoje],
    enabled: alunoIdsHoje.length > 0,
    queryFn: () => getHistoricoLicoesFn({ data: { aluno_ids: alunoIdsHoje, antesDe: dataDoDia } }),
  });

  if (!mounted) return null;

  if (!professoraId || !grade?.professoras.find((p) => p.id === professoraId)) {
    return (
      <SelecaoProfessora
        professoras={grade?.professoras ?? []}
        onEscolher={(id) => {
          localStorage.setItem(STORAGE_KEY, id);
          setProfessoraId(id);
        }}
      />
    );
  }

  const professora = grade.professoras.find((p) => p.id === professoraId)!;
  const presencasDoDia = (lanc?.presencas ?? []).filter((p) => p.data === dataDoDia);
  const notasDoDia = (lanc?.notas ?? []).filter((n) => n.data === dataDoDia);
  const licoesDoDia = (lanc?.licoes ?? []).filter((l) => l.data === dataDoDia);

  const semanaAtualIso = toISODate(segundaDaSemana());
  const eSemanaPassada = dataSegunda < semanaAtualIso;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: professora.cor }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">Professora</div>
            <h1 className="text-2xl font-bold">{professora.nome}</h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setProfessoraId(null);
            }}
            className="text-xs px-3 py-1.5 rounded bg-black/10 hover:bg-black/20"
          >
            Trocar
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-3">
          <button
            onClick={() => setDataSegunda(semanaAtualIso)}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent mb-2"
          >
            Semana atual
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDataSegunda(somarSemanas(dataSegunda, -1))}
              className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent"
            >
              ← Semana anterior
            </button>
            <button
              onClick={() => setDataSegunda(somarSemanas(dataSegunda, 1))}
              className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent"
            >
              Próxima semana →
            </button>
            <div className="text-xs text-muted-foreground">
              {formatarDataBR(datas[0])} a {formatarDataBR(datas[5])}
              {eSemanaPassada && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-muted uppercase text-[10px] font-bold">
                  histórico
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
          {DIAS_SEMANA.map((d, i) => {
            const iso = datas[i];
            const eHoje = iso === hojeIso;
            const passou = iso < hojeIso;
            return (
              <button
                key={d.n}
                onClick={() => setDiaAtivo(d.n)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  diaAtivo === d.n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                } ${passou && !eHoje ? "opacity-60" : ""}`}
              >
                <div>
                  {d.curto} {eHoje && "•"}
                </div>
                <div className="text-xs opacity-70">{formatarDataBR(iso)}</div>
              </button>
            );
          })}
        </div>

        {cels.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">
            Nenhuma aula agendada neste dia.
          </div>
        ) : (
          <ol className="space-y-2">
            {agruparPorPeriodo(cels).map(({ periodo, celsPer }) => {
              const cfg = configDe(grade.horariosConfig, diaAtivo, periodo, professoraId);
              const tipo: TipoHorario = cfg?.tipo ?? "regular";
              return (
                <AulaCard
                  key={periodo}
                  periodo={periodo}
                  tipo={tipo}
                  cfg={cfg}
                  cels={celsPer}
                  presencas={presencasDoDia}
                  notas={notasDoDia}
                  licoes={licoesDoDia}
                  historicoLicoes={historicoLicoes ?? {}}
                  dataDoDia={dataDoDia}
                  diaSemana={diaAtivo}
                  professoraId={professoraId}
                  professora={professora}
                />
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function agruparPorPeriodo(cels: CelulaAula[]) {
  const map = new Map<number, CelulaAula[]>();
  for (const c of cels) {
    if (!map.has(c.periodo)) map.set(c.periodo, []);
    map.get(c.periodo)!.push(c);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([periodo, celsPer]) => ({ periodo, celsPer }));
}

function AulaCard({
  periodo,
  tipo,
  cfg,
  cels,
  presencas,
  notas,
  licoes,
  historicoLicoes,
  dataDoDia,
  diaSemana,
  professoraId,
  professora,
}: {
  periodo: number;
  tipo: TipoHorario;
  cfg: HorarioConfig | null;
  cels: CelulaAula[];
  presencas: PresencaRow[];
  notas: NotaRow[];
  licoes: LicaoRow[];
  historicoLicoes: Record<string, { licao: string; nivel_no_momento: string }[]>;
  dataDoDia: string;
  diaSemana: number;
  professoraId: string;
  professora: Professora;
}) {
  const mostraLivro = TIPO_MOSTRA_LIVRO[tipo];
  const mostraNotasELicao = tipo !== "conversacao";
  const cls = tipoCardBg(tipo);
  const fechado = TIPO_FECHADO[tipo];

  return (
    <li
      className="rounded-lg border border-border bg-card overflow-hidden"
      style={{ borderLeftColor: professora.cor, borderLeftWidth: 6 }}
    >
      <div className="p-2 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-muted-foreground">
            {HORARIO_INICIO_PERIODO[periodo] ?? periodo}
          </span>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${cls}`}
          >
            {ROTULO_TIPO[tipo]}
          </span>
          {cfg?.tema && <span className="text-xs italic text-muted-foreground">{cfg.tema}</span>}
        </div>

        {fechado ? (
          <div className={`rounded px-3 py-2 text-center text-sm font-bold ${cls}`}>
            {ROTULO_TIPO[tipo].toUpperCase()}
          </div>
        ) : (
          <ul className="space-y-1">
            {cels.map((c) => (
              <AlunoLinha
                key={`${c.id}-${dataDoDia}`}
                c={c}
                mostraLivro={mostraLivro}
                mostraNotasELicao={mostraNotasELicao}
                presencas={
                  c.aluno_id
                    ? presencas.filter((p) => p.aluno_id === c.aluno_id && p.periodo === periodo)
                    : []
                }
                notas={
                  c.aluno_id
                    ? notas.filter((n) => n.aluno_id === c.aluno_id && n.periodo === periodo)
                    : []
                }
                licoes={
                  c.aluno_id
                    ? licoes.filter((l) => l.aluno_id === c.aluno_id && l.periodo === periodo)
                    : []
                }
                historicoLicao={c.aluno_id ? (historicoLicoes[c.aluno_id] ?? []) : []}
                dataDoDia={dataDoDia}
                diaSemana={diaSemana}
                professoraId={professoraId}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// Alunos de "Aula online" fazem 2 lições no mesmo horário — parte 1 e parte 2.
function useParte(
  parte: number,
  registro: {
    presenca: PresencaRow | null;
    nota: NotaRow | null;
    licao: LicaoRow | null;
    licaoSugestao: string;
  },
) {
  const licaoOriginal = registro.licao?.licao ?? "";
  const [presencaLocal, setPresencaLocal] = useState<StatusPresenca | null>(
    registro.presenca?.status ?? null,
  );
  const [notasLocal, setNotasLocal] = useState<Record<CampoNota, ConceitoNota | null>>({
    fala: registro.nota?.fala ?? null,
    audicao: registro.nota?.audicao ?? null,
    leitura: registro.nota?.leitura ?? null,
    escrita: registro.nota?.escrita ?? null,
  });
  const [licaoLocal, setLicaoLocal] = useState(licaoOriginal || registro.licaoSugestao);
  const [licaoEditadaManualmente, setLicaoEditadaManualmente] = useState(false);

  // A sugestão de lição depende de uma consulta que carrega depois da grade
  // (getHistoricoLicoes), ou — na parte 2 — do valor digitado na parte 1. Se ela
  // mudar depois do primeiro render, atualiza o valor mostrado — a menos que a
  // professora já tenha mexido no campo.
  useEffect(() => {
    if (!licaoEditadaManualmente) {
      setLicaoLocal(licaoOriginal || registro.licaoSugestao);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licaoOriginal, registro.licaoSugestao]);

  const alterado =
    presencaLocal !== (registro.presenca?.status ?? null) ||
    CAMPOS_NOTA.some(({ key }) => notasLocal[key] !== (registro.nota?.[key] ?? null)) ||
    licaoLocal !== licaoOriginal;

  return {
    parte,
    presencaLocal,
    setPresencaLocal,
    notasLocal,
    setNotasLocal,
    licaoLocal,
    setLicaoLocal: (v: string) => {
      setLicaoLocal(v);
      setLicaoEditadaManualmente(true);
    },
    licaoOriginal,
    licaoSugestao: registro.licaoSugestao,
    presencaOriginal: registro.presenca?.status ?? null,
    notaOriginal: registro.nota,
    alterado,
  };
}

type EstadoParte = ReturnType<typeof useParte>;

function AlunoLinha({
  c,
  mostraLivro,
  mostraNotasELicao,
  presencas,
  notas,
  licoes,
  historicoLicao,
  dataDoDia,
  diaSemana,
  professoraId,
}: {
  c: CelulaAula;
  mostraLivro: boolean;
  mostraNotasELicao: boolean;
  presencas: PresencaRow[];
  notas: NotaRow[];
  licoes: LicaoRow[];
  historicoLicao: { licao: string; nivel_no_momento: string }[];
  dataDoDia: string;
  diaSemana: number;
  professoraId: string;
}) {
  const qc = useQueryClient();
  const presencaFn = useServerFn(setPresenca);
  const notaFn = useServerFn(setNota);
  const licaoFn = useServerFn(setLicao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehOnline = c.tipo === "online";
  const temLicao = temTrackingDeLicao(c.aluno_nivel);

  const licaoSugestao1 = temLicao ? licaoSugerida(c.aluno_nivel, historicoLicao) : "";
  const parte1 = useParte(1, {
    presenca: presencas.find((p) => p.parte === 1) ?? null,
    nota: notas.find((n) => n.parte === 1) ?? null,
    licao: licoes.find((l) => l.parte === 1) ?? null,
    licaoSugestao: licaoSugestao1,
  });

  // A 2ª lição é sempre a seguinte à maior lição já atingida — encadeia a
  // partir do valor (editado ou sugerido) que está na parte 1 agora mesmo,
  // junto com o histórico, pra não "voltar" se a parte 1 for uma repetição.
  const licaoSugestao2 = temLicao
    ? licaoSugerida(c.aluno_nivel, [
        { licao: parte1.licaoLocal || licaoSugestao1, nivel_no_momento: c.aluno_nivel },
        ...historicoLicao,
      ])
    : "";
  const parte2 = useParte(2, {
    presenca: presencas.find((p) => p.parte === 2) ?? null,
    nota: notas.find((n) => n.parte === 2) ?? null,
    licao: licoes.find((l) => l.parte === 2) ?? null,
    licaoSugestao: licaoSugestao2,
  });

  const alterado = parte1.alterado || (ehOnline && parte2.alterado);

  async function salvarParte(estado: EstadoParte) {
    const chamadas: Promise<unknown>[] = [];
    if (estado.presencaLocal && estado.presencaLocal !== estado.presencaOriginal) {
      chamadas.push(
        presencaFn({
          data: {
            data: dataDoDia,
            professora_id: professoraId,
            aluno_id: c.aluno_id!,
            periodo: c.periodo,
            parte: estado.parte,
            dia_semana: diaSemana,
            status: estado.presencaLocal,
          },
        }),
      );
    }
    if (mostraNotasELicao) {
      for (const { key } of CAMPOS_NOTA) {
        const original = estado.notaOriginal?.[key] ?? null;
        if (estado.notasLocal[key] !== original) {
          chamadas.push(
            notaFn({
              data: {
                data: dataDoDia,
                professora_id: professoraId,
                aluno_id: c.aluno_id!,
                periodo: c.periodo,
                parte: estado.parte,
                campo: key,
                valor: estado.notasLocal[key],
              },
            }),
          );
        }
      }
      if (estado.licaoLocal && estado.licaoLocal !== estado.licaoOriginal) {
        chamadas.push(
          licaoFn({
            data: {
              data: dataDoDia,
              professora_id: professoraId,
              aluno_id: c.aluno_id!,
              periodo: c.periodo,
              parte: estado.parte,
              licao: estado.licaoLocal,
              nivel_no_momento: c.aluno_nivel,
            },
          }),
        );
      }
    }
    return chamadas;
  }

  async function salvar() {
    if (!c.aluno_id) return;
    setErro(null);
    setSalvando(true);
    try {
      const chamadas = [
        ...(await salvarParte(parte1)),
        ...(ehOnline ? await salvarParte(parte2) : []),
      ];
      await Promise.all(chamadas);
      qc.invalidateQueries({ queryKey: ["lancamentos-semana"] });
      qc.invalidateQueries({ queryKey: ["historico-licoes"] });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li className="rounded-lg px-2 py-1.5 bg-secondary">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {c.horario_especifico && <span className="text-sm font-bold">{c.horario_especifico}</span>}
        <span className="text-base font-semibold">{c.aluno_nome}</span>
        {mostraLivro && c.aluno_nivel && (
          <span className="text-xs opacity-70">— {c.aluno_nivel}</span>
        )}
        {c.aluno_id && (
          <Link
            to="/professora/aluno/$id"
            params={{ id: c.aluno_id }}
            className="text-xs text-muted-foreground underline shrink-0"
            title="Ver histórico de lições e notas"
          >
            Histórico
          </Link>
        )}
        {c.aluno_avulso && (
          <span className="text-[9px] uppercase font-bold ml-auto tracking-wider opacity-70">
            avulso
          </span>
        )}
      </div>

      {c.aluno_avulso ? (
        <div className="text-xs text-muted-foreground mt-0.5 italic">
          Aluno avulso — sem lançamento de presença/notas.
        </div>
      ) : (
        <>
          <BlocoLancamento
            rotulo={ehOnline ? "1ª lição" : null}
            salvando={salvando}
            mostraNotasELicao={mostraNotasELicao}
            mostraLicao={mostraNotasELicao && temLicao}
            estado={parte1}
          />
          {ehOnline && (
            <BlocoLancamento
              rotulo="2ª lição"
              salvando={salvando}
              mostraNotasELicao={mostraNotasELicao}
              mostraLicao={mostraNotasELicao && temLicao}
              estado={parte2}
            />
          )}
          <div className="mt-1 flex items-center gap-2">
            <button
              disabled={!alterado || salvando}
              onClick={salvar}
              className={`ml-auto text-xs px-2.5 py-1 rounded font-medium ${
                alterado
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground"
              } disabled:opacity-50`}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
          {erro && <div className="w-full text-xs text-destructive">{erro}</div>}
        </>
      )}
    </li>
  );
}

function BlocoLancamento({
  rotulo,
  salvando,
  mostraNotasELicao,
  mostraLicao,
  estado,
}: {
  rotulo: string | null;
  salvando: boolean;
  mostraNotasELicao: boolean;
  mostraLicao: boolean;
  estado: EstadoParte;
}) {
  return (
    <div className="mt-1 flex items-center gap-3 flex-wrap">
      {rotulo && (
        <span className="text-[10px] font-bold uppercase text-muted-foreground w-12 shrink-0">
          {rotulo}
        </span>
      )}
      <div className="flex gap-1">
        <button
          title="Presente (clique de novo pra desmarcar)"
          disabled={salvando}
          onClick={() =>
            estado.setPresencaLocal(estado.presencaLocal === "presente" ? null : "presente")
          }
          className={`w-7 h-7 rounded text-sm font-bold border-2 ${
            estado.presencaLocal === "presente"
              ? "bg-emerald-500 border-emerald-600 text-white"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          ✓
        </button>
        <button
          title="Falta (clique de novo pra desmarcar)"
          disabled={salvando}
          onClick={() => estado.setPresencaLocal(estado.presencaLocal === "falta" ? null : "falta")}
          className={`w-7 h-7 rounded text-sm font-bold border-2 ${
            estado.presencaLocal === "falta"
              ? "bg-rose-500 border-rose-600 text-white"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          ✗
        </button>
      </div>

      {mostraLicao && (
        <input
          value={estado.licaoLocal}
          disabled={salvando}
          onChange={(e) => estado.setLicaoLocal(normalizarLicao(e.target.value))}
          placeholder={estado.licaoSugestao || "Lição"}
          title="Lição dada/avaliada hoje"
          className="w-16 rounded border border-input bg-card px-1 py-0.5 text-xs font-bold text-center"
        />
      )}

      {mostraNotasELicao &&
        CAMPOS_NOTA.map(({ key, label }) => {
          const atual = estado.notasLocal[key];
          return (
            <div key={key} className="flex items-center gap-0.5" title={label}>
              <span className="text-[10px] font-bold text-muted-foreground w-3">
                {key.charAt(0).toUpperCase()}
              </span>
              <div className="flex gap-0.5">
                {CONCEITOS.map((v) => (
                  <button
                    key={v}
                    disabled={salvando}
                    onClick={() =>
                      estado.setNotasLocal((prev) => ({ ...prev, [key]: atual === v ? null : v }))
                    }
                    className={`w-6 h-6 rounded text-[10px] font-bold border ${
                      atual === v
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function tipoCardBg(tipo: TipoHorario) {
  const map: Record<TipoHorario, string> = {
    regular: "bg-[var(--tipo-regular-bg)] text-[var(--tipo-regular-fg)]",
    online: "bg-[var(--tipo-online-bg)] text-[var(--tipo-online-fg)]",
    vip: "bg-[var(--tipo-vip-bg)] text-[var(--tipo-vip-fg)]",
    reforco: "bg-[var(--tipo-reforco-bg)] text-[var(--tipo-reforco-fg)]",
    conversacao: "bg-[var(--tipo-conversacao-bg)] text-[var(--tipo-conversacao-fg)]",
    break: "bg-[var(--tipo-break-bg)] text-[var(--tipo-break-fg)]",
    preparacao_homework: "bg-[var(--tipo-prep-bg)] text-[var(--tipo-prep-fg)]",
    sem_aula: "bg-[var(--tipo-sem-aula-bg)] text-[var(--tipo-sem-aula-fg)]",
  };
  return map[tipo];
}

function SelecaoProfessora({
  professoras,
  onEscolher,
}: {
  professoras: Professora[];
  onEscolher: (id: string) => void;
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">Quem está usando?</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Escolha o seu nome para ver a grade.
        </p>
        <ul className="space-y-2">
          <li>
            <Link
              to="/admin"
              className="block w-full rounded-xl px-5 py-4 text-left text-lg font-semibold border-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0F1B6C", color: "#fff", borderColor: "#E4002B" }}
            >
              Wizard
            </Link>
          </li>
          {professoras.length === 0 && (
            <li className="text-muted-foreground text-center">Carregando…</li>
          )}
          {professoras
            .filter((p) => p.ativa)
            .map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onEscolher(p.id)}
                  className="w-full rounded-xl px-5 py-4 text-left text-lg font-semibold border-2 border-border hover:border-primary transition-colors"
                  style={{ backgroundColor: p.cor }}
                >
                  {p.nome}
                </button>
              </li>
            ))}
        </ul>
      </div>
    </main>
  );
}
