# EXGARASI — Supabase managed PostgreSQL setup

## Deployment target

- Supabase managed PostgreSQL project, with separate development and production projects.
- EXGARASI Next.js 16 App Router deployed to Cloudflare Workers using the OpenNext adapter.
- Cloudflare Hyperdrive connects Workers to Supabase PostgreSQL using the dedicated `exgarasi_app` login.
- Cloudflare DNS, CDN, WAF and R2 remain available for media.
- The application connects to PostgreSQL only from trusted server code. Never expose database credentials or service-role keys in browser bundles.

## 1. Create Supabase projects

Create two projects in the Supabase dashboard:
1. `exgarasi-dev` for migrations, seed data and security tests.
2. `exgarasi-prod` for production, created only after dev verification.

Save each project's database password in a password manager. Never commit it to GitHub or paste it into source files.

For the initial migration, use the project's direct PostgreSQL connection if IPv6/network access permits, or the Supabase session pooler connection. Use a direct/session connection for DDL migrations; use the transaction pooler only for application runtime after verifying prepared statements and transaction behavior. This app uses postgres.js with `prepare: true`.

## 2. PostgreSQL roles and credential setup

The development project already contains two restricted roles:
- `exgarasi_app`: application runtime role; `NOBYPASSRLS`, not an owner of marketplace tables.
- `exgarasi_migrator`: reserved migration role; currently `NOLOGIN`. Schema changes are currently applied through the Supabase migration control plane.

The roles are intentionally created without passwords. Do not send database passwords in chat or commit them to GitHub. When ready to connect the Next.js server, generate a unique password in a password manager and set it directly in Supabase Dashboard → SQL Editor:

```sql
ALTER ROLE exgarasi_app
WITH LOGIN PASSWORD 'PASTE_A_NEW_RANDOM_PASSWORD_HERE';
```

The role was already verified to have `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false` and `rolbypassrls=false`. Do not try to alter the SUPERUSER attribute from the SQL Editor.

Use a long random password and keep it only in the password manager and the hosting provider's encrypted environment settings. Until this is done, the runtime role cannot authenticate over PostgreSQL. Do not use the Supabase `service_role` or a project-owner password as the application's normal database identity.

Migrations for the current development project have been applied with the Supabase managed migration tool. The `exgarasi_migrator` role is reserved for a later dedicated CI migration runner; do not enable LOGIN or assign it credentials until its object ownership and migration permissions are provisioned deliberately.

## 3. Configure Supabase Hyperdrive connection

1. In Supabase Dashboard → Connect, copy the **Direct connection** URI for EXGARASI-dev. Use the `exgarasi_app` role and the newly rotated password. Keep `sslmode=require`. Do not use the migration/owner credentials. If direct connectivity is unavailable from Hyperdrive, use the Supabase session pooler URI instead.
2. On a trusted local terminal, store the URI in a temporary environment variable (do not paste it into chat, source control, or a committed shell script). PowerShell example:

```powershell
$env:SUPABASE_DB_URL = "postgresql://exgarasi_app:URL_ENCODED_PASSWORD@HOST:5432/postgres?sslmode=require"
npx wrangler hyperdrive create exgarasi-dev --connection-string="$env:SUPABASE_DB_URL"
```

3. Wrangler returns a Hyperdrive ID. Replace `REPLACE_WITH_HYPERDRIVE_ID` in `wrangler.jsonc` with that ID. The binding is named `HYPERDRIVE` and is marked `remote: true` so local development uses the remote Hyperdrive resource.
4. The Cloudflare Hyperdrive connection string is stored by Cloudflare. Do not add the raw database URI to Worker variables or secrets as well.
5. Install dependencies and generate binding types:

```bash
npm install
npx wrangler types
npm run cf:build
npm run cf:preview
```

The Cloudflare Worker uses the `HYPERDRIVE.connectionString` binding through postgres.js. Hyperdrive owns the shared connection pool; the application creates a small request-scoped client with `max: 5`, `fetch_types: false` and `prepare: true`, and closes it after each operation. Do not set `prepare: false` with Hyperdrive.

## 4. Configure Worker secrets and runtime connection strings

Set secrets from a trusted terminal. Generate `AUTH_SECRET` as a random value of at least 32 characters. Use a verified sender domain before enabling production email verification:

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESEND_API_KEY
# Optional fallback provider; configure only after verifying the Brevo sender/domain.
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put APP_BASE_URL
npx wrangler secret put NEXT_PUBLIC_APP_URL
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in local values. Never commit `.dev.vars`.



In Supabase Dashboard → Project Settings → Database, copy the connection strings and set the username to the role created above. Use the host, port, database name and SSL settings shown by Supabase.

- `MIGRATION_DATABASE_URL`: leave unset for now; current development migrations are applied through Supabase's managed migration tool.
- Runtime PostgreSQL: Cloudflare `HYPERDRIVE` binding; raw database URI stays inside Hyperdrive configuration.
- `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL`: application origin.
- `AUTH_SECRET`: random secret with at least 32 characters.
- `RESEND_API_KEY` and `EMAIL_FROM`: verified sender configuration for production verification emails. Resend is primary; `BREVO_API_KEY` is optional and is used only when Resend returns a quota/rate-limit error.

Set secrets with `wrangler secret put`. Do not place real secrets in GitHub or `.env.example`.

## 5. Applied migrations and seller-verification rollout

Migrations 0001–0013 and 0014 are recorded as applied in EXGARASI-dev. Migration 0015 is a new security hardening migration and has not yet been applied. Apply it through the Supabase managed migration control plane in EXGARASI-dev, verify the function and grants, then record it in the migration history and `public.schema_migrations`. Do not apply it to production until the development validation passes.

