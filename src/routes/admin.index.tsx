import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getGradeSemana,
  adicionarAluno,
  removerCelula,
  setHorarioConfig,
  removerHorarioConfig,
} from "@/lib/grade.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import {
  datasDaSemana,
  formatarDataBR,
  parseISODate,
  segundaDaSemana,
  somarSemanas,
  toISODate,
} from "@/lib/date-utils";
import {
  DIAS_SEMANA,
  PERIODOS,
  CAPACIDADE,
  ROTULO_TIPO,
  TIPO_FECHADO,
  TIPO_MOSTRA_LIVRO,
  configDe,
  type Aluno,
  type CelulaAula,
  type HorarioConfig,
  type Professora,
  type TipoHorario,
} from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: GradePage,
});

const TIPOS_ORDEM: TipoHorario[] = [
  "regular",
  "online",
  "vip",
  "reforco",
  "conversacao",
  "break",
  "preparacao_homework",
];

function GradePage() {
  useRealtimeGrade();
  const [dataSegunda, setDataSegunda] = useState(() => toISODate(segundaDaSemana()));
  const [diaAtivo, setDiaAtivo] = useState<number>(() => {
    const hoje = new Date().getDay();
    return hoje >= 1 && hoje <= 6 ? hoje : 1;
  });

  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", dataSegunda],
    queryFn: () => getFn({ data: { dataSegunda } }),
  });

  const datas = useMemo(() => datasDaSemana(parseISODate(dataSegunda)), [dataSegunda]);
  const dataDoDia = datas[diaAtivo - 1];

  const [editando, setEditando] = useState<{ professora: Professora; periodo: number } | null>(null);

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setDataSegunda(somarSemanas(dataSegunda, -1))}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-accent"
        >← Semana anterior</button>
        <button
          onClick={() => setDataSegunda(toISODate(segundaDaSemana()))}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-accent"
        >Hoje</button>
        <button
          onClick={() => setDataSegunda(somarSemanas(dataSegunda, 1))}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-accent"
        >Próxima semana →</button>
        <div className="ml-auto text-sm text-muted-foreground">
          Semana de {formatarDataBR(datas[0])} a {formatarDataBR(datas[5])}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-border">
        {DIAS_SEMANA.map((d, i) => (
          <button
            key={d.n}
            onClick={() => setDiaAtivo(d.n)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              diaAtivo === d.n
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {d.nome} <span className="opacity-60">{formatarDataBR(datas[i])}</span>
          </button>
        ))}
      </div>

      {!data ? (
        <div className="text-muted-foreground">Carregando grade…</div>
      ) : (
        <GradeTabela
          professoras={data.professoras.filter((p) => p.ativa)}
          celulas={data.celulasPorData[dataDoDia] ?? []}
          horariosConfig={data.horariosConfig}
          diaSemana={diaAtivo}
          onEditarCelula={(professora, periodo) => setEditando({ professora, periodo })}
        />
      )}

      {editando && data && (
        <CelulaEditor
          key={`${editando.professora.id}-${editando.periodo}-${diaAtivo}`}
          professora={editando.professora}
          periodo={editando.periodo}
          diaSemana={diaAtivo}
          dataDoDia={dataDoDia}
          config={configDe(data.horariosConfig, diaAtivo, editando.periodo, editando.professora.id)}
          celulas={(data.celulasPorData[dataDoDia] ?? []).filter(
            (c) => c.professora_id === editando.professora.id && c.periodo === editando.periodo,
          )}
          alunos={data.alunos.filter((a) => a.ativo)}
          onFechar={() => setEditando(null)}
        />
      )}
    </main>
  );
}

