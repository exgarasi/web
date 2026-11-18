import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/db";

export async function withAuthenticatedDb<T>(
  callback: (tx: Awaited<ReturnType<typeof getDatabase>>["sql"], appUserId: string) => Promise<T>,
): Promise<T> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");

  const { sql } = await getDatabase();
  const profiles = await sql`select public.app_profile_id_for_auth_user(${session.user.id}) as id`;
  const appUserId = profiles[0]?.id as string | undefined;
  if (!appUserId) throw new Error("APPLICATION_PROFILE_NOT_FOUND");

  return await sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${appUserId}, true)`;
    return callback(tx as unknown as typeof sql, appUserId);
  }) as T;
}
