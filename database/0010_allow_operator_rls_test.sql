-- EXGARASI migration 0010: allow the trusted Supabase postgres operator to SET ROLE
-- during development RLS smoke tests. This does not grant the runtime role to any app user.
GRANT exgarasi_app TO postgres WITH SET TRUE;
