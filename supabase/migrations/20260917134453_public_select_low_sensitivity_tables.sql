-- Story 2.2 (EPIC-002): Realtime strategy decision.
--
-- Realtime only delivers a postgres_changes event to a subscriber if that
-- subscriber's role can SELECT the row per RLS. After Story 2.1's relock,
-- anon lost SELECT on all 8 tables src/hooks/use-realtime-grade.ts listens
-- to except aulas_licoes (which keeps its own deliberate public SELECT
-- policy for the same reason) — so live updates silently stopped working
-- for the other 7.
--
-- Decision (confirmed with the owner 2026-09-17): split those 7 by whether
-- they carry student PII.
--   - professoras, grade_base, horarios_config, excecoes_semana: schedule/
--     config data only, no student PII. Safe to grant public SELECT (never
--     INSERT/UPDATE/DELETE) so Realtime works again for them.
--   - alunos, aulas_presenca, aulas_notas: PII of minors / grades /
--     attendance. Stay locked down — no Realtime for these, screens fall
--     back to react-query's default refetch-on-focus/mount behavior. Not
--     compensated with polling in this story (no refetchInterval added).
--
-- Authenticated Realtime (the third option in EPIC-002 AC6) is out of scope:
-- this app's login is a custom cookie-session system (auth.server.ts), not
-- Supabase Auth, so the browser's Supabase client has no per-user session to
-- authenticate a Realtime channel with.

CREATE POLICY "leitura publica professoras" ON "public"."professoras" FOR SELECT USING (true);
CREATE POLICY "leitura publica grade_base" ON "public"."grade_base" FOR SELECT USING (true);
CREATE POLICY "leitura publica horarios_config" ON "public"."horarios_config" FOR SELECT USING (true);
CREATE POLICY "leitura publica excecoes" ON "public"."excecoes_semana" FOR SELECT USING (true);

GRANT SELECT ON "public"."professoras" TO "anon", "authenticated";
GRANT SELECT ON "public"."grade_base" TO "anon", "authenticated";
GRANT SELECT ON "public"."horarios_config" TO "anon", "authenticated";
GRANT SELECT ON "public"."excecoes_semana" TO "anon", "authenticated";
