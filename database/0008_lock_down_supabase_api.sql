-- EXGARASI migration 0008: explicitly close Supabase Data API access paths.
-- The app uses a private server-side PostgreSQL connection; browser roles do not need table/RPC grants.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated, authenticator, service_role, dashboard_user, supabase_privileged_role;

ALTER FUNCTION public.app_current_user_id()
  SET search_path = pg_catalog, public;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Explicitly grant only the application RPCs to the server-only runtime role.
GRANT EXECUTE ON FUNCTION public.app_profile_id_for_auth_user(text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_accept_seller_invitation(text,text,text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_current_user_id() TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_is_store_member(uuid) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_adjust_inventory(uuid,integer,text) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_reserve_stock(uuid,integer,uuid,integer) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_release_stock(uuid) TO exgarasi_app;
GRANT EXECUTE ON FUNCTION public.app_consume_stock(uuid) TO exgarasi_app;
