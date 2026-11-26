import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { billingHistory, subscriptions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/ai/config";
import { ensureCredits, monthlyModelUsage, recentTransactions } from "@/lib/credits";

// Billing & Plan dashboard — every number comes from the database.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credits = await ensureCredits(user.id);
  const planCfg = PLANS[credits.plan as PlanId];
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
      id: credits.plan,
      name: planCfg.name,
      priceCents: planCfg.priceCents,
      unlimited: credits.unlimited,
      status: sub?.status ?? "active",
      renewsAt: credits.renewsAt,
    },
    credits: {
      unlimited: credits.unlimited,
      monthlyAllowance: credits.unlimited ? null : credits.monthlyAllowance,
      used: credits.used,
      remaining: credits.unlimited ? null : credits.remaining,
      balance: credits.unlimited ? null : credits.balance,
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
