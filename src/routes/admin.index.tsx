import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getGradeSemana, adicionarAluno, removerCelula, atualizarCelula, upsertBloco, removerBloco } from "@/lib/grade.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { datasDaSemana, formatarDataBR, parseISODate, segundaDaSemana, somarSemanas, toISODate } from "@/lib/date-utils";
import { DIAS_SEMANA, PERIODOS, type Aluno, type CelulaAula, type Professora, type TipoAula, type BlocoEspecial, type TipoBloco } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: GradePage,
});

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

  const [editando, setEditando] = useState<{
    professora: Professora;
    periodo: number;
  } | null>(null);
  const [editandoBloco, setEditandoBloco] = useState<BlocoEspecial | null>(null);

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
          alunos={data.alunos.filter((a) => a.ativo)}
          celulas={data.celulasPorData[dataDoDia] ?? []}
          blocos={data.blocos.filter((b) => b.dia_semana === diaAtivo)}
          diaSemana={diaAtivo}
          dataDoDia={dataDoDia}
          onEditarCelula={(professora, periodo) => setEditando({ professora, periodo })}
          onEditarBloco={(b) => setEditandoBloco(b)}
        />
      )}

      {editando && data && (
        <CelulaEditor
          key={`${editando.professora.id}-${editando.periodo}`}
          professora={editando.professora}
          periodo={editando.periodo}
          diaSemana={diaAtivo}
          dataDoDia={dataDoDia}
          celulas={(data.celulasPorData[dataDoDia] ?? []).filter(
            (c) => c.professora_id === editando.professora.id && c.periodo === editando.periodo,
          )}
          alunos={data.alunos.filter((a) => a.ativo)}
          blocoExistente={data.blocos.find(
            (b) => b.professora_id === editando.professora.id && b.periodo === editando.periodo && b.dia_semana === diaAtivo,
          )}
          onFechar={() => setEditando(null)}
        />
      )}

      {editandoBloco && (
        <BlocoEditor bloco={editandoBloco} onFechar={() => setEditandoBloco(null)} />
      )}
    </main>
  );
}

