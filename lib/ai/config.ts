// Central Xecoge AI configuration: model registry and subscription plans.
// Everything the credit/billing/model-access system enforces lives here.
// The full gateway catalogue lives in lib/ai/catalog.ts (generated from the
// live /models response); the curated entries below carry hand-checked limits
// and are the ones the default routing prefers.
import { CATALOG, type CatalogRow } from "@/lib/ai/catalog";

export const DRAKE_BASE_URL = process.env.DRAKE_BASE_URL ?? "https://api.drakezakuru.com/v1";

export type PlanId = "free" | "plus" | "pro" | "max" | "xmax";

// Lowest to highest. `planAllows` compares positions in this list.
export const PLAN_ORDER: PlanId[] = ["free", "plus", "pro", "max", "xmax"];

export type ModelEntry = {
  id: string; // gateway model id used for routing
  name: string; // only this is shown in the picker — never the vendor
  provider: string; // gateway pool, kept for diagnostics only
  minPlan: PlanId;
  description?: string;
  creditsPer1kIn: number; // credits per 1,000 input tokens
  creditsPer1kOut: number; // credits per 1,000 output tokens
  contextLength: number;
  maxOutput: number;
  vision: boolean;
  reasoning: boolean;
  status: "available" | "degraded";
};

// Hand-checked against the gateway: these answer reliably and are the chain
// used when a newly added model returns 429/401/503 (see fallbacksFor).
const CURATED: ModelEntry[] = [
  {
    id: "guava3/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "guava3",
    minPlan: "free",
    description: "Fast, capable default",
    creditsPer1kIn: 0.02,
    creditsPer1kOut: 0.08,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "guava3/gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "guava3",
    minPlan: "free",
    description: "Cheapest, quickest answers",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.03,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "guava3/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "guava3",
    minPlan: "free",
    description: "Light and fast",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.04,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "guava3/gemini-3.8-flash-tiered",
    name: "Gemini 3.8 Flash",
    provider: "guava3",
    minPlan: "free",
    description: "Newest Gemini Flash",
    creditsPer1kIn: 0.03,
    creditsPer1kOut: 0.12,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "free/cline-free/nemotron-3.5-super-vl",
    name: "Nemotron 3.5 Super",
    provider: "cline-free",
    minPlan: "free",
    description: "Open model with vision",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.02,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "free/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano Omni",
    provider: "nvidia",
    minPlan: "free",
    description: "Small reasoning model",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.02,
    contextLength: 131_072,
    maxOutput: 32_768,
    vision: true,
    reasoning: true,
    status: "available",
  },
];

function fromCatalog([id, name, provider, inK, outK, ctx, vision, reasoning]: CatalogRow): ModelEntry {
  return {
    id,
    name,
    provider,
    minPlan: "free",
    creditsPer1kIn: inK,
    creditsPer1kOut: outK,
    contextLength: ctx,
    maxOutput: Math.min(32_768, ctx),
    vision: vision === 1,
    reasoning: reasoning === 1,
    status: "available",
  };
}

// Only models that answered a live request with the deployment's provider key
// are listed. The gateway advertises 453 ids but currently serves these; a
// picker full of models that answer 429 is worse than a short honest list.
// Verified 2026-11-27 by probing GET /models + one chat call per id.
export const VERIFIED_IDS = [
  "guava3/gemini-3-flash",
  "guava3/gemini-3.8-flash-tiered",
  "guava3/gemini-3.5-flash-lite",
  "guava3/gemini-3.1-flash-lite",
  "guava3/gemini-3.1-flash-image",
  "mango13/deepseek-v4.1-flash-1017",
  "free/tencent/hy4-flash:free",
  "free/upstage/solar-mini4:free",
] as const;

const VERIFIED = new Set<string>(VERIFIED_IDS);
const CATALOG_BY_ID = new Map(CATALOG.map((row) => [row[0], row]));

export const MODELS: ModelEntry[] = VERIFIED_IDS.map((id) => {
  const curated = CURATED.find((m) => m.id === id);
  if (curated) return curated;
  const row = CATALOG_BY_ID.get(id);
  return row ? fromCatalog(row) : null;
}).filter((m): m is ModelEntry => m !== null);

export const DEFAULT_MODEL_ID = "guava3/gemini-3-flash";

const DEFAULT_CHAIN = [
  "guava3/gemini-3-flash",
  "guava3/gemini-3.5-flash-lite",
  "guava3/gemini-3.1-flash-lite",
];

