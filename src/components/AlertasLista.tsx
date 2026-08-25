import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAlertasAtivos,
  resolverAlerta,
  marcarContactado,
  getAniversariantesDoMes,
  type AlertaAtivo,
  type TipoAlerta,
  type DesfechoRematricula,
} from "@/lib/alertas.functions";
import { getUltimasLicoesPorAluno } from "@/lib/cadastros.functions";
import { formatarDataBR, formatarMesAnoBR, toISODate, somarMeses } from "@/lib/date-utils";

// Ordem de exibição dos grupos: rematrícula sempre primeiro.
const ORDEM_TIPO: TipoAlerta[] = [
  "rematricula",
  "faltas",
  "nota_fala",
  "atrasado",
  "sem_aula",
  "escrita_pendente",
  "gravacao_r3r4",
  "gravacao_r7r8",
];

const ROTULO_TIPO_ALERTA: Record<TipoAlerta, string> = {
  faltas: "Faltas seguidas",
  rematricula: "Rematrícula (R8)",
  nota_fala: "Nota baixa em Fala",
  atrasado: "Atrasado no calendário",
  sem_aula: "Sem aula agendada",
  escrita_pendente: "Tarefa escrita pendente",
  gravacao_r3r4: "Gravação pendente (entre R3 e R4)",
  gravacao_r7r8: "Gravação pendente (entre R7 e R8)",
};

// Mesma janela de aviso usada no servidor (ver JANELA_AVISO_CONTRATO_MESES em
// alertas.functions.ts) — só pra decidir se vale a pena mostrar o prazo do
// contrato junto da descrição do alerta.
function contratoProximoOuVencido(contratoFim: string | null): boolean {
  if (!contratoFim) return false;
  return somarMeses(contratoFim, -1) <= toISODate(new Date());
}

function descricaoAlerta(a: AlertaAtivo): string {
  if (a.tipo === "faltas") return `${a.contagem} faltas seguidas`;
  if (a.tipo === "sem_aula") return `Sem nenhuma aula agendada há ${a.contagem} dias`;
  if (a.tipo === "rematricula") {
    if (a.contagem === -1) {
      return a.contrato_fim
        ? `Contrato termina em ${formatarMesAnoBR(a.contrato_fim)} — ainda não chegou na R8`
        : "Contrato terminando";
    }
    const base =
      a.contagem === 0 ? "Chegou na R8" : `${a.contagem} lições além da R8, ainda sem resposta`;
    return a.contrato_fim && contratoProximoOuVencido(a.contrato_fim)
      ? `${base} · Contrato até ${formatarMesAnoBR(a.contrato_fim)}`
      : base;
  }
  if (a.tipo === "atrasado") {
    return `Atrasado ~${a.contagem} ${a.contagem === 1 ? "mês" : "meses"} no calendário do nível`;
  }
  if (a.tipo === "nota_fala") return `B ou pior em Fala nas últimas ${a.contagem} lições`;
  if (a.tipo === "escrita_pendente") return `${a.contagem} tarefas escritas seguidas sem entregar`;
  return "Ainda não foi gravado nesta janela de revisões";
}

// Rótulo da linha "Resolvidos recentemente" pra rematrícula — desfecho é o
// campo novo e correto; alertas antigos (resolvidos antes dessa feature)
// não têm desfecho salvo, então cai no critério antigo (motivo preenchido =
// não rematriculado, senão rematriculado).
function rotuloDesfechoRematricula(a: AlertaAtivo): string {
  if (a.desfecho === "nao_rematriculado" || (!a.desfecho && a.motivo)) {
    return `Não rematriculado por ${a.resolvido_por}${a.motivo ? ` — ${a.motivo}` : ""}`;
  }
  if (a.desfecho === "parcelas_adicionais") return `Parcelas adicionais — ${a.resolvido_por}`;
  return `Rematriculado por ${a.resolvido_por}`;
}

function agruparPorTipo(alertas: AlertaAtivo[]): { tipo: TipoAlerta; itens: AlertaAtivo[] }[] {
  return ORDEM_TIPO.map((tipo) => ({ tipo, itens: alertas.filter((a) => a.tipo === tipo) })).filter(
    (g) => g.itens.length > 0,
  );
}

