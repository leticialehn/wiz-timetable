import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAlertasAtivos,
  resolverAlerta,
  marcarContactado,
  type AlertaAtivo,
  type TipoAlerta,
} from "@/lib/alertas.functions";
import { getUltimasLicoesPorAluno } from "@/lib/cadastros.functions";
import { formatarDataBR } from "@/lib/date-utils";

// Ordem de exibição dos grupos: rematrícula sempre primeiro.
const ORDEM_TIPO: TipoAlerta[] = ["rematricula", "faltas", "nota_fala", "atrasado", "sem_aula"];

const ROTULO_TIPO_ALERTA: Record<TipoAlerta, string> = {
  faltas: "Faltas seguidas",
  rematricula: "Rematrícula (R8)",
  nota_fala: "Nota baixa em Fala",
  atrasado: "Atrasado no calendário",
  sem_aula: "Sem aula agendada",
};

function descricaoAlerta(a: AlertaAtivo): string {
  if (a.tipo === "faltas") return `${a.contagem} faltas seguidas`;
  if (a.tipo === "sem_aula") return `Sem nenhuma aula agendada há ${a.contagem} dias`;
  if (a.tipo === "rematricula") {
    return a.contagem === 0
      ? "Chegou na R8"
      : `${a.contagem} lições além da R8, ainda sem resposta`;
  }
  if (a.tipo === "atrasado") {
    return `Atrasado ~${a.contagem} ${a.contagem === 1 ? "mês" : "meses"} no calendário do nível`;
  }
  return `B ou pior em Fala nas últimas ${a.contagem} lições`;
}

function agruparPorTipo(alertas: AlertaAtivo[]): { tipo: TipoAlerta; itens: AlertaAtivo[] }[] {
  return ORDEM_TIPO.map((tipo) => ({ tipo, itens: alertas.filter((a) => a.tipo === tipo) })).filter(
    (g) => g.itens.length > 0,
  );
}

export function AlertasLista({ resolvidoPor }: { resolvidoPor: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getAlertasAtivos);
  const resolverFn = useServerFn(resolverAlerta);
  const contactarFn = useServerFn(marcarContactado);
  const getUltimasLicoesFn = useServerFn(getUltimasLicoesPorAluno);
  const [salvando, setSalvando] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: () => getFn(),
  });
  const { data: ultimasLicoes } = useQuery({
    queryKey: ["ultimas-licoes-por-aluno"],
    queryFn: () => getUltimasLicoesFn(),
  });

  async function marcarResolvido(id: string) {
    setSalvando(id);
    try {
      await resolverFn({ data: { id, resolvido_por: resolvidoPor } });
      qc.invalidateQueries({ queryKey: ["alertas-ativos"] });
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

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando…</p>;

  const pendentes = (data ?? []).filter((a) => a.status === "pendente");
  const resolvidos = (data ?? []).filter((a) => a.status === "resolvido");
  const gruposPendentes = agruparPorTipo(pendentes);
  const gruposResolvidos = agruparPorTipo(resolvidos);

  return (
    <div>
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
                  const jaContactado = ehRematricula && a.contactado_em;
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
                      </div>
                      <button
                        disabled={salvando === a.id}
                        onClick={() =>
                          ehRematricula && !jaContactado
                            ? marcarContatoFeito(a.id)
                            : marcarResolvido(a.id)
                        }
                        className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
                      >
                        {salvando === a.id
                          ? "Salvando…"
                          : ehRematricula
                            ? jaContactado
                              ? "Rematriculado"
                              : "Contato feito"
                            : "Contato feito"}
                      </button>
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
                      ✓{" "}
                      {a.tipo === "rematricula"
                        ? `Rematriculado por ${a.resolvido_por}`
                        : a.resolvido_por}
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
