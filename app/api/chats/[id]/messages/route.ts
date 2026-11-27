import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { chats, messages, projects, userCredits } from "@/lib/db/schema";
import { getSessionUser, newId } from "@/lib/auth";
import { normalizeMode, providerConfigured, streamCompletion, type ChatMessage } from "@/lib/ai/provider";
import { creditsFor, getModel, planAllows, PLANS, DEFAULT_MODEL_ID, fallbacksFor, normalizePlan, type PlanId } from "@/lib/ai/config";
import { ensureCredits, getSummary, refundHold, reserveCredits, settleCredits } from "@/lib/credits";
import { accountBlock, blockMessage } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const chat = await one(db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id))));
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
  return NextResponse.json({ chat, messages: rows });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const block = accountBlock(user);
  if (block) return NextResponse.json({ error: blockMessage(block), blocked: block.status }, { status: 403 });
  const chat = await one(db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id))));
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { content?: unknown; regenerate?: unknown; mode?: unknown; model?: unknown } | null;
  const regenerate = Boolean(body?.regenerate);
  const content = String(body?.content || "").trim();
  if (!content && !regenerate) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  // --- Model resolution and access check (server-side, registry-driven) ---
  // Xecoge Max rows (unlimited=1) bypass ensureCredits: the monthly renewal
  // must never rewrite their plan or allowance.
  const [creditsRow] = await db.select().from(userCredits).where(eq(userCredits.userId, user.id)).limit(1);
  const credits = creditsRow?.unlimited === 1 ? await getSummary(user.id) : await ensureCredits(user.id);
  const plan: PlanId = normalizePlan(user.plan ?? credits.plan);
  const requestedModel = typeof body?.model === "string" ? body.model : null;
  const model = (requestedModel && getModel(requestedModel)) || getModel(DEFAULT_MODEL_ID)!;
  if (!planAllows(plan, model)) {
    return NextResponse.json(
      { error: `${model.name} requires the ${PLANS[model.minPlan].name} plan.`, upgradeTo: model.minPlan },
      { status: 403 },
    );
  }
  const planCfg = PLANS[plan];
  const mode = normalizeMode(body?.mode ?? chat.mode);
  const now = Date.now();

  if (regenerate) {
    const rows = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
    for (let i = rows.length - 1; i >= 0 && rows[i].role === "assistant"; i--) {
      await db.delete(messages).where(eq(messages.id, rows[i].id));
    }
  } else {
    await db
      .insert(messages)
      .values({ id: newId("msg"), chatId: id, role: "user", content: content.slice(0, 16000), createdAt: now });
  }

  if (chat.title === "New chat") {
    const title = content.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
    await db.update(chats).set({ title }).where(eq(chats.id, id));
  }
  await db.update(chats).set({ mode, updatedAt: Date.now() }).where(eq(chats.id, id));

  const history: ChatMessage[] = (
    await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(asc(messages.createdAt))
  ).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const project = chat.projectId ? await one(db.select().from(projects).where(eq(projects.id, chat.projectId))) : null;

  // --- Credit reservation before the provider call ---
  const estInputTokens = Math.ceil(history.reduce((n, m) => n + m.content.length, 0) / 4);
  const estOutputTokens = Math.min(1024, planCfg.maxOutputTokens);
  const holdCost = creditsFor(model, estInputTokens, estOutputTokens);
  const unlimited = credits.unlimited;
  let holdId: string | undefined;
  let heldAmount = 0;
  if (!unlimited) {
    const hold = await reserveCredits(user.id, holdCost, `Chat with ${model.name}`, model.id, estInputTokens);
    if (!hold) {
      return NextResponse.json(
        { error: "Not enough credits left this month. Upgrade your plan to continue.", outOfCredits: true },
        { status: 402 },
      );
    }
    holdId = hold.holdId;
    heldAmount = hold.debited;
  }


  if (!(await providerConfigured())) {
    await refundHold(user.id, holdId, heldAmount);
    return NextResponse.json(
      { error: "Ключ провайдера не настроен: сохраните его в админ-панели (или задайте DRAKE_API_KEY)." },
      { status: 503 },
    );
  }

  const abort = new AbortController();
  const onAbort = () => abort.abort();
  req.signal.addEventListener("abort", onAbort);

  const replyId = newId("msg");
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let inputTokens = estInputTokens;
      let outputTokens = 0;
      let usageSeen = false;
      const send = (event: string, data: unknown) => controller.enqueue(sse(event, data));
      try {
        send("status", { stage: "thinking" });
        send("meta", {
          messageId: replyId,
          model: model.id,
          modelName: model.name,
          lang: /[\u0400-\u04FF]/.test(content) ? "ru" : "en",
        });
        send("status", { stage: "analyzing" });

        let first = true;
        let used = model;
        for await (const ev of streamCompletion({
          model: model.id,
          fallbacks: fallbacksFor(model.id),
          messages: history,
          maxTokens: planCfg.maxOutputTokens,
          signal: abort.signal,
        })) {
          if (ev.type === "model") {
            const served = getModel(ev.model);
            if (served && served.id !== used.id) {
              used = served;
              send("meta", { messageId: replyId, model: served.id, modelName: served.name, fallback: true });
            }
            continue;
          }
          if (ev.type === "delta") {
            if (first) {
              first = false;
              send("status", { stage: "generating" });
            }
            full += ev.text;
            send("delta", { text: ev.text });
          } else if (ev.type === "usage") {
            usageSeen = true;
            inputTokens = ev.inputTokens;
            outputTokens = ev.outputTokens;
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          }
        }
        if (!full.trim()) throw new Error("Empty provider response");
        if (!usageSeen) {
          outputTokens = Math.ceil(full.length / 4);
        }

        await db.insert(messages).values({
          id: replyId,
          chatId: id,
          role: "assistant",
          content: full,
          mode,
          createdAt: Date.now(),
        });

        const actualCost = unlimited ? 0 : creditsFor(used, inputTokens, outputTokens);
        const settled = await settleCredits({
          userId: user.id,
          holdId,
          holdAmount: heldAmount,
          actualCost,
          model: used.id,
          inputTokens,
          outputTokens,
        });
        send("done", {
          messageId: replyId,
          balance: unlimited ? null : settled.balance,
          creditsCharged: settled.charged,
          inputTokens,
          outputTokens,
        });
      } catch (e) {
        // Failed requests must not consume credits.
        await refundHold(user.id, holdId, heldAmount).catch(() => {});
        if (!abort.signal.aborted) {
          send("error", { message: e instanceof Error ? e.message : "The model failed to respond." });
        }
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
