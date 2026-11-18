# EXGARASI Marketplace

Hybrid automotive marketplace for EXGARASI Official inventory and invited partner sellers.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- Cloudflare Workers deployment target (adapter decision and compatibility validation required)
- Cloudflare R2 for product media

## Current status
This repository is a greenfield foundation. The public landing page and initial architecture/database documents are being established. Authentication, production database provisioning, payment, shipping, seller dashboard and checkout are not yet implemented.

## Local development
1. Install Node.js LTS compatible with the selected Next.js release.
2. Copy `.env.example` to `.env.local` and set local PostgreSQL credentials.
3. Install dependencies with `npm install`.
4. Start the app using `npm run dev`.

## Quality checks
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Database
Initial PostgreSQL schema: `database/0001_marketplace_foundation.sql`.
Apply it only to a disposable local development database first. Review the schema, add security policies and tested transactional functions, then manage all later changes through versioned migrations.

## Important
- Never commit secrets or production credentials.
- Never treat browser-side totals or payment return URLs as authoritative.
- Production payments/payouts require a provider-approved marketplace funds flow and legal/compliance review.
- Read `docs/architecture.md` and `docs/implementation-plan.md` before implementation.
