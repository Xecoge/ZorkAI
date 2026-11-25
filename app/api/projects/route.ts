import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { projects, chats } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.createdAt));
  const ids = rows.map((p) => p.id);
  const chatRows = ids.length
    ? await db.select().from(chats).where(inArray(chats.projectId, ids)).orderBy(desc(chats.updatedAt))
    : [];
  return NextResponse.json({
    projects: rows.map((p) => ({ ...p, chats: chatRows.filter((c) => c.projectId === p.id) })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const id = newId("prj");
  await db
    .insert(projects)
    .values({ id, userId: user.id, name: name.slice(0, 80), instructions: String(body?.instructions || "").slice(0, 4000), createdAt: Date.now() });
  return NextResponse.json({ project: await one(db.select().from(projects).where(eq(projects.id, id))) });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body?.id || "");
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body?.instructions === "string") patch.instructions = body.instructions.slice(0, 4000);
  await db.update(projects).set(patch).where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  const project = await one(db.select().from(projects).where(eq(projects.id, id)));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  return NextResponse.json({ ok: true });
}
