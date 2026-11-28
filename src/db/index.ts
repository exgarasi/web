import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { authSchemaTables } from "./auth-schema";

type RuntimeEnv = {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
};

export async function getDatabase() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as RuntimeEnv;
  const connectionString = runtimeEnv.HYPERDRIVE?.connectionString ?? runtimeEnv.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Cloudflare HYPERDRIVE binding is missing. Configure it in wrangler.jsonc.");
  }

  // Hyperdrive maintains the shared pool. Reserve one connection for this
  // request so the least-privilege role applies to every query made by the
  // auth adapter, catalog readers, and authenticated database operations.
  const client = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
    connection: { application_name: "EXGARASI Cloudflare Worker" },
  });

  let reserved: Awaited<ReturnType<typeof client.reserve>> | undefined;

  try {
    reserved = await client.reserve();
    await reserved`SET ROLE exgarasi_app`;

    const [identity] = await reserved`select current_user as role`;
    if (identity?.role !== "exgarasi_app") {
      throw new Error("DATABASE_RUNTIME_ROLE_MISMATCH");
    }

    return {
      sql: reserved,
      db: drizzle(reserved, { schema: authSchemaTables }),
      close: async () => {
        try {
          await reserved!`RESET ROLE`;
        } finally {
          try {
            await reserved!.release();
          } finally {
            await client.end({ timeout: 5 });
          }
        }
      },
    };
  } catch (error) {
    if (reserved) {
      await reserved.release().catch(() => undefined);
    }
    await client.end({ timeout: 5 }).catch(() => undefined);
    throw error;
  }
}
