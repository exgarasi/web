# EXGARASI Implementation Plan

## Stage 0 — Project foundation
- [x] Confirm hybrid model, invite-only sellers, commission revenue, automotive launch
- [x] Locate GitHub repository and create isolated feature branch
- [x] Add initial architecture and database foundation
- [ ] Select managed PostgreSQL provider and create dev/preview/prod environments
- [ ] Select authentication approach and implement sessions
- [ ] Add migration runner, lint, typecheck, unit tests and CI

## Stage 1 — Identity and seller onboarding
- Buyer registration and verification
- Admin and support roles
- Invitation tokens stored as hashes, expiry and one-time acceptance
- Store creation, owner membership and verification workflow
- Server-side RBAC and store-level authorization tests

## Stage 2 — Catalog and inventory
- Automotive taxonomy and brands
- Master product and store listing separation
- Seller SKU uniqueness per store
- Listing moderation and image upload to R2
- Atomic stock reservation, release, sale and adjustment
- Vehicle compatibility attributes for parts/accessories

## Stage 3 — Marketplace commerce
- Cart validation and server-side price calculation
- Multi-store checkout with parent order and one sub-order per store
- Payment adapter and signed webhook verification
- Idempotent payment processing
- Shipping quotes, labels and tracking adapter
- Cancellation and refund workflow

## Stage 4 — Marketplace finance
- Effective-dated commission rules
- Immutable ledger and reconciliation reports
- Seller payable calculation
- Provider-supported split settlement/payout flow
- Payout approval and audit trail
- Finance and dispute dashboards

## Stage 5 — User interfaces
- Public storefront and search
- Buyer account, checkout and order tracking
- Seller dashboard, products, inventory, orders and finance
- Admin dashboard, seller invitations, moderation and reports

## Stage 6 — Production readiness
- Authorization and tenant-isolation tests
- Concurrent checkout and overselling tests
- Webhook replay and idempotency tests
- Refund and payout reconciliation tests
- Security review, rate limiting and abuse protection
- Backup restore drill, monitoring and incident runbooks
- Pilot with 5–10 invited sellers before public expansion

## Non-negotiable acceptance criteria
1. A seller cannot read or mutate another store's private data.
2. Client requests cannot set authoritative price, commission, order status or payment status.
3. Concurrent checkout cannot produce negative available stock.
4. Replayed webhooks cannot duplicate financial or inventory events.
5. Multi-store checkout is atomic and produces one seller sub-order per participating store.
6. Every financial movement is traceable to a source event and idempotency key.
7. Production payout flow is approved by the selected payment provider and reviewed for Indonesian regulatory obligations.
