import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/db";

/**
 * Run application SQL with the authenticated application user set for the
 * duration of one transaction. PostgreSQL RLS policies read app.user_id.
 * Never accept userId from a request body or query string.
 */
export async function withUserContext<T>(
  callback: (tx: typeof sql) => Promise<T>,
): Promise<T> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");

  const rows = await sql`
    select id from public.users
    where auth_user_id = ${session.user.id}
    limit 1
  `;
  const appUserId = rows[0]?.id as string | undefined;
  if (!appUserId) throw new Error("APPLICATION_PROFILE_NOT_FOUND");

  return sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${appUserId}, true)`;
    return callback(tx as unknown as typeof sql);
  }) as Promise<T>;
}
