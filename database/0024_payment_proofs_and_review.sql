-- EXGARASI migration 0024: private manual-payment proofs and safe admin review.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_confirmed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  review_note text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_proofs_order_created_idx
  ON public.payment_proofs(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_proofs_pending_idx
  ON public.payment_proofs(created_at) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS payment_proofs_one_pending_per_order
  ON public.payment_proofs(order_id) WHERE status='pending';

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_proofs_buyer_select ON public.payment_proofs;
CREATE POLICY payment_proofs_buyer_select ON public.payment_proofs
  FOR SELECT USING (
    uploaded_by = public.app_current_user_id() OR public.app_is_admin()
  );
DROP POLICY IF EXISTS payment_proofs_buyer_insert ON public.payment_proofs;
CREATE POLICY payment_proofs_buyer_insert ON public.payment_proofs
  FOR INSERT WITH CHECK (
    uploaded_by = public.app_current_user_id()
    AND object_key LIKE public.app_current_user_id()::text || '/' || payment_proofs.order_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.payments p ON p.order_id=o.id
      WHERE o.id=payment_proofs.order_id
        AND p.id=payment_proofs.payment_id
        AND o.buyer_user_id=public.app_current_user_id()
        AND o.status='pending_payment'
        AND o.shipping_confirmed_at IS NOT NULL
        AND p.status='pending'
    )
  );
DROP POLICY IF EXISTS payment_proofs_admin_update ON public.payment_proofs;
CREATE POLICY payment_proofs_admin_update ON public.payment_proofs
  FOR UPDATE USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

GRANT SELECT, INSERT, UPDATE ON public.payment_proofs TO exgarasi_app;
GRANT INSERT ON public.audit_logs TO exgarasi_app;
DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;
CREATE POLICY audit_logs_admin_insert ON public.audit_logs
  FOR INSERT WITH CHECK (public.app_is_admin());

-- The bucket is private. All file operations are proxied by server routes that
-- keep the service-role key server-side; no public object URLs are issued.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs','payment-proofs',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

-- Seller sub-orders must not appear ready for fulfillment before payment.
ALTER TYPE public.sub_order_status ADD VALUE IF NOT EXISTS 'pending_payment';

CREATE OR REPLACE FUNCTION public.mark_new_sub_order_pending_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = NEW.order_id AND status = 'pending_payment'
  ) THEN
    NEW.status := 'pending_payment';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sub_orders_pending_payment_guard ON public.sub_orders;
CREATE TRIGGER sub_orders_pending_payment_guard
BEFORE INSERT ON public.sub_orders
FOR EACH ROW EXECUTE FUNCTION public.mark_new_sub_order_pending_payment();

CREATE OR REPLACE FUNCTION public.sync_sub_orders_with_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'paid' THEN
      UPDATE public.sub_orders
      SET status = 'awaiting_fulfillment', updated_at = now()
      WHERE order_id = NEW.id AND status = 'pending_payment';
    ELSIF NEW.status = 'cancelled' THEN
      UPDATE public.sub_orders
      SET status = 'cancelled', updated_at = now()
      WHERE order_id = NEW.id AND status = 'pending_payment';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_sync_sub_order_payment_status ON public.orders;
CREATE TRIGGER orders_sync_sub_order_payment_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_sub_orders_with_order_payment();
