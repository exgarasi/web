-- EXGARASI migration 0002: auth, authorization and row-level security.
-- Apply after 0001 in a fresh PostgreSQL database. Review in staging before production.

CREATE SCHEMA IF NOT EXISTS auth;

-- Better Auth canonical identity tables. Public application users are linked by auth_user_id.
CREATE TABLE auth."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth.session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE
);
CREATE INDEX auth_session_user_idx ON auth.session(user_id);
CREATE TABLE auth.account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, account_id)
);
CREATE INDEX auth_account_user_idx ON auth.account(user_id);
CREATE TABLE auth.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verification_identifier_idx ON auth.verification(identifier);

ALTER TABLE users ADD COLUMN auth_user_id text UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Mirror newly registered Better Auth identities into the application profile.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.users (email, full_name, status, auth_user_id, email_verified_at)
  VALUES (lower(NEW.email), NEW.name, 'active', NEW.id,
          CASE WHEN NEW.email_verified THEN now() ELSE NULL END)
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        full_name = EXCLUDED.full_name,
        email_verified_at = EXCLUDED.email_verified_at,
        updated_at = now();
  INSERT INTO public.user_roles(user_id, role)
    SELECT id, 'buyer' FROM public.users WHERE auth_user_id = NEW.id
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER auth_user_profile_sync
AFTER INSERT OR UPDATE ON auth."user"
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_profile();

-- Session-scoped identity is set only by trusted server code inside a transaction:
-- SELECT set_config('app.user_id', '<uuid>', true)
CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = public.app_current_user_id()
      AND role IN ('admin','super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_store_member(target_store uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = target_store
      AND sm.user_id = public.app_current_user_id()
  ) OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = target_store
      AND s.owner_user_id = public.app_current_user_id()
  )
$$;

-- Enable RLS on all tables containing private or tenant-owned data.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public catalog reads are limited to approved/active records.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_or_admin ON users
  USING (id = app_current_user_id() OR app_is_admin())
  WITH CHECK (id = app_current_user_id() OR app_is_admin());
CREATE POLICY roles_self_or_admin ON user_roles
  USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (app_is_admin());
CREATE POLICY addresses_owner_or_admin ON addresses
  USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY stores_public_or_member ON stores
  FOR SELECT USING (status = 'active' OR app_is_store_member(id) OR app_is_admin());
CREATE POLICY stores_admin_insert ON stores
  FOR INSERT WITH CHECK (app_is_admin());
CREATE POLICY stores_member_update ON stores
  FOR UPDATE USING (app_is_store_member(id) OR app_is_admin())
  WITH CHECK (app_is_store_member(id) OR app_is_admin());
CREATE POLICY stores_admin_delete ON stores
  FOR DELETE USING (app_is_admin());

CREATE POLICY store_members_visible_to_store ON store_members
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_store_member(store_id) OR app_is_admin());
CREATE POLICY store_members_admin_manage ON store_members
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY invitations_admin_only ON seller_invitations
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY verifications_store_or_admin ON seller_verifications
  FOR SELECT USING (app_is_store_member(store_id) OR app_is_admin());
CREATE POLICY verifications_admin_insert ON seller_verifications
  FOR INSERT WITH CHECK (submitted_by = app_current_user_id() OR app_is_admin());
CREATE POLICY verifications_admin_update ON seller_verifications
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY categories_public_read ON categories FOR SELECT USING (is_active OR app_is_admin());
CREATE POLICY brands_public_read ON brands FOR SELECT USING (true);
CREATE POLICY products_public_read ON products
  FOR SELECT USING (moderation_status = 'approved' OR app_is_admin());
CREATE POLICY products_admin_write ON products
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY fitments_public_read ON vehicle_fitments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM products p WHERE p.id = product_id AND p.moderation_status = 'approved'
  ) OR app_is_admin());

CREATE POLICY listings_public_or_store ON listings
  FOR SELECT USING (
    (status = 'active' AND EXISTS (
      SELECT 1 FROM stores s WHERE s.id = store_id AND s.status = 'active'
    )) OR app_is_store_member(store_id) OR app_is_admin()
  );
CREATE POLICY listings_store_write ON listings
  FOR INSERT WITH CHECK (app_is_store_member(store_id) OR app_is_admin());
CREATE POLICY listings_store_update ON listings
  FOR UPDATE USING (app_is_store_member(store_id) OR app_is_admin())
  WITH CHECK (app_is_store_member(store_id) OR app_is_admin());
CREATE POLICY listings_store_delete ON listings
  FOR DELETE USING (app_is_store_member(store_id) OR app_is_admin());

CREATE POLICY listing_images_read ON listing_images
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id
  ));
CREATE POLICY listing_images_store_write ON listing_images
  FOR ALL USING (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ) OR app_is_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ) OR app_is_admin());

CREATE POLICY inventory_store_access ON inventories
  FOR ALL USING (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ) OR app_is_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ) OR app_is_admin());
CREATE POLICY stock_movements_store_access ON stock_movements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ) OR app_is_admin());
CREATE POLICY stock_movements_admin_insert ON stock_movements
  FOR INSERT WITH CHECK (app_is_admin() OR EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ));
