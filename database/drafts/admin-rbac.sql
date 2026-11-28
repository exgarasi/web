-- DRAFT ONLY: Admin RBAC roles and permission primitives.
-- This file is intentionally NOT a numbered executable migration.
-- Review against the target database and add database-level tests before
-- assigning a migration number in a separately approved change.
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
          'dashboard.read','users.manage','roles.manage',
          'catalog.read','catalog.write','catalog.moderate',
          'sellers.admin','sellers.read','sellers.invite','sellers.verify',
          'orders.read','orders.manage','finance.read',
          'finance.manage','audit.read'
        )
        WHEN 'admin' THEN permission_name IN (
          'dashboard.read','users.manage',
          'catalog.read','catalog.write','catalog.moderate',
          'sellers.admin','sellers.read','sellers.invite','sellers.verify',
          'orders.read','orders.manage','finance.read','audit.read'
        )
        WHEN 'finance' THEN permission_name IN (
          'dashboard.read','orders.read','finance.read','finance.manage'
        )
        WHEN 'moderator' THEN permission_name IN (
          'dashboard.read','catalog.read','catalog.moderate','sellers.read'
        )
        ELSE false
      END
  )
$$;

REVOKE ALL ON FUNCTION public.app_has_admin_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_has_admin_permission(text) TO exgarasi_app;

COMMIT;
