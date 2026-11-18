-- EXGARASI migration 0004: tighten inventory writes and add atomic stock functions.
-- App runtime database role must not own tables and must not have BYPASSRLS.

-- Tenant dashboards and seller reports need efficient filtered access.
CREATE INDEX IF NOT EXISTS orders_buyer_placed_idx ON public.orders(buyer_user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS sub_orders_store_status_idx ON public.sub_orders(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_sub_order_idx ON public.order_items(sub_order_id);
CREATE INDEX IF NOT EXISTS payments_order_status_idx ON public.payments(order_id, status);
CREATE INDEX IF NOT EXISTS refunds_order_status_idx ON public.refunds(order_id, status);
CREATE INDEX IF NOT EXISTS shipments_sub_order_idx ON public.shipments(sub_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_store_created_idx ON public.reviews(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx ON public.audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_active_idx ON public.listings(status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS products_search_idx ON public.products USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

ALTER TABLE public.stock_reservations
  ADD CONSTRAINT stock_reservations_order_fk
  FOREIGN KEY (order_id) REFERENCES public.orders(id);

DROP POLICY IF EXISTS inventory_store_access ON public.inventories;
CREATE POLICY inventory_store_read ON public.inventories
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ));

DROP POLICY IF EXISTS stock_movements_admin_insert ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_store_access ON public.stock_movements;
CREATE POLICY stock_movements_store_read ON public.stock_movements
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ));

DROP POLICY IF EXISTS stock_reservations_store_or_admin ON public.stock_reservations;
CREATE POLICY stock_reservations_store_read ON public.stock_reservations
  FOR SELECT USING (
    app_is_admin()
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id))
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_user_id = app_current_user_id())
  );

DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_participant_read ON public.reviews
  FOR SELECT USING (
    app_is_admin() OR buyer_user_id = app_current_user_id() OR app_is_store_member(store_id)
  );

CREATE OR REPLACE FUNCTION public.app_adjust_inventory(
  target_listing_id uuid,
  quantity_delta integer,
  movement_note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_store_id uuid;
  new_physical integer;
  current_id uuid := public.app_current_user_id();
BEGIN
  IF current_id IS NULL OR quantity_delta = 0 THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED_OR_INVALID_QUANTITY';
  END IF;
  SELECT store_id INTO target_store_id FROM public.listings WHERE id = target_listing_id;
  IF target_store_id IS NULL OR NOT (public.app_is_admin() OR public.app_is_store_member(target_store_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.inventories
    SET physical_stock = physical_stock + quantity_delta, updated_at = now()
    WHERE listing_id = target_listing_id
      AND physical_stock + quantity_delta >= reserved_stock
    RETURNING physical_stock INTO new_physical;
  IF new_physical IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_PHYSICAL_STOCK_FOR_ADJUSTMENT';
  END IF;
  INSERT INTO public.stock_movements(listing_id,movement_type,quantity,note,actor_user_id)
  VALUES(target_listing_id, CASE WHEN quantity_delta > 0 THEN 'restock'::inventory_movement_type ELSE 'adjustment'::inventory_movement_type END,
         abs(quantity_delta), movement_note, current_id);
  RETURN new_physical;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_reserve_stock(
  target_listing_id uuid,
  requested_quantity integer,
  target_order_id uuid DEFAULT NULL,
  reservation_minutes integer DEFAULT 20
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_id uuid := public.app_current_user_id();
  reservation_id uuid;
BEGIN
  IF current_id IS NULL OR requested_quantity <= 0 OR reservation_minutes < 1 OR reservation_minutes > 120 THEN
    RAISE EXCEPTION 'INVALID_RESERVATION_REQUEST';
  END IF;
  IF target_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = target_order_id AND buyer_user_id = current_id
  ) AND NOT public.app_is_admin() THEN
    RAISE EXCEPTION 'ORDER_ACCESS_DENIED';
  END IF;
  UPDATE public.inventories i
    SET reserved_stock = reserved_stock + requested_quantity, updated_at = now()
    FROM public.listings l JOIN public.stores s ON s.id = l.store_id
    WHERE i.listing_id = target_listing_id
      AND l.id = i.listing_id AND l.status = 'active' AND s.status = 'active'
      AND i.available_stock >= requested_quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK_OR_LISTING_UNAVAILABLE';
  END IF;
  INSERT INTO public.stock_reservations(listing_id,order_id,quantity,expires_at)
  VALUES(target_listing_id,target_order_id,requested_quantity,now() + make_interval(mins => reservation_minutes))
  RETURNING id INTO reservation_id;
  INSERT INTO public.stock_movements(listing_id,movement_type,quantity,reference_type,reference_id,actor_user_id)
  VALUES(target_listing_id,'reserve',requested_quantity,'stock_reservation',reservation_id,current_id);
  RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_release_stock(target_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation public.stock_reservations%ROWTYPE;
  current_id uuid := public.app_current_user_id();
BEGIN
  IF current_id IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'; END IF;
  SELECT * INTO reservation FROM public.stock_reservations
    WHERE id = target_reservation_id FOR UPDATE;
  IF reservation.id IS NULL OR reservation.status <> 'active' THEN RETURN false; END IF;
  IF NOT public.app_is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = reservation.order_id AND o.buyer_user_id = current_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = reservation.listing_id AND public.app_is_store_member(l.store_id)
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  UPDATE public.stock_reservations SET status = 'released' WHERE id = target_reservation_id;
  UPDATE public.inventories SET reserved_stock = reserved_stock - reservation.quantity, updated_at = now()
    WHERE listing_id = reservation.listing_id AND reserved_stock >= reservation.quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_RESERVATION_INVARIANT_FAILED'; END IF;
  INSERT INTO public.stock_movements(listing_id,movement_type,quantity,reference_type,reference_id,actor_user_id)
  VALUES(reservation.listing_id,'release',reservation.quantity,'stock_reservation',target_reservation_id,current_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_consume_stock(target_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation public.stock_reservations%ROWTYPE;
  current_id uuid := public.app_current_user_id();
BEGIN
  IF current_id IS NULL OR NOT public.app_is_admin() THEN
    RAISE EXCEPTION 'ADMIN_OR_TRUSTED_PAYMENT_WORKER_REQUIRED';
  END IF;
  SELECT * INTO reservation FROM public.stock_reservations
    WHERE id = target_reservation_id FOR UPDATE;
  IF reservation.id IS NULL OR reservation.status <> 'active' THEN RETURN false; END IF;
  UPDATE public.inventories
    SET physical_stock = physical_stock - reservation.quantity,
        reserved_stock = reserved_stock - reservation.quantity,
        updated_at = now()
    WHERE listing_id = reservation.listing_id
      AND physical_stock >= reservation.quantity
      AND reserved_stock >= reservation.quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_CONSUMPTION_INVARIANT_FAILED'; END IF;
  UPDATE public.stock_reservations SET status = 'consumed' WHERE id = target_reservation_id;
  INSERT INTO public.stock_movements(listing_id,movement_type,quantity,reference_type,reference_id,actor_user_id)
  VALUES(reservation.listing_id,'sale',reservation.quantity,'stock_reservation',target_reservation_id,current_id);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_adjust_inventory(uuid,integer,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_reserve_stock(uuid,integer,uuid,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_release_stock(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_consume_stock(uuid) TO PUBLIC;
