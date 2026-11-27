// Central Xecoge AI configuration: model registry and subscription plans.
// Everything the credit/billing/model-access system enforces lives here.
// Model IDs below were verified live against the Drake gateway on 2026-11-27
// (GET {DRAKE_BASE_URL}/models + one real completion each). Do not edit an ID
// without re-verifying: the gateway rejects models whose upstream is out of quota.

export const DRAKE_BASE_URL = process.env.DRAKE_BASE_URL ?? "https://api.drakezakuru.com/v1";

export type PlanId = "free" | "max";

export type ModelEntry = {
  id: string; // gateway model id used for routing
  name: string; // only this is shown in the picker — never the vendor
  provider: string; // gateway pool; kept for diagnostics, never rendered
  description: string;
  minPlan: PlanId; // lowest plan that may use this model
  creditsPer1kIn: number; // credits per 1,000 input tokens
  creditsPer1kOut: number; // credits per 1,000 output tokens
  contextLength: number;
  maxOutput: number;
  vision: boolean;
  reasoning: boolean;
  status: "available" | "degraded" | "offline";
};

// Ordered fastest-first: the first entry is the default so a new chat answers
// in about a second. Every id below answered a live completion on 2026-11-27.
export const MODELS: ModelEntry[] = [
  {
    id: "guava3/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "gemini",
    description: "Quick, capable default",
    minPlan: "free",
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
    provider: "gemini",
    description: "Lightest and fastest",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.03,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: false,
    reasoning: false,
    status: "available",
  },
  {
    id: "guava3/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    description: "Newer lightweight model",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.04,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: false,
    reasoning: false,
    status: "available",
  },
  {
    id: "guava3/gemini-3.8-flash-tiered",
    name: "Gemini 3.8 Flash",
    provider: "gemini",
    description: "Thinks harder on complex requests",
    minPlan: "free",
    creditsPer1kIn: 0.03,
    creditsPer1kOut: 0.12,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "free/cline-free/nemotron-3.5-super-vl",
    name: "Nemotron 3.5 Super",
    provider: "nemotron",
    description: "Fast open model with vision",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.02,
    contextLength: 1_000_000,
    maxOutput: 65_536,
    vision: true,
    reasoning: false,
    status: "available",
  },
  {
    id: "free/nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    provider: "nemotron",
    description: "Largest open model on the gateway",
    minPlan: "free",
    creditsPer1kIn: 0.02,
    creditsPer1kOut: 0.06,
    contextLength: 262_144,
    maxOutput: 65_536,
    vision: false,
    reasoning: true,
    status: "available",
  },
  {
    id: "free/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano Omni",
    provider: "nemotron",
    description: "Small, reasoning-first model",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.02,
    contextLength: 131_072,
    maxOutput: 32_768,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "free/tencent/hy4-flash:free",
    name: "Hunyuan 4 Flash",
    provider: "hunyuan",
    description: "Long-context Chinese-English model",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.03,
    contextLength: 262_144,
    maxOutput: 32_768,
    vision: false,
    reasoning: false,
    status: "available",
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

// The gateway answers 503/429 for a model when its upstream pool is drained.
// Each model lists cheaper-or-equal substitutes, tried in order by the provider
// so a chat still answers instead of failing; billing then uses the model that
// actually served the request, never a more expensive one than was charged for.
export const FALLBACKS: Record<string, string[]> = {
  "guava3/gemini-3-flash": ["guava3/gemini-3.1-flash-lite", "free/cline-free/nemotron-3.5-super-vl"],
  "guava3/gemini-3.1-flash-lite": ["free/cline-free/nemotron-3.5-super-vl", "free/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
  "guava3/gemini-3.5-flash-lite": ["guava3/gemini-3.1-flash-lite", "free/cline-free/nemotron-3.5-super-vl"],
  "guava3/gemini-3.8-flash-tiered": ["guava3/gemini-3-flash", "guava3/gemini-3.1-flash-lite"],
  "free/cline-free/nemotron-3.5-super-vl": ["free/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
  "free/nvidia/nemotron-3-ultra-550b-a55b:free": ["guava3/gemini-3.1-flash-lite", "free/cline-free/nemotron-3.5-super-vl"],
  "free/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": ["free/cline-free/nemotron-3.5-super-vl"],
  "free/tencent/hy4-flash:free": ["guava3/gemini-3.1-flash-lite", "free/cline-free/nemotron-3.5-super-vl"],
};

export function fallbacksFor(id: string): string[] {
  return FALLBACKS[id] ?? [];
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

export const PROMO_PERCENT = 0;

// One plan, Max. Activating it is free for now and permanent: the entitlement
// is stored in the database (users.plan + user_credits.unlimited) and never
// expires. Payment is not wired up yet — checkout returns a stub.
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    promoPercent: 0,
    monthlyCredits: 300,
    monthlyTokens: 1_000_000,
    buildRuns: 5,
    requestsPerDay: 50,
    maxOutputTokens: 4096,
    blurb: "Start chatting with every model",
    features: [
      "300 credits every month",
      "Every model in the picker",
      "5 Build runs per month",
      "Conversation history",
    ],
  },
  max: {
    id: "max",
    name: "Max",
    priceCents: 0,
    promoPercent: 0,
    monthlyCredits: 0, // ignored: user_credits.unlimited governs the balance
    monthlyTokens: -1,
    buildRuns: -1,
    requestsPerDay: -1,
    maxOutputTokens: 32768,
    blurb: "Free for now, yours forever",
    features: [
      "Unlimited credits",
      "Every model, highest limits",
      "Longest responses (32K tokens)",
      "Unlimited Build runs",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "max"];

export function planAllows(plan: PlanId, model: ModelEntry): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(model.minPlan);
}

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelOrThrow(id: string): ModelEntry {
  const m = getModel(id);
  if (!m) throw new Error(`Unknown model: ${id}`);
  return m;
}

export function creditsFor(model: ModelEntry, inputTokens: number, outputTokens: number): number {
  const raw = (inputTokens / 1000) * model.creditsPer1kIn + (outputTokens / 1000) * model.creditsPer1kOut;
  return Math.max(1, Math.ceil(raw));
}

export function discountCents(plan: PlanConfig): number {
  return Math.round(plan.priceCents * (1 - plan.promoPercent / 100));
}
