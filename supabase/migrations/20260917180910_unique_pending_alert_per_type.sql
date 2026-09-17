-- Extends the guard from 20260917174216 (rematricula-only) to every other
-- alert type. The same insert race turned out to affect ALL of them, not
-- just rematricula — found 400+ duplicate pending rows in prod across
-- nota_fala, gravacao_r7r8, and sem_aula (one student had 32 duplicate
-- "gravacao_r7r8" rows, another 26 duplicate "nota_fala" rows). The
-- generic sincronizar() function in alertas.functions.ts already assumes
-- at most one "pendente" row per (aluno_id, tipo) — this makes it real at
-- the database level, so no school running this app can hit this bug
-- again regardless of load/timing, without needing a manual fix.
--
-- rematricula is excluded here because its uniqueness key includes nivel
-- too (a student can legitimately have a pending rematricula episode per
-- level over time) — that's covered by the separate index in
-- 20260917174216_unique_pending_rematricula_episode.sql.

CREATE UNIQUE INDEX "alertas_status_pendente_por_tipo"
  ON "public"."alertas_status" ("aluno_id", "tipo")
  WHERE ("status" = 'pendente' AND "tipo" <> 'rematricula');
