import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getProspectosComerciais,
  rotuloOcorrenciaLead,
  type Lead,
} from "@/lib/relatorios.functions";
import { criarAluno } from "@/lib/cadastros.functions";
import { removerCelula } from "@/lib/grade.functions";
import { useRealtimeGrade } from "@/hooks/use-realtime-grade";
import { NIVEIS } from "@/lib/types";

export const Route = createFileRoute("/admin/comercial")({ component: ComercialPage });

function ComercialPage() {
  useRealtimeGrade();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  // Story 7.3: nome do prospect atualmente em edição pro fluxo "MATRICULADO"
  // (null = nenhum). Um prospect não tem id (é um agrupamento de ocorrências
  // avulsas por nome), então usamos o próprio nome como chave.
  const [matriculando, setMatriculando] = useState<string | null>(null);
  // Nomes já matriculados nesta sessão — o prospect continua na lista (o
  // histórico de ocorrências Comercial dele não muda), só marcamos aqui pra
  // não deixar matricular de novo por engano enquanto a tela não recarrega.
  const [matriculados, setMatriculados] = useState<Set<string>>(new Set());

  const getFn = useServerFn(getProspectosComerciais);
  const { data } = useQuery({
    queryKey: ["prospectos-comerciais"],
    queryFn: () => getFn(),
  });

  const criarFn = useServerFn(criarAluno);
  const matricular = useMutation({
    mutationFn: (vars: { nome: string; nivel: string }) =>
      criarFn({ data: { nome: vars.nome, nivel: vars.nivel } }),
    onSuccess: (_r, vars) => {
      setMatriculados((prev) => new Set(prev).add(vars.nome));
      setMatriculando(null);
      qc.invalidateQueries();
    },
  });

  // Remove um prospect inteiro — apaga TODAS as ocorrências dele (todas as
  // reservas avulsas que caíram nesse nome agrupado), via o mesmo
  // `removerCelula` que a grade já usa pra apagar uma célula.
  const removerFn = useServerFn(removerCelula);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const remover = useMutation({
    mutationFn: async (lead: Lead) => {
      for (const o of lead.ocorrencias) {
        await removerFn({
          data: {
            escopo: o.origem === "base" ? "base" : "semana",
            data: o.data ?? "",
            origem: o.origem,
            grade_base_id: o.grade_base_id,
            excecao_id: o.excecao_id,
          },
        });
      }
    },
    onMutate: (lead) => setRemovendo(lead.nome),
    onSettled: () => setRemovendo(null),
    onSuccess: () => qc.invalidateQueries(),
  });

  const filtrados = (data ?? []).filter((a: Lead) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-1">Comercial</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Prospects agendados num slot Comercial (conversa sobre matrícula) — se a mesma pessoa foi
        digitada com grafias diferentes (com ou sem acento), já aparece agrupada aqui.
      </p>

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar prospect…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {!data ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : filtrados.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {data.length === 0
            ? "Nenhum prospect comercial registrado ainda."
            : "Nenhum prospect encontrado com essa busca."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((a: Lead) => (
            <li key={a.nome} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium mb-1">{a.nome}</div>
                  <ul className="space-y-0.5">
                    {a.ocorrencias.map((o, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {rotuloOcorrenciaLead(o)} · {o.professora_nome}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {matriculados.has(a.nome) ? (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1">
                      Matriculado ✓
                    </span>
                  ) : matriculando !== a.nome ? (
                    <button
                      type="button"
                      onClick={() => setMatriculando(a.nome)}
                      className="text-xs font-medium px-2 py-1 rounded border border-border hover:bg-accent"
                    >
                      MATRICULADO
                    </button>
                  ) : null}
                  {matriculando !== a.nome && (
                    <button
                      type="button"
                      disabled={removendo === a.nome}
                      onClick={() => {
                        if (
                          !confirm(
                            `Remover ${a.nome} da lista de prospects? Isso apaga todas as ${a.ocorrencias.length} ocorrência(s) dele na grade.`,
                          )
                        )
                          return;
                        remover.mutate(a);
                      }}
                      className="text-xs font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      {removendo === a.nome ? "Removendo…" : "Remover"}
                    </button>
                  )}
                </div>
              </div>
              {remover.isError && remover.variables?.nome === a.nome && (
                <div className="mt-1 text-xs text-destructive">
                  {(remover.error as Error).message}
                </div>
              )}
              {matriculando === a.nome && (
                <FormMatricular
                  nomeInicial={a.nome}
                  salvando={matricular.isPending}
                  erro={matricular.error ? (matricular.error as Error).message : null}
                  onCancelar={() => {
                    matricular.reset();
                    setMatriculando(null);
                  }}
                  onConfirmar={(nome, nivel) => matricular.mutate({ nome, nivel })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// Story 7.3: ao clicar "MATRICULADO", nome e nível do prospect viram campos
// editáveis inline — o nível de quem fez a aula experimental nem sempre é o
// nível em que a matrícula de fato entra, então o nome também pode precisar
// de correção (grafia completa) antes de virar um aluno de verdade.
function FormMatricular({
  nomeInicial,
  salvando,
  erro,
  onCancelar,
  onConfirmar,
}: {
  nomeInicial: string;
  salvando: boolean;
  erro: string | null;
  onCancelar: () => void;
  onConfirmar: (nome: string, nivel: string) => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [nivel, setNivel] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  return (
    <div className="mt-3 space-y-2 rounded border border-border p-3">
      <div className="flex gap-2">
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo…"
          className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
        />
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          className="w-20 shrink-0 rounded border border-input bg-background px-1 py-1 text-sm"
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
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            if (!nome.trim()) {
              setErroLocal("Informe o nome.");
              return;
            }
            if (!nivel) {
              setErroLocal("Escolha o nível.");
              return;
            }
            setErroLocal(null);
            onConfirmar(nome.trim(), nivel);
          }}
          className="text-xs font-medium px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Matriculando…" : "Confirmar matrícula"}
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={onCancelar}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
      {(erroLocal || erro) && <div className="text-xs text-destructive">{erroLocal ?? erro}</div>}
    </div>
  );
}
