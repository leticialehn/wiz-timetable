-- aulas_licoes nunca foi adicionada à publicação de realtime (diferente de
-- aulas_presenca e aulas_notas, que já tinham isso desde a criação). Sem
-- isso, quando uma professora lança uma lição, outras professoras com a
-- tela já aberta não recebem o aviso pra atualizar — a tela delas fica com
-- o histórico desatualizado, e a lição sugerida (calculada a partir desse
-- histórico) pode ficar atrasada, levando a lançar uma lição de trás pra
-- frente sem perceber.
ALTER PUBLICATION supabase_realtime ADD TABLE public.aulas_licoes;
