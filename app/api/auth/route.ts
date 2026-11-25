import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword, createSession, destroySession, getSessionUser, newId, AVATAR_COLORS, ensureSettings } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const row = email ? db.select().from(users).where(eq(users.email, email)).get() : null;
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await createSession(row.id);
    await ensureSettings(row.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "register") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (db.select().from(users).where(eq(users.email, email)).get()) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const id = newId("usr");
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    db.insert(users)
      .values({ id, email, name: name || email.split("@")[0], passwordHash: hashPassword(password), avatarColor: color })
      .run();
    await ensureSettings(id);
    await createSession(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
