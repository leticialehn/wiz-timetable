-- Story 5.2 (EPIC-005): widen alunos_situacao_check to accept "removido" —
-- the new soft-delete status for "Remover aluno" (owner-confirmed 2026-09-18,
-- replaces the previous hard DELETE ... CASCADE). Exact current definition
-- confirmed live against prod before writing this — dropped and recreated
-- with the same 3 values plus "removido", nothing else changed.

ALTER TABLE "public"."alunos" DROP CONSTRAINT "alunos_situacao_check";
ALTER TABLE "public"."alunos" ADD CONSTRAINT "alunos_situacao_check"
  CHECK (("situacao" = ANY (ARRAY['matriculado'::text, 'nao_rematriculado'::text, 'cancelado'::text, 'removido'::text])));
