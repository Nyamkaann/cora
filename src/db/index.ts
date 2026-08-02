import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

// Supabase (and most hosted Postgres) requires SSL; local dev doesn't have a cert to verify.
const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL, isLocal ? {} : { ssl: "require" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
