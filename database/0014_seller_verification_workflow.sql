-- EXGARASI migration 0014: seller verification workflow privileges and pending-request uniqueness.
-- Apply through the Supabase migration control plane as the database owner before enabling this feature.

CREATE UNIQUE INDEX IF NOT EXISTS seller_verifications_one_pending_per_store
  ON public.seller_verifications(store_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS seller_verifications_review_queue_idx
  ON public.seller_verifications(status, submitted_at DESC);

-- The runtime role may submit verification requests and admins may record decisions.
GRANT INSERT ON public.seller_verifications TO exgarasi_app;
GRANT UPDATE (status, review_note, reviewer_user_id, reviewed_at)
  ON public.seller_verifications TO exgarasi_app;

-- Store activation is performed only by the authenticated admin review endpoint.
GRANT UPDATE (status, approved_at, updated_at)
  ON public.stores TO exgarasi_app;
