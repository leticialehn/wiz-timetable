-- Found while fixing a stuck duplicate alert for one student: nothing in the
-- schema stops two "rematricula" episodes from being created for the same
-- aluno+nivel at the same time (a race between two near-simultaneous calls
-- to getAlertasAtivos, e.g. two open tabs). The application logic in
-- alertas.functions.ts already assumes at most one "pendente" episode per
-- aluno+nivel (sincronizarRematricula/statusRematriculaPorAluno) but nothing
-- enforced it at the database level, so two identical rows could land at
-- once — which is exactly what happened.
--
-- The insert path (abrirEpisodioRematricula) already tolerates a failed
-- insert gracefully (it only pushes the result if the insert actually
-- returned a row), so adding this constraint is safe: a losing concurrent
-- insert just doesn't create a second row, no crash.

CREATE UNIQUE INDEX "alertas_status_pendente_rematricula_por_nivel"
  ON "public"."alertas_status" ("aluno_id", "nivel")
  WHERE ("tipo" = 'rematricula' AND "status" = 'pendente');
