-- EXGARASI RLS/auth smoke test.
-- Run only against a disposable Supabase development project after migrations and grants.
-- Execute with a privileged migration connection; this test creates and rolls back fixtures.
BEGIN;

INSERT INTO public.users(id,email,full_name,status,auth_user_id)
VALUES
 ('10000000-0000-4000-8000-000000000001','buyer-a@example.test','Buyer A','active','exg-test-auth-a'),
 ('10000000-0000-4000-8000-000000000002','buyer-b@example.test','Buyer B','active','exg-test-auth-b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO better_auth."user"(id,name,email,email_verified)
VALUES
 ('exg-test-auth-a','Buyer A','buyer-a@example.test',true),
 ('exg-test-auth-b','Buyer B','buyer-b@example.test',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores(id,owner_user_id,slug,name,store_type,status)
VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','rls-test-store-a','RLS Test Store A','partner','pending_review'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','rls-test-store-b','RLS Test Store B','partner','pending_review')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.addresses(id,user_id,recipient_name,phone,address_line,city,province)
VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Buyer A','080000000001','Test address A','Makassar','Sulawesi Selatan'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Buyer B','080000000002','Test address B','Makassar','Sulawesi Selatan')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE exgarasi_app;
SELECT set_config('app.user_id','10000000-0000-4000-8000-000000000001',true);

DO $$
DECLARE visible_stores integer;
DECLARE visible_addresses integer;
DECLARE affected integer;
DECLARE profile_id uuid;
BEGIN
  SELECT count(*) INTO visible_stores FROM public.stores
    WHERE id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
  IF visible_stores <> 1 THEN
    RAISE EXCEPTION 'RLS FAILURE: buyer A sees % stores; expected exactly 1', visible_stores;
  END IF;

  SELECT count(*) INTO visible_addresses FROM public.addresses
    WHERE id IN ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
  IF visible_addresses <> 1 THEN
    RAISE EXCEPTION 'RLS FAILURE: buyer A sees % addresses; expected exactly 1', visible_addresses;
  END IF;

  UPDATE public.stores SET name='Unauthorized change'
    WHERE id='20000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'RLS FAILURE: buyer A updated buyer B store';
  END IF;

  SELECT public.app_profile_id_for_auth_user('exg-test-auth-a') INTO profile_id;
  IF profile_id <> '10000000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'AUTH PROFILE MAPPING FAILURE';
  END IF;
END $$;

ROLLBACK;
