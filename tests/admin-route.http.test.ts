import test from "node:test";
import assert from "node:assert/strict";
import { createAdminRoute } from "../src/lib/admin-route";
import { roleHasPermission, type AdminPermission } from "../src/lib/admin-role-permissions";

type Role = "super_admin" | "admin" | "finance" | "moderator" | "buyer";
const permissions: AdminPermission[] = ["sellers.admin", "sellers.invite"];

async function invoke(role: Role | null, permission: AdminPermission, method: string) {
  let reachedHandler = false;
  const route = createAdminRoute(
    permission,
    async (requested) => role && roleHasPermission(role, requested) ? { role } : null,
    async (request, access) => {
      reachedHandler = true;
      return Response.json({ method: request.method, role: access.role }, { status: method === "POST" ? 201 : 200 });
    },
  );
  const response = await route(new Request("https://preview.exgarasi.id/api/admin/test", { method }));
  return { response, reachedHandler };
}

test("seller verification GET/PATCH guard: only Admin and Super Admin pass", async () => {
  for (const role of ["super_admin", "admin"] as const) {
    for (const method of ["GET", "PATCH"]) {
      const { response, reachedHandler } = await invoke(role, "sellers.admin", method);
      assert.equal(response.status, 200);
      assert.equal(reachedHandler, true);
    }
  }
  for (const role of ["finance", "moderator", "buyer", null] as const) {
    const { response, reachedHandler } = await invoke(role, "sellers.admin", "GET");
    assert.equal(response.status, 403);
    assert.equal(reachedHandler, false);
  }
});

test("seller invitation POST guard: Admin and Super Admin pass; others fail closed", async () => {
  for (const role of ["super_admin", "admin"] as const) {
    const { response, reachedHandler } = await invoke(role, "sellers.invite", "POST");
    assert.equal(response.status, 201);
    assert.equal(reachedHandler, true);
  }
  for (const role of ["finance", "moderator", "buyer", null] as const) {
    const { response, reachedHandler } = await invoke(role, "sellers.invite", "POST");
    assert.equal(response.status, 403);
    assert.equal(reachedHandler, false);
  }
});
