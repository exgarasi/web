import { roleHasPermission, type AdminPermission } from "@/lib/admin-role-permissions";

export type AdminUserForAccess = {
  status: string;
  roles?: unknown;
};

export function resolveAdminRole(
  user: AdminUserForAccess | null,
  permission: AdminPermission,
): { roles: string[]; activeRole: string } | null {
  if (!user || user.status !== "active") return null;

  const roles = Array.isArray(user.roles)
    ? user.roles.filter((role): role is string => typeof role === "string")
    : [];
  const activeRole = ["super_admin", "admin", "finance", "moderator"].find(
    (role) => roles.includes(role) && roleHasPermission(role, permission),
  );

  return activeRole ? { roles, activeRole } : null;
}
