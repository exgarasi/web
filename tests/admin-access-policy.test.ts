import test from "node:test";
import assert from "node:assert/strict";
import { resolveAdminRole } from "../src/lib/admin-access-policy";

test("rejects unauthenticated and inactive users", () => {
  assert.equal(resolveAdminRole(null, "dashboard.read"), null);
  assert.equal(resolveAdminRole({ status: "suspended", roles: ["super_admin"] }, "dashboard.read"), null);
});

test("rejects active users without an allowed admin role", () => {
  assert.equal(resolveAdminRole({ status: "active", roles: ["buyer", "seller", "support"] }, "dashboard.read"), null);
});

test("resolves a role that grants the requested permission", () => {
  assert.deepEqual(resolveAdminRole({ status: "active", roles: ["finance"] }, "finance.manage"), {
    roles: ["finance"], activeRole: "finance",
  });
});

test("Finance cannot access catalog or seller administration", () => {
  assert.equal(resolveAdminRole({ status: "active", roles: ["finance"] }, "catalog.read"), null);
  assert.equal(resolveAdminRole({ status: "active", roles: ["finance"] }, "sellers.admin"), null);
});

test("Moderator cannot review seller verification or manage orders", () => {
  assert.equal(resolveAdminRole({ status: "active", roles: ["moderator"] }, "sellers.admin"), null);
  assert.equal(resolveAdminRole({ status: "active", roles: ["moderator"] }, "orders.manage"), null);
  assert.deepEqual(resolveAdminRole({ status: "active", roles: ["moderator"] }, "catalog.moderate"), {
    roles: ["moderator"], activeRole: "moderator",
  });
});

test("ignores malformed role values", () => {
  assert.equal(resolveAdminRole({ status: "active", roles: [null, 42, "buyer"] }, "dashboard.read"), null);
});
