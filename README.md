# Wiz Timetable

Wizard Brusque — horário semanal, presença, notas e lições.

## Banco de dados

Schema changes via migration only — no Studio edits. Toda mudança de schema é uma
nova migration em `supabase/migrations/` seguida de `supabase db push` e
regeneração de `src/integrations/supabase/types.ts`. Ver `docs/DB-AUDIT.md` para o
histórico de por que essa regra existe.
