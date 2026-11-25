import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, one } from "@/lib/db/client";
import { chats, messages } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ChatView } from "@/components/chat-view";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  const chat = await one(db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id))));
  if (!chat) notFound();
  const rows = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
  return (
    <Suspense>
      <ChatView chat={chat} initialMessages={rows} />
    </Suspense>
  );
}
