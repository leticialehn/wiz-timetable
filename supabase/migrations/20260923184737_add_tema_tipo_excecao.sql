-- Story 8.2: "nota especial só para hoje" num horário específico — reaproveita
-- excecoes_semana (já tem data/dia_semana/periodo/professora_id/observacao),
-- só precisa de um tipo_excecao novo pra uma linha sem aluno nenhum, só a nota.
ALTER TABLE "public"."excecoes_semana"
  DROP CONSTRAINT "excecoes_semana_tipo_excecao_check";

ALTER TABLE "public"."excecoes_semana"
  ADD CONSTRAINT "excecoes_semana_tipo_excecao_check"
  CHECK (("tipo_excecao" = ANY (ARRAY['adicionar'::"text", 'remover'::"text", 'mover'::"text", 'ausente'::"text", 'tema'::"text"])));
