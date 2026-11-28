# EXGARASI Implementation Plan

## Stage 0 — Project foundation
- [x] Confirm hybrid model, invite-only sellers, commission revenue, automotive launch
- [x] Locate GitHub repository and create isolated feature branch
- [x] Add initial architecture and database foundation
- [x] Add ordered SQL migration runner and CI workflow (CI execution still pending)
- [x] Use the existing Supabase-managed PostgreSQL project `EXGARASI-dev` for the current build; no additional environments or paid resources
- [x] Select Better Auth and implement PostgreSQL-backed sessions
- [ ] Complete automated unit, integration and RLS isolation tests

## Stage 1 — Identity and seller onboarding
- [x] Buyer email/password registration and sign-in
- [x] Production email verification integration hook (requires verified Resend sender and credentials)
- [x] Admin/super-admin authorization gate; initial super-admin is provisioned by database operator
- [x] Invitation tokens stored as hashes, seven-day expiry and atomic one-time acceptance
- [x] Partner store creation and owner membership on invitation acceptance
- [ ] Seller KYC/document review and admin approval interface
- [x] Server-side role checks and baseline PostgreSQL RLS policies
- [ ] Automated tenant-isolation tests with two sellers and the actual non-owner runtime role

## Stage 2 — Catalog and inventory
- [x] Master product and store listing database separation
- [x] Seller SKU uniqueness per store
- [x] Inventory rows created automatically for new listings
- [x] Atomic stock adjustment, reservation, release and consumption functions
- [x] Inventory and order indexes
- [ ] Automotive taxonomy, brand and vehicle-fitment management UI
- [ ] Listing moderation and image upload to R2
- [ ] Seller catalog and inventory management screens

## Stage 3 — Marketplace commerce
- [ ] Cart validation and server-side price calculation
- [ ] Multi-store checkout with parent order and one sub-order per store
- [ ] Payment adapter and signed webhook verification
- [ ] Idempotent payment processing
- [ ] Shipping quotes, labels and tracking adapter
- [ ] Cancellation and refund workflow

## Stage 4 — Marketplace finance
- [ ] Effective-dated commission rules in operational workflows
- [ ] Immutable ledger and reconciliation reports
- [ ] Seller payable calculation
- [ ] Provider-supported split settlement/payout flow
- [ ] Payout approval and audit trail
- [ ] Finance and dispute dashboards

## Stage 5 — User interfaces
- [x] Public EXGARASI landing page
- [x] Buyer registration, sign-in and initial order-history dashboard
- [x] Seller invitation acceptance and initial store dashboard
- [x] Admin dashboard metrics and seller invitation form
- [ ] Full buyer account, checkout and order tracking
- [ ] Seller products, inventory, orders and finance management
- [ ] Admin seller verification, moderation, order operations and reports

## Stage 6 — Production readiness
- [ ] Run CI and fix all lint, typecheck and build failures
- [ ] Authorization and tenant-isolation tests
- [ ] Concurrent checkout and overselling tests
- [ ] Webhook replay and idempotency tests
- [ ] Refund and payout reconciliation tests
- [ ] Security review, rate limiting and abuse protection
- [ ] Backup restore drill, monitoring and incident runbooks
- [ ] Pilot with 5–10 invited sellers before public expansion

## Non-negotiable acceptance criteria
1. A seller cannot read or mutate another store's private data.
2. Client requests cannot set authoritative price, commission, order status or payment status.
3. Concurrent checkout cannot produce negative available stock.
4. Replayed webhooks cannot duplicate financial or inventory events.
5. Multi-store checkout is atomic and produces one seller sub-order per participating store.
6. Every financial movement is traceable to a source event and idempotency key.
7. Production payout flow is approved by the selected payment provider and reviewed for Indonesian regulatory obligations.
