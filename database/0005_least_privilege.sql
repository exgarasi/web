-- EXGARASI migration 0005: least-privilege DML policies.
-- Runtime grants are described in docs/deployment.md. RLS alone does not restrict columns.

-- Prevent buyer self-deletion or mutation of privileged profile fields.
DROP POLICY IF EXISTS users_self_or_admin ON public.users;
CREATE POLICY users_select_self_or_admin ON public.users
  FOR SELECT USING (id = public.app_current_user_id() OR public.app_is_admin());
CREATE POLICY users_update_self_or_admin ON public.users
  FOR UPDATE USING (id = public.app_current_user_id() OR public.app_is_admin())
  WITH CHECK (id = public.app_current_user_id() OR public.app_is_admin());

-- Users may read their own role assignments, but cannot delete or create roles.
DROP POLICY IF EXISTS roles_self_or_admin ON public.user_roles;
CREATE POLICY roles_select_self_or_admin ON public.user_roles
  FOR SELECT USING (user_id = public.app_current_user_id() OR public.app_is_admin());
CREATE POLICY roles_admin_manage ON public.user_roles
  FOR ALL USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());

-- Store creation and status changes are performed only by trusted invitation/review functions.
DROP POLICY IF EXISTS stores_admin_insert ON public.stores;
DROP POLICY IF EXISTS stores_member_update ON public.stores;
CREATE POLICY stores_admin_insert ON public.stores
  FOR INSERT WITH CHECK (public.app_is_admin());
CREATE POLICY stores_member_update ON public.stores
  FOR UPDATE USING (public.app_is_store_member(id) OR public.app_is_admin())
  WITH CHECK (public.app_is_store_member(id) OR public.app_is_admin());

-- A seller can submit a draft listing, but cannot self-publish or change ownership/master product.
DROP POLICY IF EXISTS listings_store_write ON public.listings;
DROP POLICY IF EXISTS listings_store_update ON public.listings;
CREATE POLICY listings_store_insert_draft ON public.listings
  FOR INSERT WITH CHECK (
    (public.app_is_admin())
    OR (public.app_is_store_member(store_id) AND status = 'draft')
  );
CREATE POLICY listings_store_update_fields ON public.listings
  FOR UPDATE USING (public.app_is_store_member(store_id) OR public.app_is_admin())
  WITH CHECK (public.app_is_store_member(store_id) OR public.app_is_admin());

-- Checkout and order creation must use a server-side transaction/service, not direct client inserts.
DROP POLICY IF EXISTS orders_buyer_insert ON public.orders;

-- Reviews must be tied to the actual store on the completed order item.
DROP POLICY IF EXISTS reviews_buyer_insert ON public.reviews;
CREATE POLICY reviews_buyer_insert ON public.reviews
  FOR INSERT WITH CHECK (
    buyer_user_id = public.app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.sub_orders so ON so.id = oi.sub_order_id
      JOIN public.orders o ON o.id = so.order_id
      WHERE oi.id = order_item_id
        AND so.store_id = store_id
        AND o.buyer_user_id = public.app_current_user_id()
        AND o.status = 'completed'
    )
  );
DROP POLICY IF EXISTS reviews_owner_admin_update ON public.reviews;

-- A dispute must concern an order the current buyer actually placed.
DROP POLICY IF EXISTS disputes_buyer_insert ON public.disputes;
CREATE POLICY disputes_buyer_insert ON public.disputes
  FOR INSERT WITH CHECK (
    opened_by = public.app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.sub_orders so
      JOIN public.orders o ON o.id = so.order_id
      WHERE so.id = sub_order_id AND o.buyer_user_id = public.app_current_user_id()
    )
  );

-- Audit log entries are written by trusted functions only.
DROP POLICY IF EXISTS audit_logs_insert_actor ON public.audit_logs;

