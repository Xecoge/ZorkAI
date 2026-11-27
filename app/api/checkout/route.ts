import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { billingHistory, userCredits, users } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { PLANS, PROMO_PERCENT, discountCents, type PlanId } from "@/lib/ai/config";

// Stripe checkout for the paid ladder (Plus / Pro / Max). Payments open as soon
// as STRIPE_SECRET_KEY is set; until then the endpoint says so plainly instead
// of charging or silently granting a plan. The internal Xecoge Max is never
// sold here — staff grant it from the admin panel. Switching to Free is a
// direct downgrade and needs no payment.
const STRIPE_API = "https://api.stripe.com/v1";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const planId = String(body?.plan || "") as PlanId;
  if (!(planId in PLANS) || planId === "xmax") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  if (planId === "free") {
    await db.update(users).set({ plan: "free" }).where(eq(users.id, user.id));
    await db.update(userCredits).set({ plan: "free", unlimited: 0 }).where(eq(userCredits.userId, user.id));
    return NextResponse.json({ ok: true, plan: "free" });
  }

  const plan = PLANS[planId];
  const amountCents = discountCents(plan); // launch promo applied at checkout

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Payments aren't open on this deployment yet. The owner can grant this plan from the admin panel.",
        configured: false,
      },
      { status: 501 },
    );
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `Xecoge ${plan.name}`,
    "client_reference_id": user.id,
    "metadata[plan]": planId,
    "metadata[user_id]": user.id,
    "metadata[full_price_cents]": String(plan.priceCents),
    "metadata[promo_percent]": String(PROMO_PERCENT),
    success_url: `${origin}/app?billing=success`,
    cancel_url: `${origin}/app?billing=cancelled`,
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return NextResponse.json(
      { error: data.error?.message ?? "Stripe checkout failed." },
      { status: 502 },
    );
  }
  await db.insert(billingHistory).values({
    id: newId(),
    userId: user.id,
    kind: "subscription_change",
    plan: planId,
    amountCents,
    status: "pending",
    provider: "stripe",
    providerRef: data.id ?? null,
    createdAt: Date.now(),
  });
  return NextResponse.json({ url: data.url, configured: true });
}
