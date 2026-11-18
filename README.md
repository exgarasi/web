# EXGARASI Marketplace

Hybrid automotive marketplace for EXGARASI Official inventory and invited partner sellers.

## Business model
- Hybrid: EXGARASI Official + partner stores
- Seller onboarding: invite-only and admin-approved
- Monetization: commission on completed partner-store sales
- Launch vertical: automotive (diecast, parts, accessories, lifestyle)

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Drizzle ORM (Better Auth adapter)
- Better Auth email/password sessions
- Cloudflare R2 for product media
- PostgreSQL row-level security for store and buyer isolation

## Repository status
The `feat/marketplace-foundation` branch contains the greenfield application foundation, SQL migrations, authentication, seller invitation flow, and initial buyer/seller/admin dashboards. This is an implementation branch, not a production-ready marketplace. Payment, shipping, order checkout, finance settlement, full catalog management and email delivery for seller invitations are still release work.

## Local setup
1. Provision PostgreSQL using the separate migrator and runtime roles in `docs/deployment.md`.
2. Copy `.env.example` to `.env.local` and configure both database URLs and `AUTH_SECRET`.
3. Install dependencies: `npm install`.
4. Apply SQL migrations: `npm run db:migrate`.
5. Apply the runtime table/column grants described in `docs/deployment.md`.
6. Start the app: `npm run dev`.

## Routes
- `/`: public landing page
- `/sign-up`: buyer registration
- `/sign-in`: account login
- `/account/dashboard`: buyer order history
- `/seller/accept-invitation?token=...`: seller onboarding
- `/seller/dashboard`: partner store overview
- `/admin/dashboard`: admin metrics and seller invitations

## Database
SQL files in `database/` are the authoritative ordered migrations (0001–0012 currently applied to EXGARASI-dev). Supabase migration history records managed migrations; `public.schema_migrations` is seeded to keep the custom runner from replaying migrations already applied to EXGARASI-dev. Never run the web app with the migration/owner credentials. The runtime role must not own tables and must not have `BYPASSRLS`.

## Quality checks
- `npm run lint`
- `npm run typecheck`
- `npm run build`

GitHub Actions runs these checks on pushes and pull requests. They still need to pass in the connected repository environment before deployment.

## Security and production gates
- Configure a verified sender domain and Resend credentials for production email verification.
- Test row-level security using two different seller accounts and the actual non-owner runtime database role.
- Add checkout, payment provider webhooks, shipping, refunds, ledger reconciliation and payout workflows.
- Add password recovery, rate limits, abuse protection, monitoring and backup restore drills.
- Confirm marketplace split-settlement capabilities and Indonesian regulatory requirements before processing real customer funds.

Read `docs/architecture.md`, `docs/implementation-plan.md`, and `docs/deployment.md` before deploying.
