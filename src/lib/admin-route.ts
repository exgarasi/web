import type { AdminPermission } from "@/lib/admin-role-permissions";

export function createAdminRoute<Access, Args extends unknown[]>(
  permission: AdminPermission,
  resolveAccess: (permission: AdminPermission) => Promise<Access | null>,
  handler: (request: Request, access: Access, ...args: Args) => Promise<Response>,
): (request: Request, ...args: Args) => Promise<Response> {
  return async (request, ...args) => {
    const access = await resolveAccess(permission);
    if (!access) return Response.json({ error: "Forbidden." }, { status: 403 });
    return handler(request, access, ...args);
  };
}
