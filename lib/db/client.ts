import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// All persistent data lives in Supabase Postgres, addressed through DATABASE_URL
// (Supabase → Project Settings → Database → Connection string, pooled port 6543
// for serverless hosts). Sessions, profiles, chats and messages are shared
// across devices through this one database.
// DATABASE_URL is the convention, but when it is set to something that is not
// a valid Postgres URL (e.g. a dashboard link), prefer the Vercel Supabase
// integration variables, which the integration keeps correct on its own.
function connectionUrl(): string | undefined {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.STORAGE_POSTGRES_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];

  return (
    candidates.find((url) => {
      try {
        const host = new URL(url).host;
        return host.includes("supabase.co") || host.includes("supabase.com") || host.includes("pooler.supabase");
      } catch {
        return false;
      }
    }) ?? candidates[0]
  );
}

const url = connectionUrl();
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Point it at your Supabase Postgres connection string.",
  );
}

// Local Postgres runs without TLS; Supabase requires it. Transaction poolers
// (Supabase port 6543) do not support prepared statements, so disable them.
const isLocal = /(localhost|127\.0\.0\.1|\[::1\])/.test(url);
export const pool = postgres(url, {
  prepare: false,
  max: 10,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// Postgres queries resolve to arrays; helper for "fetch one row or null".
export async function one<T>(query: PromiseLike<T[]>): Promise<T | null> {
  const rows = await query;
  return rows[0] ?? null;
}
