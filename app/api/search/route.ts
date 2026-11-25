import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats, messages, projects } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ chats: [], messages: [], projects: [] });
  const pattern = `%${q.replace(/[%_]/g, "")}%`;

  const chatRows = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, user.id), like(chats.title, pattern)))
    .orderBy(desc(chats.updatedAt))
    .limit(20)
    .all();

  const myChatIds = db.select({ id: chats.id }).from(chats).where(eq(chats.userId, user.id)).all().map((c) => c.id);
  const messageRows = myChatIds.length
    ? db
        .select({ id: messages.id, chatId: messages.chatId, content: messages.content, createdAt: messages.createdAt })
        .from(messages)
        .where(and(or(...myChatIds.map((id) => eq(messages.chatId, id))), like(messages.content, pattern)))
        .orderBy(desc(messages.createdAt))
        .limit(20)
        .all()
    : [];

  const projectRows = db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), like(projects.name, pattern)))
    .limit(10)
    .all();

  return NextResponse.json({ chats: chatRows, messages: messageRows, projects: projectRows });
}
