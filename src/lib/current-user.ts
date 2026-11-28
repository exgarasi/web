import { withAuthenticatedDb } from "@/lib/db-context";

export async function getCurrentUser() {
  try {
    return await withAuthenticatedDb(async (tx) => {
      const rows = await tx`
        select u.id, u.email, u.full_name, u.status,
          coalesce(array_agg(distinct ur.role) filter (where ur.role is not null), '{}') as roles
        from public.users u left join public.user_roles ur on ur.user_id = u.id
        where u.id = public.app_current_user_id()
        group by u.id limit 1
      `;
      return rows[0] ?? null;
    });
  } catch {
    return null;
  }
}
