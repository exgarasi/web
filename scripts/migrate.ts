import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("MIGRATION_DATABASE_URL is required (DATABASE_URL fallback is for local development only).");

const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  await sql`create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`;
  const directory = path.join(process.cwd(), "database");
  const files = (await readdir(directory))
    .filter((name) => /^[0-9]{4}_.*\.sql$/.test(name))
    .sort();

  for (const filename of files) {
    const exists = await sql`select 1 from public.schema_migrations where filename = ${filename}`;
    if (exists.length) {
      process.stdout.write("skip " + filename + "\n");
      continue;
    }
    process.stdout.write("apply " + filename + "\n");
    const contents = await readFile(path.join(directory, filename), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(contents).simple();
      await tx`insert into public.schema_migrations(filename) values (${filename})`;
    });
  }
  process.stdout.write("Database migrations complete.\n");
} finally {
  await sql.end();
}