function GradeTabela(props: {
  professoras: Professora[];
  celulas: CelulaAula[];
  horariosConfig: HorarioConfig[];
  diaSemana: number;
  onEditarCelula: (p: Professora, periodo: number) => void;
}) {
  const { professoras, celulas, horariosConfig, diaSemana } = props;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-16 border border-border bg-muted text-xs font-medium text-muted-foreground p-2">Per.</th>
            {professoras.map((p) => (
              <th
                key={p.id}
                className="border border-border p-3 font-semibold text-sm"
                style={{ backgroundColor: p.cor }}
              >
                {p.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODOS.map((per) => (
            <tr key={per}>
              <td className="border border-border bg-muted text-center font-medium text-sm p-2">{per}</td>
              {professoras.map((p) => {
                const cfg = configDe(horariosConfig, diaSemana, per, p.id);
                const tipo: TipoHorario = cfg?.tipo ?? "regular";
                const cels = celulas.filter((c) => c.professora_id === p.id && c.periodo === per);
                return (
                  <td
                    key={p.id}
                    onClick={() => props.onEditarCelula(p, per)}
                    className={`border border-border align-top p-1.5 min-w-[170px] h-24 cursor-pointer hover:brightness-95 ${tipoCellBg(tipo)}`}
                  >
                    <CelulaConteudo tipo={tipo} cfg={cfg} cels={cels} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CelulaConteudo({
  tipo,
  cfg,
  cels,
}: {
  tipo: TipoHorario;
  cfg: HorarioConfig | null;
  cels: CelulaAula[];
}) {
  if (TIPO_FECHADO[tipo]) {
    return (
      <div className="text-center py-2">
        <div className="text-xs font-bold uppercase tracking-wide">{ROTULO_TIPO[tipo]}</div>
        {cfg?.tema && <div className="text-[11px] mt-1 opacity-80">{cfg.tema}</div>}
      </div>
    );
  }
  const cap = CAPACIDADE[tipo];
  const mostraLivro = TIPO_MOSTRA_LIVRO[tipo];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] uppercase font-bold opacity-70">{ROTULO_TIPO[tipo]}</span>
        <span className="text-[10px] opacity-70">{cels.length}/{cap}</span>
      </div>
      {cfg?.tema && <div className="text-[11px] italic opacity-80 leading-tight">{cfg.tema}</div>}
      {cels.length === 0 ? (
        <div className="text-xs opacity-50">—</div>
      ) : (
        cels.map((c) => (
          <div key={c.id} className="text-xs leading-tight">
            {c.horario_especifico && <span className="font-semibold mr-1">{c.horario_especifico}</span>}
            <span>{c.aluno_nome}</span>
            {mostraLivro && c.aluno_nivel && <span className="opacity-70"> — {c.aluno_nivel}</span>}
            {c.aluno_avulso && <span className="ml-1 text-[9px] uppercase opacity-70">avulso</span>}
          </div>
        ))
      )}
    </div>
  );
}

function tipoCellBg(tipo: TipoHorario) {
  const map: Record<TipoHorario, string> = {
    regular: "bg-[var(--tipo-regular-bg)] text-[var(--tipo-regular-fg)]",
    online: "bg-[var(--tipo-online-bg)] text-[var(--tipo-online-fg)]",
    vip: "bg-[var(--tipo-vip-bg)] text-[var(--tipo-vip-fg)]",
    reforco: "bg-[var(--tipo-reforco-bg)] text-[var(--tipo-reforco-fg)]",
    conversacao: "bg-[var(--tipo-conversacao-bg)] text-[var(--tipo-conversacao-fg)]",
    break: "bg-[var(--tipo-break-bg)] text-[var(--tipo-break-fg)]",
    preparacao_homework: "bg-[var(--tipo-prep-bg)] text-[var(--tipo-prep-fg)]",
  };
  return map[tipo];
}

// ============ Editor de célula ============

function CelulaEditor(props: {
  professora: Professora;
  periodo: number;
  diaSemana: number;
  dataDoDia: string;
  config: HorarioConfig | null;
  celulas: CelulaAula[];
  alunos: Aluno[];
  onFechar: () => void;
}) {
  const addFn = useServerFn(adicionarAluno);
  const removerFn = useServerFn(removerCelula);
  const setCfgFn = useServerFn(setHorarioConfig);
  const removerCfgFn = useServerFn(removerHorarioConfig);

  const tipoAtual: TipoHorario = props.config?.tipo ?? "regular";
  const [tipo, setTipo] = useState<TipoHorario>(tipoAtual);
  const [tema, setTema] = useState(props.config?.tema ?? "");
  const [busca, setBusca] = useState("");
  const [horario, setHorario] = useState("");
  const [obs, setObs] = useState("");
  const [pendingAlunoId, setPendingAlunoId] = useState<string | null>(null);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [modoTipo, setModoTipo] = useState(!props.config);

  const fechado = TIPO_FECHADO[tipo];
  const cap = CAPACIDADE[tipo];
  const mostraLivro = TIPO_MOSTRA_LIVRO[tipo];
  const permiteAvulso = tipo === "reforco";
  const cheio = props.celulas.length >= cap;

  const alunosFiltrados = props.alunos
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
    .slice(0, 8);

  async function salvarTipo() {
    setErro(null);
    try {
      await setCfgFn({
        data: {
          dia_semana: props.diaSemana,
          periodo: props.periodo,
          professora_id: props.professora.id,
          tipo,
          tema: tema || null,
        },
      });
      setModoTipo(false);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function limparTipo() {
    setErro(null);
    try {
      await removerCfgFn({
        data: {
          dia_semana: props.diaSemana,
          periodo: props.periodo,
          professora_id: props.professora.id,
        },
      });
      setTipo("regular");
      setTema("");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function confirmarAdicao(esc: "base" | "semana") {
    setErro(null);
    if (!pendingAlunoId && !avulsoNome.trim()) {
      setErro("Escolha um aluno matriculado ou informe o nome do aluno avulso.");
      return;
    }
    try {
      await addFn({
        data: {
          escopo: esc,
          data: props.dataDoDia,
          dia_semana: props.diaSemana,
          periodo: props.periodo,
          professora_id: props.professora.id,
          aluno_id: pendingAlunoId ?? null,
          aluno_nome_avulso: pendingAlunoId ? null : avulsoNome.trim() || null,
          horario_especifico: horario || null,
          observacao: obs || null,
        },
      });
      setPendingAlunoId(null);
      setAvulsoNome("");
      setBusca("");
      setHorario("");
      setObs("");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function remover(c: CelulaAula, esc: "base" | "semana") {
    setErro(null);
    try {
      await removerFn({
        data: {
          escopo: esc,
          data: props.dataDoDia,
          origem: c.origem,
          grade_base_id: c.grade_base_id,
          excecao_id: c.excecao_id,
        },
      });
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={props.onFechar}>
      <div
        className="w-full max-w-md h-full bg-card overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: props.professora.cor }} />
            <h2 className="font-semibold text-lg">
              {props.professora.nome} — {DIAS_SEMANA[props.diaSemana - 1].nome} • Período {props.periodo}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{formatarDataBR(props.dataDoDia)}</p>

          {erro && (
            <div className="mb-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}

          {/* Configuração do horário */}
          {modoTipo ? (
            <section className="mb-6 rounded border border-border p-3">
              <h3 className="font-medium text-sm mb-2">
                {props.config ? "Trocar tipo deste horário" : "Escolha o tipo deste horário"}
              </h3>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {TIPOS_ORDEM.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`text-xs rounded px-2 py-1.5 border ${
                      tipo === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {ROTULO_TIPO[t]}
                  </button>
                ))}
              </div>
              {(tipo === "reforco" || tipo === "conversacao" || fechado) && (
                <input
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder={
                    tipo === "conversacao"
                      ? "Tema da conversação"
                      : tipo === "reforco"
                      ? "Conteúdo a ser estudado"
                      : "Observação (opcional)"
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={salvarTipo}
                  className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                >
                  Salvar tipo
                </button>
                {props.config && (
                  <button
                    onClick={() => {
                      setModoTipo(false);
                      setTipo(tipoAtual);
                      setTema(props.config?.tema ?? "");
                    }}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              {props.config && (
                <button
                  onClick={limparTipo}
                  className="mt-2 text-xs text-muted-foreground underline"
                >
                  Voltar a Regular (limpar configuração)
                </button>
              )}
            </section>
          ) : (
            <section className="mb-6 rounded border border-border p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold">Tipo</div>
                <div className="font-semibold">{ROTULO_TIPO[tipoAtual]}</div>
                {props.config?.tema && (
                  <div className="text-xs italic text-muted-foreground">{props.config.tema}</div>
                )}
                {!fechado && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Capacidade: até {cap} aluno{cap > 1 ? "s" : ""}.
                  </div>
                )}
              </div>
              <button
                onClick={() => setModoTipo(true)}
                className="text-xs rounded border border-border px-3 py-1.5 hover:bg-accent"
              >
                Trocar tipo
              </button>
            </section>
          )}


          {/* Lista de alunos */}
          {props.config && !modoTipo && !fechado && props.celulas.length > 0 && (
            <section className="mb-6">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">
                Alunos ({props.celulas.length}/{cap})
              </h3>
              <ul className="space-y-2">
                {props.celulas.map((c) => (
                  <li key={c.id} className="rounded border border-border p-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">
                        {c.horario_especifico && (
                          <span className="text-sm text-primary mr-1">{c.horario_especifico}</span>
                        )}
                        {c.aluno_nome}
                        {mostraLivro && c.aluno_nivel && (
                          <span className="text-muted-foreground text-sm"> — {c.aluno_nivel}</span>
                        )}
                        {c.aluno_avulso && (
                          <span className="ml-2 text-[10px] uppercase bg-accent px-1.5 py-0.5 rounded">
                            avulso
                          </span>
                        )}
                      </div>
                      {c.observacao && (
                        <div className="text-xs text-muted-foreground italic">{c.observacao}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => remover(c, "semana")}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
                      >
                        Só nesta semana
                      </button>
                      <button
                        onClick={() => remover(c, "base")}
                        className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground"
                      >
                        Todas
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Adicionar aluno */}
          {!fechado && (
            <section className="mb-6">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Adicionar aluno</h3>
              {cheio ? (
                <div className="text-sm text-muted-foreground">
                  Horário lotado ({cap} alunos).
                </div>
              ) : (
                <>
                  <input
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setAvulsoNome("");
                    }}
                    placeholder="Buscar aluno matriculado…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  {busca && (
                    <ul className="mt-2 space-y-1 max-h-52 overflow-y-auto">
                      {alunosFiltrados.length === 0 && (
                        <li className="text-sm text-muted-foreground p-2">Nenhum aluno encontrado.</li>
                      )}
                      {alunosFiltrados.map((a) => (
                        <li key={a.id}>
                          <button
                            onClick={() => {
                              setPendingAlunoId(a.id);
                              setAvulsoNome("");
                            }}
                            className={`w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent ${
                              pendingAlunoId === a.id ? "bg-accent" : ""
                            }`}
                          >
                            {a.nome} <span className="text-muted-foreground">— {a.nivel}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {permiteAvulso && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        …ou aluno avulso (não matriculado):
                      </div>
                      <input
                        value={avulsoNome}
                        onChange={(e) => {
                          setAvulsoNome(e.target.value);
                          setPendingAlunoId(null);
                          setBusca("");
                        }}
                        placeholder="Nome do aluno avulso"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {(pendingAlunoId || avulsoNome.trim()) && (
                    <div className="mt-3 space-y-2 rounded border border-border p-3">
                      <div className="flex gap-2">
                        <input
                          value={horario}
                          onChange={(e) => setHorario(e.target.value)}
                          placeholder={
                            tipo === "online"
                              ? "Horário do slot (ex: 07:00, 07:20…)"
                              : "Horário (opcional, ex: 07:30)"
                          }
                          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </div>
                      <input
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        placeholder="Observação (opcional)"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                      <div className="text-xs text-muted-foreground pt-1">Aplicar:</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmarAdicao("semana")}
                          className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                        >
                          Só nesta semana
                        </button>
                        <button
                          onClick={() => confirmarAdicao("base")}
                          className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                        >
                          Em todas as semanas
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          <button
            onClick={props.onFechar}
            className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
