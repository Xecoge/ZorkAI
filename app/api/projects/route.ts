import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects, chats, settings } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.createdAt)).all();
  const ids = rows.map((p) => p.id);
  const chatRows = ids.length
    ? db.select().from(chats).where(inArray(chats.projectId, ids)).orderBy(desc(chats.updatedAt)).all()
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
  db.insert(projects)
    .values({ id, userId: user.id, name: name.slice(0, 80), instructions: String(body?.instructions || "").slice(0, 4000), createdAt: Date.now() })
    .run();
  return NextResponse.json({ project: db.select().from(projects).where(eq(projects.id, id)).get() });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body?.id || "");
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body?.instructions === "string") patch.instructions = body.instructions.slice(0, 4000);
  db.update(projects).set(patch).where(and(eq(projects.id, id), eq(projects.userId, user.id))).run();
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).run();
  return NextResponse.json({ ok: true });
}
