import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { authSchemaTables } from "./auth-schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
}

const globalForDb = globalThis as unknown as {
  sqlClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.sqlClient ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = client;
}

export const sql = client;
export const db = drizzle(client, { schema: authSchemaTables });
