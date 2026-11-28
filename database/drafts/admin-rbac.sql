-- DRAFT ONLY: Admin RBAC roles and permission primitives.
-- This file is intentionally NOT numbered as an executable migration.
-- Review against the target database, add route/action enforcement and tests,
-- then assign a migration number in a separately approved change.
-- Do not execute against Production.

BEGIN;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('buyer','seller','admin','super_admin','support','finance','moderator'));

-- Keep app_is_admin() unchanged: legacy RLS policies must not silently grant
-- Finance or Moderator the broad access currently reserved for administrators.
CREATE OR REPLACE FUNCTION public.app_has_admin_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.app_current_user_id()
      AND CASE ur.role
        WHEN 'super_admin' THEN permission_name IN (
          'admin.dashboard.read','admin.users.manage','admin.roles.manage',
          'admin.catalog.read','admin.catalog.write','admin.catalog.moderate',
          'admin.sellers.read','admin.sellers.invite','admin.sellers.verify',
          'admin.orders.read','admin.orders.manage','admin.finance.read',
          'admin.finance.manage','admin.audit.read'
        )
        WHEN 'admin' THEN permission_name IN (
          'admin.dashboard.read','admin.users.manage',
          'admin.catalog.read','admin.catalog.write','admin.catalog.moderate',
          'admin.sellers.read','admin.sellers.invite','admin.sellers.verify',
          'admin.orders.read','admin.orders.manage','admin.finance.read',
          'admin.audit.read'
        )
        WHEN 'finance' THEN permission_name IN (
          'admin.dashboard.read','admin.orders.read','admin.finance.read',
          'admin.finance.manage'
        )
        WHEN 'moderator' THEN permission_name IN (
          'admin.dashboard.read','admin.catalog.read','admin.catalog.moderate',
          'admin.sellers.read','admin.sellers.verify'
        )
        ELSE false
      END
  )
$$;

REVOKE ALL ON FUNCTION public.app_has_admin_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_has_admin_permission(text) TO exgarasi_app;

COMMIT;
