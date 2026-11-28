-- EXGARASI migration 0003: authenticated request context and atomic seller invitation acceptance.
CREATE OR REPLACE FUNCTION public.app_profile_id_for_auth_user(auth_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth_id LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.app_profile_id_for_auth_user(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.app_accept_seller_invitation(
  invitation_token_hash text,
  requested_store_name text,
  requested_store_slug text
)
RETURNS TABLE(store_id uuid, store_name text, store_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_id uuid := public.app_current_user_id();
  current_email text;
  invitation_id uuid;
  new_store_id uuid;
BEGIN
  IF current_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;
  IF requested_store_name IS NULL OR length(trim(requested_store_name)) < 2 THEN
    RAISE EXCEPTION 'INVALID_STORE_NAME';
  END IF;
  IF requested_store_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'INVALID_STORE_SLUG';
  END IF;

  SELECT lower(email) INTO current_email FROM public.users WHERE id = current_id;
  SELECT id INTO invitation_id
  FROM public.seller_invitations
  WHERE token_hash = invitation_token_hash
    AND lower(email) = current_email
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF invitation_id IS NULL THEN
    RAISE EXCEPTION 'INVITATION_INVALID_OR_EXPIRED';
  END IF;

  INSERT INTO public.stores(owner_user_id, slug, name, store_type, status)
  VALUES(current_id, requested_store_slug, trim(requested_store_name), 'partner', 'pending_review')
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members(store_id, user_id, member_role)
  VALUES(new_store_id, current_id, 'owner');

  INSERT INTO public.user_roles(user_id, role)
  VALUES(current_id, 'seller')
  ON CONFLICT DO NOTHING;

  UPDATE public.seller_invitations
  SET status = 'accepted', accepted_by = current_id
  WHERE id = invitation_id;

  RETURN QUERY SELECT new_store_id, trim(requested_store_name), requested_store_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_accept_seller_invitation(text,text,text) TO PUBLIC;
