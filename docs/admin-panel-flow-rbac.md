# Admin Panel RBAC — Clean Light

## Status
Draft implementation plan for PR #13. No database migration has been applied. The SQL in `database/drafts/admin-rbac.sql` is a review artifact, not an executable numbered migration.

## Roles and least-privilege matrix

| Capability | Super Admin | Admin | Finance | Moderator |
|---|---:|---:|---:|---:|
| Dashboard overview | Yes | Yes | Yes | Yes |
| Manage user accounts | Yes | Yes | No | No |
| Assign/change privileged roles | Yes | No | No | No |
| Read catalog | Yes | Yes | No | Yes |
| Create/edit catalog | Yes | Yes | No | No |
| Moderate catalog | Yes | Yes | No | Yes |
| Read seller applications | Yes | Yes | No | Yes |
| Verify seller applications | Yes | Yes | No | No* |
| Invite sellers | Yes | Yes | No | No |
| Read orders | Yes | Yes | Yes | No |
| Manage order operations | Yes | Yes | No | No |
| Read finance | Yes | Yes | Yes | No |
| Manage finance operations | Yes | No | Yes | No |
| Read audit log | Yes | Yes | No | No |

## Security boundaries
- Existing `app_is_admin()` remains limited to `admin` and `super_admin`. Existing broad RLS policies therefore do not grant Finance or Moderator extra database access.
- The draft adds a role allow-list and a permission predicate. It does not grant route access by itself.
- Every Server Component route, Server Action, Route Handler and data mutation must check the relevant permission server-side. Hiding a navigation item is not authorization.
- Finance and Moderator must remain blocked from routes/actions without a permission check and purpose-built data access.
- Role assignment must be restricted to Super Admin and audited. No self-service role escalation.
- Audit entries should be written server-side for role changes, seller decisions, catalog moderation and finance mutations. Do not log secrets, payment credentials or full personal data.
- The initial dashboard is limited to currently supported roles until the role constraint and all route/action guards are deployed together.
- Moderator seller verification is intentionally disabled: the current database review function and RLS still require `admin` or `super_admin`.

## Required verification before merge
1. Add server-only permission helper that reads roles from `getCurrentUser()` and denies by default.
2. Protect every existing admin page and every mutation/action/API endpoint.
3. Add tests for each role, unauthenticated users, unknown roles, and direct URL/action invocation. The permission-matrix unit tests are now included; route-level integration tests remain required.
4. Validate SQL against a disposable development database and inspect grants/RLS.
5. Only after explicit approval, apply a numbered migration to the intended environment.
6. Run lint, typecheck, tests and production build; keep Production deployment separate and explicitly approved.
