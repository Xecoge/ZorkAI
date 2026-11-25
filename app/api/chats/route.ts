import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { normalizeMode } from "@/lib/ai/provider";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, user.id), eq(chats.private, 0)))
    .orderBy(desc(chats.updatedAt))
    .limit(100)
    .all();
  return NextResponse.json({ chats: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = newId("chat");
  const now = Date.now();
  db.insert(chats)
    .values({
      id,
      userId: user.id,
      projectId: body.projectId || null,
      title: "New chat",
      mode: normalizeMode(body.mode),
      private: body.private ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return NextResponse.json({ chat: db.select().from(chats).where(eq(chats.id, id)).get() });
}
