// Server-side credit engine. All balances move inside transactions with a row
// lock so concurrent requests can never double-spend or go negative.
// Never import from client components.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creditTransactions, modelUsage, userCredits, users } from "@/lib/db/schema";
import { PLANS, type PlanId } from "@/lib/ai/config";
import { newId } from "@/lib/auth";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export type CreditSummary = {
  plan: PlanId;
  unlimited: boolean;
  balance: number;
  monthlyAllowance: number;
  used: number;
  remaining: number;
  tokensIn: number;
  tokensOut: number;
  periodStart: number;
  renewsAt: number;
};

export async function ensureCredits(userId: string): Promise<CreditSummary> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  const plan = (user.plan as PlanId) in PLANS ? (user.plan as PlanId) : "free";
  const planCfg = PLANS[plan];

  await db
    .insert(userCredits)
    .values({
      userId,
      plan,
      monthlyAllowance: planCfg.monthlyCredits,
      balance: planCfg.monthlyCredits,
      periodStart: Date.now(),
      updatedAt: Date.now(),
    })
    .onConflictDoNothing();

  // Monthly renewal: grant a fresh allowance when the period rolls over.
  await db
    .update(userCredits)
    .set({
      plan,
      monthlyAllowance: planCfg.monthlyCredits,
      balance: sql`${userCredits.monthlyAllowance}`,
      usedThisPeriod: 0,
      tokensIn: 0,
      tokensOut: 0,
      periodStart: Date.now(),
      updatedAt: Date.now(),
    })
    .where(and(eq(userCredits.userId, userId), sql`${userCredits.periodStart} <= ${Date.now() - PERIOD_MS}`));

  return getSummary(userId);
}

export async function getSummary(userId: string): Promise<CreditSummary> {
  const [row] = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (!row) return ensureCredits(userId);
  return {
    plan: row.plan as PlanId,
    unlimited: row.unlimited === 1,
    balance: row.balance,
    monthlyAllowance: row.monthlyAllowance,
    used: row.usedThisPeriod,
    remaining: row.unlimited === 1 ? Infinity : row.balance,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    periodStart: row.periodStart,
    renewsAt: row.periodStart + PERIOD_MS,
  };
}

// Atomically debit up to `cost` credits. Returns the actual amount debited
// (may be less than requested when the balance is running out) or null when
// the request cannot be afforded at all.
export type Hold = { holdId: string; debited: number; balance: number };

export async function reserveCredits(
  userId: string,
  cost: number,
  description: string,
  model: string | null,
  inputTokens: number | null,
): Promise<Hold | null> {
  const holdId = newId();
  return db.transaction(async (tx): Promise<Hold | null> => {
    const [row] = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).for("update");
    if (!row) return null;
    if (row.unlimited === 1) {
      // Unlimited entitlement: no cap, but usage is still recorded.
      await tx.insert(creditTransactions).values({
        id: holdId,
        userId,
        kind: "hold",
        model,
        credits: 0,
        inputTokens,
        outputTokens: null,
        balanceAfter: null,
        description,
        createdAt: Date.now(),
      });
      return { debited: 0, balance: Infinity, holdId };
    }
    if (row.balance < 1) return null; // cannot afford even 1 credit
    const debited = Math.min(row.balance, cost);
    const balance = row.balance - debited;
    await tx
      .update(userCredits)
      .set({
        balance,
        usedThisPeriod: row.usedThisPeriod + debited,
        updatedAt: Date.now(),
      })
      .where(eq(userCredits.userId, userId));
    await tx.insert(creditTransactions).values({
      id: holdId,
      userId,
      kind: "hold",
      model,
      credits: -debited,
      inputTokens,
      outputTokens: null,
      balanceAfter: balance,
      description,
      createdAt: Date.now(),
    });
    return { debited, balance, holdId };
  });
}

// After the provider responds: charge the real cost inside the hold, refunding
// the difference. Tokens are accumulated for the usage dashboard.
export async function settleCredits(opts: {
  userId: string;
  holdId?: string;
  holdAmount: number;
  actualCost: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<{ balance: number; charged: number; refunded: number }> {
  const { userId, holdId, holdAmount, actualCost, model, inputTokens, outputTokens } = opts;
  const month = new Date().toISOString().slice(0, 7);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).for("update");
    if (!row) throw new Error("credit row missing");

    let charged = actualCost;
    let refunded = 0;
    let balance = row.balance;

    if (row.unlimited === 1) {
      charged = 0;
    } else if (actualCost > holdAmount) {
      // Under-estimated: take the difference now (settle() is called only after
      // reserveCredits already approved the request).
      const extra = Math.min(row.balance, actualCost - holdAmount);
      charged = holdAmount + extra;
      refunded = 0;
      balance = row.balance - extra;
    } else if (actualCost < holdAmount) {
      refunded = holdAmount - actualCost;
      charged = actualCost;
      balance = row.balance + refunded;
    } else {
      charged = holdAmount;
    }

    await tx
      .update(userCredits)
      .set({
        balance,
        usedThisPeriod: row.usedThisPeriod + (charged - holdAmount),
        tokensIn: row.tokensIn + inputTokens,
        tokensOut: row.tokensOut + outputTokens,
        updatedAt: Date.now(),
      })
      .where(eq(userCredits.userId, userId));

    if (holdId) {
      await tx
        .update(creditTransactions)
        .set({
          kind: "charge",
          credits: -charged,
          outputTokens,
          balanceAfter: balance,
          description: `Chat with ${model}`,
        })
        .where(eq(creditTransactions.id, holdId));
    }
    if (refunded > 0) {
      await tx.insert(creditTransactions).values({
        id: newId(),
        userId,
        kind: "refund",
        model,
        credits: refunded,
        inputTokens: null,
        outputTokens: null,
        balanceAfter: balance,
        description: "Reserved credits refunded",
        createdAt: Date.now(),
      });
    }

    const usageId = `${userId}:${model}:${month}`;
    await tx
      .insert(modelUsage)
      .values({
        id: usageId,
        userId,
        model,
        requests: 1,
        inputTokens,
        outputTokens,
        credits: charged,
        periodMonth: month,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: modelUsage.id,
        set: {
          requests: sql`${modelUsage.requests} + 1`,
          inputTokens: sql`${modelUsage.inputTokens} + ${inputTokens}`,
          outputTokens: sql`${modelUsage.outputTokens} + ${outputTokens}`,
          credits: sql`${modelUsage.credits} + ${charged}`,
          updatedAt: Date.now(),
        },
      });

    return { balance, charged, refunded };
  });
}

// Release a hold completely when the provider request failed.
export async function refundHold(userId: string, holdId?: string, holdAmount = 0): Promise<number> {
  if (!holdId || holdAmount <= 0) return 0;
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).for("update");
    if (!row) return 0;
    const balance = row.balance + holdAmount;
    await tx
      .update(userCredits)
      .set({ balance, usedThisPeriod: Math.max(0, row.usedThisPeriod - holdAmount), updatedAt: Date.now() })
      .where(eq(userCredits.userId, userId));
    await tx
      .update(creditTransactions)
      .set({ kind: "refund", credits: holdAmount, balanceAfter: balance, description: "Failed request refunded" })
      .where(eq(creditTransactions.id, holdId));
    return holdAmount;
  });
}

export async function recentTransactions(userId: string, limit = 20) {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function monthlyModelUsage(userId: string) {
  const month = new Date().toISOString().slice(0, 7);
  return db
    .select()
    .from(modelUsage)
    .where(and(eq(modelUsage.userId, userId), eq(modelUsage.periodMonth, month)))
    .orderBy(desc(modelUsage.credits));
}
