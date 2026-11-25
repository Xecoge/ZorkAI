import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { chats, messages, projects } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { getProvider, normalizeMode } from "@/lib/ai/provider";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const chat = await one(db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id))));
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
  return NextResponse.json({ chat, messages: rows });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const chat = await one(db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id))));
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const regenerate = Boolean(body?.regenerate);
  const content = String(body?.content || "").trim();
  if (!content && !regenerate) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const mode = normalizeMode(body?.mode ?? chat.mode);
  const now = Date.now();

  if (regenerate) {
    // Drop the trailing assistant replies so the retry replaces them instead of duplicating.
    const rows = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
    for (let i = rows.length - 1; i >= 0 && rows[i].role === "assistant"; i--) {
      await db.delete(messages).where(eq(messages.id, rows[i].id));
    }
  } else {
    await db
      .insert(messages)
      .values({ id: newId("msg"), chatId: id, role: "user", content: content.slice(0, 16000), createdAt: now });
  }

  // Title a brand-new chat from the first user message.
  if (chat.title === "New chat") {
    const title = content.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
    await db.update(chats).set({ title }).where(eq(chats.id, id));
  }
  await db.update(chats).set({ mode, updatedAt: Date.now() }).where(eq(chats.id, id));

  const history = (
    await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(asc(messages.createdAt))
  ).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const project = chat.projectId
    ? await one(db.select().from(projects).where(eq(projects.id, chat.projectId)))
    : null;

  let reply;
  try {
    reply = await getProvider().complete(history, mode, {
      projectName: project?.name,
      instructions: project?.instructions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "The model provider failed to respond. Try again." },
      { status: 502 },
    );
  }

  const replyId = newId("msg");
  await db.insert(messages).values({
    id: replyId,
    chatId: id,
    role: "assistant",
    content: reply.content,
    mode,
    sources: reply.sources ?? null,
    createdAt: Date.now(),
  });

  return NextResponse.json({
    message: await one(db.select().from(messages).where(eq(messages.id, replyId))),
  });
}
