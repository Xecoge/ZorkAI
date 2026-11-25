import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { generations } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = db.select().from(generations).orderBy(desc(generations.createdAt)).limit(48).all();
  return NextResponse.json({ generations: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  const id = newId("gen");
  db.insert(generations).values({ id, userId: user.id, prompt: prompt.slice(0, 500), kind: "image", createdAt: Date.now() }).run();
  // Image rendering is delegated to the configured provider interface; without an
  // image endpoint configured we record the prompt and render a generated poster.
  return NextResponse.json({
    generation: db.select().from(generations).where(eq(generations.id, id)).get(),
    image: `/api/imagine/preview?seed=${encodeURIComponent(id)}&p=${encodeURIComponent(prompt.slice(0, 80))}`,
  });
}
