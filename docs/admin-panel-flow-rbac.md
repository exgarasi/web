# EXGARASI Admin Panel — Flow & RBAC

## Product direction
- Existing route: `/admin/dashboard`
- Visual system: Clean Light (white surfaces, neutral gray borders/text, EXGARASI blue accent).
- Do not create a new Worker or Preview environment.
- Do not deploy from this branch automatically.
- No production database migrations or schema changes without explicit approval.

## Roles and responsibilities

| Role | Intended scope |
|---|---|
| Super Admin | Full access; manage admin roles, security, marketplace settings and audit records |
| Admin | Marketplace operations: users, sellers, catalog, orders and shipping |
| Finance | Payment verification, refunds, commissions, settlements and financial reports |
| Moderator | Seller and product review, listing moderation and content reports |

## Admin workflow
1. Sign in using the existing authentication flow.
2. Server verifies the user's assigned admin role.
3. Dashboard shows operational overview and the current role.
4. Navigation is filtered by permission, not merely hidden in the UI; every route and server action must repeat authorization.
5. Sensitive actions create an audit record with actor, action, target, timestamp and outcome.
6. Role changes require Super Admin authorization and should invalidate/re-evaluate existing sessions.

## Module access matrix (target)

| Module | Super Admin | Admin | Finance | Moderator |
|---|---:|---:|---:|---:|
| Dashboard overview | Full | Read | Finance summary | Moderation summary |
| Users | Manage | Manage | — | — |
| Seller verification | Manage | Manage | — | Review |
| Product/catalog moderation | Manage | Manage | — | Manage |
| Orders | Manage | Manage | Read | Read |
| Payments/refunds | Manage | Read status | Manage | — |
| Commission/settlement | Manage | Read | Manage | — |
| Shipping | Manage | Manage | Read | — |
| Reports | Full | Operations | Finance | Moderation |
| Admin roles/security | Manage | — | — | — |
| Audit log | Full | Operations subset | Finance subset | Moderation subset |

## Implementation status and safety boundary
- Dashboard remains on the existing route and uses the existing Clean Light layout.
- Dashboard now resolves and displays one of the four intended role labels if that role is already present in the user's existing `roles` claim.
- This is a UI/access preparation only. It does **not** provision Finance or Moderator users, change role storage, or establish complete module-level authorization.
- Existing catalog authorization remains limited to the currently supported `admin` and `super_admin` roles.
- Full RBAC enforcement requires a reviewed permission source, server-side route/action guards, audit logging and tests. Do not infer permissions from a client-side menu.
- No database migrations, production data changes, Worker creation or Preview creation are part of this work.
- Before merge/deployment: verify the actual role claim format, implement permission checks for each route/action, add negative authorization tests for all four roles, and run lint/typecheck/build.
