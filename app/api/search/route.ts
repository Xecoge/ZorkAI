import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
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

  const chatRows = await db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, user.id), ilike(chats.title, pattern)))
    .orderBy(desc(chats.updatedAt))
    .limit(20);

  const myChatIds = (await db.select({ id: chats.id }).from(chats).where(eq(chats.userId, user.id))).map((c) => c.id);
  const messageRows = myChatIds.length
    ? await db
        .select({ id: messages.id, chatId: messages.chatId, content: messages.content, createdAt: messages.createdAt })
        .from(messages)
        .where(and(inArray(messages.chatId, myChatIds), ilike(messages.content, pattern)))
        .orderBy(desc(messages.createdAt))
        .limit(20)
    : [];

  const projectRows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), ilike(projects.name, pattern)))
    .limit(10);

  return NextResponse.json({ chats: chatRows, messages: messageRows, projects: projectRows });
}
