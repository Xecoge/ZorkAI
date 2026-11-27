import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { billingHistory, subscriptions, userCredits, users } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { getSummary } from "@/lib/credits";
import { normalizePlan } from "@/lib/ai/config";

// Max launch offer: one activation per account, free, permanent. The
// entitlement lives in the database (users.plan = "max" and
// user_credits.unlimited = 1) with no renewal date, so it survives deploys,
// billing changes and signing in from another device. Payment comes later;
// this endpoint is the stub that grants the plan today.

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ plan: normalizePlan(user.plan), max: normalizePlan(user.plan) === "max" });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.plan === "max") {
    return NextResponse.json({ ok: true, already: true, plan: "max" });
  }

  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.update(users).set({ plan: "max" }).where(eq(users.id, user.id));

    await tx
      .insert(userCredits)
      .values({
        userId: user.id,
        plan: "max",
        unlimited: 1,
        balance: 0,
        monthlyAllowance: 0,
        periodStart: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userCredits.userId,
        set: { plan: "max", unlimited: 1, balance: 0, monthlyAllowance: 0, updatedAt: now },
      });

    const active = await one(
      tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.plan, "max"), eq(subscriptions.status, "active")))
        .limit(1),
    );
    if (!active) {
      await tx.insert(subscriptions).values({
        id: newId("sub"),
        userId: user.id,
        plan: "max",
        status: "active",
        provider: "promo",
        providerRef: "max-launch-free",
        pricePaidCents: 0,
        createdAt: now,
        renewsAt: null,
      });
    }

    await tx.insert(billingHistory).values({
      id: newId("bh"),
      userId: user.id,
      kind: "subscription_change",
      plan: "max",
      amountCents: 0,
      status: "paid",
      provider: "promo",
      providerRef: "max-launch-free",
      createdAt: now,
    });
  });

  return NextResponse.json({ ok: true, plan: "max", summary: await getSummary(user.id) });
}
