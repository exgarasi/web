export type AdminRole = "super_admin" | "admin" | "finance" | "moderator";

export type AdminPermission =
  | "dashboard.read" | "users.manage" | "roles.manage"
  | "catalog.read" | "catalog.write" | "catalog.moderate"
  | "sellers.admin" | "sellers.read" | "sellers.invite" | "sellers.verify"
  | "orders.read" | "orders.manage" | "finance.read" | "finance.manage" | "payments.verify" | "audit.read";

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: [
    "dashboard.read", "users.manage", "roles.manage", "catalog.read", "catalog.write",
    "catalog.moderate", "sellers.admin", "sellers.read", "sellers.invite", "sellers.verify",
    "orders.read", "orders.manage", "finance.read", "finance.manage", "payments.verify", "audit.read",
  ],
  admin: [
    "dashboard.read", "users.manage", "catalog.read", "catalog.write", "catalog.moderate",
    "sellers.admin", "sellers.read", "sellers.invite", "sellers.verify",
    "orders.read", "orders.manage", "finance.read", "payments.verify", "audit.read",
  ],
  finance: ["dashboard.read", "orders.read", "finance.read", "finance.manage"],
  // Seller review remains admin-only until the database review function and RLS are safely extended.
  moderator: ["dashboard.read", "catalog.read", "catalog.moderate", "sellers.read"],
};

export function roleHasPermission(role: string, permission: AdminPermission): boolean {
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)
    && ROLE_PERMISSIONS[role as AdminRole].includes(permission);
}