function GradeTabela(props: {
  professoras: Professora[];
  alunos: Aluno[];
  celulas: CelulaAula[];
  blocos: BlocoEspecial[];
  diaSemana: number;
  dataDoDia: string;
  onEditarCelula: (p: Professora, periodo: number) => void;
  onEditarBloco: (b: BlocoEspecial) => void;
}) {
  const { professoras, celulas, blocos } = props;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-16 border border-border bg-muted text-xs font-medium text-muted-foreground p-2">Período</th>
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
                const bloco = blocos.find((b) => b.professora_id === p.id && b.periodo === per);
                const cels = celulas.filter((c) => c.professora_id === p.id && c.periodo === per);
                return (
                  <td
                    key={p.id}
                    onClick={() => bloco ? props.onEditarBloco(bloco) : props.onEditarCelula(p, per)}
                    className="border border-border align-top p-1.5 min-w-[160px] h-20 cursor-pointer hover:bg-accent/40"
                  >
                    {bloco ? (
                      <BlocoPill bloco={bloco} />
                    ) : cels.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <div className="space-y-1">
                        {cels.map((c) => (
                          <div key={c.id} className={`text-sm rounded px-1.5 py-1 ${aulaClass(c.tipo)}`}>
                            {c.horario_especifico && (
                              <span className="font-semibold mr-1">{c.horario_especifico}</span>
                            )}
                            <span>{c.aluno_nome}</span>
                            {c.aluno_nivel && <span className="opacity-70"> — {c.aluno_nivel}</span>}
                          </div>
                        ))}
                      </div>
                    )}
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

function aulaClass(tipo: TipoAula) {
  if (tipo === "online") return "bg-[var(--aula-online-bg)] text-[var(--aula-online-fg)]";
  if (tipo === "vip") return "bg-[var(--aula-vip-bg)] text-[var(--aula-vip-fg)] font-semibold";
  return "bg-white/60 text-foreground";
}

function BlocoPill({ bloco }: { bloco: BlocoEspecial }) {
  const styles: Record<TipoBloco, string> = {
    break: "bg-[var(--bloco-break-bg)] text-[var(--bloco-break-fg)]",
    preparacao_homework: "bg-[var(--bloco-prep-bg)] text-[var(--bloco-prep-fg)]",
    vip: "bg-[var(--bloco-vip-bg)] text-[var(--bloco-vip-fg)]",
  };
  return (
    <div className={`rounded px-2 py-2 h-full text-center text-sm font-semibold ${styles[bloco.tipo]}`}>
      <div>{bloco.titulo || rotuloBloco(bloco.tipo)}</div>
      {bloco.aluno_nome_destaque && <div className="text-xs mt-0.5">{bloco.aluno_nome_destaque}</div>}
    </div>
  );
}

function rotuloBloco(t: TipoBloco) {
  if (t === "break") return "BREAK";
  if (t === "preparacao_homework") return "Preparação & Homework";
  return "VIP";
}

// ============ Editor de célula ============

function CelulaEditor(props: {
  professora: Professora;
  periodo: number;
  diaSemana: number;
  dataDoDia: string;
  celulas: CelulaAula[];
  alunos: Aluno[];
  blocoExistente?: BlocoEspecial;
  onFechar: () => void;
}) {
  const addFn = useServerFn(adicionarAluno);
  const removerFn = useServerFn(removerCelula);
  const atualizarFn = useServerFn(atualizarCelula);
  const upsertBlocoFn = useServerFn(upsertBloco);

  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<TipoAula>("regular");
  const [horario, setHorario] = useState("");
  const [obs, setObs] = useState("");
  const [pendingAlunoId, setPendingAlunoId] = useState<string | null>(null);
  const [escopo, setEscopo] = useState<"base" | "semana" | null>(null);

  const alunosFiltrados = props.alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 8);

  async function confirmarAdicao(esc: "base" | "semana") {
    if (!pendingAlunoId) return;
    await addFn({
      data: {
        escopo: esc,
        data: props.dataDoDia,
        dia_semana: props.diaSemana,
        periodo: props.periodo,
        professora_id: props.professora.id,
        aluno_id: pendingAlunoId,
        tipo,
        horario_especifico: horario || null,
        observacao: obs || null,
      },
    });
    setPendingAlunoId(null);
    setBusca("");
    setHorario("");
    setObs("");
    setEscopo(null);
  }

  async function remover(c: CelulaAula, esc: "base" | "semana") {
    await removerFn({
      data: {
        escopo: esc,
        data: props.dataDoDia,
        celulaId: c.id,
        origem: c.origem,
        grade_base_id: c.grade_base_id,
        excecao_id: c.excecao_id,
      },
    });
  }

  async function adicionarBloco(tipoBloco: TipoBloco) {
    await upsertBlocoFn({
      data: {
        dia_semana: props.diaSemana,
        periodo: props.periodo,
        professora_id: props.professora.id,
        tipo: tipoBloco,
        titulo: rotuloBloco(tipoBloco),
        aluno_nome_destaque: null,
      },
    });
    props.onFechar();
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
            <h2 className="font-semibold text-lg">{props.professora.nome} — Período {props.periodo}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{formatarDataBR(props.dataDoDia)}</p>

          {props.blocoExistente ? (
            <div className="rounded border border-border p-3 mb-4">
              <p className="text-sm">Este período está marcado como <strong>{rotuloBloco(props.blocoExistente.tipo)}</strong>.</p>
              <p className="text-xs text-muted-foreground mt-1">Feche este painel e clique no bloco para editar ou removê-lo.</p>
            </div>
          ) : null}

          {props.celulas.length > 0 && (
            <section className="mb-6">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Alunos neste período</h3>
              <ul className="space-y-2">
                {props.celulas.map((c) => (
                  <li key={c.id} className="rounded border border-border p-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">
                        {c.horario_especifico && <span className="text-sm text-primary mr-1">{c.horario_especifico}</span>}
                        {c.aluno_nome} {c.aluno_nivel && <span className="text-muted-foreground text-sm">— {c.aluno_nivel}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">{c.tipo}</div>
                      {c.observacao && <div className="text-xs text-muted-foreground italic">{c.observacao}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => remover(c, "semana")}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
                        title="Remover só nesta semana"
                      >Só nesta semana</button>
                      <button
                        onClick={() => remover(c, "base")}
                        className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground"
                        title="Remover em todas as semanas"
                      >Todas</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!props.blocoExistente && (
            <>
              <section className="mb-6">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground">Adicionar aluno</h3>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar aluno pelo nome…"
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
                          onClick={() => setPendingAlunoId(a.id)}
                          className={`w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent ${pendingAlunoId === a.id ? "bg-accent" : ""}`}
                        >
                          {a.nome} <span className="text-muted-foreground">— {a.nivel}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {pendingAlunoId && (
                  <div className="mt-3 space-y-2 rounded border border-border p-3">
                    <div className="flex gap-2">
                      <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAula)}
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                        <option value="regular">Regular</option>
                        <option value="vip">VIP</option>
                        <option value="online">Online</option>
                      </select>
                      <input
                        value={horario} onChange={(e) => setHorario(e.target.value)}
                        placeholder="Horário (ex: 07:30)"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                    <input
                      value={obs} onChange={(e) => setObs(e.target.value)}
                      placeholder="Observação (opcional)"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    <div className="text-xs text-muted-foreground pt-1">Aplicar:</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmarAdicao("semana")}
                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                      >Só nesta semana</button>
                      <button
                        onClick={() => confirmarAdicao("base")}
                        className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                      >Em todas as semanas</button>
                    </div>
                  </div>
                )}
              </section>

              <section className="mb-6">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground">Bloco especial</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => adicionarBloco("break")}
                    className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent">+ Break</button>
                  <button onClick={() => adicionarBloco("preparacao_homework")}
                    className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent">+ Preparação & Homework</button>
                  <button onClick={() => adicionarBloco("vip")}
                    className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent">+ VIP</button>
                </div>
              </section>
            </>
          )}

          <button
            onClick={props.onFechar}
            className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >Fechar</button>
        </div>
      </div>
    </div>
  );
}

function BlocoEditor({ bloco, onFechar }: { bloco: BlocoEspecial; onFechar: () => void }) {
  const upsertFn = useServerFn(upsertBloco);
  const removerFn = useServerFn(removerBloco);
  const [titulo, setTitulo] = useState(bloco.titulo);
  const [destaque, setDestaque] = useState(bloco.aluno_nome_destaque ?? "");

  async function salvar() {
    await upsertFn({
      data: {
        id: bloco.id,
        dia_semana: bloco.dia_semana,
        periodo: bloco.periodo,
        professora_id: bloco.professora_id,
        tipo: bloco.tipo,
        titulo,
        aluno_nome_destaque: destaque || null,
      },
    });
    onFechar();
  }
  async function remover() {
    await removerFn({ data: { id: bloco.id } });
    onFechar();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-lg">Editar bloco ({rotuloBloco(bloco.tipo)})</h2>
        <p className="text-sm text-muted-foreground mb-4">Dia {bloco.dia_semana} • Período {bloco.periodo}</p>
        <label className="text-sm">Título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3" />
        <label className="text-sm">Nome em destaque (opcional)</label>
        <input value={destaque} onChange={(e) => setDestaque(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2">
          <button onClick={remover} className="flex-1 rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm">Remover bloco</button>
          <button onClick={salvar} className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">Salvar</button>
        </div>
      </div>
    </div>
  );
}
