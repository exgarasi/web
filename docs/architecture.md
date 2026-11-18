# EXGARASI Marketplace Architecture

## Business decisions
- Model: hybrid marketplace (EXGARASI-owned inventory + invited partner sellers)
- Seller onboarding: invitation-only; admin approval required
- Monetization: commission on completed partner-store sales
- Launch vertical: automotive (diecast, parts, accessories, lifestyle)
- Architecture: modular monolith first; split services only when operationally justified

## Application topology
- Web: Next.js + TypeScript, responsive storefront and role-specific dashboards
- MVP runtime: standard Node.js hosting for Next.js (Vercel, Railway, Render, or equivalent); Cloudflare provides DNS, CDN, WAF and R2
- Future runtime option: Cloudflare Workers + Hyperdrive after validating request-scoped PostgreSQL connections and Better Auth adapter lifecycle
- API: server-side application modules; never trust client-submitted prices, roles, stock, or payment status
- Database: managed PostgreSQL; Drizzle ORM for Better Auth and versioned SQL migrations (raw SQL is authoritative)
- Media: Cloudflare R2 with short-lived presigned upload URLs
- Async work: Cloudflare Queues for notifications, image processing, webhook follow-ups
- External integrations: marketplace-capable payment provider, shipping aggregator, email provider
- Observability: structured logs, error tracking, uptime checks, database backups

## Domain modules
1. Identity & access: users, sessions, role assignments, store membership, authorization
2. Seller & stores: invitations, verification, store profile and status
3. Catalog: categories, brands, master products, store listings, vehicle fitments
4. Inventory: stock balances, reservations, immutable stock movements
5. Commerce: carts, parent orders, seller sub-orders, order items
6. Payments: payment attempts, verified webhook events, refunds
7. Finance: commission rules, immutable ledger, seller payable balances, payouts
8. Logistics: shipments, shipment items, tracking events
9. Trust & safety: reviews, disputes, moderation, audit log

## Hybrid marketplace rules
- EXGARASI Official is represented by a store with store_type = 'official'.
- Partner stores use store_type = 'partner' and must be invited and approved.
- Every listing belongs to exactly one store. Inventory is owned by that store.
- A parent order may contain items from multiple stores. Create one sub-order per store.
- Partner commission applies only to eligible partner-store item amounts. Official-store sales are retail revenue, not marketplace commission.
- Store-scoped queries must enforce authorization on the server and preferably PostgreSQL row-level security for sensitive tables.
- Seller SKU is unique within a store; master product IDs are not seller SKUs.

## Transaction invariants
- Store money as integer minor units (IDR rupiah in this deployment; no floating point).
- Calculate price, discounts, shipping, fees, and commission on the server.
- Reserve inventory atomically in a database transaction using row locks or conditional updates.
- Payment status changes only after signature-verified provider webhooks or trusted reconciliation.
- Webhook event IDs and idempotency keys must be unique.
- A checkout creates a parent order and store sub-orders in one database transaction.
- Financial events are append-only ledger entries; never overwrite a historical balance event.
- Refunds and payout reversals create compensating ledger entries.
- Never hold customer funds in an ordinary EXGARASI bank account without a legally reviewed, provider-approved marketplace funds-flow arrangement.

## Suggested deployment environments
- local: local PostgreSQL and local object storage emulator or development R2 bucket
- preview: isolated preview database and test payment credentials
- production: managed PostgreSQL, production R2 bucket, production payment credentials
- Secrets are environment variables/secrets manager only; never commit .env files.

## Initial domain boundaries
Use a modular monolith with modules under src/modules. Keep payment and shipping providers behind adapters. Use an outbox/queue pattern for notifications and non-critical background work. Do not introduce microservices in the MVP.

## MVP acceptance gates
- Role and store isolation tests pass.
- Inventory cannot go negative under concurrent checkout tests.
- Duplicate webhooks cannot duplicate payments, stock movements, commissions, or payouts.
- Multi-store checkout creates exactly one parent order and one sub-order per store.
- Refund and payout reconciliation is auditable.
- Backup restoration has been tested before production launch.
