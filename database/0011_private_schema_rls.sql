-- EXGARASI migration 0011: RLS for private authentication and migration metadata.
ALTER TABLE better_auth."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth.verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY better_auth_user_runtime_only ON better_auth."user"
  FOR ALL TO exgarasi_app USING (true) WITH CHECK (true);
CREATE POLICY better_auth_session_runtime_only ON better_auth.session
  FOR ALL TO exgarasi_app USING (true) WITH CHECK (true);
CREATE POLICY better_auth_account_runtime_only ON better_auth.account
  FOR ALL TO exgarasi_app USING (true) WITH CHECK (true);
CREATE POLICY better_auth_verification_runtime_only ON better_auth.verification
  FOR ALL TO exgarasi_app USING (true) WITH CHECK (true);
-- schema_migrations intentionally has no runtime policy; only the database owner/migration operator may access it.
