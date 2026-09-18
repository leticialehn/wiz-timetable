-- Story 6.1 (EPIC-006): widen the three `tipo` CHECK constraints to accept
-- "comercial", the new prospect-booking cell type. Exact current definitions
-- confirmed live against prod (docs/DB-AUDIT.md §5a, Story 2.3) before writing
-- this — each constraint is dropped and recreated with the same value list
-- plus "comercial", nothing else changed.

ALTER TABLE "public"."horarios_config" DROP CONSTRAINT "horarios_config_tipo_check";
ALTER TABLE "public"."horarios_config" ADD CONSTRAINT "horarios_config_tipo_check"
  CHECK (("tipo" = ANY (ARRAY['regular'::text, 'online'::text, 'comercial'::text, 'break'::text, 'preparacao_homework'::text, 'reforco'::text, 'vip'::text, 'conversacao'::text, 'sem_aula'::text])));

ALTER TABLE "public"."grade_base" DROP CONSTRAINT "grade_base_tipo_check";
ALTER TABLE "public"."grade_base" ADD CONSTRAINT "grade_base_tipo_check"
  CHECK (("tipo" = ANY (ARRAY['regular'::text, 'online'::text, 'comercial'::text, 'vip'::text, 'reforco'::text, 'conversacao'::text])));

ALTER TABLE "public"."excecoes_semana" DROP CONSTRAINT "excecoes_semana_tipo_check";
ALTER TABLE "public"."excecoes_semana" ADD CONSTRAINT "excecoes_semana_tipo_check"
  CHECK ((("tipo" IS NULL) OR ("tipo" = ANY (ARRAY['regular'::text, 'online'::text, 'comercial'::text, 'vip'::text, 'reforco'::text, 'conversacao'::text]))));
