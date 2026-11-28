-- EXGARASI migration 0015: make seller verification decisions database-enforced.
-- Admin review must use this SECURITY DEFINER function. The runtime role must not
-- be able to change verification status or activate a store with direct UPDATEs.

CREATE OR REPLACE FUNCTION public.app_review_seller_verification(
  target_verification_id uuid,
  requested_decision text,
  requested_review_note text DEFAULT NULL
)
RETURNS TABLE (verification_id uuid, store_id uuid, decision text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  reviewed_id uuid;
  reviewed_store_id uuid;
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
    WHERE s.id = reviewed_store_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'STORE_NOT_FOUND';
    END IF;
  END IF;

  RETURN QUERY SELECT reviewed_id, reviewed_store_id, requested_decision;
END;
$$;

REVOKE ALL ON FUNCTION public.app_review_seller_verification(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_review_seller_verification(uuid, text, text)
  TO exgarasi_app;

REVOKE UPDATE (status, review_note, reviewer_user_id, reviewed_at)
  ON public.seller_verifications FROM exgarasi_app;
REVOKE UPDATE (status, approved_at, updated_at)
  ON public.stores FROM exgarasi_app;
