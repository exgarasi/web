import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/db";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const rows = await sql`
    select u.id, u.email, u.full_name, u.status,
      coalesce(array_agg(distinct ur.role) filter (where ur.role is not null), '{}') as roles
    from public.users u left join public.user_roles ur on ur.user_id = u.id
    where u.auth_user_id = ${session.user.id}
    group by u.id limit 1
  `;
  return rows[0] ?? null;
}