export function AlertasLista({
  resolvidoPor,
  apenasTipos,
}: {
  resolvidoPor: string;
  apenasTipos?: TipoAlerta[];
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getAlertasAtivos);
  const resolverFn = useServerFn(resolverAlerta);
  const contactarFn = useServerFn(marcarContactado);
  const getUltimasLicoesFn = useServerFn(getUltimasLicoesPorAluno);
  const getAniversariantesFn = useServerFn(getAniversariantesDoMes);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [naoRematriculandoId, setNaoRematriculandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [renovandoId, setRenovandoId] = useState<string | null>(null);
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: () => getFn(),
  });
  const { data: ultimasLicoes } = useQuery({
    queryKey: ["ultimas-licoes-por-aluno"],
    queryFn: () => getUltimasLicoesFn(),
  });
  const { data: aniversariantes } = useQuery({
    queryKey: ["aniversariantes-do-mes"],
    queryFn: () => getAniversariantesFn(),
  });

  async function marcarResolvido(id: string, motivoTexto?: string, desfecho?: DesfechoRematricula) {
    setSalvando(id);
    try {
      await resolverFn({
        data: { id, resolvido_por: resolvidoPor, motivo: motivoTexto, desfecho },
      });
      qc.invalidateQueries({ queryKey: ["alertas-ativos"] });
      setNaoRematriculandoId(null);
      setMotivo("");
      setRenovandoId(null);
    } finally {
      setSalvando(null);
    }
  }

  async function marcarContatoFeito(id: string) {
    setSalvando(id);
    try {
      await contactarFn({ data: { id, contactado_por: resolvidoPor } });
      qc.invalidateQueries({ queryKey: ["alertas-ativos"] });
    } finally {
      setSalvando(null);
    }
  }

  // Início sugerido = hoje, término sugerido = +12 meses — ela sempre pode
  // ajustar antes de confirmar, já que às vezes a renovação é feita antes do
  // prazo vencer de fato (ou o contrato não é de exatamente 1 ano).
  function abrirRenovacao(a: AlertaAtivo) {
    const inicioSugerido = toISODate(new Date()).slice(0, 7);
    setNovoInicio(inicioSugerido);
    setNovoFim(somarMeses(`${inicioSugerido}-01`, 12).slice(0, 7));
    setRenovandoId(a.id);
  }

  async function confirmarRenovacao(id: string) {
    setSalvando(id);
    try {
      await resolverFn({
        data: {
          id,
          resolvido_por: resolvidoPor,
          desfecho: "rematriculado",
          novoContratoInicio: novoInicio ? `${novoInicio}-01` : null,
          novoContratoFim: novoFim ? `${novoFim}-01` : null,
        },
      });
      qc.invalidateQueries({ queryKey: ["alertas-ativos"] });
      setRenovandoId(null);
    } finally {
      setSalvando(null);
    }
  }

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;

  const alertas = apenasTipos
    ? (data ?? []).filter((a) => apenasTipos.includes(a.tipo))
    : (data ?? []);
  const pendentes = alertas.filter((a) => a.status === "pendente");
  const resolvidos = alertas.filter((a) => a.status === "resolvido");
  const gruposPendentes = agruparPorTipo(pendentes);
  const gruposResolvidos = agruparPorTipo(resolvidos);

  const nomeMesAtual = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div>
      {aniversariantes && aniversariantes.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-3">
          <h2 className="text-sm font-semibold mb-2">
            🎂 Aniversariantes de {nomeMesAtual} ({aniversariantes.length})
          </h2>
          <ul className="space-y-1 text-sm">
            {aniversariantes.map((a) => (
              <li key={a.aluno_id}>
                <span className="font-medium">Dia {a.dia}</span> — {a.nome}{" "}
                <span className="text-muted-foreground">({a.nivel})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
      </h2>
      {gruposPendentes.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-8">Nenhum alerta pendente.</p>
      ) : (
        <div className="mb-8 space-y-4">
          {gruposPendentes.map(({ tipo, itens }) => (
            <div key={tipo}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {ROTULO_TIPO_ALERTA[tipo]} ({itens.length})
              </h3>
              <ul className="space-y-2">
                {itens.map((a) => {
                  const ehRematricula = a.tipo === "rematricula";
                  const ehGravacao = a.tipo === "gravacao_r3r4" || a.tipo === "gravacao_r7r8";
                  const jaContactado = ehRematricula && a.contactado_em;
                  const escrevendoMotivo = naoRematriculandoId === a.id;
                  const renovandoContrato = renovandoId === a.id;
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <div className="font-medium">
                          {a.nome}{" "}
                          <span className="text-muted-foreground font-normal">
                            — {a.nivel}
                            {ultimasLicoes?.[a.aluno_id] && ` · ${ultimasLicoes[a.aluno_id]}`}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">{descricaoAlerta(a)}</div>
                        {jaContactado && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Contactado por {a.contactado_por} em{" "}
                            {formatarDataBR(a.contactado_em!.slice(0, 10))} — aguardando decisão
                          </div>
                        )}
                        {escrevendoMotivo && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              autoFocus
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && motivo.trim())
                                  marcarResolvido(a.id, motivo.trim(), "nao_rematriculado");
                                if (e.key === "Escape") {
                                  setNaoRematriculandoId(null);
                                  setMotivo("");
                                }
                              }}
                              placeholder="Motivo (ex.: terminou o último livro, não vai continuar)"
                              className="flex-1 min-w-[220px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                            />
                            <button
                              disabled={salvando === a.id || !motivo.trim()}
                              onClick={() =>
                                marcarResolvido(a.id, motivo.trim(), "nao_rematriculado")
                              }
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => {
                                setNaoRematriculandoId(null);
                                setMotivo("");
                              }}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                        {renovandoContrato && (
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <label className="text-xs text-muted-foreground">
                              <div className="mb-0.5">Novo início</div>
                              <input
                                type="month"
                                value={novoInicio}
                                onChange={(e) => setNovoInicio(e.target.value)}
                                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                              />
                            </label>
                            <label className="text-xs text-muted-foreground">
                              <div className="mb-0.5">Novo término</div>
                              <input
                                type="month"
                                value={novoFim}
                                onChange={(e) => setNovoFim(e.target.value)}
                                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                              />
                            </label>
                            <button
                              disabled={salvando === a.id}
                              onClick={() => confirmarRenovacao(a.id)}
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setRenovandoId(null)}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                      {!escrevendoMotivo && !renovandoContrato && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={salvando === a.id}
                            onClick={() => {
                              if (ehRematricula && !jaContactado) {
                                marcarContatoFeito(a.id);
                              } else if (ehRematricula) {
                                abrirRenovacao(a);
                              } else {
                                marcarResolvido(a.id);
                              }
                            }}
                            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {salvando === a.id
                              ? "Salvando…"
                              : ehRematricula
                                ? jaContactado
                                  ? "Rematriculado"
                                  : "Contato feito"
                                : ehGravacao
                                  ? "Gravado"
                                  : "Contato feito"}
                          </button>
                          {ehRematricula && jaContactado && (
                            <>
                              <button
                                disabled={salvando === a.id}
                                onClick={() =>
                                  marcarResolvido(a.id, undefined, "parcelas_adicionais")
                                }
                                title="Não renova o contrato agora — aluno continua no livro atual pagando parcelas à parte"
                                className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
                              >
                                Parcelas adicionais
                              </button>
                              <button
                                disabled={salvando === a.id}
                                onClick={() => {
                                  setNaoRematriculandoId(a.id);
                                  setMotivo("");
                                }}
                                className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
                              >
                                Não rematriculado
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground mb-2">Resolvidos recentemente</h2>
      {gruposResolvidos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum ainda.</p>
      ) : (
        <div className="space-y-3">
          {gruposResolvidos.map(({ tipo, itens }) => (
            <div key={tipo}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {ROTULO_TIPO_ALERTA[tipo]}
              </h3>
              <ul className="space-y-1.5">
                {itens.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg bg-secondary px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap"
                  >
                    <div>
                      <span className="font-medium">{a.nome}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {a.nivel}
                        {ultimasLicoes?.[a.aluno_id] && ` · ${ultimasLicoes[a.aluno_id]}`} ·{" "}
                        {descricaoAlerta(a)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ✓ {a.tipo === "rematricula" ? rotuloDesfechoRematricula(a) : a.resolvido_por}
                      {a.resolvido_em ? ` em ${formatarDataBR(a.resolvido_em.slice(0, 10))}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
