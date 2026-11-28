# EXGARASI Marketplace Architecture

## Product decisions
- Hybrid marketplace: EXGARASI-owned inventory plus invited partner sellers
- Seller onboarding is invitation-based and subject to admin review
- Initial vertical: automotive (diecast, parts, accessories and lifestyle)
- Commission applies to eligible completed partner-store sales
- Architecture: modular monolith; do not split into services without an operational reason

## Runtime topology
- Web application: Next.js App Router, React and TypeScript
- Runtime: Cloudflare Workers using the OpenNext adapter
- Database: managed PostgreSQL on Supabase, reached server-side through Cloudflare Hyperdrive
- ORM/schema access: Drizzle ORM and Better Auth adapter; ordered SQL migrations remain authoritative for database changes
- Media: Cloudflare R2; listing records store object keys and the application resolves public media URLs through runtime configuration
- CI: GitHub Actions validation workflow
- Preview deployment: separate workflow, explicitly scoped to the Preview Wrangler environment

## Existing repository boundaries
- `src/app/`: route pages, layouts, API route handlers and route-specific UI
- `src/components/`: shared presentation components
- `src/lib/`: authentication, current-user resolution, database context and shared utilities
- `src/db/`: database and authentication schema definitions
- `database/`: ordered SQL migrations and database smoke tests
- `scripts/`: operational scripts, including the guarded migration runner
- `docs/`: maintained project documentation

Keep the current structure coherent. Extract a domain module only when it reduces real coupling; do not create empty folders or duplicate abstractions merely to match a proposed architecture.

## Domain responsibilities
1. Identity and access: users, sessions, role assignments, store membership and authorization
2. Sellers and stores: invitations, verification, store profile and status
3. Catalog: categories, brands, master products, store listings and vehicle fitments
4. Inventory: stock balances, reservations and immutable stock movements
5. Commerce: carts, parent orders, seller sub-orders and order items
6. Payments: payment attempts, verified webhook events and refunds
7. Finance: commission rules, immutable ledger, seller payable balances and payouts
8. Logistics: shipments, shipment items and tracking events
9. Trust and safety: reviews, disputes, moderation and audit log

These are logical domain boundaries, not a requirement to create a separate service or folder for every domain today.

## Marketplace invariants
- EXGARASI Official is represented by a store with `store_type = 'official'`.
- Partner stores use `store_type = 'partner'` and must pass the invitation and approval process.
- Every listing belongs to exactly one store; inventory belongs to that store.
- Seller SKU is unique within a store; master product IDs are not seller SKUs.
- A future parent order may contain items from multiple stores, with one sub-order per store.
- Partner commission applies only to eligible partner-store amounts. Official-store sales are retail revenue.

## Transaction and security invariants
- Store money as integer minor units; do not use floating point for money.
- Calculate price, discounts, shipping, fees and commission on the server.
- Never trust client-submitted roles, stock, prices or payment status.
- Enforce authorization on the server and PostgreSQL row-level security for protected data.
- Reserve inventory atomically using transactions, row locks or conditional updates.
- Change payment status only after signature-verified provider webhooks or trusted reconciliation.
- Use unique webhook event IDs and idempotency keys.
- Treat financial events as append-only ledger entries; reversals create compensating entries.
- Do not process real customer funds until the provider funds-flow model and Indonesian regulatory requirements have been reviewed.

## Environment separation
- Local development uses local-only variables and a development database/resource set.
- Preview uses the dedicated `exgarasi-preview` Worker and `exgarasi-media-preview` bucket. Preview database access must remain development/test scoped.
- Production resources are separate and must not be changed by Preview work.
- Secrets belong in the appropriate encrypted runtime secret store; never commit real credentials.

## Release gates
- Role and store-isolation tests pass using the non-owner runtime database role.
- Inventory cannot become negative under concurrent operations.
- Duplicate webhooks cannot duplicate payments, stock movements, commissions or payouts.
- Multi-store checkout is atomic and creates one sub-order per participating store.
- Refund and payout reconciliation is auditable.
- Backup restoration, monitoring and incident procedures are tested before production launch.
