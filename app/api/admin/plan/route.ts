import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { users, userCredits } from "@/lib/db/schema";
import { PLANS, type PlanId } from "@/lib/ai/config";

// Secure plan administration. Xecoge Max (and any plan change) can only be
// assigned here, with a server-side admin key — never through any
// user-facing request. Set ADMIN_API_KEY in the deployment environment.
function authorized(req: NextRequest): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false; // endpoint disabled until an admin key is configured
  const given = req.headers.get("x-admin-key") ?? "";
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(key, "utf8");
  return a.length === b.length && (a.length === 0 || a.equals(b));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const planId = String(body?.plan || "") as PlanId;
  if (!email || !(planId in PLANS) || planId === "free") {
    return NextResponse.json({ error: "Provide an email and a valid plan." }, { status: 400 });
  }
  if (planId === "max") {
    // Max is the only plan: its entitlement must persist in the database,
    // paired with the unlimited-credits flag the credit engine honors.
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const now = Date.now();
    await db.update(users).set({ plan: planId }).where(eq(users.id, user.id));
    await db
      .insert(userCredits)
      .values({
        userId: user.id,
        plan: planId,
        unlimited: 1,
        balance: 0,
        monthlyAllowance: 0,
        periodStart: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userCredits.userId,
        set: { plan: planId, unlimited: 1, updatedAt: now },
      });
    return NextResponse.json({ ok: true, email, plan: planId, unlimited: true });
  }
  // Any other paid plan is recorded on the user row for completeness.
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  await db.update(users).set({ plan: planId }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, email, plan: planId });
}
