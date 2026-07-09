import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getGradeSemana } from "@/lib/grade.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { DIAS_SEMANA, PERIODOS, type BlocoEspecial, type CelulaAula, type Professora, type TipoAula, type TipoBloco } from "@/lib/types";
import { datasDaSemana, formatarDataBR, parseISODate, segundaDaSemana, toISODate } from "@/lib/date-utils";

export const Route = createFileRoute("/professora")({
  component: ProfessoraPage,
  head: () => ({ meta: [{ title: "Minha grade — Professora" }] }),
});

const STORAGE_KEY = "escola:professora-id";

function ProfessoraPage() {
  useRealtimeGrade();
  const [professoraId, setProfessoraId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProfessoraId(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
  }, []);

  const [dataSegunda, setDataSegunda] = useState(() => toISODate(segundaDaSemana()));
  const datas = useMemo(() => datasDaSemana(parseISODate(dataSegunda)), [dataSegunda]);
  const hojeIso = toISODate(new Date());
  const [diaAtivo, setDiaAtivo] = useState<number>(() => {
    const dow = new Date().getDay();
    return dow >= 1 && dow <= 6 ? dow : 1;
  });
  const dataDoDia = datas[diaAtivo - 1];

  const getFn = useServerFn(getGradeSemana);
  const { data } = useQuery({
    queryKey: ["grade-semana-prof", dataSegunda],
    queryFn: () => getFn({ data: { dataSegunda } }),
  });

  if (!mounted) return null;

  if (!professoraId || !data?.professoras.find((p) => p.id === professoraId)) {
    return (
      <SelecaoProfessora
        professoras={data?.professoras ?? []}
        onEscolher={(id) => { localStorage.setItem(STORAGE_KEY, id); setProfessoraId(id); }}
      />
    );
  }

  const professora = data.professoras.find((p) => p.id === professoraId)!;
  const cels = (data.celulasPorData[dataDoDia] ?? []).filter((c) => c.professora_id === professoraId);
  const blocos = data.blocos.filter((b) => b.professora_id === professoraId && b.dia_semana === diaAtivo);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: professora.cor }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">Professora</div>
            <h1 className="text-2xl font-bold">{professora.nome}</h1>
          </div>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setProfessoraId(null); }}
            className="text-xs px-3 py-1.5 rounded bg-black/10 hover:bg-black/20"
          >Trocar</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
          {DIAS_SEMANA.map((d, i) => {
            const iso = datas[i];
            const eHoje = iso === hojeIso;
            return (
              <button
                key={d.n}
                onClick={() => setDiaAtivo(d.n)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  diaAtivo === d.n ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div>{d.curto} {eHoje && "•"}</div>
                <div className="text-xs opacity-70">{formatarDataBR(iso)}</div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setDataSegunda(toISODate(segundaDaSemana()))}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent">Hoje</button>
          <div className="text-xs text-muted-foreground self-center">
            Semana de {formatarDataBR(datas[0])} a {formatarDataBR(datas[5])}
          </div>
        </div>

        <ol className="space-y-3">
          {PERIODOS.map((per) => {
            const bloco = blocos.find((b) => b.periodo === per);
            const celsPer = cels.filter((c) => c.periodo === per);
            return (
              <li key={per} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-14 bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {per}
                  </div>
                  <div className="flex-1 p-3">
                    {bloco ? <BlocoCard bloco={bloco} /> : celsPer.length === 0 ? (
                      <div className="text-muted-foreground italic py-2">Livre</div>
                    ) : (
                      <ul className="space-y-2">
                        {celsPer.map((c) => <AlunoCard key={c.id} c={c} />)}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}

function AlunoCard({ c }: { c: CelulaAula }) {
  const cls: Record<TipoAula, string> = {
    regular: "bg-card",
    online: "bg-[var(--aula-online-bg)] text-[var(--aula-online-fg)]",
    vip: "bg-[var(--aula-vip-bg)] text-[var(--aula-vip-fg)]",
  };
  return (
    <li className={`rounded-lg px-3 py-2 ${cls[c.tipo]}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        {c.horario_especifico && (
          <span className="text-lg font-bold">{c.horario_especifico}</span>
        )}
        <span className="text-xl font-semibold">{c.aluno_nome}</span>
        {c.aluno_nivel && <span className="text-base opacity-70">— {c.aluno_nivel}</span>}
        {c.tipo !== "regular" && (
          <span className="text-xs uppercase font-bold ml-auto tracking-wider">{c.tipo}</span>
        )}
      </div>
      {c.observacao && <div className="text-sm opacity-75 mt-1 italic">{c.observacao}</div>}
    </li>
  );
}

function BlocoCard({ bloco }: { bloco: BlocoEspecial }) {
  const styles: Record<TipoBloco, string> = {
    break: "bg-[var(--bloco-break-bg)] text-[var(--bloco-break-fg)]",
    preparacao_homework: "bg-[var(--bloco-prep-bg)] text-[var(--bloco-prep-fg)]",
    vip: "bg-[var(--bloco-vip-bg)] text-[var(--bloco-vip-fg)]",
  };
  return (
    <div className={`rounded-lg px-4 py-3 text-center font-bold text-lg ${styles[bloco.tipo]}`}>
      {bloco.titulo || rotuloBloco(bloco.tipo)}
      {bloco.aluno_nome_destaque && <div className="text-sm font-normal mt-1">{bloco.aluno_nome_destaque}</div>}
    </div>
  );
}

function rotuloBloco(t: TipoBloco) {
  if (t === "break") return "BREAK";
  if (t === "preparacao_homework") return "Preparação & Homework";
  return "VIP";
}

function SelecaoProfessora({ professoras, onEscolher }: { professoras: Professora[]; onEscolher: (id: string) => void }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">Quem está usando?</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Escolha o seu nome para ver a grade.</p>
        <ul className="space-y-2">
          {professoras.length === 0 && <li className="text-muted-foreground text-center">Carregando…</li>}
          {professoras.filter((p) => p.ativa).map((p) => (
            <li key={p.id}>
              <button onClick={() => onEscolher(p.id)}
                className="w-full rounded-xl px-5 py-4 text-left text-lg font-semibold border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: p.cor }}>
                {p.nome}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">Voltar</Link>
        </div>
      </div>
    </main>
  );
}
