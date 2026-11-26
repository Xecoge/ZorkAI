// Real ML AI provider integration (OpenAI-compatible gateway, verified 2026-11-26).
// Base URL: https://api.ai.ml/v1 (override with MLAI_BASE_URL).
// Auth: Authorization: Bearer <MLAI_API_KEY> — server-side only, never shipped
// to the browser. Streaming uses SSE with stream_options.include_usage so the
// final event carries true token usage for billing.
import { MLAI_BASE_URL } from "@/lib/ai/config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Mode = "auto" | "fast" | "expert" | "heavy" | "build";

export type StreamEvent =
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

function authHeaders(): HeadersInit {
  const key = (process.env.MLAI_API_KEY || "").trim();
  if (!key) throw new Error("MLAI_API_KEY is not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export function providerConfigured(): boolean {
  return Boolean(process.env.MLAI_API_KEY);
}

/**
 * Stream a chat completion from the ML AI gateway. Yields deltas and a final
 * usage event. `signal` aborts the upstream request when the client leaves.
 */
export async function* streamCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${MLAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...opts.messages],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) {
    let detail = `Provider error ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.error?.message ? `${detail}: ${body.error.message}` : detail;
    } catch {
      /* keep status-only detail */
    }
    yield { type: "error", message: detail };
    return;
  }

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${MLAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: authHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...opts.messages],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
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
