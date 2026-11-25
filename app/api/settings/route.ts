import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { getSessionUser, ensureSettings } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await ensureSettings(user.id) });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSettings(user.id);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const boolKeys = ["wrapCode", "reduceMotion", "showSuggestions", "memory", "improvedModel", "notifications"];
  const patch: Record<string, unknown> = {};
  for (const k of boolKeys) {
    const v = body[k];
    if (v === true || v === 1) patch[k] = 1;
    else if (v === false || v === 0) patch[k] = 0;
  }
  if (typeof body.theme === "string" && ["system", "light", "dark"].includes(body.theme)) patch.theme = body.theme;
  if (typeof body.customInstructions === "string") patch.customInstructions = body.customInstructions.slice(0, 4000);
  if (typeof body.language === "string" && body.language.trim()) patch.language = body.language.trim().slice(0, 40);
  if (Object.keys(patch).length) await db.update(settings).set(patch).where(eq(settings.userId, user.id));
  return NextResponse.json({ settings: await ensureSettings(user.id) });
}
