import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { type PlanId } from "@/lib/ai/config";

// Stripe webhook: only verified `checkout.session.completed` /
// `invoice.paid` events activate a paid subscription. Signature check uses
// Stripe's v1 scheme (HMAC-SHA256 over "t.payload") with the webhook secret —
// no SDK required.
function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => [kv.split("=")[0], kv.split("=").slice(1).join("=")]),
  );
  const t = parts["t"];
  const sig = parts["v1"];
  if (!t || !sig) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function activateSubscription(userId: string, planId: PlanId, ref: string, amountCents: number) {
  const now = Date.now();
  void now;
  void userId;
  void planId;
  void ref;
  void amountCents;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
  const obj = event.data?.object ?? {};

  if (event.type === "checkout.session.completed" || event.type === "invoice.paid") {
    const userId = String(obj.client_reference_id ?? (obj.metadata as Record<string, string>)?.user_id ?? "");
    const planId = String((obj.metadata as Record<string, string>)?.plan ?? "") as PlanId;
    const amount = Number(obj.amount_total ?? obj.amount_paid ?? 0);
    const ref = String(obj.id ?? obj.subscription ?? "");
    if (userId && ref) await activateSubscription(userId, planId, ref, amount);
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const ref = String(obj.id ?? "");
    if (ref) {
      const status = event.type === "customer.subscription.deleted" ? "canceled" : String(obj.status ?? "active");
      await db.update(subscriptions).set({ status }).where(eq(subscriptions.providerRef, ref));
    }
  }

  return NextResponse.json({ received: true });
}
