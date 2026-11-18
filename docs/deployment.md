# EXGARASI — Supabase managed PostgreSQL setup

## Deployment target

- Supabase managed PostgreSQL project, with separate development and production projects.
- EXGARASI Next.js application on a Node.js runtime.
- Cloudflare DNS, CDN, WAF and R2 remain available for media.
- The application connects to PostgreSQL from the trusted server runtime using the dedicated `exgarasi_app` login. Do not expose database credentials or service-role keys in browser bundles.

## 1. Create Supabase projects

Create two projects in the Supabase dashboard:
1. `exgarasi-dev` for migrations, seed data and security tests.
2. `exgarasi-prod` for production, created only after dev verification.

Save each project's database password in a password manager. Never commit it to GitHub or paste it into source files.

For the initial migration, use the project's direct PostgreSQL connection if IPv6/network access permits, or the Supabase session pooler connection. Use a direct/session connection for DDL migrations; use the transaction pooler only for application runtime after verifying prepared statements and transaction behavior. This app uses postgres.js with `prepare: false`.

## 2. Create isolated PostgreSQL roles

Open Supabase Dashboard → SQL Editor in the development project. Run the following as the database owner. Replace both passwords with unique generated secrets:

```sql
CREATE ROLE exgarasi_migrator LOGIN PASSWORD 'REPLACE_WITH_LONG_RANDOM_MIGRATION_SECRET'
  NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
CREATE ROLE exgarasi_app LOGIN PASSWORD 'REPLACE_WITH_LONG_RANDOM_RUNTIME_SECRET'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT CONNECT ON DATABASE postgres TO exgarasi_migrator, exgarasi_app;
GRANT CREATE ON DATABASE postgres TO exgarasi_migrator;
GRANT CREATE ON SCHEMA public TO exgarasi_migrator;
CREATE SCHEMA IF NOT EXISTS better_auth AUTHORIZATION exgarasi_migrator;
GRANT USAGE ON SCHEMA public, better_auth TO exgarasi_app;

ALTER DEFAULT PRIVILEGES FOR ROLE exgarasi_migrator IN SCHEMA public
  GRANT SELECT, INSERT ON TABLES TO exgarasi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE exgarasi_migrator IN SCHEMA better_auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO exgarasi_app;
```

The migration role is a trusted schema owner and is used only by migration jobs. The runtime role must not own tables, be superuser, or have `BYPASSRLS`. The app does not use Supabase browser `anon` or `authenticated` roles for its own data access.

## 3. Configure migration and runtime connection strings

In Supabase Dashboard → Project Settings → Database, copy the connection strings and set the username to the role created above. Use the host, port, database name and SSL settings shown by Supabase.

- `MIGRATION_DATABASE_URL`: `exgarasi_migrator` using direct connection or session pooler.
- `DATABASE_URL`: `exgarasi_app` using direct connection or transaction pooler after testing.
- `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL`: application origin.
- `AUTH_SECRET`: random secret with at least 32 characters.
- `RESEND_API_KEY` and `EMAIL_FROM`: verified sender configuration for production verification emails.

Set these in the hosting provider's encrypted environment settings. Do not place real secrets in `.env.example`.

## 4. Apply migrations 0001–0007

From the repository branch `feat/marketplace-foundation`:

```bash
npm ci
npm run db:migrate
```

The migration runner applies ordered SQL files and records each completed filename in `public.schema_migrations`. Migrations 0001–0007 include the marketplace schema, Better Auth tables, application identity mapping, RLS, stock functions, least-privilege policies and Supabase privilege hardening.

After migrations, apply the runtime grants as `exgarasi_migrator`/database owner:

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
REVOKE ALL ON public.schema_migrations FROM exgarasi_app;
GRANT DELETE ON public.addresses, public.carts, public.cart_items, public.listings, public.listing_images TO exgarasi_app;
```

Run these grants again when new tables or mutable columns are introduced. Do not grant blanket UPDATE or DELETE on application tables. Keep the runtime role's column grants minimal.

## 5. Supabase API exposure

In Supabase Dashboard → Project Settings → API, do not add the `better_auth` schema to the exposed Data API schemas. Keep it as a private schema for the server-side Better Auth adapter. The app's database access uses the server-only PostgreSQL connection, not browser-side Supabase JS.

Migration 0007 revokes default PUBLIC function execution and table/sequence access in the public schema, then grants the application functions only to `exgarasi_app`. Never add the migration role or its password to the application runtime.

## 6. Authentication bootstrap

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

## 7. RLS and authentication smoke tests

Use a disposable development project only. After migrations and grants, run:

```bash
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/rls_auth_smoke.sql
```

The test creates two users, two stores and two addresses, switches to the non-owner `exgarasi_app` role, then verifies:
- Buyer A can see only Buyer A's private store and address rows.
- Buyer A cannot update Buyer B's store.
- Better Auth identity maps to the correct application profile.

The script rolls back its fixtures. Follow it with manual signup, email verification, login, session persistence and seller invitation acceptance tests in the dev project.

## 8. Current routes

- `/sign-up`: buyer registration
- `/sign-in`: sign in
- `/account/dashboard`: buyer dashboard
- `/seller/accept-invitation?token=...`: seller invitation acceptance
- `/seller/dashboard`: seller overview
- `/admin/dashboard`: admin metrics and seller invitations

## 9. Release gates

- Verify the Better Auth Drizzle adapter schema against the exact installed package version.
- Run the migration sequence and smoke test against a real disposable Supabase project.
- Run tenant-isolation tests with two distinct seller identities.
- Test simultaneous stock reservation, release, expiry and consumption.
- Add invitation email delivery, password recovery, rate limiting and abuse controls.
- Implement checkout, payment webhooks, shipping, refund and ledger reconciliation before real transactions.
- Configure backups, restore drills, monitoring and a production incident process.
