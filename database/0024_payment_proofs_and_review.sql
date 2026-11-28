-- EXGARASI migration 0024: private manual-payment proofs and safe admin review.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'manual_bank_transfer';
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('manual_bank_transfer','manual_qris','midtrans'))
  NOT VALID;
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
GRANT USAGE, SELECT ON SEQUENCE public.payment_proofs_id_seq TO exgarasi_app;

-- The bucket is private. All file operations are proxied by server routes that
-- keep the service-role key server-side; no public object URLs are issued.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs','payment-proofs',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
