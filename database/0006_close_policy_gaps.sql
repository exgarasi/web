-- EXGARASI migration 0006: close remaining tenant and shipment write gaps.
DROP POLICY IF EXISTS shipments_store_write ON public.shipments;

DROP POLICY IF EXISTS verifications_admin_insert ON public.seller_verifications;
CREATE POLICY verifications_store_member_insert ON public.seller_verifications
  FOR INSERT WITH CHECK (
    submitted_by = public.app_current_user_id()
    AND public.app_is_store_member(store_id)
  );

DROP POLICY IF EXISTS reviews_buyer_insert ON public.reviews;
CREATE POLICY reviews_buyer_insert ON public.reviews
  FOR INSERT WITH CHECK (
    buyer_user_id = public.app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.sub_orders so ON so.id = oi.sub_order_id
      JOIN public.orders o ON o.id = so.order_id
      WHERE oi.id = order_item_id
        AND so.store_id = public.reviews.store_id
        AND o.buyer_user_id = public.app_current_user_id()
        AND o.status = 'completed'
    )
  );

-- Privileged roles are provisioned by a controlled database operator, not app endpoints.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM PUBLIC;
