import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAlertasAtivos,
  resolverAlerta,
  marcarContactado,
  type AlertaAtivo,
} from "@/lib/alertas.functions";
import { formatarDataBR } from "@/lib/date-utils";

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

export function AlertasLista({ resolvidoPor }: { resolvidoPor: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getAlertasAtivos);
  const resolverFn = useServerFn(resolverAlerta);
  const contactarFn = useServerFn(marcarContactado);
  const [salvando, setSalvando] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: () => getFn(),
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

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">
        Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
      </h2>
      {pendentes.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-8">Nenhum alerta pendente.</p>
      ) : (
        <ul className="space-y-2 mb-8">
          {pendentes.map((a) => {
            const ehRematricula = a.tipo === "rematricula";
            const jaContactado = ehRematricula && a.contactado_em;
            return (
              <li
                key={a.id}
                className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <div className="font-medium">
                    {a.nome} <span className="text-muted-foreground font-normal">— {a.nivel}</span>
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
      )}

      <h2 className="text-sm font-semibold text-muted-foreground mb-2">Resolvidos recentemente</h2>
      {resolvidos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {resolvidos.map((a) => (
            <li
              key={a.id}
              className="rounded-lg bg-secondary px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap"
            >
              <div>
                <span className="font-medium">{a.nome}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {a.nivel} · {descricaoAlerta(a)}
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
      )}
    </div>
  );
}
