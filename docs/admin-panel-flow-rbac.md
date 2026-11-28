# Admin Panel RBAC — Clean Light

## Status
Draft implementation for PR #13. No database migration has been applied. The SQL in `database/drafts/admin-rbac.sql` is a review artifact, not an executable numbered migration.

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
| Verify seller applications | Yes | Yes | No | No |
| Invite sellers | Yes | Yes | No | No |
| Read orders | Yes | Yes | Yes | No |
| Manage order operations | Yes | Yes | No | No |
| Read finance | Yes | Yes | Yes | No |
| Manage finance operations | Yes | No | Yes | No |
| Read audit log | Yes | Yes | No | No |

## Implemented in this PR
- Server-only `getAdminAccess()` reads the authenticated user and denies inactive, missing or unauthorized accounts.
- Deny-by-default permission matrix and access-resolution tests cover all four proposed roles, inactive/missing users, malformed roles and unknown roles.
- Existing Admin dashboard, catalog and seller-verification pages have server-side page guards.
- Existing seller invitation and seller-verification GET/PATCH handlers have server-side API guards.
- Seller verification remains Admin/Super Admin only; the current database review function and RLS enforce the same restriction.
- GitHub Actions run #416 passed on commit `d68c69c`: install, lint, typecheck, unit tests and Next.js build all succeeded. The subsequent seller-invitation response fix is being revalidated on the current head.

## Security boundaries and remaining work
- Existing `app_is_admin()` remains limited to `admin` and `super_admin`; legacy broad RLS policies do not grant Finance or Moderator extra database access.
- Finance and Moderator are not accepted by the current database role constraint. Their UI/access must remain unavailable until a separately reviewed database/RLS rollout.
- The draft SQL permission predicate mirrors the application matrix; it is not deployed and does not grant route access by itself.
- Role assignment must be restricted to Super Admin and audited. No self-service role escalation.
- Audit entries should be written server-side for role changes, seller decisions, catalog moderation and finance mutations. Do not log secrets, payment credentials or full personal data.
- HTTP route-level integration tests against isolated authenticated role fixtures and a complete review of every admin action are still required before merge. The current policy tests validate access resolution but do not replace HTTP integration tests.
- Production migration, merge and deployment require separate explicit approval.


## Cloudflare build note
- Cloudflare build `cd888b25-27c9-40e2-bad4-2f2dc96e9238` for older commit `7d59baf` failed during Next.js TypeScript validation: the `Row` type returned by `getCurrentUser()` was incompatible with `AdminUserForAccess` because `status` was required. This was corrected in commit `7366795`; GitHub CI #416 subsequently passed the same typecheck and build stages on `d68c69c`.
- That Cloudflare run stopped before the configured `wrangler preview` deploy command, so it did not create a deployment. A fresh Cloudflare build on the current commit still needs confirmation. No Preview configuration or Worker was changed.
