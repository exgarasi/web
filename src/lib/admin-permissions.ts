import "server-only";

import { getCurrentUser } from "@/lib/current-user";
import { roleHasPermission, type AdminPermission } from "@/lib/admin-role-permissions";

export type { AdminPermission } from "@/lib/admin-role-permissions";

export type AdminAccess = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  roles: string[];
  activeRole: string;
};

export async function getAdminAccess(permission: AdminPermission): Promise<AdminAccess | null> {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") return null;

  const roles = Array.isArray(user.roles)
    ? user.roles.filter((role): role is string => typeof role === "string")
    : [];
  const activeRole = ["super_admin", "admin", "finance", "moderator"].find(
    (role) => roles.includes(role) && roleHasPermission(role, permission),
  );

  if (!activeRole) return null;
  return { user, roles, activeRole };
}
