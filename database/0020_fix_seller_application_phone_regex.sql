-- EXGARASI migration 0020: use a bracket expression for a literal plus sign.
-- This supersedes the regex escaping in migration 0019; applied migrations remain immutable.
CREATE OR REPLACE FUNCTION public.app_submit_seller_application(
  p_store_name text,
  p_description text,
  p_support_phone text,
  p_verification_type text
)
RETURNS TABLE(store_id uuid, verification_id uuid, store_slug text, application_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := public.app_current_user_id();
  v_store_id uuid;
  v_verification_id uuid;
  v_slug_base text;
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF p_store_name IS NULL OR length(btrim(p_store_name)) NOT BETWEEN 3 AND 80 THEN
    RAISE EXCEPTION 'INVALID_STORE_NAME';
  END IF;
  IF p_description IS NOT NULL AND length(btrim(p_description)) > 1000 THEN
    RAISE EXCEPTION 'INVALID_DESCRIPTION';
  END IF;
  IF p_support_phone IS NULL OR length(btrim(p_support_phone)) NOT BETWEEN 7 AND 30
     OR btrim(p_support_phone) !~ '^[+]?[0-9[:space:]().-]{7,30}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF p_verification_type NOT IN ('individual','business') THEN
    RAISE EXCEPTION 'INVALID_VERIFICATION_TYPE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 180018));
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.status = 'active' AND u.email_verified_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'EMAIL_VERIFICATION_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_user_id = v_user_id) THEN
    RAISE EXCEPTION 'STORE_APPLICATION_EXISTS';
  END IF;

  v_slug_base := trim(both '-' from regexp_replace(lower(btrim(p_store_name)), '[^a-z0-9]+', '-', 'g'));
  IF length(v_slug_base) < 3 THEN v_slug_base := 'seller-store'; END IF;
  v_slug := left(v_slug_base, 48) || '-' || substr(encode(gen_random_bytes(5), 'hex'), 1, 10);

  INSERT INTO public.stores(owner_user_id, slug, name, store_type, status, description, support_email, support_phone)
  SELECT v_user_id, v_slug, btrim(p_store_name), 'partner', 'pending_review',
         nullif(btrim(p_description), ''), u.email, btrim(p_support_phone)
  FROM public.users u WHERE u.id = v_user_id
  RETURNING id INTO v_store_id;

  INSERT INTO public.store_members(store_id, user_id, member_role)
  VALUES(v_store_id, v_user_id, 'owner');

  INSERT INTO public.seller_verifications(store_id, submitted_by, verification_type)
  VALUES(v_store_id, v_user_id, p_verification_type)
  RETURNING id INTO v_verification_id;

  INSERT INTO public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  VALUES(v_user_id, 'seller_application_submitted', 'store', v_store_id,
         jsonb_build_object('verification_id', v_verification_id, 'verification_type', p_verification_type));

  RETURN QUERY SELECT v_store_id, v_verification_id, v_slug, 'pending'::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.app_submit_seller_application(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_submit_seller_application(text,text,text,text) TO exgarasi_app;
