import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getLeads, rotuloOcorrenciaLead, type Lead } from "@/lib/relatorios.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { formatarDataBR } from "@/lib/date-utils";
import { ROTULO_TIPO } from "@/lib/types";

export const Route = createFileRoute("/admin/relatorios_/avulsos")({ component: LeadsPage });

function LeadsPage() {
  useRealtimeGrade();
  const [busca, setBusca] = useState("");

  const getFn = useServerFn(getLeads);
  const { data } = useQuery({
    queryKey: ["leads"],
    queryFn: () => getFn(),
  });

  const filtrados = (data ?? []).filter((a: Lead) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/relatorios"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Leads</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Nomes marcados numa aula (ex.: experimental) sem virar cadastro de aluno — se a mesma pessoa
        foi digitada com grafias diferentes (com ou sem acento), já aparece agrupada aqui.
      </p>

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lead…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {!data ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : filtrados.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {data.length === 0 ? "Nenhum lead registrado ainda." : "Nenhum lead encontrado com essa busca."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((a: Lead) => (
            <li key={a.nome} className="rounded-lg border border-border p-3">
              <div className="font-medium mb-1">{a.nome}</div>
              <ul className="space-y-0.5">
                {a.ocorrencias.map((o, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {rotuloOcorrenciaLead(o)} · {o.professora_nome} · {ROTULO_TIPO[o.tipo]}
                  </li>
                ))}
              </ul>
              {a.ultimaData && (
                <div className="text-xs text-muted-foreground mt-1">
                  Última aula: {formatarDataBR(a.ultimaData)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
