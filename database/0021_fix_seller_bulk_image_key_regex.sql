-- EXGARASI migration 0021: fix seller bulk image key validation.
-- Apply to EXGARASI-dev only after review; never apply to Production from this branch.

CREATE OR REPLACE FUNCTION public.seller_bulk_upsert_listing(
  p_store_id uuid,
  p_listing_id uuid,
  p_payload jsonb,
  p_image_keys text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := public.app_current_user_id();
  v_store public.stores%ROWTYPE;
  v_listing public.listings%ROWTYPE;
  v_product_id uuid;
  v_category_id uuid;
  v_brand_id uuid;
  v_slug text;
  v_is_edit boolean := p_listing_id IS NOT NULL;
  v_key text;
  v_index integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_store
  FROM public.stores s
  WHERE s.id = p_store_id
    AND s.status = 'active'
    AND (
      s.owner_user_id = v_user_id
      OR EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = s.id
          AND sm.user_id = v_user_id
          AND sm.member_role IN ('owner','manager','catalog')
      )
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_payload) <> 'object'
     OR length(trim(coalesce(p_payload->>'title',''))) NOT BETWEEN 1 AND 180
     OR length(trim(coalesce(p_payload->>'sku',''))) NOT BETWEEN 1 AND 100
     OR coalesce(p_payload->>'condition','') NOT IN ('new','used','refurbished')
     OR coalesce(p_payload->>'currency','') NOT IN ('IDR','USD')
     OR coalesce(p_payload->>'price','') !~ '^[1-9][0-9]*$'
     OR coalesce(p_payload->>'stock','') !~ '^(0|[1-9][0-9]*)$'
  THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_DATA' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_category_id
  FROM public.categories
  WHERE is_active AND lower(name) = lower(trim(p_payload->>'category'))
  LIMIT 1;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'CATEGORY_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  IF nullif(trim(p_payload->>'brand'),'') IS NOT NULL THEN
    SELECT id INTO v_brand_id
    FROM public.brands
    WHERE lower(name) = lower(trim(p_payload->>'brand'))
    LIMIT 1;
    IF v_brand_id IS NULL THEN
      RAISE EXCEPTION 'BRAND_NOT_FOUND' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.store_id = p_store_id
      AND lower(l.seller_sku) = lower(trim(p_payload->>'sku'))
      AND (p_listing_id IS NULL OR l.id <> p_listing_id)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SKU' USING ERRCODE = '23505';
  END IF;

  IF v_is_edit THEN
    SELECT * INTO v_listing
    FROM public.listings l
    WHERE l.id = p_listing_id AND l.store_id = p_store_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'LISTING_NOT_FOUND' USING ERRCODE = '42501';
    END IF;
    v_product_id := v_listing.product_id;

    UPDATE public.products SET
      category_id = v_category_id,
      brand_id = v_brand_id,
      title = trim(p_payload->>'title'),
      description = nullif(p_payload->>'description',''),
      attributes = jsonb_build_object(
        'details', coalesce(p_payload->>'details',''),
        'series', coalesce(p_payload->>'series',''),
        'model', coalesce(p_payload->>'model',''),
        'year', coalesce(p_payload->>'year','')
      ),
      moderation_status = 'pending',
      updated_at = now()
    WHERE id = v_product_id;

    UPDATE public.listings SET
      seller_sku = trim(p_payload->>'sku'),
      title_override = NULL,
      description_override = NULL,
      condition = (p_payload->>'condition')::public.product_condition,
      price_amount = (p_payload->>'price')::bigint,
      currency = p_payload->>'currency',
      status = 'pending_review',
      updated_at = now()
    WHERE id = p_listing_id;
  ELSE
    v_slug := trim(both '-' from regexp_replace(lower(trim(p_payload->>'title')), '[^a-z0-9]+', '-', 'g'))
      || '-' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.products (
      category_id, brand_id, title, slug, description, product_type,
      attributes, moderation_status
    ) VALUES (
      v_category_id, v_brand_id, trim(p_payload->>'title'), v_slug,
      nullif(p_payload->>'description',''), 'diecast',
      jsonb_build_object(
        'details', coalesce(p_payload->>'details',''),
        'series', coalesce(p_payload->>'series',''),
        'model', coalesce(p_payload->>'model',''),
        'year', coalesce(p_payload->>'year','')
      ),
      'pending'
    ) RETURNING id INTO v_product_id;

    INSERT INTO public.listings (
      store_id, product_id, seller_sku, condition, price_amount, currency, status
    ) VALUES (
      p_store_id, v_product_id, trim(p_payload->>'sku'),
      (p_payload->>'condition')::public.product_condition,
      (p_payload->>'price')::bigint, p_payload->>'currency', 'draft'
    ) RETURNING id INTO p_listing_id;

    INSERT INTO public.inventories (listing_id, physical_stock, reserved_stock)
    VALUES (p_listing_id, (p_payload->>'stock')::integer, 0);
  END IF;

  IF v_is_edit THEN
    UPDATE public.inventories
    SET physical_stock = (p_payload->>'stock')::integer,
        updated_at = now()
    WHERE listing_id = p_listing_id;
    IF NOT FOUND THEN
      INSERT INTO public.inventories (listing_id, physical_stock, reserved_stock)
      VALUES (p_listing_id, (p_payload->>'stock')::integer, 0);
    END IF;
  END IF;

  DELETE FROM public.listing_images WHERE listing_id = p_listing_id;
  FOREACH v_key IN ARRAY coalesce(p_image_keys, ARRAY[]::text[]) LOOP
    IF v_index >= 5 OR v_key !~ ('^seller-media/' || p_store_id::text || '/[a-f0-9-]+[.](jpg|jpeg|png|webp)$') THEN
      RAISE EXCEPTION 'INVALID_IMAGE_KEY' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.listing_images (listing_id, object_key, sort_order)
    VALUES (p_listing_id, v_key, v_index);
    v_index := v_index + 1;
  END LOOP;

  RETURN p_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.seller_bulk_upsert_listing(uuid,uuid,jsonb,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seller_bulk_upsert_listing(uuid,uuid,jsonb,text[]) TO exgarasi_app;
