-- Found during QA review of 20260917103416_relock_public_tables.sql: that
-- migration revoked anon/authenticated access on the currently-existing
-- tables, but the baseline (20260915134213_baseline_from_prod.sql) carries a
-- standing ALTER DEFAULT PRIVILEGES rule that auto-grants ALL on every new
-- table/sequence/function created by role "postgres" in schema "public" to
-- anon and authenticated. Left alone, the very next migration or Studio-created
-- table would silently reproduce the same public-access regression this
-- migration was written to close, with zero policy change needed.

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
