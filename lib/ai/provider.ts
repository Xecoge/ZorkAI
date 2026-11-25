import { newId } from "@/lib/auth";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Mode = "auto" | "fast" | "expert" | "heavy";

export type ProviderResult = {
  content: string;
  sources?: number;
  thinking?: string;
};

export interface AIProvider {
  /** Human-readable label shown in logs only. */
  readonly name: string;
  complete(messages: ChatMessage[], mode: Mode, opts?: { projectName?: string; instructions?: string }): Promise<ProviderResult>;
}

/**
 * OpenAI-compatible provider — used when AI_API_KEY / AI_BASE_URL are set.
 * Works with xAI, OpenAI, OpenRouter, or any compatible endpoint.
 */
class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";
  async complete(messages: ChatMessage[], mode: Mode): Promise<ProviderResult> {
    const model = process.env.AI_MODEL || "grok-4.7";
    const system: ChatMessage = {
      role: "assistant",
      content:
        "You are a helpful AI assistant in a premium chat app. Answer in clean markdown with headings, lists, tables and fenced code blocks where useful. Be concise and accurate.",
    };
    const temperature = mode === "expert" || mode === "heavy" ? 0.4 : 0.7;
    const res = await fetch(`${process.env.AI_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [system, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty provider response");
    return { content };
  }
}

/**
 * Deterministic local provider — default when no API key is configured.
 * Clearly labeled in code as a demo responder; produces real markdown so the
 * product is fully explorable offline. Never presented as live model output.
 */
class DemoProvider implements AIProvider {
  readonly name = "demo";
  async complete(messages: ChatMessage[], mode: Mode): Promise<ProviderResult> {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const q = (last?.content || "").trim();
    const took = mode === "expert" || mode === "heavy" ? 4 : 1;
    const content = `Here's a take on **${q.slice(0, 120) || "your question"}**.

> This reply comes from the built-in demo responder — no \`AI_API_KEY\` is configured on this deployment. Set \`AI_BASE_URL\`, \`AI_API_KEY\` and optionally \`AI_MODEL\` (for example \`grok-4.7\`) to route replies to a live model.

**How I'd approach it**

1. Frame the question precisely — what would a great answer change for you?
2. Gather the two or three sources that matter most and skim them first.
3. Draft, then cut everything that does not support the main point.

| Option | Best for | Trade-off |
| --- | --- | --- |
| Quick answer | Getting unstuck fast | Less depth |
| Structured plan | Decisions you'll defend | Takes longer to read |
| Deep dive | High-stakes work | Most tokens, most time |

\`\`\`ts
// Example: calling a chat model
const reply = await client.chat.create({
  model: "grok-4.7",
  messages: [{ role: "user", content: "${q.replace(/["\\]/g, "").slice(0, 60) || "Hello"}" }],
});
\`\`\`

Want me to go deeper on any of these?`;
    return { content, sources: took * 11, thinking: mode === "fast" ? undefined : "Planning next moves" };
  }
}

export function getProvider(): AIProvider {
  if (process.env.AI_API_KEY && process.env.AI_BASE_URL) return new OpenAICompatibleProvider();
  return new DemoProvider();
}

export const MODES: Record<Mode, { label: string; description: string; paid: boolean }> = {
  auto: { label: "Auto", description: "Chooses Fast or Expert", paid: true },
  fast: { label: "Fast", description: "Quick responses", paid: false },
  expert: { label: "Expert", description: "Thinks hard · Grok 4.7", paid: true },
  heavy: { label: "Heavy", description: "Team of Experts · Grok 4.7", paid: true },
};

export function normalizeMode(v: unknown): Mode {
  return typeof v === "string" && v in MODES ? (v as Mode) : "fast";
}

export { newId };
