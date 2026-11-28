import "server-only";

import { getCurrentUser } from "@/lib/current-user";

export type AdminPermission =
  | "dashboard.read"
  | "users.manage"
  | "roles.manage"
  | "catalog.read"
  | "catalog.write"
  | "catalog.moderate"
  | "sellers.read"
  | "sellers.invite"
  | "sellers.verify"
  | "orders.read"
  | "orders.manage"
  | "finance.read"
  | "finance.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<string, readonly AdminPermission[]> = {
  super_admin: [
    "dashboard.read", "users.manage", "roles.manage", "catalog.read",
    "catalog.write", "catalog.moderate", "sellers.read", "sellers.invite",
    "sellers.verify", "orders.read", "orders.manage", "finance.read",
    "finance.manage", "audit.read",
  ],
  admin: [
    "dashboard.read", "users.manage", "catalog.read", "catalog.write",
    "catalog.moderate", "sellers.read", "sellers.invite", "sellers.verify",
    "orders.read", "orders.manage", "finance.read", "audit.read",
  ],
  finance: ["dashboard.read", "orders.read", "finance.read", "finance.manage"],
  moderator: ["dashboard.read", "catalog.read", "catalog.moderate", "sellers.read", "sellers.verify"],
};

export type AdminAccess = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  roles: string[];
  activeRole: string;
};

export async function getAdminAccess(permission: AdminPermission): Promise<AdminAccess | null> {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") return null;

  const roles = Array.isArray(user.roles) ? user.roles.filter((role): role is string => typeof role === "string") : [];
  const activeRole = ["super_admin", "admin", "finance", "moderator"].find(
    (role) => roles.includes(role) && ROLE_PERMISSIONS[role]?.includes(permission),
  );

  if (!activeRole) return null;
  return { user, roles, activeRole };
}
