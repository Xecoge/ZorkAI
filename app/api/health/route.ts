import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Reports which database connection variables are visible to the runtime,
// without exposing any values, so a broken deployment can be diagnosed.
export async function GET() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_POSTGRES_URL;
  const host = dbUrl ? safeHost(dbUrl) : null;
  return NextResponse.json({
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
    hasStoragePostgresUrl: Boolean(process.env.STORAGE_POSTGRES_URL),
    hasPostgresHost: Boolean(process.env.POSTGRES_HOST),
    hasStoragePostgresHost: Boolean(process.env.STORAGE_POSTGRES_HOST),
    host,
    nodeEnv: process.env.NODE_ENV,
  });
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
