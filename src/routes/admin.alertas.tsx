import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getAlertasAtivos,
  getAniversariantesDoMes,
  SLUG_TIPO_ALERTA,
} from "@/lib/alertas.functions";
import {
  AniversariantesBanner,
  ORDEM_TIPO,
  ROTULO_TIPO_ALERTA,
  DESCRICAO_TIPO_ALERTA,
} from "@/components/AlertasLista";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";

export const Route = createFileRoute("/admin/alertas")({ component: AlertasPage });

function AlertaCard({
  to,
  titulo,
  descricao,
  contagem,
}: {
  to: string;
  titulo: string;
  descricao: string;
  contagem: number;
}) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-border p-4 hover:bg-accent hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-semibold">{titulo}</div>
        {contagem > 0 && (
          <span className="shrink-0 text-[11px] leading-none px-1.5 py-1 rounded-full bg-orange-500 text-white font-semibold">
            {contagem}
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{descricao}</div>
    </Link>
  );
}

function AlertasPage() {
  useRealtimeGrade();
  const getAlertasFn = useServerFn(getAlertasAtivos);
  const { data: alertas } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: () => getAlertasFn(),
  });
  const getAniversariantesFn = useServerFn(getAniversariantesDoMes);
  const { data: aniversariantes } = useQuery({
    queryKey: ["aniversariantes-do-mes"],
    queryFn: () => getAniversariantesFn(),
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Alertas</h1>
      <AniversariantesBanner aniversariantes={aniversariantes ?? []} />
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDEM_TIPO.map((tipo) => (
          <AlertaCard
            key={tipo}
            to={`/admin/alertas/${SLUG_TIPO_ALERTA[tipo]}`}
            titulo={ROTULO_TIPO_ALERTA[tipo]}
            descricao={DESCRICAO_TIPO_ALERTA[tipo]}
            contagem={
              (alertas ?? []).filter((a) => a.tipo === tipo && a.status === "pendente").length
            }
          />
        ))}
      </div>
    </main>
  );
}
