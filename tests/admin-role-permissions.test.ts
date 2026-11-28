import test from "node:test";
import assert from "node:assert/strict";
import { roleHasPermission } from "../src/lib/admin-role-permissions";

test("super admin receives all defined admin permissions", () => {
  for (const permission of [
    "dashboard.read", "users.manage", "roles.manage", "catalog.read", "catalog.write",
    "catalog.moderate", "sellers.admin", "sellers.read", "sellers.invite", "sellers.verify",
    "orders.read", "orders.manage", "finance.read", "finance.manage", "audit.read",
  ] as const) assert.equal(roleHasPermission("super_admin", permission), true);
});

test("admin cannot assign privileged roles or manage finance", () => {
  assert.equal(roleHasPermission("admin", "dashboard.read"), true);
  assert.equal(roleHasPermission("admin", "roles.manage"), false);
  assert.equal(roleHasPermission("admin", "finance.manage"), false);
});

test("finance is limited to dashboard, orders read and finance", () => {
  assert.equal(roleHasPermission("finance", "dashboard.read"), true);
  assert.equal(roleHasPermission("finance", "orders.read"), true);
  assert.equal(roleHasPermission("finance", "finance.manage"), true);
  assert.equal(roleHasPermission("finance", "catalog.read"), false);
  assert.equal(roleHasPermission("finance", "orders.manage"), false);
  assert.equal(roleHasPermission("finance", "users.manage"), false);
});

test("moderator is limited to catalog moderation and seller read", () => {
  assert.equal(roleHasPermission("moderator", "catalog.read"), true);
  assert.equal(roleHasPermission("moderator", "catalog.moderate"), true);
  assert.equal(roleHasPermission("moderator", "sellers.read"), true);
  assert.equal(roleHasPermission("moderator", "sellers.verify"), false);
  assert.equal(roleHasPermission("moderator", "sellers.admin"), false);
  assert.equal(roleHasPermission("moderator", "orders.read"), false);
});

test("unknown roles and unknown permissions fail closed", () => {
  assert.equal(roleHasPermission("buyer", "dashboard.read"), false);
  assert.equal(roleHasPermission("support", "orders.read"), false);
  assert.equal(roleHasPermission("root", "roles.manage"), false);
});
