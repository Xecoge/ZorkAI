// Drake gateway integration (OpenAI-compatible, verified 2026-11-27).
// Base URL: https://api.drakezakuru.com/v1 (override with DRAKE_BASE_URL).
// Auth: Authorization: Bearer <DRAKE_API_KEY> — server-side only, never shipped
// to the browser. Streaming uses SSE with stream_options.include_usage so the
// final event carries true token usage for billing.
import { DRAKE_BASE_URL } from "@/lib/ai/config";
import { getSetting } from "@/lib/settings";

export const PROVIDER_KEY_SETTING = "drake_api_key";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Mode = "auto" | "fast" | "expert" | "heavy" | "build";

export type StreamEvent =
  | { type: "model"; model: string }
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string };

export type ProviderResult = {
  content: string;
  sources?: number;
  thinking?: string;
  inputTokens?: number;
  outputTokens?: number;
};

const SYSTEM_PROMPT =
  "You are Xecoge, a helpful AI assistant in a premium chat app. Answer in clean markdown with headings, lists, tables and fenced code blocks where useful. Be concise and accurate. Reply in the language the user writes in.";

// The provider key is read server-side only. A key saved in the admin panel
// wins over the deployment variable, so a stale DRAKE_API_KEY can be replaced
// from the UI without a redeploy. MLAI_API_KEY is never used: those platform
// keys are not valid on this gateway.
export async function providerKey(): Promise<string | undefined> {
  const stored = await getSetting(PROVIDER_KEY_SETTING);
  if (stored) return stored;
  return (process.env.DRAKE_API_KEY || "").trim() || undefined;
}

function headersFor(key: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

/** Explains an upstream rejection in terms the person can act on. */
function failureDetail(status: number, upstream: string): string {
  const message = upstream.trim();
  // Model-level refusals come first: a 403 for a VIP-only model is not a bad key.
  if (/vip\/svip|premium model/i.test(message)) {
    return "Эта модель требует VIP-доступа на шлюзе. Ответила другая модель.";
  }
  if (/quota|cooldown|rate limit|resource_exhausted/i.test(message)) {
    return "У ключа провайдера закончилась квота на эту модель. Ответила другая модель.";
  }
  if (status === 401 || status === 403) {
    return `Ключ провайдера отклонён (${status}). Сохраните рабочий ключ в админ-панели.`;
  }
  return message || `Провайдер ответил ${status}.`;
}

export async function providerConfigured(): Promise<boolean> {
  return Boolean(await providerKey());
}


/**
 * Stream a chat completion from the Drake gateway. Yields the id of the model
 * that actually served the request (the gateway can be out of capacity for a
 * given model), then deltas and a final usage event. `fallbacks` are tried in
 * order when the first model returns a non-200 response, so a chat still
 * answers quickly instead of failing. `signal` aborts the upstream request.
 */
export async function* streamCompletion(opts: {
  model: string;
  fallbacks?: string[];
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const body = (model: string) =>
    JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...opts.messages],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    });
  const url = `${DRAKE_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, AbortSignal.timeout(120_000)])
    : AbortSignal.timeout(120_000);

  const key = await providerKey();
  if (!key) {
    yield {
      type: "error",
      message: "Ключ провайдера не настроен. Откройте админ-панель и сохраните ключ.",
    };
    return;
  }
  const headers = headersFor(key);

  let res: Response | null = null;
  let served = opts.model;
  let detail = "";
  for (const candidate of [opts.model, ...(opts.fallbacks ?? [])]) {
    if (opts.signal?.aborted) break;
    try {
      const r = await fetch(url, { method: "POST", headers, signal, body: body(candidate) });
      if (r.ok && r.body) {
        res = r;
        served = candidate;
        break;
      }
      let upstream = "";
      try {
        const errBody = await r.json();
        upstream = String(errBody?.error?.message ?? "");
      } catch {
        /* keep status-only detail */
      }
      detail = failureDetail(r.status, upstream);
    } catch (e) {
      if (opts.signal?.aborted) break;
      detail = e instanceof Error ? `Provider error: ${e.message}` : "Provider error";
    }
  }
  if (!res || !res.body) {
    yield { type: "error", message: detail || "The model is unavailable right now." };
    return;
  }
  yield { type: "model", model: served };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        const text: string | undefined = chunk.choices?.[0]?.delta?.content;
        if (text) yield { type: "delta", text };
        if (chunk.usage) {
          yield {
            type: "usage",
            inputTokens: chunk.usage.prompt_tokens ?? 0,
            outputTokens: chunk.usage.completion_tokens ?? 0,
          };
        }
      } catch {
        /* skip malformed keep-alive lines */
      }
    }
  }
}

/** Non-streaming completion, used as a fallback and for title generation. */
export async function complete(opts: {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<ProviderResult> {
  const key = await providerKey();
  if (!key) throw new Error("Ключ провайдера не настроен: сохраните его в админ-панели.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${DRAKE_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: headersFor(key),
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...opts.messages],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    if (!res.ok) {
      let upstream = "";
      try {
        const errBody = await res.json();
        upstream = String(errBody?.error?.message ?? "");
      } catch {
        /* status-only */
      }
      throw new Error(failureDetail(res.status, upstream));
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty provider response");
    return {
      content,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const MODES: Record<Mode, { label: string; description: string; paid: boolean }> = {
  auto: { label: "Auto", description: "Chooses Fast or Expert", paid: true },
  fast: { label: "Fast", description: "Quick responses", paid: false },
  expert: { label: "Expert", description: "Thinks hard", paid: true },
  heavy: { label: "Heavy", description: "Team of Experts", paid: true },
  build: { label: "Build", description: "Ship a working prototype", paid: true },
};

export function normalizeMode(v: unknown): Mode {
  return typeof v === "string" && v in MODES ? (v as Mode) : "fast";
}
