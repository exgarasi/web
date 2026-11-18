-- Better Auth PostgreSQL adapter smoke test.
-- Run only in development using a trusted database owner connection.
-- All fixture writes are rolled back.
BEGIN;
SET LOCAL ROLE exgarasi_app;

INSERT INTO better_auth."user"(id,name,email,email_verified)
VALUES ('exg-auth-adapter-smoke','EXG Adapter Smoke','exg-auth-adapter-smoke@example.test',true);
INSERT INTO better_auth.account(id,account_id,provider_id,user_id,password)
VALUES ('exg-auth-account-smoke','exg-auth-adapter-smoke','credential','exg-auth-adapter-smoke','test-password-hash');
INSERT INTO better_auth.session(id,expires_at,token,user_id)
VALUES ('exg-auth-session-smoke',now()+interval '1 hour','exg-auth-session-smoke-token','exg-auth-adapter-smoke');

SELECT set_config('app.user_id',public.app_profile_id_for_auth_user('exg-auth-adapter-smoke')::text,true);

DO $$
DECLARE
  auth_users integer;
  auth_accounts integer;
  auth_sessions integer;
  app_profiles integer;
  buyer_roles integer;
BEGIN
  SELECT count(*) INTO auth_users FROM better_auth."user" WHERE id='exg-auth-adapter-smoke';
  SELECT count(*) INTO auth_accounts FROM better_auth.account WHERE id='exg-auth-account-smoke';
  SELECT count(*) INTO auth_sessions FROM better_auth.session WHERE id='exg-auth-session-smoke';
  SELECT count(*) INTO app_profiles FROM public.users WHERE auth_user_id='exg-auth-adapter-smoke';
  SELECT count(*) INTO buyer_roles FROM public.user_roles ur
    JOIN public.users u ON u.id=ur.user_id
    WHERE u.auth_user_id='exg-auth-adapter-smoke' AND ur.role='buyer';
  IF auth_users <> 1 OR auth_accounts <> 1 OR auth_sessions <> 1
     OR app_profiles <> 1 OR buyer_roles <> 1 THEN
    RAISE EXCEPTION 'Better Auth adapter smoke test failed: user %, account %, session %, profile %, buyer role %',
      auth_users, auth_accounts, auth_sessions, app_profiles, buyer_roles;
  END IF;
END $$;
ROLLBACK;
