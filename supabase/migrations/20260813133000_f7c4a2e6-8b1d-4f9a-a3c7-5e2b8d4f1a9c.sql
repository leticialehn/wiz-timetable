-- aulas_licoes tem RLS ativado mas nunca ganhou nenhuma policy (foi criada
-- fora do histórico de migrations rastreado) — então a chave anon (usada
-- pelo navegador, inclusive pra realtime) não enxerga nenhuma linha, mesmo
-- com SELECT explícito. Isso passou despercebido porque toda leitura normal
-- do app passa pelo servidor com a service_role key, que ignora RLS — só o
-- realtime (que roda direto do navegador) é afetado. Sem SELECT liberado,
-- nenhum evento de mudança é entregue, mesmo já estando na publicação.
ALTER TABLE public.aulas_licoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica licoes" ON public.aulas_licoes FOR SELECT TO public USING (true);
