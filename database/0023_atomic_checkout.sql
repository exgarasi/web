-- EXGARASI migration 0023: secure, atomic buyer checkout.
-- The function executes with a fixed search_path and derives the buyer from
-- the transaction-scoped app.user_id set by trusted server code.
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_address_id uuid,
  p_payment_method text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_address jsonb;
  v_cart_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_currency char(3);
  v_currency_count integer;
  v_item_count integer;
  v_cart_item_count integer;
  v_subtotal bigint;
  v_store record;
  v_sub_order_id uuid;
  v_sub_order_number text;
BEGIN
  v_user_id := public.app_current_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_payment_method NOT IN ('manual_bank_transfer', 'manual_qris') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
  END IF;

  -- Serialize retries with the same buyer/idempotency key before checking for an existing order.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0));

  -- A retried request returns the original order and never duplicates stock holds.
  SELECT id, order_number, total_amount, currency
    INTO v_order_id, v_order_number, v_subtotal, v_currency
  FROM public.orders
  WHERE buyer_user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT id INTO v_payment_id FROM public.payments
    WHERE order_id = v_order_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'total_amount', v_subtotal,
      'currency', trim(v_currency),
      'payment_id', v_payment_id,
      'shipping_pending', true,
      'reused', true
    );
  END IF;

  SELECT jsonb_build_object(
    'recipient_name', recipient_name,
    'phone', phone,
    'address_line', address_line,
    'village', village,
    'district', district,
    'city', city,
    'province', province,
    'postal_code', postal_code,
    'country_code', country_code
  )
  INTO v_address
  FROM public.addresses
  WHERE id = p_address_id AND user_id = v_user_id;

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE user_id = v_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'CART_EMPTY';
  END IF;

  -- Lock listings and inventory rows in stable order to prevent overselling.
  PERFORM 1
  FROM public.cart_items ci
  JOIN public.listings l ON l.id = ci.listing_id
  JOIN public.products p ON p.id = l.product_id
  JOIN public.stores s ON s.id = l.store_id
  JOIN public.inventories i ON i.listing_id = l.id
  WHERE ci.cart_id = v_cart_id
    AND l.status = 'active'
    AND p.moderation_status = 'approved'
    AND s.status = 'active'
  ORDER BY l.id
  FOR UPDATE OF l, i;

  SELECT count(*)::integer,
         count(DISTINCT l.currency)::integer,
         min(l.currency),
         coalesce(sum(ci.quantity * l.price_amount), 0)::bigint
  INTO v_item_count, v_currency_count, v_currency, v_subtotal
  FROM public.cart_items ci
  JOIN public.listings l ON l.id = ci.listing_id
  JOIN public.products p ON p.id = l.product_id
  JOIN public.stores s ON s.id = l.store_id
  JOIN public.inventories i ON i.listing_id = l.id
  WHERE ci.cart_id = v_cart_id
    AND l.status = 'active'
    AND p.moderation_status = 'approved'
    AND s.status = 'active';

  SELECT count(*)::integer INTO v_cart_item_count
  FROM public.cart_items WHERE cart_id = v_cart_id;

  IF v_item_count = 0 OR v_item_count <> v_cart_item_count THEN
    RAISE EXCEPTION 'CART_EMPTY_OR_UNAVAILABLE';
  END IF;
  IF v_currency_count <> 1 THEN
    RAISE EXCEPTION 'MIXED_CURRENCY_CART';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cart_items ci
    JOIN public.listings l ON l.id = ci.listing_id
    JOIN public.inventories i ON i.listing_id = l.id
    WHERE ci.cart_id = v_cart_id
      AND (i.physical_stock - i.reserved_stock) < ci.quantity
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  -- Require a configured partner commission; official store commission is zero
  -- unless an explicit store-level rate is configured.
  FOR v_store IN
    SELECT
      s.id AS store_id,
      sum(ci.quantity * l.price_amount)::bigint AS store_subtotal,
      (
        sum(round(
          (ci.quantity * l.price_amount)::numeric *
          coalesce(s.commission_rate_bps, cr.rate_bps,
            CASE WHEN s.store_type = 'official' THEN 0 ELSE NULL END
          ) / 10000
        )) + max(coalesce(cr.fixed_fee_amount, 0))
      )::bigint AS commission_amount,
      bool_or(coalesce(s.commission_rate_bps, cr.rate_bps,
        CASE WHEN s.store_type = 'official' THEN 0 ELSE NULL END
      ) IS NULL) AS missing_commission
    FROM public.cart_items ci
    JOIN public.listings l ON l.id = ci.listing_id
    JOIN public.products p ON p.id = l.product_id
    JOIN public.stores s ON s.id = l.store_id
    LEFT JOIN LATERAL (
      SELECT rate_bps, fixed_fee_amount
      FROM public.commission_rules
      WHERE store_type = s.store_type
        AND is_active = true
        AND effective_from <= now()
        AND (effective_until IS NULL OR effective_until > now())
        AND (category_id IS NULL OR category_id = p.category_id)
      ORDER BY (category_id IS NOT NULL) DESC, effective_from DESC
      LIMIT 1
    ) cr ON true
    WHERE ci.cart_id = v_cart_id
    GROUP BY s.id, s.commission_rate_bps, s.store_type
  LOOP
    IF v_store.missing_commission THEN
      RAISE EXCEPTION 'COMMISSION_RULE_MISSING';
    END IF;
  END LOOP;

  v_order_number := 'EXG-' || to_char(now() AT TIME ZONE 'Asia/Makassar', 'YYYYMMDD')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.orders (
    order_number, buyer_user_id, status, currency,
    subtotal_amount, discount_amount, shipping_amount, total_amount,
    shipping_address_snapshot, idempotency_key
  ) VALUES (
    v_order_number, v_user_id, 'pending_payment', v_currency,
    v_subtotal, 0, 0, v_subtotal, v_address, p_idempotency_key
  ) RETURNING id INTO v_order_id;

  FOR v_store IN
    SELECT
      s.id AS store_id,
      sum(ci.quantity * l.price_amount)::bigint AS store_subtotal,
      (
        sum(round(
          (ci.quantity * l.price_amount)::numeric *
          coalesce(s.commission_rate_bps, cr.rate_bps,
            CASE WHEN s.store_type = 'official' THEN 0 ELSE NULL END
          ) / 10000
        )) + max(coalesce(cr.fixed_fee_amount, 0))
      )::bigint AS commission_amount,
      bool_or(coalesce(s.commission_rate_bps, cr.rate_bps,
        CASE WHEN s.store_type = 'official' THEN 0 ELSE NULL END
      ) IS NULL) AS missing_commission
    FROM public.cart_items ci
    JOIN public.listings l ON l.id = ci.listing_id
    JOIN public.products p ON p.id = l.product_id
    JOIN public.stores s ON s.id = l.store_id
    LEFT JOIN LATERAL (
      SELECT rate_bps, fixed_fee_amount
      FROM public.commission_rules
      WHERE store_type = s.store_type
        AND is_active = true
        AND effective_from <= now()
        AND (effective_until IS NULL OR effective_until > now())
        AND (category_id IS NULL OR category_id = p.category_id)
      ORDER BY (category_id IS NOT NULL) DESC, effective_from DESC
      LIMIT 1
    ) cr ON true
    WHERE ci.cart_id = v_cart_id
    GROUP BY s.id, s.commission_rate_bps, s.store_type
    ORDER BY s.id
  LOOP
    IF v_store.missing_commission THEN
      RAISE EXCEPTION 'COMMISSION_RULE_MISSING';
    END IF;

    v_sub_order_number := v_order_number || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

    INSERT INTO public.sub_orders (
      order_id, store_id, sub_order_number, status,
      subtotal_amount, commission_amount, seller_net_amount
    ) VALUES (
      v_order_id, v_store.store_id, v_sub_order_number, 'awaiting_fulfillment',
      v_store.store_subtotal, v_store.commission_amount,
      v_store.store_subtotal - v_store.commission_amount
    ) RETURNING id INTO v_sub_order_id;

    INSERT INTO public.order_items (
      sub_order_id, listing_id, product_id, seller_sku_snapshot,
      product_title_snapshot, condition_snapshot, unit_price_amount,
      quantity, line_total_amount
    )
    SELECT
      v_sub_order_id, l.id, l.product_id, l.seller_sku,
      coalesce(l.title_override, p.title), l.condition,
      l.price_amount, ci.quantity, ci.quantity * l.price_amount
    FROM public.cart_items ci
    JOIN public.listings l ON l.id = ci.listing_id
    JOIN public.products p ON p.id = l.product_id
    WHERE ci.cart_id = v_cart_id AND l.store_id = v_store.store_id;
  END LOOP;

  UPDATE public.inventories i
  SET reserved_stock = i.reserved_stock + ci.quantity,
      updated_at = now()
  FROM public.cart_items ci
  WHERE ci.cart_id = v_cart_id AND ci.listing_id = i.listing_id;

  INSERT INTO public.stock_reservations (listing_id, order_id, quantity, status, expires_at)
  SELECT ci.listing_id, v_order_id, ci.quantity, 'active', now() + interval '30 minutes'
  FROM public.cart_items ci
  WHERE ci.cart_id = v_cart_id;

  INSERT INTO public.payments (
    order_id, provider, status, amount, currency, idempotency_key
  ) VALUES (
    v_order_id, p_payment_method, 'pending', v_subtotal, v_currency,
    p_idempotency_key || ':payment'
  ) RETURNING id INTO v_payment_id;

  UPDATE public.carts SET status = 'converted', updated_at = now()
  WHERE id = v_cart_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_subtotal,
    'currency', trim(v_currency),
    'payment_id', v_payment_id,
    'shipping_pending', true,
    'reused', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid, text, text) TO exgarasi_app;
