import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for Drizzle migrations.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/auth-schema.ts",
  out: "./database/generated",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
});
