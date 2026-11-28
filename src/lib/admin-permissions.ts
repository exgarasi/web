import "server-only";

import { getCurrentUser } from "@/lib/current-user";
import { resolveAdminRole } from "@/lib/admin-access-policy";
import type { AdminPermission } from "@/lib/admin-role-permissions";

export type { AdminPermission } from "@/lib/admin-role-permissions";

export type AdminAccess = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  roles: string[];
  activeRole: string;
};

export async function getAdminAccess(permission: AdminPermission): Promise<AdminAccess | null> {
  const user = await getCurrentUser();
  const authorization = resolveAdminRole(user, permission);
  if (!user || !authorization) return null;

  return { user, ...authorization };
}
