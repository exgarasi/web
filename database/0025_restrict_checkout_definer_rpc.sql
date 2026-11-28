-- EXGARASI migration 0025: restrict checkout SECURITY DEFINER RPCs to the
-- trusted application database role. Supabase default privileges had exposed
-- these functions to anon/authenticated despite the PUBLIC revoke in 0023.
REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_stock_reservations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid, text, text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.release_expired_stock_reservations() TO exgarasi_app;