CREATE POLICY stock_reservations_store_or_admin ON stock_reservations
  FOR ALL USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  )) WITH CHECK (app_is_admin() OR EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND app_is_store_member(l.store_id)
  ));

CREATE POLICY carts_owner ON carts FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());
CREATE POLICY cart_items_owner ON cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = app_current_user_id()) OR app_is_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = app_current_user_id()) OR app_is_admin());

CREATE POLICY orders_buyer_store_admin ON orders
  FOR SELECT USING (
    buyer_user_id = app_current_user_id() OR app_is_admin() OR EXISTS (
      SELECT 1 FROM sub_orders so WHERE so.order_id = id AND app_is_store_member(so.store_id)
    )
  );
CREATE POLICY orders_buyer_insert ON orders
  FOR INSERT WITH CHECK (buyer_user_id = app_current_user_id() OR app_is_admin());
CREATE POLICY orders_admin_update ON orders
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY sub_orders_store_buyer_admin ON sub_orders
  FOR SELECT USING (app_is_admin() OR app_is_store_member(store_id) OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_user_id = app_current_user_id()
  ));
CREATE POLICY sub_orders_admin_write ON sub_orders
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY order_items_buyer_store_admin ON order_items
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM sub_orders so JOIN orders o ON o.id = so.order_id
    WHERE so.id = sub_order_id
      AND (o.buyer_user_id = app_current_user_id() OR app_is_store_member(so.store_id))
  ));
CREATE POLICY order_items_admin_write ON order_items
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY payments_buyer_admin ON payments
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_user_id = app_current_user_id()
  ));
CREATE POLICY payments_admin_write ON payments
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY webhook_events_admin_only ON payment_webhook_events
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY commission_rules_public_read ON commission_rules
  FOR SELECT USING (is_active OR app_is_admin());
CREATE POLICY commission_rules_admin_write ON commission_rules
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY ledger_store_read ON ledger_entries
  FOR SELECT USING (app_is_admin() OR app_is_store_member(store_id));
CREATE POLICY ledger_admin_write ON ledger_entries
  FOR INSERT WITH CHECK (app_is_admin());
CREATE POLICY payout_store_read ON payouts
  FOR SELECT USING (app_is_admin() OR app_is_store_member(store_id));
CREATE POLICY payout_admin_write ON payouts
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY refunds_buyer_store_admin ON refunds
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_user_id = app_current_user_id()
  ) OR EXISTS (
    SELECT 1 FROM sub_orders so JOIN order_items oi ON oi.sub_order_id = so.id
    JOIN orders o ON o.id = so.order_id
    WHERE o.id = order_id AND app_is_store_member(so.store_id)
  ));
CREATE POLICY refunds_admin_write ON refunds
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY shipments_buyer_store_admin ON shipments
  FOR SELECT USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM sub_orders so JOIN orders o ON o.id = so.order_id
    WHERE so.id = sub_order_id
      AND (o.buyer_user_id = app_current_user_id() OR app_is_store_member(so.store_id))
  ));
CREATE POLICY shipments_store_write ON shipments
  FOR ALL USING (app_is_admin() OR EXISTS (
    SELECT 1 FROM sub_orders so WHERE so.id = sub_order_id AND app_is_store_member(so.store_id)
  )) WITH CHECK (app_is_admin() OR EXISTS (
    SELECT 1 FROM sub_orders so WHERE so.id = sub_order_id AND app_is_store_member(so.store_id)
  ));
CREATE POLICY tracking_buyer_store_read ON tracking_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM shipments sh JOIN sub_orders so ON so.id = sh.sub_order_id
    JOIN orders o ON o.id = so.order_id
    WHERE sh.id = shipment_id AND
      (app_is_admin() OR o.buyer_user_id = app_current_user_id() OR app_is_store_member(so.store_id))
  ));
CREATE POLICY tracking_admin_write ON tracking_events
  FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY reviews_public_read ON reviews FOR SELECT USING (true);
CREATE POLICY reviews_buyer_insert ON reviews
  FOR INSERT WITH CHECK (buyer_user_id = app_current_user_id() AND EXISTS (
    SELECT 1 FROM order_items oi JOIN sub_orders so ON so.id = oi.sub_order_id
    JOIN orders o ON o.id = so.order_id
    WHERE oi.id = order_item_id AND o.buyer_user_id = app_current_user_id()
      AND o.status = 'completed'
  ));
CREATE POLICY reviews_owner_admin_update ON reviews
  FOR UPDATE USING (buyer_user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (buyer_user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY disputes_buyer_store_admin ON disputes
  FOR SELECT USING (app_is_admin() OR opened_by = app_current_user_id() OR EXISTS (
    SELECT 1 FROM sub_orders so WHERE so.id = sub_order_id AND app_is_store_member(so.store_id)
  ));
CREATE POLICY disputes_buyer_insert ON disputes
  FOR INSERT WITH CHECK (opened_by = app_current_user_id());
CREATE POLICY disputes_admin_update ON disputes
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (app_is_admin());
CREATE POLICY audit_logs_insert_actor ON audit_logs
  FOR INSERT WITH CHECK (actor_user_id = app_current_user_id() OR app_is_admin());

-- Remove direct table access to auth records from application roles; grant only through auth adapter role.
-- Configure separate database roles and grants in the deployment environment.
