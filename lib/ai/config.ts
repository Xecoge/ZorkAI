// Central Xecoge AI configuration: model registry and subscription plans.
// Everything the credit/billing/model-access system enforces lives here.
// Model IDs below were verified live against the provider gateway on 2026-11-26
// (GET {MLAI_BASE_URL}/models). Do not edit an ID without re-verifying.

export const MLAI_BASE_URL = process.env.MLAI_BASE_URL ?? "https://api.ai.ml/v1";

export type PlanId = "free" | "plus" | "pro" | "max";

export type ModelEntry = {
  id: string; // provider model id used for routing
  name: string;
  provider: "anthropic" | "openai" | "zai";
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

// creditsPer1k rates derive from the provider's $/MTok pricing ÷ 50, rounded:
// e.g. GLM 5.3 Flash $0.15/$0.50 per MTok → 0.003/0.01 credits per 1k tokens.
export const MODELS: ModelEntry[] = [
  {
    id: "zai/glm-5.3-flash",
    name: "GLM 5.3 Flash",
    provider: "zai",
    description: "Fast, cost-efficient model for everyday requests",
    minPlan: "free",
    creditsPer1kIn: 0.01,
    creditsPer1kOut: 0.01,
    contextLength: 1000000,
    maxOutput: 128000,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    name: "Claude Sonnet 5.5",
    provider: "anthropic",
    description: "Balanced speed and intelligence for daily work",
    minPlan: "free",
    creditsPer1kIn: 0.04,
    creditsPer1kOut: 0.2,
    contextLength: 1000000,
    maxOutput: 128000,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "zai/glm-5.3",
    name: "GLM 5.3",
    provider: "zai",
    description: "Full GLM 5.3 with a 1M-token context window",
    minPlan: "plus",
    creditsPer1kIn: 0.03,
    creditsPer1kOut: 0.09,
    contextLength: 1000000,
    maxOutput: 128000,
    vision: false, // text only — verified on the gateway
    reasoning: true,
    status: "available",
  },
  {
    id: "openai/gpt-6.1-sol",
    name: "ChatGPT 6.1 Sol",
    provider: "openai",
    description: "Very fast frontier model with a large context",
    minPlan: "pro",
    creditsPer1kIn: 0.04,
    creditsPer1kOut: 0.21,
    contextLength: 272000,
    maxOutput: 128000,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "anthropic/claude-opus-5.5",
    name: "Claude Opus 5.5",
    provider: "anthropic",
    description: "The strongest model for hard, long-running work",
    minPlan: "pro",
    creditsPer1kIn: 0.08,
    creditsPer1kOut: 0.42,
    contextLength: 1000000,
    maxOutput: 128000,
    vision: true,
    reasoning: true,
    status: "available",
  },
  {
    id: "openai/gpt-6.1-sol-pro",
    name: "ChatGPT 6.1 Sol Pro",
    provider: "openai",
    description: "Priority tier of 6.1 Sol for the heaviest requests",
    minPlan: "max",
    creditsPer1kIn: 0.04,
    creditsPer1kOut: 0.21,
    contextLength: 272000,
    maxOutput: 128000,
    vision: true,
    reasoning: true,
    status: "available",
  },
];

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceCents: number; // full monthly price
  promoPercent: number; // current promotion discount (50 = half price)
  monthlyCredits: number;
  monthlyTokens: number; // soft token allowance reported on the dashboard
  buildRuns: number; // Build-mode requests per month (-1 = unlimited)
  requestsPerDay: number; // rate limit (-1 = unlimited)
  maxOutputTokens: number; // per-response cap enforced server-side
  features: string[];
  blurb: string;
};

export const PROMO_PERCENT = 50;

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
    blurb: "Try real AI models",
    features: [
      "100 credits every month",
      "GLM 5.3 Flash & Claude Sonnet 5.5",
      "3 Build runs per month",
      "Conversation history",
    ],
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
    blurb: "More credits, more models",
    features: [
      "2,000 credits every month",
      "Everything in Free + GLM 5.3",
      "25 Build runs per month",
      "Longer responses (8K tokens)",
    ],
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
    blurb: "Frontier models unlocked",
    features: [
      "6,000 credits every month",
      "Claude Opus 5.5 & ChatGPT 6.1 Sol",
      "100 Build runs per month",
      "Priority request handling",
    ],
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
    maxOutputTokens: 32768,
    blurb: "Everything, at the highest limits",
    features: [
      "20,000 credits every month",
      "All models incl. 6.1 Sol Pro",
      "Unlimited Build runs",
      "Highest rate limits",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "plus", "pro", "max"];

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
