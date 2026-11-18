import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/db";

export async function withAuthenticatedDb<T>(
  callback: (tx: typeof sql, appUserId: string) => Promise<T>,
): Promise<T> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");
  const profiles = await sql`select public.app_profile_id_for_auth_user(${session.user.id}) as id`;
  const appUserId = profiles[0]?.id as string | undefined;
  if (!appUserId) throw new Error("APPLICATION_PROFILE_NOT_FOUND");

  return await sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${appUserId}, true)`;
    return callback(tx as unknown as typeof sql, appUserId);
  }) as T;
}