export const FALLBACKS: Record<string, string[]> = {
  "guava3/gemini-3-flash": ["guava3/gemini-3.1-flash-lite", "guava3/gemini-3.5-flash-lite"],
  "guava3/gemini-3.1-flash-lite": ["guava3/gemini-3-flash", "free/upstage/solar-mini4:free"],
  "guava3/gemini-3.5-flash-lite": ["guava3/gemini-3.1-flash-lite", "guava3/gemini-3-flash"],
  "guava3/gemini-3.8-flash-tiered": ["guava3/gemini-3-flash", "guava3/gemini-3.1-flash-lite"],
  "guava3/gemini-3.1-flash-image": ["guava3/gemini-3-flash"],
  "mango13/deepseek-v4.1-flash-1017": ["guava3/gemini-3-flash", "guava3/gemini-3.1-flash-lite"],
  "free/tencent/hy4-flash:free": ["guava3/gemini-3.1-flash-lite", "guava3/gemini-3-flash"],
  "free/upstage/solar-mini4:free": ["guava3/gemini-3.1-flash-lite", "guava3/gemini-3-flash"],
};

/** Models to try in order when `id` fails upstream (503, 429, quota, 401). */
export function fallbacksFor(id: string): string[] {
  const explicit = FALLBACKS[id];
  const chain = explicit ?? DEFAULT_CHAIN;
  return chain.filter((candidate) => candidate !== id);
}

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceCents: number; // full monthly price (0 = free)
  promoPercent: number; // current promotion discount (0 = none)
  monthlyCredits: number;
  monthlyTokens: number; // soft token allowance reported on the dashboard
  buildRuns: number; // Build-mode requests per month (-1 = unlimited)
  requestsPerDay: number; // rate limit (-1 = unlimited)
  maxOutputTokens: number; // per-response cap enforced server-side
  features: string[];
  blurb: string;
};

export const PROMO_PERCENT = 50;

// The ladder: Free → Plus → Pro → Max, plus the internal Xecoge Max that the
// owner hands out. Every plan except Free is paid; the 50% launch promotion
// applies to the price shown at checkout.
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    promoPercent: 0,
    monthlyCredits: 100,
    monthlyTokens: 500_000,
    buildRuns: 3,
    requestsPerDay: 30,
    maxOutputTokens: 4096,
    features: ["100 credits a month", "Every chat model", "3 Build runs a month", "30 requests a day"],
    blurb: "Try real AI models",
  },
  plus: {
    id: "plus",
    name: "Plus",
    priceCents: 1500,
    promoPercent: PROMO_PERCENT,
    monthlyCredits: 2_000,
    monthlyTokens: 5_000_000,
    buildRuns: 25,
    requestsPerDay: 200,
    maxOutputTokens: 8192,
    features: ["2,000 credits a month", "Every chat model", "25 Build runs a month", "200 requests a day"],
    blurb: "More credits, more models",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 2500,
    promoPercent: PROMO_PERCENT,
    monthlyCredits: 6_000,
    monthlyTokens: 20_000_000,
    buildRuns: 100,
    requestsPerDay: 600,
    maxOutputTokens: 16_384,
    features: ["6,000 credits a month", "Frontier models unlocked", "100 Build runs a month", "600 requests a day"],
    blurb: "Frontier models unlocked",
  },
  max: {
    id: "max",
    name: "Max",
    priceCents: 7000,
    promoPercent: PROMO_PERCENT,
    monthlyCredits: 20_000,
    monthlyTokens: 100_000_000,
    buildRuns: -1,
    requestsPerDay: -1,
    maxOutputTokens: 32_768,
    features: ["Unlimited requests", "Everything unlocked", "Unlimited Build runs", "Highest limits"],
    blurb: "Everything, at the highest limits",
  },
  xmax: {
    id: "xmax",
    name: "Xecoge Max",
    priceCents: 0,
    promoPercent: 0,
    monthlyCredits: 0, // ignored: unlimited flag on user_credits governs balance
    monthlyTokens: -1,
    buildRuns: -1,
    requestsPerDay: -1,
    maxOutputTokens: 32_768,
    features: ["Unlimited platform credits", "Everything unlocked", "Reserved for the owner and staff"],
    blurb: "Exclusive internal plan — unlimited platform credits",
  },
};

export function creditsFor(model: ModelEntry, inputTokens: number, outputTokens: number): number {
  const raw = (inputTokens / 1000) * model.creditsPer1kIn + (outputTokens / 1000) * model.creditsPer1kOut;
  return Math.max(1, Math.ceil(raw));
}

export function planAllows(plan: PlanId, model: ModelEntry): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(model.minPlan);
}

export function normalizePlan(plan: string | null | undefined): PlanId {
  const value = (plan ?? "").trim().toLowerCase();
  if (value === "xmax") return "xmax";
  if (value === "max") return "max";
  if (value === "pro") return "pro";
  if (value === "plus") return "plus";
  return "free";
}

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelOrThrow(id: string): ModelEntry {
  const m = getModel(id);
  if (!m) throw new Error(`Unknown model: ${id}`);
  return m;
}

export function discountCents(plan: PlanConfig): number {
  return Math.round(plan.priceCents * (1 - plan.promoPercent / 100));
}
