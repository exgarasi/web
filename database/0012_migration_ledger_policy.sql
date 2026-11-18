-- EXGARASI migration 0012: grant migration-ledger access only to the reserved migration role.
CREATE POLICY schema_migrations_migrator_only ON public.schema_migrations
  FOR ALL TO exgarasi_migrator USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON public.schema_migrations TO exgarasi_migrator;
