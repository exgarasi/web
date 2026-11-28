-- EXGARASI migration 0010: bootstrap the custom migration ledger and allow trusted
-- Supabase postgres operator to SET ROLE during development RLS smoke tests.
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.schema_migrations TO exgarasi_migrator;
GRANT exgarasi_app TO postgres WITH SET TRUE;
