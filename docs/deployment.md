# EXGARASI local setup and deployment

## 1. Provision PostgreSQL roles

For the first MVP, deploy Next.js on a standard Node.js runtime (for example Vercel, Railway, or Render). Keep Cloudflare for DNS, CDN, WAF and R2. Do not deploy this current module-level PostgreSQL client to Workers until its request-scoped connection lifecycle and Better Auth adapter are validated with Hyperdrive. Use a managed PostgreSQL service. Create two separate roles:
- `exgarasi_migrator`: schema owner / migration credentials; use only in deployment or migration jobs.
- `exgarasi_app`: application runtime login; must be NOSUPERUSER, NOBYPASSRLS, and must not own application tables.

Example DBA commands (replace passwords and database name securely):

```sql
CREATE ROLE exgarasi_migrator LOGIN PASSWORD 'REPLACE_WITH_SECRET'
  NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
CREATE ROLE exgarasi_app LOGIN PASSWORD 'REPLACE_WITH_SECRET'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT CONNECT ON DATABASE exgarasi TO exgarasi_migrator, exgarasi_app;
GRANT CREATE ON DATABASE exgarasi TO exgarasi_migrator;
GRANT CREATE ON SCHEMA public TO exgarasi_migrator;
CREATE SCHEMA IF NOT EXISTS better_auth AUTHORIZATION exgarasi_migrator;
GRANT USAGE ON SCHEMA public, better_auth TO exgarasi_app;

-- Default privileges apply to tables created by the migration owner in future migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE exgarasi_migrator IN SCHEMA public
  GRANT SELECT, INSERT ON TABLES TO exgarasi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE exgarasi_migrator IN SCHEMA better_auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO exgarasi_app;
```

The migration role should own the tables and security-definer functions. Never run the application using the migration/owner role. RLS is not a security boundary if the runtime role owns the tables or has BYPASSRLS. Do not add blanket UPDATE or DELETE grants to the runtime role: the column-level grants above are deliberate. When adding a new mutable feature, add the smallest required column grants and a matching RLS policy.

## 2. Configure environment

Copy `.env.example` to `.env.local` and set:
- `DATABASE_URL`: runtime connection for exgarasi_app (use Cloudflare Hyperdrive connection string where applicable).
- `MIGRATION_DATABASE_URL`: migration connection for exgarasi_migrator.
- `AUTH_SECRET`: cryptographically random secret, at least 32 characters.
- `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL`.
- Production email: `RESEND_API_KEY` and a verified `EMAIL_FROM` domain.

Do not commit `.env.local` or production secrets.

## 3. Install and migrate

```bash
npm install
npm run db:migrate
npm run dev
```

The SQL files in `database/` are the authoritative schema migrations and are applied in filename order. The runner records applied filenames in `public.schema_migrations`. Back up the database before applying migrations to an existing environment.

After the first migration run, apply runtime table and column grants as the migration role:

```sql
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO exgarasi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA better_auth TO exgarasi_app;

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

Run these grants again after adding tables or mutable columns. The runtime role intentionally has no blanket UPDATE or DELETE access.

## 4. Bootstrap the first administrator

1. Register the first account through `/sign-up`.
2. Verify the email in production.
3. As the database migration/admin role, grant the initial super-admin role:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM public.users
WHERE lower(email) = lower('admin@your-domain.com')
ON CONFLICT DO NOTHING;
```

4. Sign in and open `/admin/dashboard`.

Do not expose an admin-registration endpoint. Additional admin privileges must be granted through a controlled operator process and audited.

## 5. Current application routes

- `/`: public EXGARASI storefront landing page
- `/sign-up`: buyer account registration
- `/sign-in`: sign in
- `/account/dashboard`: buyer account and order history
- `/seller/accept-invitation?token=...`: invited seller onboarding
- `/seller/dashboard`: seller's own stores and operational counts
- `/admin/dashboard`: admin metrics and seller invitation form
- `/api/admin/seller-invitations`: admin-only invitation endpoint
- `/api/seller/accept-invitation`: authenticated one-time invitation acceptance
- `/api/auth/[...all]`: Better Auth endpoints

## 6. Important release gates

- Add email delivery for seller invitation links; currently the admin UI returns a one-time URL for secure manual delivery.
- Verify Better Auth adapter schema against the installed package version before first migration in staging.
- Add automated RLS tests using the actual non-owner runtime role and two separate seller identities.
- Test simultaneous stock reservation, release and consumption.
- Add password reset, account recovery, rate limits, CAPTCHA/abuse controls and audit alerts.
- Add payment and shipping provider adapters only after confirming marketplace split settlement and regulatory requirements.
- Run backup restore tests and security review before production.
