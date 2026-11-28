-- EXGARASI migration 0022: fix seller visibility for parent orders.
-- Qualify the outer orders.id explicitly; an unqualified id resolves to
-- sub_orders.id inside the EXISTS subquery and incorrectly hides seller orders.

DROP POLICY IF EXISTS orders_buyer_store_admin ON public.orders;

CREATE POLICY orders_buyer_store_admin ON public.orders
  FOR SELECT
  USING (
    buyer_user_id = public.app_current_user_id()
    OR public.app_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.sub_orders AS so
      WHERE so.order_id = public.orders.id
        AND public.app_is_store_member(so.store_id)
    )
  );
