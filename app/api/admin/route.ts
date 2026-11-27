import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, one, pool } from "@/lib/db/client";
import { adminAudit, userCredits, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/ensure";
import { getSetting, setSetting } from "@/lib/settings";
import { PROVIDER_KEY_SETTING, providerKey } from "@/lib/ai/provider";
import { DRAKE_BASE_URL, PLANS, PLAN_ORDER, normalizePlan, type PlanId } from "@/lib/ai/config";
import {
  accountBlock,
  isOwner,
  isStaff,
  recordAdminAction,
  roleOf,
  setAccountStatus,
  setRole,
  grantPlan,
} from "@/lib/admin";

const PLAN_IDS = new Set(PLAN_ORDER);

function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function untilFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(req: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(viewer)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureSchema();

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      role: users.role,
      status: users.status,
      statusReason: users.statusReason,
      statusUntil: users.statusUntil,
      createdAt: users.createdAt,
      unlimited: userCredits.unlimited,
      balance: userCredits.balance,
    })
    .from(users)
    .leftJoin(userCredits, eq(userCredits.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(500);

  const accounts = rows
    .filter((row) => !q || row.email.toLowerCase().includes(q) || row.name.toLowerCase().includes(q))
    .map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      plan: normalizePlan(row.plan),
      planName: PLANS[normalizePlan(row.plan)].name,
      role: roleOf(row),
      status: row.status ?? "active",
      statusReason: row.statusReason ?? "",
      statusUntil: row.statusUntil ?? null,
      blocked: Boolean(accountBlock({ ...row, email: row.email })),
      unlimited: row.unlimited === 1,
      balance: row.balance ?? null,
      createdAt: row.createdAt,
    }));

  const audit = await db
    .select()
    .from(adminAudit)
    .orderBy(desc(adminAudit.createdAt))
    .limit(40);

  const envKey = (process.env.DRAKE_API_KEY || "").trim();
  const storedKey = await getSetting(PROVIDER_KEY_SETTING);
  const activeKey = await providerKey();
  const [counts] = await pool.unsafe(
    `select
       (select count(*) from users) as users,
       (select count(*) from chats) as chats,
       (select count(*) from messages) as messages`,
  );

  return NextResponse.json({
    me: {
      email: viewer.email,
      role: roleOf(viewer),
      owner: isOwner(viewer),
    },
    plans: PLAN_ORDER.map((id) => ({ id, name: PLANS[id].name })),
    provider: {
      baseUrl: DRAKE_BASE_URL,
      source: storedKey ? "admin" : envKey ? "env" : "none",
      activeKeyHint: maskKey(activeKey),
      envKeyHint: maskKey(envKey),
      storedKeyHint: maskKey(storedKey),
    },
    stats: {
      users: Number(counts?.users ?? 0),
      chats: Number(counts?.chats ?? 0),
      messages: Number(counts?.messages ?? 0),
      banned: accounts.filter((a) => a.status === "banned" && a.blocked).length,
      frozen: accounts.filter((a) => a.status === "frozen" && a.blocked).length,
      admins: accounts.filter((a) => a.role !== "user").length,
    },
    accounts,
    audit: audit.map((row) => ({
      id: row.id,
      actorEmail: row.actorEmail,
      action: row.action,
      targetId: row.targetId,
      detail: row.detail,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(viewer)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action ?? "");
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const reason = String(body?.reason ?? "").slice(0, 300);

  const viewerRole = roleOf(viewer);

  if (action === "provider-key") {
    const key = String(body?.key ?? "").trim();
    if (!key) return NextResponse.json({ error: "Вставьте ключ провайдера." }, { status: 400 });
    await setSetting(PROVIDER_KEY_SETTING, key);
    await recordAdminAction({ actor: viewer, action: "provider-key", detail: `key ${maskKey(key)}` });
    return NextResponse.json({ ok: true, hint: maskKey(key), source: "admin" });
  }

  if (action === "test-provider") {
    const key = await providerKey();
    if (!key) return NextResponse.json({ ok: false, error: "Ключ не задан." });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(`${DRAKE_BASE_URL.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = (await res.text()).slice(0, 200);
        return NextResponse.json({ ok: false, error: `Шлюз ответил ${res.status}: ${text}` });
      }
      const payload = (await res.json()) as { data?: unknown[] };
      return NextResponse.json({ ok: true, models: payload.data?.length ?? 0 });
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Сеть недоступна" });
    } finally {
      clearTimeout(timer);
    }
  }

  if (!userId) return NextResponse.json({ error: "Не указан аккаунт." }, { status: 400 });
  const target = await one(db.select().from(users).where(eq(users.id, userId)).limit(1));
  if (!target) return NextResponse.json({ error: "Аккаунт не найден." }, { status: 404 });

  const targetIsOwner = isOwner(target);
  if (targetIsOwner && viewerRole !== "owner") {
    return NextResponse.json({ error: "Только владелец может менять владельца." }, { status: 403 });
  }
  if (target.id === viewer.id && ["ban", "freeze", "set-role", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Нельзя применить это к своему аккаунту." }, { status: 400 });
  }

  const targetRole = roleOf(target);

  switch (action) {
    case "set-plan": {
      const plan = String(body?.plan ?? "");
      if (!PLAN_IDS.has(plan as PlanId)) return NextResponse.json({ error: "Неизвестный план." }, { status: 400 });
      await grantPlan(target.id, plan as PlanId);
      await recordAdminAction({ actor: viewer, action: "set-plan", targetId: target.id, detail: `${targetRole} → ${plan}` });
      return NextResponse.json({ ok: true });
    }

    case "ban":
    case "freeze": {
      if (targetRole === "admin" && viewerRole !== "owner" && target.id !== viewer.id) {
        return NextResponse.json({ error: "Админ не может заблокировать другого админа." }, { status: 403 });
      }
      const status = action === "ban" ? "banned" : "frozen";
      const until = untilFrom(body?.until);
      await setAccountStatus(target.id, status, reason, until);
      await recordAdminAction({
        actor: viewer,
        action: status === "banned" ? "ban" : "freeze",
        targetId: target.id,
        detail: `${reason || "без причины"}${until ? ` until ${new Date(until).toISOString()}` : " permanently"}`,
      });
      return NextResponse.json({ ok: true });
    }

    case "restore": {
      await setAccountStatus(target.id, "active", "", null);
      await recordAdminAction({ actor: viewer, action: "restore", targetId: target.id, detail: "unbanned / unfrozen" });
      return NextResponse.json({ ok: true });
    }

    case "set-role": {
      const role = String(body?.role ?? "");
      if (role !== "admin" && role !== "user" && role !== "owner") {
        return NextResponse.json({ error: "Неизвестная роль." }, { status: 400 });
      }
      if (role === "owner" && viewerRole !== "owner") {
        return NextResponse.json({ error: "Только владелец может выдать владельца." }, { status: 403 });
      }
      if (targetIsOwner && role !== "owner" && viewerRole !== "owner") {
        return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
      }
      await setRole(target.id, role);
      await recordAdminAction({ actor: viewer, action: "set-role", targetId: target.id, detail: `${targetRole} → ${role}` });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
  }
}
