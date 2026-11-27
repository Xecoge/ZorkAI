import { eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure";

// Small cache: the provider key is read on every completion, and a settings
// row rarely changes. Writes invalidate it immediately.
const TTL_MS = 15_000;
const cache = new Map<string, { value: string; at: number }>();

export async function getSetting(key: string): Promise<string | undefined> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  await ensureSchema();
  const row = await one(db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1));
  const value = (row?.value ?? "").trim();
  if (value) cache.set(key, { value, at: Date.now() });
  else cache.delete(key);
  return value || undefined;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSchema();
  const now = Date.now();
  const trimmed = value.trim();
  if (!trimmed) {
    await db.delete(appSettings).where(eq(appSettings.key, key));
  } else {
    await db
      .insert(appSettings)
      .values({ key, value: trimmed, updatedAt: now })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: trimmed, updatedAt: now } });
  }
  cache.delete(key);
}
