import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { MODELS, PLANS, PLAN_ORDER, planAllows, discountCents, normalizePlan } from "@/lib/ai/config";
import { getSummary } from "@/lib/credits";
import { providerConfigured } from "@/lib/ai/provider";
import { roleOf } from "@/lib/admin";

// The model registry the frontend renders from. All access rules and credit
// costs are computed here on the server — the client never decides access.
export async function GET() {
  const user = await getSessionUser();
  const credits = user ? await getSummary(user.id) : null;
  const plan = normalizePlan(user?.plan ?? credits?.plan);
  return NextResponse.json({
    configured: await providerConfigured(),
    plan,
    role: user ? roleOf(user) : "user",
    status: user ? (user.status ?? "active") : "active",
    unlimited: credits?.unlimited ?? false,
    balance: credits?.unlimited ? null : credits?.balance ?? null,
    remaining: credits?.unlimited ? null : (credits?.remaining ?? null),
    models: MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
      status: m.status,
      minPlan: m.minPlan,
      allowed: planAllows(plan, m),
      creditsPer1kIn: m.creditsPer1kIn,
      creditsPer1kOut: m.creditsPer1kOut,
      contextLength: m.contextLength,
      vision: m.vision,
      reasoning: m.reasoning,
    })),
    plans: PLAN_ORDER.map((id) => {
      const p = PLANS[id];
      return {
        id,
        name: p.name,
        priceCents: p.priceCents,
        priceAfterPromoCents: id === "free" ? 0 : discountCents(p),
        promoPercent: p.promoPercent,
        monthlyCredits: p.monthlyCredits,
        buildRuns: p.buildRuns,
        features: p.features,
        blurb: p.blurb,
      };
    }),
  });
}
