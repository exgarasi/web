import { getDatabase } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database: Awaited<ReturnType<typeof getDatabase>> | undefined;

  try {
    database = await getDatabase();
    const result = await database.sql`select 1 as ok`;

    return Response.json({
      status: "ok",
      database: "connected",
      provider: "postgresql",
      query: result[0]?.ok === 1,
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
