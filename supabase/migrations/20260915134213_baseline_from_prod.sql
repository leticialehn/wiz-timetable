


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alertas_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aluno_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "contagem" integer NOT NULL,
    "resolvido_por" "text",
    "resolvido_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nivel" "text",
    "contactado_por" "text",
    "contactado_em" timestamp with time zone,
    "motivo" "text",
    "desfecho" "text",
    CONSTRAINT "alertas_status_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'resolvido'::"text"]))),
    CONSTRAINT "alertas_status_tipo_check" CHECK (("tipo" = ANY (ARRAY['faltas'::"text", 'nota_fala'::"text", 'sem_aula'::"text", 'rematricula'::"text", 'atrasado'::"text", 'escrita_pendente'::"text", 'gravacao_r3r4'::"text", 'gravacao_r7r8'::"text"])))
);


ALTER TABLE "public"."alertas_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alunos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "nivel" "text" DEFAULT ''::"text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data_inicio_nivel" "date",
    "data_nascimento" "date",
    "situacao" "text" DEFAULT 'matriculado'::"text" NOT NULL,
    "contrato_inicio" "date",
    "contrato_fim" "date",
    "creditos" integer,
    CONSTRAINT "alunos_situacao_check" CHECK (("situacao" = ANY (ARRAY['matriculado'::"text", 'nao_rematriculado'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."alunos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aulas_licoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "professora_id" "uuid" NOT NULL,
    "aluno_id" "uuid" NOT NULL,
    "periodo" integer NOT NULL,
    "licao" "text" NOT NULL,
    "nivel_no_momento" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parte" smallint DEFAULT 1 NOT NULL,
    "praticado" boolean DEFAULT true NOT NULL,
    "horario_especifico" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."aulas_licoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aulas_notas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "professora_id" "uuid" NOT NULL,
    "aluno_id" "uuid" NOT NULL,
    "periodo" integer NOT NULL,
    "fala" "text",
    "audicao" "text",
    "leitura" "text",
    "escrita" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parte" smallint DEFAULT 1 NOT NULL,
    "horario_especifico" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "aulas_notas_audicao_check" CHECK (("audicao" = ANY (ARRAY['O'::"text", 'MB'::"text", 'B'::"text", 'R'::"text"]))),
    CONSTRAINT "aulas_notas_escrita_check" CHECK (("escrita" = ANY (ARRAY['O'::"text", 'MB'::"text", 'B'::"text", 'R'::"text"]))),
    CONSTRAINT "aulas_notas_fala_check" CHECK (("fala" = ANY (ARRAY['O'::"text", 'MB'::"text", 'B'::"text", 'R'::"text"]))),
    CONSTRAINT "aulas_notas_leitura_check" CHECK (("leitura" = ANY (ARRAY['O'::"text", 'MB'::"text", 'B'::"text", 'R'::"text"])))
);


ALTER TABLE "public"."aulas_notas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aulas_presenca" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "professora_id" "uuid" NOT NULL,
    "aluno_id" "uuid" NOT NULL,
    "periodo" integer NOT NULL,
    "dia_semana" integer NOT NULL,
    "status" "text" NOT NULL,
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parte" smallint DEFAULT 1 NOT NULL,
    "horario_especifico" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "aulas_presenca_status_check" CHECK (("status" = ANY (ARRAY['presente'::"text", 'falta'::"text", 'falta_avisada'::"text"])))
);


ALTER TABLE "public"."aulas_presenca" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendario_excecoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "tipo" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "grupo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "calendario_excecoes_grupo_check" CHECK (("grupo" = ANY (ARRAY['todos'::"text", 'kids'::"text", 'teens'::"text", 'adultos'::"text"]))),
    CONSTRAINT "calendario_excecoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['feriado'::"text", 'recesso'::"text", 'ferias'::"text"])))
);


ALTER TABLE "public"."calendario_excecoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."excecoes_semana" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "tipo_excecao" "text" NOT NULL,
    "grade_base_id" "uuid",
    "professora_id" "uuid",
    "aluno_id" "uuid",
    "dia_semana" integer,
    "periodo" integer,
    "tipo" "text",
    "horario_especifico" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "aluno_nome_avulso" "text",
    "experimental" boolean DEFAULT false NOT NULL,
    CONSTRAINT "excecoes_semana_dia_semana_check" CHECK ((("dia_semana" >= 1) AND ("dia_semana" <= 6))),
    CONSTRAINT "excecoes_semana_periodo_check" CHECK ((("periodo" >= 1) AND ("periodo" <= 12))),
    CONSTRAINT "excecoes_semana_tipo_check" CHECK ((("tipo" IS NULL) OR ("tipo" = ANY (ARRAY['regular'::"text", 'online'::"text", 'vip'::"text", 'reforco'::"text", 'conversacao'::"text"])))),
    CONSTRAINT "excecoes_semana_tipo_excecao_check" CHECK (("tipo_excecao" = ANY (ARRAY['adicionar'::"text", 'remover'::"text", 'mover'::"text", 'ausente'::"text"])))
);


