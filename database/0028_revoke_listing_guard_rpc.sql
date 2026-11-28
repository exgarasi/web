-- EXGARASI migration 0028: keep the listing guard trigger-only.
-- Trigger functions do not need to be directly callable through the Data API.
REVOKE EXECUTE ON FUNCTION public.enforce_active_store_listing_publish() FROM PUBLIC, anon, authenticated;
