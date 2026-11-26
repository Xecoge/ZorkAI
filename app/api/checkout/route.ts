import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { billingHistory } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { PLANS, PROMO_PERCENT, discountCents, type PlanId } from "@/lib/ai/config";

// Stripe-compatible checkout. With STRIPE_SECRET_KEY set, a real Checkout
// Session is created via Stripe's REST API; without it the endpoint reports
// 501 so the UI can show an honest "payments not configured" state.
// The 50% promotion is applied to the amount sent to Stripe — the discount is
// real pricing, not a visual badge.
const STRIPE_API = "https://api.stripe.com/v1";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const planId = String(body?.plan || "") as PlanId;
  if (!(planId in PLANS) || planId === "free") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  const plan = PLANS[planId];
  const amountCents = discountCents(plan); // 50% promo applied at checkout

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "Payments are not configured on this deployment. Set STRIPE_SECRET_KEY (and the webhook secret) to enable checkout.",
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
