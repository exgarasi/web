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

  // Hyperdrive maintains the shared pool; this client is scoped to one request operation.
  const client = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
    connection: { application_name: "EXGARASI Cloudflare Worker" },
  });

  return {
    sql: client,
    db: drizzle(client, { schema: authSchemaTables }),
    close: () => client.end({ timeout: 5 }),
  };
}
