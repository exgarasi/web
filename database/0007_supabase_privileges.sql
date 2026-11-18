-- EXGARASI migration 0007: restrict callable public functions to the trusted app runtime.
-- Supabase exposes public schema through PostgREST by default; browser roles must not
-- inherit execute privileges on security-definer application functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_profile_id_for_auth_user(text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_accept_seller_invitation(text,text,text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_current_user_id() TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_is_store_member(uuid) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_adjust_inventory(uuid,integer,text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_reserve_stock(uuid,integer,uuid,integer) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_release_stock(uuid) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_consume_stock(uuid) TO exgarasi_app;

-- Keep PostgREST browser roles away from application tables. EXGARASI accesses
-- PostgreSQL from its trusted server runtime using exgarasi_app, not anon/authenticated.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