ALTER TABLE "public"."excecoes_semana" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grade_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dia_semana" integer NOT NULL,
    "periodo" integer NOT NULL,
    "professora_id" "uuid" NOT NULL,
    "aluno_id" "uuid",
    "tipo" "text" DEFAULT 'regular'::"text" NOT NULL,
    "horario_especifico" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "aluno_nome_avulso" "text",
    CONSTRAINT "grade_base_dia_semana_check" CHECK ((("dia_semana" >= 1) AND ("dia_semana" <= 6))),
    CONSTRAINT "grade_base_periodo_check" CHECK ((("periodo" >= 1) AND ("periodo" <= 12))),
    CONSTRAINT "grade_base_tipo_check" CHECK (("tipo" = ANY (ARRAY['regular'::"text", 'online'::"text", 'vip'::"text", 'reforco'::"text", 'conversacao'::"text"])))
);


ALTER TABLE "public"."grade_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."horarios_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dia_semana" integer NOT NULL,
    "periodo" integer NOT NULL,
    "professora_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "tema" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vagas_fechadas" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "horarios_config_dia_semana_check" CHECK ((("dia_semana" >= 1) AND ("dia_semana" <= 6))),
    CONSTRAINT "horarios_config_periodo_check" CHECK ((("periodo" >= 1) AND ("periodo" <= 12))),
    CONSTRAINT "horarios_config_tipo_check" CHECK (("tipo" = ANY (ARRAY['regular'::"text", 'online'::"text", 'break'::"text", 'preparacao_homework'::"text", 'reforco'::"text", 'vip'::"text", 'conversacao'::"text", 'sem_aula'::"text"]))),
    CONSTRAINT "horarios_config_vagas_fechadas_check" CHECK (("vagas_fechadas" >= 0))
);


ALTER TABLE "public"."horarios_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professoras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#f3f4f6'::"text" NOT NULL,
    "ativa" boolean DEFAULT true NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "coordenadora" boolean DEFAULT false NOT NULL,
    "sem_lancamento" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."professoras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuario_papeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "papel" "text" NOT NULL,
    CONSTRAINT "usuario_papeis_papel_check" CHECK (("papel" = ANY (ARRAY['secretaria'::"text", 'professor'::"text", 'coordenador'::"text"])))
);


ALTER TABLE "public"."usuario_papeis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "username" "text" NOT NULL,
    "senha_hash" "text" NOT NULL,
    "professora_id" "uuid",
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alertas_status"
    ADD CONSTRAINT "alertas_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alunos"
    ADD CONSTRAINT "alunos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aulas_licoes"
    ADD CONSTRAINT "aulas_licoes_data_prof_aluno_periodo_parte_horario_key" UNIQUE ("data", "professora_id", "aluno_id", "periodo", "parte", "horario_especifico");



ALTER TABLE ONLY "public"."aulas_licoes"
    ADD CONSTRAINT "aulas_licoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aulas_notas"
    ADD CONSTRAINT "aulas_notas_data_prof_aluno_periodo_parte_horario_key" UNIQUE ("data", "professora_id", "aluno_id", "periodo", "parte", "horario_especifico");



ALTER TABLE ONLY "public"."aulas_notas"
    ADD CONSTRAINT "aulas_notas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aulas_presenca"
    ADD CONSTRAINT "aulas_presenca_data_prof_aluno_periodo_parte_horario_key" UNIQUE ("data", "professora_id", "aluno_id", "periodo", "parte", "horario_especifico");



ALTER TABLE ONLY "public"."aulas_presenca"
    ADD CONSTRAINT "aulas_presenca_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendario_excecoes"
    ADD CONSTRAINT "calendario_excecoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."excecoes_semana"
    ADD CONSTRAINT "excecoes_semana_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_base"
    ADD CONSTRAINT "grade_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."horarios_config"
    ADD CONSTRAINT "horarios_config_dia_semana_periodo_professora_id_key" UNIQUE ("dia_semana", "periodo", "professora_id");



ALTER TABLE ONLY "public"."horarios_config"
    ADD CONSTRAINT "horarios_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professoras"
    ADD CONSTRAINT "professoras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_usuario_id_papel_key" UNIQUE ("usuario_id", "papel");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_professora_id_key" UNIQUE ("professora_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_username_key" UNIQUE ("username");



CREATE INDEX "idx_excecoes_data" ON "public"."excecoes_semana" USING "btree" ("data");



CREATE INDEX "idx_grade_base_lookup" ON "public"."grade_base" USING "btree" ("dia_semana", "professora_id", "periodo");



