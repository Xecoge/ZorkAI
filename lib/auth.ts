import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { users, sessions, settings } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure";

const SESSION_COOKIE = "grokish_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  avatarColor: string;
  role: string;
  status: string;
  statusReason: string;
  statusUntil: number | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function newId(prefix = "id"): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function signToken(raw: string): string {
  const secret = process.env.SESSION_SECRET || "dev-only-local-secret";
  return createHmac("sha256", secret).update(raw).digest("hex") + "." + raw;
}

function unsignToken(signed: string): string | null {
  const [mac, raw] = String(signed || "").split(".");
  if (!mac || !raw) return null;
  const secret = process.env.SESSION_SECRET || "dev-only-local-secret";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return raw;
}

export async function createSession(userId: string) {
  const raw = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  await db.insert(sessions).values({ token: raw, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken(raw), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const signed = jar.get(SESSION_COOKIE)?.value;
  const raw = signed ? unsignToken(signed) : null;
  if (raw) await db.delete(sessions).where(eq(sessions.token, raw));
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const signed = jar.get(SESSION_COOKIE)?.value;
  const raw = signed ? unsignToken(signed) : null;
  if (!raw) return null;
  // Columns added after the first deploy are created on demand.
  await ensureSchema();
  const row = await one(
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        avatarColor: users.avatarColor,
        role: users.role,
        status: users.status,
        statusReason: users.statusReason,
        statusUntil: users.statusUntil,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, raw)),
  );
  if (!row || row.expiresAt < Date.now()) return null;
  const { expiresAt: _expiresAt, ...user } = row;
  return user;
}

export async function ensureSettings(userId: string) {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  return one(db.select().from(settings).where(eq(settings.userId, userId)));
}

// Every authenticated user automatically gets a durable profile row (plus its
// settings row) in Supabase, created on first sign-in — password, register or
// OAuth — so any device that signs in resolves to the same profile and history.
export async function ensureProfile(profile: {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatarColor?: string;
}) {
  await db
    .insert(users)
    .values({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      passwordHash: profile.passwordHash ?? "",
      avatarColor: profile.avatarColor ?? AVATAR_COLORS[0],
      createdAt: Date.now(),
    })
    .onConflictDoNothing();
  await ensureSettings(profile.id);
}

export const AVATAR_COLORS = ["#1084fe", "#e5484d", "#f5a623", "#12a594", "#8e4ec6", "#e93d82"];
