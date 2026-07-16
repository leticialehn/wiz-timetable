import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getAlertasAtivos, resolverAlerta, type AlertaAtivo } from "@/lib/alertas.functions";
import { formatarDataBR } from "@/lib/date-utils";

function descricaoAlerta(a: AlertaAtivo): string {
  if (a.tipo === "faltas") return `${a.contagem} faltas seguidas`;
  if (a.tipo === "sem_aula") return `Sem nenhuma aula agendada há ${a.contagem} dias`;
  return `B ou pior em Fala nas últimas ${a.contagem} lições`;
}

export function AlertasLista({ resolvidoPor }: { resolvidoPor: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getAlertasAtivos);
  const resolverFn = useServerFn(resolverAlerta);
  const [resolvendo, setResolvendo] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: () => getFn(),
  });

  async function marcarResolvido(id: string) {
    setResolvendo(id);
    try {
      await resolverFn({ data: { id, resolvido_por: resolvidoPor } });
      qc.invalidateQueries({ queryKey: ["alertas-ativos"] });
    } finally {
      setResolvendo(null);
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
          {pendentes.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <div className="font-medium">
                  {a.nome} <span className="text-muted-foreground font-normal">— {a.nivel}</span>
                </div>
                <div className="text-sm text-muted-foreground">{descricaoAlerta(a)}</div>
              </div>
              <button
                disabled={resolvendo === a.id}
                onClick={() => marcarResolvido(a.id)}
                className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {resolvendo === a.id ? "Salvando…" : "Contato feito"}
              </button>
            </li>
          ))}
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
                ✓ {a.resolvido_por}
                {a.resolvido_em ? ` em ${formatarDataBR(a.resolvido_em.slice(0, 10))}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
