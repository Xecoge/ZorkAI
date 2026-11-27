import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { billingHistory, subscriptions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PLANS } from "@/lib/ai/config";
import { getSummary, monthlyModelUsage, recentTransactions } from "@/lib/credits";
import { effectivePlan } from "@/lib/admin";

// Billing & Plan dashboard — every number comes from the database.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Xecoge Max rows carry unlimited=1 and must never be touched by the
  // monthly-allowance renewal, which would reset their plan row.
  const credits = await getSummary(user.id);
  const planId = effectivePlan({ email: user.email, role: user.role, plan: user.plan });
  const planCfg = PLANS[planId];
  const unlimited = credits.unlimited || planId === "xmax";
  const sub = await one(
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)),
  );
  const usage = await monthlyModelUsage(user.id);
  const transactions = await recentTransactions(user.id, 20);
  const billing = await db
    .select()
    .from(billingHistory)
    .where(eq(billingHistory.userId, user.id))
    .orderBy(desc(billingHistory.createdAt))
    .limit(20);

  return NextResponse.json({
    plan: {
      id: planId,
      name: planCfg.name,
      priceCents: planCfg.priceCents,
      unlimited,
      status: sub?.status ?? "active",
      renewsAt: credits.renewsAt,
    },
    credits: {
      unlimited,
      monthlyAllowance: unlimited ? null : credits.monthlyAllowance,
      used: credits.used,
      remaining: unlimited ? null : credits.remaining,
      balance: unlimited ? null : credits.balance,
    },
    usage: {
      tokensIn: credits.tokensIn,
      tokensOut: credits.tokensOut,
      tokensTotal: credits.tokensIn + credits.tokensOut,
      byModel: usage.map((u) => ({
        model: u.model,
        requests: u.requests,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        credits: u.credits,
      })),
    },
    transactions,
    billing,
  });
}
