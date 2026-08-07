import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAniversariantes, type Aniversariante } from "@/lib/relatorios.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";

export const Route = createFileRoute("/admin/relatorios_/aniversariantes")({
  component: AniversariantesPage,
});

function nomeDoMes(mes: number): string {
  const rotulo = new Date(2000, mes, 1).toLocaleDateString("pt-BR", { month: "long" });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

type Modo = "mensal" | "anual";

function AniversariantesPage() {
  useRealtimeGrade();
  const [modo, setModo] = useState<Modo>("mensal");
  const [mesRef, setMesRef] = useState(() => new Date().getMonth());

  const getFn = useServerFn(getAniversariantes);
  const { data } = useQuery({
    queryKey: ["aniversariantes"],
    queryFn: () => getFn(),
  });

  const porMes = useMemo(() => {
    const grupos: Aniversariante[][] = Array.from({ length: 12 }, () => []);
    for (const a of data ?? []) grupos[a.mes].push(a);
    return grupos;
  }, [data]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/admin/relatorios"
        className="text-sm text-muted-foreground underline mb-4 inline-block"
      >
        ← Voltar a Relatórios
      </Link>
      <h1 className="text-2xl font-semibold mb-4">Aniversariantes</h1>

      <div className="flex gap-1 rounded-md border border-border p-1 mb-6 w-fit">
        <button
          onClick={() => setModo("mensal")}
          className={`px-3 py-1 rounded text-sm ${modo === "mensal" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        >
          Mensal
        </button>
        <button
          onClick={() => setModo("anual")}
          className={`px-3 py-1 rounded text-sm ${modo === "anual" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        >
          Anual
        </button>
      </div>

      {!data ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : modo === "mensal" ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setMesRef((m) => (m + 11) % 12)}
              className="px-2 py-1 rounded border border-border hover:bg-accent text-xs"
            >
              ← Mês anterior
            </button>
            <h2 className="text-lg font-semibold">{nomeDoMes(mesRef)}</h2>
            <button
              onClick={() => setMesRef((m) => (m + 1) % 12)}
              className="px-2 py-1 rounded border border-border hover:bg-accent text-xs"
            >
              Próximo mês →
            </button>
          </div>
          {porMes[mesRef].length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum aniversariante em {nomeDoMes(mesRef)}.</p>
          ) : (
            <ul className="space-y-1.5">
              {porMes[mesRef].map((a) => (
                <li key={a.aluno_id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium">Dia {a.dia}</span> — {a.nome}{" "}
                  <span className="text-muted-foreground">({a.nivel})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {porMes.map(
            (lista, mes) =>
              lista.length > 0 && (
                <div key={mes}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {nomeDoMes(mes)}
                  </h2>
                  <ul className="space-y-1.5">
                    {lista.map((a) => (
                      <li key={a.aluno_id} className="rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="font-medium">Dia {a.dia}</span> — {a.nome}{" "}
                        <span className="text-muted-foreground">({a.nivel})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </main>
  );
}
