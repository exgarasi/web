import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { authSchemaTables } from "./auth-schema";

type HyperdriveBinding = { connectionString: string };
type RuntimeEnv = { HYPERDRIVE?: HyperdriveBinding; DATABASE_URL?: string };

export async function getDatabase() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as RuntimeEnv;
  const connectionString = runtimeEnv.HYPERDRIVE?.connectionString ?? runtimeEnv.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Cloudflare HYPERDRIVE binding is missing. Configure it in wrangler.jsonc.");
  }

  // Hyperdrive owns the shared connection pool. Keep the per-isolate client small.
  const client = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });

  return {
    sql: client,
    db: drizzle(client, { schema: authSchemaTables }),
  };
}
