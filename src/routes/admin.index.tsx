import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  getGradeSemana,
  adicionarAluno,
  removerCelula,
  setHorarioConfig,
  removerHorarioConfig,
  alternarVagaFechada,
  alternarAusenciaAvisada,
  definirTemaDia,
} from "@/lib/grade.functions";
import { criarAluno, atualizarAluno } from "@/lib/cadastros.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import {
  datasDaSemana,
  formatarDataBR,
  parseISODate,
  segundaDaSemana,
  somarSemanas,
  toISODate,
  estaNaSemanaDoAniversario,
} from "@/lib/date-utils";
import {
  DIAS_SEMANA,
  HORARIO_INICIO_PERIODO,
  periodosDoDia,
  CAPACIDADE,
  ROTULO_TIPO,
  TIPO_FECHADO,
  TIPO_MOSTRA_LIVRO,
  NIVEIS,
  slotsFixosPorPeriodo,
  configDe,
  idiomaDoNivel,
  corTextoLegivel,
  excecaoQueAfeta,
  ROTULO_TIPO_CALENDARIO,
  type Aluno,
  type CelulaAula,
  type CalendarioExcecao,
  type HorarioConfig,
  type Professora,
  type TipoHorario,
} from "@/lib/types";
import { getCalendarioExcecoes } from "@/lib/calendario.functions";
import { BuscaAlunoNaSemana } from "@/components/BuscaAlunoNaSemana";

export const Route = createFileRoute("/admin/")({
  component: GradePage,
});

const TIPOS_ORDEM: TipoHorario[] = [
  "regular",
  "online",
  "comercial",
  "vip",
  "reforco",
  "conversacao",
  "break",
  "preparacao_homework",
  "sem_aula",
];

// Segunda(1)..sábado(6) — domingo (0) cai em segunda, já que não há aula nesse dia.
function diaAtivoHoje(): number {
  const hoje = new Date().getDay();
  return hoje >= 1 && hoje <= 6 ? hoje : 1;
}

