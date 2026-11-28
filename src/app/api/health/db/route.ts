import { getDatabase } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database: Awaited<ReturnType<typeof getDatabase>> | undefined;

  try {
    database = await getDatabase();
    const result = await database.sql`select current_user as role`;
    const leastPrivilegeRoleActive = result[0]?.role === "exgarasi_app";

    if (!leastPrivilegeRoleActive) {
      return Response.json(
        {
          status: "error",
          database: "connected",
          security: "runtime_role_mismatch",
        },
        { status: 503 },
      );
    }

    return Response.json({
      status: "ok",
      database: "connected",
      provider: "postgresql",
      security: "least_privilege_role_active",
    });
  } catch {
    return Response.json(
      {
        status: "error",
        database: "unavailable",
      },
      { status: 503 },
    );
  } finally {
    if (database) {
      await database.close().catch(() => undefined);
    }
  }
}
