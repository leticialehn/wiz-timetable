-- Story 7.5: bookings that never create a real aluno (Comercial prospects,
-- "Experimental" walk-ins) had no way to record the nível the person is
-- trying, even though the professora needs it to know what to teach.
-- Free-text (not an FK to a nível enum/table — none exists), nullable —
-- optional even for experimental, and meaningless for grade_base (permanent
-- rows always carry a real aluno_id with its own aluno.nivel).
ALTER TABLE "public"."excecoes_semana"
  ADD COLUMN "nivel_avulso" "text";
