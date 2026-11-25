import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats, messages, projects, generations } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

const WEEK = 7 * 24 * 3600 * 1000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const since = Date.now() - WEEK;
  const chatCount = db.select().from(chats).where(and(eq(chats.userId, user.id), gte(chats.createdAt, since))).all().length;
  const msgCount = db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(and(eq(chats.userId, user.id), gte(messages.createdAt, since)))
    .all().length;
  const projectCount = db.select().from(projects).where(eq(projects.userId, user.id)).all().length;
  const imageCount = db.select().from(generations).where(and(eq(generations.userId, user.id), gte(generations.createdAt, since))).all().length;
  // Free tier weekly pool, matching the researched usage model.
  const pool = 10;
  const used = Math.min(pool, Math.round((chatCount * 2 + msgCount * 0.4 + imageCount * 3) * 10) / 10);
  return NextResponse.json({
    usage: { used, pool, chatCount, msgCount, projectCount, imageCount },
    plan: user.plan,
  });
}