CREATE OR REPLACE TRIGGER "update_aulas_notas_updated_at" BEFORE UPDATE ON "public"."aulas_notas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_aulas_presenca_updated_at" BEFORE UPDATE ON "public"."aulas_presenca" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usuarios_updated_at" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alertas_status"
    ADD CONSTRAINT "alertas_status_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_licoes"
    ADD CONSTRAINT "aulas_licoes_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_licoes"
    ADD CONSTRAINT "aulas_licoes_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_notas"
    ADD CONSTRAINT "aulas_notas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_notas"
    ADD CONSTRAINT "aulas_notas_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_presenca"
    ADD CONSTRAINT "aulas_presenca_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aulas_presenca"
    ADD CONSTRAINT "aulas_presenca_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."excecoes_semana"
    ADD CONSTRAINT "excecoes_semana_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."excecoes_semana"
    ADD CONSTRAINT "excecoes_semana_grade_base_id_fkey" FOREIGN KEY ("grade_base_id") REFERENCES "public"."grade_base"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."excecoes_semana"
    ADD CONSTRAINT "excecoes_semana_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grade_base"
    ADD CONSTRAINT "grade_base_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grade_base"
    ADD CONSTRAINT "grade_base_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."horarios_config"
    ADD CONSTRAINT "horarios_config_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_professora_id_fkey" FOREIGN KEY ("professora_id") REFERENCES "public"."professoras"("id") ON DELETE SET NULL;



ALTER TABLE "public"."alertas_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alunos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "atualizar notas publico" ON "public"."aulas_notas" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "atualizar presenca publico" ON "public"."aulas_presenca" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."aulas_licoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aulas_notas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aulas_presenca" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendario_excecoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."excecoes_semana" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grade_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."horarios_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inserir notas publico" ON "public"."aulas_notas" FOR INSERT WITH CHECK (true);



CREATE POLICY "inserir presenca publico" ON "public"."aulas_presenca" FOR INSERT WITH CHECK (true);



CREATE POLICY "leitura publica alunos" ON "public"."alunos" FOR SELECT USING (true);



CREATE POLICY "leitura publica excecoes" ON "public"."excecoes_semana" FOR SELECT USING (true);



CREATE POLICY "leitura publica grade_base" ON "public"."grade_base" FOR SELECT USING (true);



CREATE POLICY "leitura publica horarios_config" ON "public"."horarios_config" FOR SELECT USING (true);



CREATE POLICY "leitura publica licoes" ON "public"."aulas_licoes" FOR SELECT USING (true);



CREATE POLICY "leitura publica notas" ON "public"."aulas_notas" FOR SELECT USING (true);



CREATE POLICY "leitura publica presenca" ON "public"."aulas_presenca" FOR SELECT USING (true);



CREATE POLICY "leitura publica professoras" ON "public"."professoras" FOR SELECT USING (true);



ALTER TABLE "public"."professoras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuario_papeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."alunos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."aulas_licoes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."aulas_notas";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."aulas_presenca";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."excecoes_semana";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."grade_base";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."horarios_config";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."professoras";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."alertas_status" TO "anon";
GRANT ALL ON TABLE "public"."alertas_status" TO "authenticated";
GRANT ALL ON TABLE "public"."alertas_status" TO "service_role";



GRANT ALL ON TABLE "public"."alunos" TO "anon";
GRANT ALL ON TABLE "public"."alunos" TO "authenticated";
GRANT ALL ON TABLE "public"."alunos" TO "service_role";



GRANT ALL ON TABLE "public"."aulas_licoes" TO "anon";
GRANT ALL ON TABLE "public"."aulas_licoes" TO "authenticated";
GRANT ALL ON TABLE "public"."aulas_licoes" TO "service_role";



GRANT ALL ON TABLE "public"."aulas_notas" TO "anon";
GRANT ALL ON TABLE "public"."aulas_notas" TO "authenticated";
GRANT ALL ON TABLE "public"."aulas_notas" TO "service_role";



GRANT ALL ON TABLE "public"."aulas_presenca" TO "anon";
GRANT ALL ON TABLE "public"."aulas_presenca" TO "authenticated";
GRANT ALL ON TABLE "public"."aulas_presenca" TO "service_role";



GRANT ALL ON TABLE "public"."calendario_excecoes" TO "anon";
GRANT ALL ON TABLE "public"."calendario_excecoes" TO "authenticated";
GRANT ALL ON TABLE "public"."calendario_excecoes" TO "service_role";



GRANT ALL ON TABLE "public"."excecoes_semana" TO "anon";
GRANT ALL ON TABLE "public"."excecoes_semana" TO "authenticated";
GRANT ALL ON TABLE "public"."excecoes_semana" TO "service_role";



GRANT ALL ON TABLE "public"."grade_base" TO "anon";
GRANT ALL ON TABLE "public"."grade_base" TO "authenticated";
GRANT ALL ON TABLE "public"."grade_base" TO "service_role";



GRANT ALL ON TABLE "public"."horarios_config" TO "anon";
GRANT ALL ON TABLE "public"."horarios_config" TO "authenticated";
GRANT ALL ON TABLE "public"."horarios_config" TO "service_role";



GRANT ALL ON TABLE "public"."professoras" TO "anon";
GRANT ALL ON TABLE "public"."professoras" TO "authenticated";
GRANT ALL ON TABLE "public"."professoras" TO "service_role";



GRANT ALL ON TABLE "public"."usuario_papeis" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































