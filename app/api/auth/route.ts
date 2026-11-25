import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword, createSession, destroySession, getSessionUser, newId, ensureProfile } from "@/lib/auth";

function originOf(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

// Accept both JSON fetch bodies and native form posts. Form posts happen when a
// tap lands before React hydrates (slow mobile connections); those must redirect.
async function readBody(req: NextRequest): Promise<{ action?: string; email?: string; password?: string; name?: string; form: boolean }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    return { ...json, form: false };
  }
  const form = await req.formData().catch(() => null);
  if (!form) return { form: true };
  const url = new URL(req.url);
  return {
    action: url.searchParams.get("mode") ?? undefined,
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? ""),
    form: true,
  };
}

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const action = body.action;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const row = email ? await one(db.select().from(users).where(eq(users.email, email))) : null;
    if (!row || !verifyPassword(password, row.passwordHash)) {
      if (body.form) {
        const url = new URL("/sign-in", originOf(req));
        url.searchParams.set("authError", "Invalid email or password.");
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await createSession(row.id);
    await ensureProfile({ id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash, avatarColor: row.avatarColor });
    return body.form
      ? NextResponse.redirect(new URL("/app", originOf(req)))
      : NextResponse.json({ ok: true });
  }

  if (action === "register") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return body.form ? NextResponse.redirect(new URL("/sign-up?authError=Email+is+invalid", originOf(req))) : NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return body.form ? NextResponse.redirect(new URL("/sign-up?authError=Password+must+be+at+least+8+characters", originOf(req))) : NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (await one(db.select().from(users).where(eq(users.email, email)))) {
      return body.form ? NextResponse.redirect(new URL("/sign-up?authError=An+account+with+this+email+already+exists", originOf(req))) : NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const id = newId("usr");
    await ensureProfile({ id, email, name: name || email.split("@")[0], passwordHash: hashPassword(password) });
    await createSession(id);
    return body.form
      ? NextResponse.redirect(new URL("/app", originOf(req)))
      : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
