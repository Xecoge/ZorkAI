import { db } from "@/lib/db/client";
import { chats, projects } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { desc, eq, and } from "drizzle-orm";

export async function loadSidebarData(userId: string) {
  const chatRows = await db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt, projectId: chats.projectId })
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.private, 0)))
    .orderBy(desc(chats.updatedAt))
    .limit(40);
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
  return { chats: chatRows, projects: projectRows };
}

export async function getSidebarData() {
  const user = await getSessionUser();
  if (!user) return { chats: [], projects: [] };
  return loadSidebarData(user.id);
}