Before applying migration 0014 to any other database, check for duplicate pending requests:

```sql
SELECT store_id, count(*) AS pending_count
FROM public.seller_verifications
WHERE status = 'pending'
GROUP BY store_id
HAVING count(*) > 1;
```

The query must return no rows before creating the partial unique index. Review and resolve any duplicates deliberately; do not delete verification records automatically.

After applying migration 0015, verify that the runtime role cannot directly update the protected columns and can execute the guarded review function:

```sql
SELECT has_column_privilege('exgarasi_app', 'public.seller_verifications', 'status', 'UPDATE') AS can_update_verification_status,
       has_column_privilege('exgarasi_app', 'public.stores', 'status', 'UPDATE') AS can_update_store_status,
       has_function_privilege('exgarasi_app', 'public.app_review_seller_verification(uuid,text,text)', 'EXECUTE') AS can_review_through_function;
```

Expected result: `false`, `false`, `true` respectively.

From the repository branch `feat/marketplace-foundation`, install dependencies with `npm ci`. Migrations 0001–0013 are already applied to EXGARASI-dev through the Supabase managed migration tool. Do not run `npm run db:migrate` with the runtime role: the dedicated migration login and ownership model are not enabled yet. The Supabase migration history records applied migrations. A matching `public.schema_migrations` ledger has been seeded to prevent the repository runner from replaying those files. Migrations 0001–0013 include the marketplace schema, Better Auth tables, application identity mapping, RLS, stock functions, least-privilege policies, Supabase API hardening, foreign-key indexes, private-schema RLS and migration-ledger isolation.

Runtime grants for `exgarasi_app` have already been applied to the development project. Reapply the appropriate grants as the database owner after adding tables or mutable columns:

```sql
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO exgarasi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA better_auth TO exgarasi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO exgarasi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA better_auth TO exgarasi_app;

GRANT UPDATE (full_name, phone) ON public.users TO exgarasi_app;
GRANT UPDATE (recipient_name, phone, address_line, village, district, city, province, postal_code, latitude, longitude, is_default)
  ON public.addresses TO exgarasi_app;
GRANT UPDATE (name, description, logo_object_key, support_email, support_phone)
  ON public.stores TO exgarasi_app;
GRANT UPDATE (title_override, description_override, condition, price_amount, weight_grams, attributes)
  ON public.listings TO exgarasi_app;
GRANT UPDATE (status) ON public.carts TO exgarasi_app;
GRANT UPDATE (quantity) ON public.cart_items TO exgarasi_app;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM exgarasi_app;
REVOKE ALL ON public.schema_migrations FROM PUBLIC, anon, authenticated, exgarasi_app;
GRANT DELETE ON public.addresses, public.carts, public.cart_items, public.listings, public.listing_images TO exgarasi_app;
```

Run these grants again when new tables or mutable columns are introduced. Do not grant blanket UPDATE or DELETE on application tables. Keep the runtime role's column grants minimal.

## 6. Supabase API exposure

In Supabase Dashboard → Project Settings → API, do not add the `better_auth` schema to the exposed Data API schemas. Keep it as a private schema for the server-side Better Auth adapter. The app's database access uses the server-only PostgreSQL connection, not browser-side Supabase JS.

Migrations 0007–0008 revoke default/public RPC and table access from browser roles, then grant the application functions only to `exgarasi_app`. Migrations 0011–0012 enable RLS on Better Auth and migration metadata tables, with access limited to the trusted runtime or migration role. Never add the migration role or its password to the application runtime.

## 7. Authentication bootstrap

1. Configure production email with a verified Resend sender.
2. Register the first user at `/sign-up` and verify the email.
3. As a database operator, provision the first admin role:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM public.users
WHERE lower(email) = lower('admin@your-domain.com')
ON CONFLICT DO NOTHING;
```

4. Sign in and visit `/admin/dashboard`.

Never provide a public admin-registration endpoint. Seller access remains invitation-only.

## 8. RLS and authentication smoke tests

Use a disposable development project only. After migrations and grants, run the SQL files in `database/tests/` from Supabase SQL Editor or a one-off trusted database-owner connection. The tests create and roll back their fixtures, then switch to the non-owner `exgarasi_app` role. Never run these tests using the application runtime credentials.

The RLS test creates two users, two stores and two addresses, then verifies:
- Buyer A can see only Buyer A's private store and address rows.
- Buyer A cannot update Buyer B's store.
- Better Auth identity maps to the correct application profile.

The script rolls back its fixtures. Follow it with manual signup, email verification, login, session persistence and seller invitation acceptance tests in the dev project.

## 9. Current routes

- `/admin/seller-verifications`: admin/super-admin seller verification queue
- `/api/seller/verifications`: seller verification status and submission API
- `/api/admin/seller-verifications`: admin verification queue API
- `/api/admin/seller-verifications/[id]`: admin approval/rejection API

- `/sign-up`: buyer registration
- `/sign-in`: sign in
- `/account/dashboard`: buyer dashboard
- `/seller/accept-invitation?token=...`: seller invitation acceptance
- `/seller/dashboard`: seller overview
- `/admin/dashboard`: admin metrics and seller invitations

## 10. Release gates

- Verify the Better Auth Drizzle adapter schema against the exact installed package version.
- Run the migration sequence and smoke test against a real disposable Supabase project.
- Run tenant-isolation tests with two distinct seller identities.
- Test simultaneous stock reservation, release, expiry and consumption.
- Add invitation email delivery, password recovery, rate limiting and abuse controls.
- Implement checkout, payment webhooks, shipping, refund and ledger reconciliation before real transactions.
- Configure backups, restore drills, monitoring and a production incident process.