function GradePage() {
  useRealtimeGrade();
  const qc = useQueryClient();
  const [dataSegunda, setDataSegunda] = useState(() => toISODate(segundaDaSemana()));
  const [diaAtivo, setDiaAtivo] = useState<number>(diaAtivoHoje);

  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana", dataSegunda],
    queryFn: () => getFn({ data: { dataSegunda } }),
  });

  const getCalendarioFn = useServerFn(getCalendarioExcecoes);
  const { data: calendarioExcecoes } = useQuery({
    queryKey: ["calendario-excecoes"],
    queryFn: () => getCalendarioFn(),
  });

  const datas = useMemo(() => datasDaSemana(parseISODate(dataSegunda)), [dataSegunda]);
  const dataDoDia = datas[diaAtivo - 1];

  const [editando, setEditando] = useState<{ professora: Professora; periodo: number } | null>(
    null,
  );

  const adicionarFn = useServerFn(adicionarAluno);
  const removerFn = useServerFn(removerCelula);
  const criarAlunoFn = useServerFn(criarAluno);
  const atualizarAlunoFn = useServerFn(atualizarAluno);
  const alternarVagaFn = useServerFn(alternarVagaFechada);
  const alternarAusenciaFn = useServerFn(alternarAusenciaAvisada);
  const definirTemaDiaFn = useServerFn(definirTemaDia);

  async function handleAdicionar(
    professoraId: string,
    periodo: number,
    alunoId: string,
    avulso: boolean,
    horarioEspecifico: string | null,
  ) {
    await adicionarFn({
      data: {
        escopo: avulso ? "semana" : "base",
        data: dataDoDia,
        dia_semana: diaAtivo,
        periodo,
        professora_id: professoraId,
        aluno_id: alunoId,
        horario_especifico: horarioEspecifico,
      },
    });
    qc.invalidateQueries();
  }

  async function handleCriarEAdicionar(
    professoraId: string,
    periodo: number,
    nome: string,
    nivel: string,
    avulso: boolean,
    horarioEspecifico: string | null,
    tipo: TipoHorario,
    experimental: boolean,
  ) {
    // Story 7.1 + follow-up: Comercial nunca cria um aluno de verdade — o
    // nome digitado é só um prospect (aluno_nome_avulso). "Experimental"
    // faz o mesmo, mas dentro de QUALQUER tipo de célula (ex.: misturado
    // numa célula regular junto de alunos de verdade) — é o caminho que a
    // secretaria realmente usa pra marcar um walk-in de aula experimental,
    // sem precisar reconfigurar a célula inteira pra Comercial primeiro.
    if (tipo === "comercial" || experimental) {
      await adicionarFn({
        data: {
          escopo: "semana",
          data: dataDoDia,
          dia_semana: diaAtivo,
          periodo,
          professora_id: professoraId,
          aluno_nome_avulso: nome,
          horario_especifico: horarioEspecifico,
          experimental: tipo !== "comercial" && experimental,
          // Comercial esconde o seletor de nível (prospect não escolheu
          // ainda), então `nivel` já vem vazio nesse caso.
          nivel_avulso: nivel.trim() || null,
        },
      });
      qc.invalidateQueries();
      return;
    }
    const r = await criarAlunoFn({ data: { nome, nivel } });
    await handleAdicionar(professoraId, periodo, r.id, avulso, horarioEspecifico);
  }

  async function handleEditarAluno(alunoId: string, nome: string, nivel: string) {
    const atual = data?.alunos.find((a) => a.id === alunoId);
    await atualizarAlunoFn({
      data: {
        id: alunoId,
        nome,
        nivel,
        ativo: true,
        dataInicioNivel: atual?.data_inicio_nivel ?? null,
        dataNascimento: atual?.data_nascimento ?? null,
      },
    });
    qc.invalidateQueries();
  }

  async function handleRemover(c: CelulaAula) {
    await removerFn({
      data: {
        escopo: "base",
        data: dataDoDia,
        origem: c.origem,
        grade_base_id: c.grade_base_id,
        excecao_id: c.excecao_id,
      },
    });
    qc.invalidateQueries();
  }

  async function handleAlternarAusencia(c: CelulaAula) {
    if (!c.grade_base_id) return;
    await alternarAusenciaFn({
      data: { data: dataDoDia, grade_base_id: c.grade_base_id, avisou: !c.avisou_falta },
    });
    qc.invalidateQueries();
  }

  async function handleAlternarVaga(professoraId: string, periodo: number, fechar: boolean) {
    await alternarVagaFn({
      data: { dia_semana: diaAtivo, periodo, professora_id: professoraId, fechar },
    });
    qc.invalidateQueries();
  }

  async function handleSalvarTemaDia(professoraId: string, periodo: number, observacao: string) {
    await definirTemaDiaFn({
      data: {
        data: dataDoDia,
        dia_semana: diaAtivo,
        periodo,
        professora_id: professoraId,
        observacao,
      },
    });
    qc.invalidateQueries();
  }

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="sticky top-[65px] z-10 bg-background pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5 mb-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[0_1px_2px_-1px_rgb(0_0_0_/_0.05)]">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-background">
            <button
              onClick={() => setDataSegunda(somarSemanas(dataSegunda, -1))}
              title="Semana anterior"
              className="px-2.5 py-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span aria-hidden="true">←</span> Anterior
            </button>
            <button
              onClick={() => {
                setDataSegunda(toISODate(segundaDaSemana()));
                setDiaAtivo(diaAtivoHoje());
              }}
              className="px-3 py-1.5 rounded-md text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Hoje
            </button>
            <button
              onClick={() => setDataSegunda(somarSemanas(dataSegunda, 1))}
              title="Próxima semana"
              className="px-2.5 py-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Próxima <span aria-hidden="true">→</span>
            </button>
          </div>
          {data && (
            <BuscaAlunoNaSemana
              alunos={data.alunos}
              celulasPorData={data.celulasPorData}
              datasSemana={datas}
              professoras={data.professoras}
              onIrParaDia={setDiaAtivo}
            />
          )}
          <div className="ml-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <span aria-hidden="true" className="text-xs opacity-60">
              🗓
            </span>
            Semana de {formatarDataBR(datas[0])} a {formatarDataBR(datas[5])}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {DIAS_SEMANA.map((d, i) => (
            <button
              key={d.n}
              onClick={() => setDiaAtivo(d.n)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                diaAtivo === d.n
                  ? "font-semibold text-primary bg-primary/10 border border-primary/30"
                  : "font-medium text-muted-foreground hover:text-foreground hover:bg-accent bg-card border border-border"
              }`}
            >
              {d.nome} <span className="opacity-60 font-normal">{formatarDataBR(datas[i])}</span>
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="text-muted-foreground">Carregando grade…</div>
      ) : (
        <GradeTabela
          professoras={data.professoras.filter((p) => p.ativa)}
          celulas={data.celulasPorData[dataDoDia] ?? []}
          horariosConfig={data.horariosConfig}
          temasDoDia={data.temasDoDia}
          diaSemana={diaAtivo}
          dataDoDia={dataDoDia}
          calendarioExcecoes={calendarioExcecoes ?? []}
          alunos={data.alunos}
          onAdicionar={handleAdicionar}
          onCriarEAdicionar={handleCriarEAdicionar}
          onEditarAluno={handleEditarAluno}
          onRemover={handleRemover}
          onAlternarVaga={handleAlternarVaga}
          onAlternarAusencia={handleAlternarAusencia}
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
          alunos={data.alunos}
          temaDoDia={
            data.temasDoDia[`${dataDoDia}|${editando.professora.id}|${editando.periodo}`] ?? null
          }
          onSalvarTemaDia={(observacao) =>
            handleSalvarTemaDia(editando.professora.id, editando.periodo, observacao)
          }
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
  temasDoDia: Record<string, string>;
  diaSemana: number;
  dataDoDia: string;
  calendarioExcecoes: CalendarioExcecao[];
  alunos: Aluno[];
  onAdicionar: (
    professoraId: string,
    periodo: number,
    alunoId: string,
    avulso: boolean,
    horarioEspecifico: string | null,
  ) => Promise<void>;
  onCriarEAdicionar: (
    professoraId: string,
    periodo: number,
    nome: string,
    nivel: string,
    avulso: boolean,
    horarioEspecifico: string | null,
    tipo: TipoHorario,
    experimental: boolean,
  ) => Promise<void>;
  onEditarAluno: (alunoId: string, nome: string, nivel: string) => Promise<void>;
  onRemover: (c: CelulaAula) => Promise<void>;
  onAlternarVaga: (professoraId: string, periodo: number, fechar: boolean) => Promise<void>;
  onAlternarAusencia: (c: CelulaAula) => Promise<void>;
  onEditarCelula: (p: Professora, periodo: number) => void;
}) {
  const { professoras, celulas, horariosConfig, diaSemana, dataDoDia, calendarioExcecoes } = props;
  const periodos = periodosDoDia(diaSemana);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-[0_1px_3px_-1px_rgb(0_0_0_/_0.06)]">
      <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "5px 5px" }}>
        <thead>
          <tr>
            <th className="w-16 rounded-lg bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground p-2">
              Per.
            </th>
            {professoras.map((p) => (
              <th
                key={p.id}
                className="rounded-t-lg p-3 text-center text-sm font-semibold"
                style={{ backgroundColor: p.cor, color: corTextoLegivel(p.cor) }}
              >
                {p.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodos.map((per) => (
            <tr key={per}>
              <td
                className={`rounded-lg bg-muted/60 text-center text-sm font-semibold text-foreground/80 p-2 align-middle ${
                  per === 5 && diaSemana !== 6 ? "border-t-2 border-border" : ""
                }`}
              >
                {HORARIO_INICIO_PERIODO[per]}
              </td>
              {professoras.map((p) => {
                const cfg = configDe(horariosConfig, diaSemana, per, p.id);
                const tipo: TipoHorario = cfg?.tipo ?? "regular";
                const cels = celulas.filter((c) => c.professora_id === p.id && c.periodo === per);
                return (
                  <td
                    key={p.id}
                    className={`rounded-lg border border-border/60 align-top p-2 min-w-[170px] ${tipoCellBg(tipo)} ${
                      per === 5 && diaSemana !== 6 ? "border-t-2 border-t-border" : ""
                    }`}
                    style={{
                      borderTopColor: per === 5 && diaSemana !== 6 ? undefined : p.cor,
                      borderTopWidth: per === 5 && diaSemana !== 6 ? undefined : 3,
                    }}
                  >
                    <div className="group relative min-h-[9rem]">
                      <button
                        onClick={() => props.onEditarCelula(p, per)}
                        title="Configurar tipo / opções avançadas"
                        className="absolute right-0.5 top-0.5 z-10 rounded px-1 text-[10px] leading-none text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                      >
                        ⋯
                      </button>
                      <CelulaConteudo
                        tipo={tipo}
                        periodo={per}
                        cfg={cfg}
                        cels={cels}
                        alunos={props.alunos}
                        dataDoDia={dataDoDia}
                        temaDoDia={props.temasDoDia[`${dataDoDia}|${p.id}|${per}`] ?? null}
                        calendarioExcecoes={calendarioExcecoes}
                        onAdicionar={(alunoId, avulso, horarioEspecifico) =>
                          props.onAdicionar(p.id, per, alunoId, avulso, horarioEspecifico)
                        }
                        onCriarEAdicionar={(nome, nivel, avulso, horarioEspecifico, experimental) =>
                          props.onCriarEAdicionar(
                            p.id,
                            per,
                            nome,
                            nivel,
                            avulso,
                            horarioEspecifico,
                            tipo,
                            experimental,
                          )
                        }
                        onEditarAluno={props.onEditarAluno}
                        onRemover={props.onRemover}
                        onAlternarAusencia={props.onAlternarAusencia}
                        onTrancarVaga={() => props.onAlternarVaga(p.id, per, true)}
                        onDestrancarVaga={() => props.onAlternarVaga(p.id, per, false)}
                      />
                    </div>
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
  periodo,
  cfg,
  cels,
  alunos,
  dataDoDia,
  temaDoDia,
  calendarioExcecoes,
  onAdicionar,
  onCriarEAdicionar,
  onEditarAluno,
  onRemover,
  onAlternarAusencia,
  onTrancarVaga,
  onDestrancarVaga,
}: {
  tipo: TipoHorario;
  periodo: number;
  cfg: HorarioConfig | null;
  cels: CelulaAula[];
  alunos: Aluno[];
  dataDoDia: string;
  temaDoDia: string | null;
  calendarioExcecoes: CalendarioExcecao[];
  onAdicionar: (
    alunoId: string,
    avulso: boolean,
    horarioEspecifico: string | null,
  ) => Promise<void>;
  onCriarEAdicionar: (
    nome: string,
    nivel: string,
    avulso: boolean,
    horarioEspecifico: string | null,
    experimental: boolean,
  ) => Promise<void>;
  onEditarAluno: (alunoId: string, nome: string, nivel: string) => Promise<void>;
  onRemover: (c: CelulaAula) => Promise<void>;
  onAlternarAusencia: (c: CelulaAula) => Promise<void>;
  onTrancarVaga: () => Promise<void>;
  onDestrancarVaga: () => Promise<void>;
}) {
  if (TIPO_FECHADO[tipo]) {
    const icone = tipo === "break" ? "☕" : tipo === "preparacao_homework" ? "📝" : "🚫";
    return (
      <div className="flex h-full min-h-[8.5rem] flex-col items-center justify-center gap-1 py-2 text-center opacity-80">
        <span aria-hidden="true" className="text-sm leading-none opacity-50">
          {icone}
        </span>
        <div className="text-[11px] font-semibold uppercase tracking-wide">{ROTULO_TIPO[tipo]}</div>
        {cfg?.tema && <div className="text-[11px] opacity-80">{cfg.tema}</div>}
      </div>
    );
  }
  const cap = CAPACIDADE[tipo];
  const mostraLivro = TIPO_MOSTRA_LIVRO[tipo];
  const fechadas = Math.min(cfg?.vagas_fechadas ?? 0, cap);
  const capDisponivel = Math.max(cap - fechadas, 0);
  // Alunos que avisaram falta hoje não ocupam vaga, mesmo continuando visíveis (riscados).
  const ocupamVaga = cels.filter((c) => !c.avisou_falta).length;
  const vagas = Math.max(capDisponivel - ocupamVaga, 0);

  const linhaPreenchida = (c: CelulaAula) => (
    <LinhaPreenchida
      key={c.id}
      c={c}
      mostraLivro={mostraLivro}
      excecao={excecaoQueAfeta(dataDoDia, c.aluno_nivel, calendarioExcecoes)}
      onEditar={c.aluno_id ? (nome, nivel) => onEditarAluno(c.aluno_id!, nome, nivel) : null}
      onRemover={() => onRemover(c)}
      onAlternarAusencia={c.origem === "base" ? () => onAlternarAusencia(c) : null}
    />
  );

  let linhas: ReactNode[];

  const slotsFixos = slotsFixosPorPeriodo(tipo, periodo);
  if (slotsFixos.length > 0) {
    // Cada linha da célula é presa a um horário fixo (X:00/X:20/X:40, ou
    // X:00/X:15/X:30/X:45 no Comercial) pela sua posição — digitar ali já
    // grava aquele horário, sem escolher em nada.
    const slots = slotsFixos;
    const porSlot = new Map<string, CelulaAula>();
    const semSlot: CelulaAula[] = [];
    for (const c of cels) {
      if (
        c.horario_especifico &&
        slots.includes(c.horario_especifico) &&
        !porSlot.has(c.horario_especifico)
      ) {
        porSlot.set(c.horario_especifico, c);
      } else {
        semSlot.push(c);
      }
    }
    let fechadasRestantes = fechadas;
    linhas = slots.map((slot) => {
      const cel = porSlot.get(slot) ?? semSlot.shift() ?? null;
      if (cel) {
        return (
          <div key={`slot-${slot}`} className="space-y-0.5">
            {linhaPreenchida(cel)}
            {cel.avisou_falta && (
              <LinhaVaziaEditavel
                alunos={alunos}
                tipo={tipo}
                periodo={periodo}
                horarioFixo={slot}
                horariosOcupados={[]}
                onAdicionar={onAdicionar}
                onCriarEAdicionar={onCriarEAdicionar}
                onTrancarVaga={onTrancarVaga}
              />
            )}
          </div>
        );
      }
      if (fechadasRestantes > 0) {
        fechadasRestantes--;
        return <LinhaVagaTrancada key={`trancada-${slot}`} onDestrancar={onDestrancarVaga} />;
      }
      return (
        <LinhaVaziaEditavel
          key={`vaga-${slot}`}
          alunos={alunos}
          tipo={tipo}
          periodo={periodo}
          horarioFixo={slot}
          horariosOcupados={[]}
          onAdicionar={onAdicionar}
          onCriarEAdicionar={onCriarEAdicionar}
          onTrancarVaga={onTrancarVaga}
        />
      );
    });
    for (const c of semSlot) linhas.push(linhaPreenchida(c));
    for (let i = 0; i < fechadasRestantes; i++) {
      linhas.push(
        <LinhaVagaTrancada key={`trancada-extra-${i}`} onDestrancar={onDestrancarVaga} />,
      );
    }
  } else {
    linhas = [
      ...cels.map(linhaPreenchida),
      ...Array.from({ length: vagas }).map((_, i) => (
        <LinhaVaziaEditavel
          key={`vaga-${i}`}
          alunos={alunos}
          tipo={tipo}
          periodo={periodo}
          horarioFixo={null}
          horariosOcupados={[]}
          onAdicionar={onAdicionar}
          onCriarEAdicionar={onCriarEAdicionar}
          onTrancarVaga={onTrancarVaga}
        />
      )),
      ...Array.from({ length: fechadas }).map((_, i) => (
        <LinhaVagaTrancada key={`trancada-${i}`} onDestrancar={onDestrancarVaga} />
      )),
    ];
  }

  return (
    <div className="space-y-1 pr-2">
      {temaDoDia && (
        <div
          className="rounded-md border border-amber-400/60 bg-amber-500/10 px-1.5 py-1 text-[11px] font-medium leading-tight text-amber-700 dark:text-amber-400 mb-1"
          title="Nota especial só para hoje"
        >
          🎉 {temaDoDia}
        </div>
      )}
      {tipo !== "regular" && (
        <div className="flex items-baseline justify-between gap-1.5 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wide">{ROTULO_TIPO[tipo]}</span>
          <span className="text-[10px] font-medium tabular-nums opacity-55">
            {ocupamVaga}/{capDisponivel}
          </span>
        </div>
      )}
      {cfg?.tema && <div className="text-[11px] italic opacity-70 leading-tight">{cfg.tema}</div>}
      <div className="space-y-1">{linhas}</div>
    </div>
  );
}

function LinhaVagaTrancada({ onDestrancar }: { onDestrancar: () => Promise<void> }) {
  const [destrancando, setDestrancando] = useState(false);
  return (
    <button
      type="button"
      disabled={destrancando}
      onClick={async () => {
        setDestrancando(true);
        try {
          await onDestrancar();
        } catch (err) {
          alert(`Não foi possível destrancar a vaga: ${(err as Error).message}`);
        } finally {
          setDestrancando(false);
        }
      }}
      title="Vaga trancada — clique para destrancar"
      className="flex h-[13px] w-full items-center justify-center rounded-sm bg-[var(--tipo-sem-aula-bg)] text-[9px] uppercase tracking-wide text-[var(--tipo-sem-aula-fg)] hover:opacity-80 disabled:opacity-50"
    >
      🔒
    </button>
  );
}

function LinhaPreenchida({
  c,
  mostraLivro,
  excecao,
  onEditar,
  onRemover,
  onAlternarAusencia,
}: {
  c: CelulaAula;
  mostraLivro: boolean;
  excecao: CalendarioExcecao | null;
  onEditar: ((nome: string, nivel: string) => Promise<void>) | null;
  onRemover: () => void;
  onAlternarAusencia: (() => Promise<void>) | null;
}) {
  const [removendo, setRemovendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.aluno_nome);
  const [nivel, setNivel] = useState(c.aluno_nivel);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [alternandoAusencia, setAlternandoAusencia] = useState(false);

  function abrirEdicao() {
    if (!onEditar) return;
    setNome(c.aluno_nome);
    setNivel(c.aluno_nivel);
    setErro(null);
    setEditando(true);
  }

  function cancelar() {
    setEditando(false);
    setErro(null);
  }

  async function confirmar() {
    if (!onEditar) return;
    if (!nome.trim()) {
      cancelar();
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await onEditar(nome.trim(), nivel.trim());
      setEditando(false);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <div
        className="relative"
        onBlur={(e) => {
          if (salvando) return;
          if (!e.currentTarget.contains(e.relatedTarget as Node)) confirmar();
        }}
      >
        <div className="flex gap-1">
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmar();
              }
              if (e.key === "Escape") cancelar();
            }}
            className="min-w-0 flex-1 rounded border border-input bg-background px-1 py-0.5 text-[12px]"
          />
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmar();
              }
              if (e.key === "Escape") cancelar();
            }}
            className="w-16 shrink-0 rounded border border-input bg-background px-1 py-0.5 text-[12px]"
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {erro && <div className="mt-0.5 text-[10px] text-destructive">{erro}</div>}
      </div>
    );
  }

  // Horário avulso: aula adicionada só nesta semana, sem vínculo com um horário fixo (grade_base).
  const horarioAvulso = c.origem === "excecao" && c.grade_base_id === null;
  const aniversario = estaNaSemanaDoAniversario(c.aluno_nascimento, toISODate(new Date()));
  const diaAniversario = c.aluno_nascimento ? parseISODate(c.aluno_nascimento).getDate() : null;

  return (
    <div
      className={`group/linha flex items-center gap-1 text-[12px] leading-tight rounded-md ${
        excecao
          ? "border border-rose-400/70 bg-rose-500/[0.07] px-1.5 py-0.5"
          : aniversario
            ? "border border-rose-400/70 px-1.5 py-0.5"
            : c.aluno_experimental
              ? "border border-amber-400/70 bg-amber-500/[0.10] px-1.5 py-0.5"
              : ""
      } ${
        c.aluno_experimental
          ? "text-amber-700 dark:text-amber-400"
          : horarioAvulso
            ? "text-blue-600 dark:text-blue-400"
            : ""
      } ${c.avisou_falta ? "opacity-50" : ""}`}
      title={
        excecao
          ? ROTULO_TIPO_CALENDARIO[excecao.tipo]
          : aniversario
            ? "Aniversário nesta semana! 🎂"
            : c.avisou_falta
              ? "Avisou que não vem hoje (horário fixo mantido, vaga liberada)"
              : c.aluno_experimental
                ? "Aula experimental — prospect, ainda não é aluno matriculado"
                : horarioAvulso
                  ? "Aula avulsa (só nesta semana)"
                  : "Horário fixo"
      }
    >
      {c.horario_especifico && (
        <span className="font-semibold shrink-0">{c.horario_especifico}</span>
      )}
      <button
        type="button"
        disabled={!onEditar}
        onClick={abrirEdicao}
        title={onEditar ? "Editar nome/nível" : undefined}
        className={`min-w-0 flex-1 truncate text-left disabled:cursor-default ${
          c.avisou_falta ? "line-through" : ""
        }`}
      >
        {c.aluno_nome}
        {(c.observacao || idiomaDoNivel(c.aluno_nivel)) && (
          <span className="opacity-70 italic">
            {" "}
            · {c.observacao || idiomaDoNivel(c.aluno_nivel)}
          </span>
        )}
      </button>
      {mostraLivro && c.aluno_nivel && (
        <span className="shrink-0 min-w-[26px] text-right text-[11px] font-medium opacity-60">
          {c.aluno_nivel}
        </span>
      )}
      {excecao && <span className="shrink-0">🎉</span>}
      {aniversario && <span className="shrink-0">🎂{diaAniversario}</span>}
      {c.aluno_experimental ? (
        <span className="shrink-0 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">
          🧪 experimental
        </span>
      ) : (
        c.aluno_avulso && <span className="shrink-0 text-[9px] uppercase opacity-70">avulso</span>
      )}
      {onAlternarAusencia ? (
        <button
          type="button"
          disabled={alternandoAusencia}
          onClick={async () => {
            setAlternandoAusencia(true);
            try {
              await onAlternarAusencia();
            } finally {
              setAlternandoAusencia(false);
            }
          }}
          title={c.avisou_falta ? "Desfazer aviso de falta" : "Avisou que não vem hoje"}
          className={`shrink-0 px-1 text-muted-foreground hover:text-foreground disabled:opacity-50 ${
            c.avisou_falta ? "" : "opacity-0 group-hover/linha:opacity-100"
          }`}
        >
          🔇
        </button>
      ) : (
        // Espaço reservado pra manter o nível alinhado com as linhas fixas (que têm o botão 🔇).
        <span className="shrink-0 px-1 opacity-0" aria-hidden="true">
          🔇
        </span>
      )}
      <button
        type="button"
        disabled={removendo}
        onClick={async () => {
          if (!confirm(`Remover ${c.aluno_nome}?`)) return;
          setRemovendo(true);
          try {
            await onRemover();
          } finally {
            setRemovendo(false);
          }
        }}
        title="Remover"
        className="shrink-0 opacity-0 group-hover/linha:opacity-100 text-muted-foreground hover:text-destructive px-1 disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

function LinhaVaziaEditavel({
  alunos,
  tipo,
  periodo,
  horarioFixo,
  horariosOcupados,
  onAdicionar,
  onCriarEAdicionar,
  onTrancarVaga,
}: {
  alunos: Aluno[];
  tipo: TipoHorario;
  periodo: number;
  // Quando definido, esta linha já pertence a este horário (posição na célula) —
  // não pede escolha nenhuma, digitar o nome já grava nesse horário.
  horarioFixo: string | null;
  horariosOcupados: string[];
  onAdicionar: (
    alunoId: string,
    avulso: boolean,
    horarioEspecifico: string | null,
  ) => Promise<void>;
  onCriarEAdicionar: (
    nome: string,
    nivel: string,
    avulso: boolean,
    horarioEspecifico: string | null,
    experimental: boolean,
  ) => Promise<void>;
  onTrancarVaga: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [nivel, setNivel] = useState("");
  const [avulso, setAvulso] = useState(false);
  const [experimental, setExperimental] = useState(false);
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [horario, setHorario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [trancando, setTrancando] = useState(false);

  const temSlotsFixos = slotsFixosPorPeriodo(tipo, periodo).length > 0;
  const precisaEscolherHorario = temSlotsFixos && !horarioFixo;

  const sugestoes =
    !alunoId && nome.trim()
      ? alunos.filter((a) => a.nome.toLowerCase().includes(nome.trim().toLowerCase())).slice(0, 6)
      : [];

  function cancelar() {
    setEditando(false);
    setNome("");
    setNivel("");
    setAvulso(false);
    setExperimental(false);
    setAlunoId(null);
    setHorario("");
    setErro(null);
  }

  // Story 7.1: Comercial é sempre prospect, nunca vira aluno de verdade — não
  // pede nível (aluno ainda não existe) e nunca chama criarAluno.
  const ehComercial = tipo === "comercial";

  async function confirmar() {
    if (!nome.trim()) {
      cancelar();
      return;
    }
    if (!alunoId && !nivel && !ehComercial && !experimental) {
      setErro("Escolha um nível.");
      return;
    }
    if (precisaEscolherHorario && !horario) {
      setErro("Escolha o horário do slot.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const horarioEspecifico = temSlotsFixos ? (horarioFixo ?? horario) : null;
      // Comercial e "Experimental" são sempre "só esta semana" — um prospect
      // não vira horário fixo recorrente na base, mesmo que alguém esqueça
      // de marcar o avulso.
      const avulsoEfetivo = ehComercial || experimental ? true : avulso;
      if (alunoId) await onAdicionar(alunoId, avulsoEfetivo, horarioEspecifico);
      else
        await onCriarEAdicionar(nome.trim(), nivel, avulsoEfetivo, horarioEspecifico, experimental);
      cancelar();
    } catch (e) {
      setSalvando(false);
      setErro((e as Error).message);
    }
  }

  if (!editando) {
    return (
      <div className="group/vaga flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="min-w-0 flex-1 border-b border-dashed border-muted-foreground/35 text-left text-[12px] leading-relaxed text-transparent hover:border-muted-foreground/70"
        >
          &nbsp;
        </button>
        <button
          type="button"
          disabled={trancando}
          onClick={async (e) => {
            e.stopPropagation();
            setTrancando(true);
            try {
              await onTrancarVaga();
            } catch (err) {
              alert(`Não foi possível trancar a vaga: ${(err as Error).message}`);
            } finally {
              setTrancando(false);
            }
          }}
          title="Trancar esta vaga"
          className="shrink-0 opacity-0 group-hover/vaga:opacity-100 text-muted-foreground hover:text-foreground px-1 disabled:opacity-50"
        >
          🔒
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (salvando) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node)) confirmar();
      }}
    >
      <div className="flex gap-1">
        <input
          autoFocus
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setAlunoId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") cancelar();
            if (e.key === "Tab" && sugestoes.length > 0) {
              e.preventDefault();
              const a = sugestoes[0];
              setAlunoId(a.id);
              setNome(a.nome);
              setNivel(a.nivel);
            }
          }}
          placeholder="Nome…"
          className="min-w-0 flex-1 rounded border border-input bg-background px-1 py-0.5 text-[12px]"
        />
        {!ehComercial && (
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmar();
              }
              if (e.key === "Escape") cancelar();
            }}
            className="w-16 shrink-0 rounded border border-input bg-background px-1 py-0.5 text-[12px]"
          >
            <option value="" disabled>
              Nível
            </option>
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
      </div>
      {precisaEscolherHorario && (
        <select
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") cancelar();
          }}
          className="mt-0.5 w-full rounded border border-input bg-background px-1 py-0.5 text-[11px]"
        >
          <option value="" disabled>
            Horário do slot
          </option>
          {slotsFixosPorPeriodo(tipo, periodo).map((slot) => (
            <option key={slot} value={slot} disabled={horariosOcupados.includes(slot)}>
              {slot}
              {horariosOcupados.includes(slot) ? " (ocupado)" : ""}
            </option>
          ))}
        </select>
      )}
      {!ehComercial && (
        <label
          className="mt-0.5 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400"
          title="Marca esse aluno como avulso, só nesta semana (em vez de horário fixo)"
        >
          <input
            type="checkbox"
            checked={avulso}
            onChange={(e) => setAvulso(e.target.checked)}
            className="h-3 w-3"
          />
          Avulso (só esta semana)
        </label>
      )}
      {!ehComercial && !alunoId && (
        <label
          className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"
          title="Aula experimental — nunca vira cadastro de aluno; aparece na aba Comercial em vez da lista de alunos"
        >
          <input
            type="checkbox"
            checked={experimental}
            onChange={(e) => setExperimental(e.target.checked)}
            className="h-3 w-3"
          />
          Experimental (não é aluno ainda)
        </label>
      )}
      {sugestoes.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-0.5 max-h-32 overflow-y-auto rounded border border-border bg-card shadow-lg">
          {sugestoes.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlunoId(a.id);
                  setNome(a.nome);
                  setNivel(a.nivel);
                }}
                className="block w-full truncate px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                {a.nome} <span className="text-muted-foreground">— {a.nivel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && <div className="mt-0.5 text-[10px] text-destructive">{erro}</div>}
      {salvando && <div className="mt-0.5 text-[10px] text-muted-foreground">Salvando…</div>}
    </div>
  );
}

function tipoCellBg(tipo: TipoHorario) {
  const map: Record<TipoHorario, string> = {
    regular: "bg-[var(--tipo-regular-bg)] text-[var(--tipo-regular-fg)]",
    online: "bg-[var(--tipo-online-bg)] text-[var(--tipo-online-fg)]",
    comercial: "bg-[var(--tipo-comercial-bg)] text-[var(--tipo-comercial-fg)]",
    vip: "bg-[var(--tipo-vip-bg)] text-[var(--tipo-vip-fg)]",
    reforco: "bg-[var(--tipo-reforco-bg)] text-[var(--tipo-reforco-fg)]",
    conversacao: "bg-[var(--tipo-conversacao-bg)] text-[var(--tipo-conversacao-fg)]",
    break: "bg-[var(--tipo-break-bg)] text-[var(--tipo-break-fg)]",
    preparacao_homework: "bg-[var(--tipo-prep-bg)] text-[var(--tipo-prep-fg)]",
    sem_aula: "bg-[var(--tipo-sem-aula-bg)] text-[var(--tipo-sem-aula-fg)]",
  };
  return map[tipo];
}

// ============ Editor avançado de célula (tipo, tema, avulso, escopo) ============

function CelulaEditor(props: {
  professora: Professora;
  periodo: number;
  diaSemana: number;
  dataDoDia: string;
  config: HorarioConfig | null;
  celulas: CelulaAula[];
  alunos: Aluno[];
  temaDoDia: string | null;
  onSalvarTemaDia: (observacao: string) => Promise<void>;
  onFechar: () => void;
}) {
  const addFn = useServerFn(adicionarAluno);
  const removerFn = useServerFn(removerCelula);
  const setCfgFn = useServerFn(setHorarioConfig);
  const removerCfgFn = useServerFn(removerHorarioConfig);

  const tipoAtual: TipoHorario = props.config?.tipo ?? "regular";
  const [tipo, setTipo] = useState<TipoHorario>(tipoAtual);
  const [tema, setTema] = useState(props.config?.tema ?? "");
  const vagasFechadas = props.config?.vagas_fechadas ?? 0;
  const [busca, setBusca] = useState("");
  const [horario, setHorario] = useState("");
  const [pendingAlunoId, setPendingAlunoId] = useState<string | null>(null);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [modoTipo, setModoTipo] = useState(false);
  const [temaDia, setTemaDia] = useState(props.temaDoDia ?? "");
  const [salvandoTemaDia, setSalvandoTemaDia] = useState(false);

  const fechado = TIPO_FECHADO[tipo];
  const cap = CAPACIDADE[tipo];
  const capEfetiva = Math.max(cap - vagasFechadas, 0);
  const mostraLivro = TIPO_MOSTRA_LIVRO[tipo];
  const cheio = props.celulas.length >= capEfetiva;

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
          vagas_fechadas: vagasFechadas,
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

  async function salvarTemaDia() {
    setErro(null);
    setSalvandoTemaDia(true);
    try {
      await props.onSalvarTemaDia(temaDia.trim());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoTemaDia(false);
    }
  }

  async function confirmarAdicao(esc: "base" | "semana") {
    setErro(null);
    if (!pendingAlunoId && !avulsoNome.trim()) {
      setErro("Escolha um aluno matriculado ou informe o nome do aluno avulso.");
      return;
    }
    const temSlotsFixos = slotsFixosPorPeriodo(tipo, props.periodo).length > 0;
    if (temSlotsFixos && !horario) {
      setErro("Escolha o horário do slot.");
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
          horario_especifico: temSlotsFixos ? horario || null : null,
          observacao: null,
        },
      });
      setPendingAlunoId(null);
      setAvulsoNome("");
      setBusca("");
      setHorario("");
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
              {props.professora.nome} — {DIAS_SEMANA[props.diaSemana - 1].nome} • Período{" "}
              {props.periodo}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{formatarDataBR(props.dataDoDia)}</p>

          {erro && (
            <div className="mb-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}

          {/* Nota especial só para este dia (ex.: atividade do Dia das Crianças) */}
          <section className="mb-6 rounded border border-amber-400/50 bg-amber-500/5 p-3">
            <h3 className="font-medium text-sm mb-1">
              🎉 Nota especial só para {formatarDataBR(props.dataDoDia)}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Aparece destacada na grade só neste dia — não afeta as outras semanas. Deixe em branco
              e salve para remover.
            </p>
            <div className="flex gap-2">
              <input
                value={temaDia}
                onChange={(e) => setTemaDia(e.target.value)}
                placeholder="Ex.: Atividade especial — Dia das Crianças"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={salvandoTemaDia}
                onClick={salvarTemaDia}
                className="shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
              >
                {salvandoTemaDia ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </section>

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
                    Capacidade: até {capEfetiva} aluno{capEfetiva > 1 ? "s" : ""}
                    {vagasFechadas > 0 &&
                      ` (${vagasFechadas} vaga${vagasFechadas > 1 ? "s" : ""} trancada${vagasFechadas > 1 ? "s" : ""})`}
                    . Trave ou destrave vagas direto na grade (ícone 🔒).
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
          {!modoTipo && !fechado && props.celulas.length > 0 && (
            <section className="mb-6">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">
                Alunos ({props.celulas.length}/{capEfetiva})
              </h3>
              <ul className="space-y-2">
                {props.celulas.map((c) => (
                  <li
                    key={c.id}
                    className="rounded border border-border p-2 flex items-center gap-2"
                  >
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
                      {(c.observacao || idiomaDoNivel(c.aluno_nivel)) && (
                        <div className="text-xs text-muted-foreground italic">
                          {c.observacao || idiomaDoNivel(c.aluno_nivel)}
                        </div>
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
          {!modoTipo && !fechado && (
            <section className="mb-6">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Adicionar aluno</h3>
              {cheio ? (
                <div className="text-sm text-muted-foreground">
                  Horário lotado ({capEfetiva} alunos).
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
                        <li className="text-sm text-muted-foreground p-2">
                          Nenhum aluno encontrado.
                        </li>
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
                            {!a.ativo && (
                              <span className="text-amber-600 dark:text-amber-400">
                                {" "}
                                (inativo — vai reativar)
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

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

                  {(pendingAlunoId || avulsoNome.trim()) && (
                    <div className="mt-3 space-y-2 rounded border border-border p-3">
                      {slotsFixosPorPeriodo(tipo, props.periodo).length > 0 && (
                        <select
                          value={horario}
                          onChange={(e) => setHorario(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="" disabled>
                            Horário do slot
                          </option>
                          {slotsFixosPorPeriodo(tipo, props.periodo).map((slot) => {
                            const ocupado = props.celulas.some(
                              (c) => c.horario_especifico === slot,
                            );
                            return (
                              <option key={slot} value={slot} disabled={ocupado}>
                                {slot}
                                {ocupado ? " (ocupado)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      )}
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
