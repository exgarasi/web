-- EXGARASI migration 0013: make migration-ledger bootstrap safe for existing dev projects.
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA public TO exgarasi_migrator;
GRANT SELECT, INSERT ON public.schema_migrations TO exgarasi_migrator;
