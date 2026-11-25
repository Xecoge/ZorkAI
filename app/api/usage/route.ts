import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats, messages, projects, generations } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

const WEEK = 7 * 24 * 3600 * 1000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const since = Date.now() - WEEK;
  const [chatRows, msgRows, projectRows, imageRows] = await Promise.all([
    db.select({ id: chats.id }).from(chats).where(and(eq(chats.userId, user.id), gte(chats.createdAt, since))),
    db
      .select({ id: messages.id })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(and(eq(chats.userId, user.id), gte(messages.createdAt, since))),
    db.select({ id: projects.id }).from(projects).where(eq(projects.userId, user.id)),
    db.select({ id: generations.id }).from(generations).where(and(eq(generations.userId, user.id), gte(generations.createdAt, since))),
  ]);
  // Free tier weekly pool, matching the researched usage model.
  const pool = 10;
  const used = Math.min(pool, Math.round((chatRows.length * 2 + msgRows.length * 0.4 + imageRows.length * 3) * 10) / 10);
  return NextResponse.json({
    usage: {
      used,
      pool,
      chatCount: chatRows.length,
      msgCount: msgRows.length,
      projectCount: projectRows.length,
      imageCount: imageRows.length,
    },
    plan: user.plan,
  });
}
