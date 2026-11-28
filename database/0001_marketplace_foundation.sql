-- EXGARASI Marketplace foundation
-- PostgreSQL 15+. Apply through a migration tool; do not run manually in production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('active','suspended','pending');
CREATE TYPE store_type AS ENUM ('official','partner');
CREATE TYPE store_status AS ENUM ('invited','pending_review','active','suspended','closed');
CREATE TYPE listing_status AS ENUM ('draft','pending_review','active','rejected','archived');
CREATE TYPE product_condition AS ENUM ('new','used','refurbished');
CREATE TYPE order_status AS ENUM ('pending_payment','paid','processing','partially_shipped','shipped','completed','cancelled','refunded','partially_refunded');
CREATE TYPE sub_order_status AS ENUM ('awaiting_fulfillment','processing','ready_to_ship','shipped','completed','cancelled','refunded');
CREATE TYPE payment_status AS ENUM ('pending','authorized','paid','failed','expired','partially_refunded','refunded');
CREATE TYPE inventory_movement_type AS ENUM ('opening','restock','reserve','release','sale','return','adjustment','damage');
CREATE TYPE ledger_entry_type AS ENUM ('sale_credit','commission_debit','refund_debit','refund_reversal','payout_debit','payout_reversal','adjustment_credit','adjustment_debit');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  phone text UNIQUE,
  password_hash text,
  full_name text NOT NULL,
  status user_status NOT NULL DEFAULT 'pending',
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('buyer','seller','admin','super_admin','support')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  recipient_name text NOT NULL,
  phone text NOT NULL,
  address_line text NOT NULL,
  village text,
  district text,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text,
  country_code char(2) NOT NULL DEFAULT 'ID',
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON addresses(user_id);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  store_type store_type NOT NULL DEFAULT 'partner',
  status store_status NOT NULL DEFAULT 'invited',
  description text,
  logo_object_key text,
  support_email text,
  support_phone text,
  commission_rate_bps integer CHECK (commission_rate_bps BETWEEN 0 AND 10000),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stores_owner_idx ON stores(owner_user_id);
CREATE INDEX stores_status_type_idx ON stores(status, store_type);

CREATE TABLE store_members (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role text NOT NULL CHECK (member_role IN ('owner','manager','catalog','fulfillment','finance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);

CREATE TABLE seller_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seller_invites_email_idx ON seller_invitations(lower(email));

CREATE TABLE seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id),
  verification_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  document_object_key text,
  reviewer_user_id uuid REFERENCES users(id),
  review_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  vertical text NOT NULL DEFAULT 'automotive',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code char(2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  product_type text NOT NULL CHECK (product_type IN ('diecast','parts','accessory','lifestyle','other')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_brand_idx ON products(brand_id);
CREATE INDEX products_attributes_gin_idx ON products USING gin(attributes);

CREATE TABLE vehicle_fitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  generation text,
  year_from smallint,
  year_to smallint,
  variant text,
  notes text,
  CHECK (year_to IS NULL OR year_from IS NULL OR year_to >= year_from)
);
CREATE INDEX vehicle_fitments_lookup_idx ON vehicle_fitments(make, model, year_from, year_to);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  product_id uuid NOT NULL REFERENCES products(id),
  seller_sku text NOT NULL,
  title_override text,
  description_override text,
  condition product_condition NOT NULL DEFAULT 'new',
  price_amount bigint NOT NULL CHECK (price_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  status listing_status NOT NULL DEFAULT 'draft',
  weight_grams integer CHECK (weight_grams IS NULL OR weight_grams >= 0),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, seller_sku),
  UNIQUE (store_id, product_id, seller_sku)
);
CREATE INDEX listings_store_status_idx ON listings(store_id, status);
CREATE INDEX listings_product_idx ON listings(product_id);

CREATE TABLE listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, object_key)
);

CREATE TABLE inventories (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  physical_stock integer NOT NULL DEFAULT 0 CHECK (physical_stock >= 0),
  reserved_stock integer NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  available_stock integer GENERATED ALWAYS AS (physical_stock - reserved_stock) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reserved_stock <= physical_stock)
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id),
  movement_type inventory_movement_type NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reference_type text,
  reference_id uuid,
  note text,
  actor_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_listing_time_idx ON stock_movements(listing_id, created_at DESC);

CREATE TABLE stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id),
  order_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released','expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_reservations_expiry_idx ON stock_reservations(status, expires_at);

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','abandoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_cart_per_user ON carts(user_id) WHERE status = 'active';

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, listing_id)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  status order_status NOT NULL DEFAULT 'pending_payment',
  currency char(3) NOT NULL DEFAULT 'IDR',
  subtotal_amount bigint NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount bigint NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  shipping_address_snapshot jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  placed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sub_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  sub_order_number text NOT NULL UNIQUE,
  status sub_order_status NOT NULL DEFAULT 'awaiting_fulfillment',
  subtotal_amount bigint NOT NULL CHECK (subtotal_amount >= 0),
  commission_amount bigint NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  seller_net_amount bigint NOT NULL DEFAULT 0 CHECK (seller_net_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id)
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid NOT NULL REFERENCES sub_orders(id),
  listing_id uuid REFERENCES listings(id),
  product_id uuid REFERENCES products(id),
  seller_sku_snapshot text NOT NULL,
  product_title_snapshot text NOT NULL,
  condition_snapshot product_condition NOT NULL,
  unit_price_amount bigint NOT NULL CHECK (unit_price_amount >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_amount bigint NOT NULL CHECK (line_total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  provider text NOT NULL,
  provider_payment_id text,
  status payment_status NOT NULL DEFAULT 'pending',
  amount bigint NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  idempotency_key text NOT NULL UNIQUE,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature_verified boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_type store_type NOT NULL DEFAULT 'partner',
  category_id uuid REFERENCES categories(id),
  rate_bps integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  fixed_fee_amount bigint NOT NULL DEFAULT 0 CHECK (fixed_fee_amount >= 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  sub_order_id uuid REFERENCES sub_orders(id),
  payout_id uuid,
  entry_type ledger_entry_type NOT NULL,
  amount bigint NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_store_time_idx ON ledger_entries(store_id, created_at DESC);

CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  amount bigint NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'IDR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  provider_payout_id text,
  idempotency_key text NOT NULL UNIQUE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_payout_fk FOREIGN KEY (payout_id) REFERENCES payouts(id);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  amount bigint NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','succeeded','rejected','failed')),
  provider_refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid NOT NULL REFERENCES sub_orders(id),
  courier_code text NOT NULL,
  service_name text,
  tracking_number text,
  status text NOT NULL DEFAULT 'pending',
  shipping_cost_amount bigint NOT NULL DEFAULT 0 CHECK (shipping_cost_amount >= 0),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_code text,
  description text NOT NULL,
  event_time timestamptz NOT NULL,
  raw_payload jsonb
);
CREATE INDEX tracking_shipment_time_idx ON tracking_events(shipment_id, event_time DESC);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL UNIQUE REFERENCES order_items(id),
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid NOT NULL REFERENCES sub_orders(id),
  opened_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved_buyer','resolved_seller','closed')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_resource_idx ON audit_logs(resource_type, resource_id, created_at DESC);

-- Follow-up migrations must add RLS policies, triggers, updated_at handling,
-- atomic reservation functions, and provider-specific reconciliation logic.
