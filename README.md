# EXGARASI Marketplace

EXGARASI is a hybrid automotive marketplace for EXGARASI Official inventory and invited partner sellers.

## Product model
- Hybrid marketplace: EXGARASI Official + partner stores
- Seller onboarding: invitation-based, with admin review/approval
- Initial vertical: automotive (diecast, parts, accessories and lifestyle)
- Revenue model: commission on eligible completed partner-store sales

## Application stack
- Next.js App Router, React and TypeScript
- Tailwind CSS and Lucide icons
- Better Auth with PostgreSQL-backed sessions
- PostgreSQL via Cloudflare Hyperdrive and Drizzle ORM
- Cloudflare Workers with the OpenNext adapter
- Cloudflare R2 for product media

## Repository structure
- `src/app/`: pages, layouts, route handlers and route-specific UI
- `src/components/`: shared UI components
- `src/lib/`: authentication, request context and shared server utilities
- `src/db/`: database and auth schema access
- `database/`: ordered SQL migrations and database smoke tests
- `docs/`: architecture, deployment and implementation notes
- `scripts/`: controlled maintenance tasks such as the migration runner
- `.github/workflows/`: CI validation and explicitly scoped Preview deployment

This is a modular monolith. Keep domain logic in the existing application structure until a real maintenance need justifies introducing additional module boundaries. Do not create duplicate apps or parallel implementations.

## Environments and deployment safety
- Development database: Supabase EXGARASI-dev
- Preview Worker: `exgarasi-preview`, configured with the Preview R2 bucket
- Production Worker and production resources must remain isolated from Preview changes.
- Preview deployment is scoped to the `feat/seller-csv-import-persistence` branch and Wrangler `--env preview`.
- Never merge to the production branch, deploy the root Wrangler environment, or apply development migrations to Production without explicit approval.

## Database change policy
SQL files in `database/` are ordered migration history. Keep applied migration files immutable, even if a later migration corrects or supersedes earlier behavior. Add a new numbered migration for subsequent schema changes. Do not delete or rename applied migrations to make the directory look cleaner.

The development database has migration history through migration `0017` according to the current project work. Confirm the actual Supabase migration ledger before applying any migration; never infer database state from filenames alone. The custom migration runner requires `MIGRATION_DATABASE_URL` and must not use application runtime credentials.

## Local development
1. Install dependencies with `npm install`.
2. Create local-only `.dev.vars` from `.dev.vars.example`; never commit real credentials.
3. Run `npm run dev` for the Next.js development server.
4. Run `npm run cf:preview` to build and test the Workers runtime locally.

## Quality checks
- `npm run lint`
- `npm run typecheck`
- `npm run build`

GitHub Actions runs validation separately from the Preview deployment workflow.

## Current implementation scope
The repository includes the storefront foundation, buyer authentication, seller invitation/verification flows, admin interfaces, cart foundation, and seller bulk CSV listing workflows. Checkout/payment, shipping, refunds, finance settlement, full catalog operations and production hardening remain release work.

See:
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Implementation plan](docs/implementation-plan.md)
- [Seller bulk products](docs/seller-bulk-products.md)
