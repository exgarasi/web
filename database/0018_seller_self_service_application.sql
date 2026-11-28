-- EXGARASI migration 0018: buyer-initiated seller applications.
-- Apply to EXGARASI-dev only after SQL review and privilege verification.
CREATE OR REPLACE FUNCTION public.app_submit_seller_application(
  p_store_name text,
  p_description text,
  p_support_phone text,
  p_verification_type text
)
RETURNS TABLE(store_id uuid, verification_id uuid, store_slug text, application_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
     OR btrim(p_support_phone) !~ '^\+?[0-9[:space:]().-]{7,30}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF p_verification_type NOT IN ('individual','business') THEN
    RAISE EXCEPTION 'INVALID_VERIFICATION_TYPE';
  END IF;

  -- Serialize applications by user to prevent concurrent duplicate stores.
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
$$;

REVOKE ALL ON FUNCTION public.app_submit_seller_application(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_submit_seller_application(text,text,text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_submit_seller_application(text,text,text,text) TO exgarasi_app;

-- Extend the existing Admin review function so approved self-service applicants
-- receive the seller role. The previous function activated the store but did not
-- assign this role, which would otherwise leave the seller dashboard inaccessible.
CREATE OR REPLACE FUNCTION public.app_review_seller_verification(
  target_verification_id uuid,
  requested_decision text,
  requested_review_note text DEFAULT NULL
)
RETURNS TABLE(verification_id uuid, store_id uuid, decision text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  reviewed_id uuid;
  reviewed_store_id uuid;
  owner_id uuid;
BEGIN
  IF NOT public.app_is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF requested_decision IS NULL OR requested_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;
  IF length(coalesce(requested_review_note, '')) > 1000 THEN
    RAISE EXCEPTION 'INVALID_REVIEW_NOTE';
  END IF;

  UPDATE public.seller_verifications AS sv
  SET status = requested_decision,
      review_note = nullif(btrim(requested_review_note), ''),
      reviewer_user_id = public.app_current_user_id(),
      reviewed_at = now()
  WHERE sv.id = target_verification_id AND sv.status = 'pending'
  RETURNING sv.id, sv.store_id INTO reviewed_id, reviewed_store_id;

  IF reviewed_id IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION_NOT_PENDING';
  END IF;

  IF requested_decision = 'approved' THEN
    UPDATE public.stores AS s
    SET status = 'active', approved_at = now(), updated_at = now()
    WHERE s.id = reviewed_store_id
    RETURNING s.owner_user_id INTO owner_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'STORE_NOT_FOUND';
    END IF;

    INSERT INTO public.user_roles(user_id, role)
    VALUES(owner_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  VALUES(public.app_current_user_id(),
         CASE WHEN requested_decision = 'approved' THEN 'seller_application_approved' ELSE 'seller_application_rejected' END,
         'seller_verification', reviewed_id,
         jsonb_build_object('store_id', reviewed_store_id, 'decision', requested_decision));

  RETURN QUERY SELECT reviewed_id, reviewed_store_id, requested_decision;
END;
$function$;
