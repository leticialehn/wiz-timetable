-- Story 5.1 (EPIC-005): atomic credit adjustment. ajustarCreditos previously
-- did a SELECT creditos then UPDATE creditos = <read value> + delta as two
-- separate round trips — a race window where two concurrent writes for the
-- same aluno could lose one adjustment. This function does the increment in
-- a single atomic UPDATE, with the "not a credit-tracked aluno" guard
-- (creditos IS NOT NULL) folded into the same statement rather than a
-- separate application-side check.
CREATE OR REPLACE FUNCTION increment_creditos(p_aluno_id uuid, p_delta int)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE alunos
  SET creditos = creditos + p_delta
  WHERE id = p_aluno_id AND creditos IS NOT NULL;
$$;
