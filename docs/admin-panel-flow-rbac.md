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
- GitHub Actions run #410 passed on commit `2966719`; additional access-resolution tests were then added and require a fresh CI run on the latest commit.

## Security boundaries and remaining work
- Existing `app_is_admin()` remains limited to `admin` and `super_admin`; legacy broad RLS policies do not grant Finance or Moderator extra database access.
- Finance and Moderator are not accepted by the current database role constraint. Their UI/access must remain unavailable until a separately reviewed database/RLS rollout.
- The draft SQL permission predicate mirrors the application matrix; it is not deployed and does not grant route access by itself.
- Role assignment must be restricted to Super Admin and audited. No self-service role escalation.
- Audit entries should be written server-side for role changes, seller decisions, catalog moderation and finance mutations. Do not log secrets, payment credentials or full personal data.
- HTTP route-level integration tests against isolated authenticated role fixtures and a complete review of every admin action are still required before merge. The current policy tests validate access resolution but do not replace HTTP integration tests.
- Production migration, merge and deployment require separate explicit approval.


## Cloudflare build note
- The repository's Cloudflare build trigger attempted a Preview build for this branch, but the build stopped after the OpenNext build succeeded because `wrangler preview` requires a `previews` block that is not present in the current Wrangler configuration.
- The Preview build did not create a deployment. Do not add Preview configuration or create a Worker until separately approved.
