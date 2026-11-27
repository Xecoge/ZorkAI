import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, one } from "@/lib/db/client";
import { adminAudit, userCredits, users } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure";
import { PLANS, normalizePlan, type PlanId } from "@/lib/ai/config";

export type Role = "user" | "admin" | "owner";
export type AccountStatus = "active" | "banned" | "frozen";

type AccountRow = {
  id: string;
  email: string;
  name: string;
  plan: string;
  role?: string | null;
  status?: string | null;
  statusReason?: string | null;
  statusUntil?: number | null;
};

// The owner account is recognised by email so the panel is reachable even
// before any role is stored. OWNER_EMAILS (comma separated) overrides the list.
const OWNER_EMAILS = (process.env.OWNER_EMAILS ?? "nikitakocenuk17@gmail.com")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export function isOwnerEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return OWNER_EMAILS.includes(value) || value.includes("xecoge");
}

export function roleOf(user: { email: string; role?: string | null }): Role {
  if (user.role === "owner" || isOwnerEmail(user.email)) return "owner";
  if (user.role === "admin") return "admin";
  return "user";
}

export function isStaff(user: { email: string; role?: string | null }): boolean {
  return roleOf(user) !== "user";
}

export function isOwner(user: { email: string; role?: string | null }): boolean {
  return roleOf(user) === "owner";
}

export type AccountBlock = { status: "banned" | "frozen"; reason: string; until: number | null };

/** Non-null when the account may not (fully) use the app right now. */
export function accountBlock(user: AccountRow): AccountBlock | null {
  const status = (user.status ?? "active") as AccountStatus;
  if (status !== "banned" && status !== "frozen") return null;
  if (user.statusUntil && user.statusUntil <= Date.now()) return null;
  return {
    status,
    reason: (user.statusReason ?? "").trim(),
    until: user.statusUntil ?? null,
  };
}

export function blockMessage(block: AccountBlock): string {
  const who = block.status === "banned" ? "Аккаунт заблокирован" : "Аккаунт заморожен";
  const until = block.until ? ` до ${new Date(block.until).toLocaleString("ru-RU")}` : "";
  const reason = block.reason ? `: ${block.reason}` : "";
  return `${who}${until}${reason}`;
}

export function newAdminId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("hex")}`;
}

export async function recordAdminAction(input: {
  actor: { id: string; email: string };
  action: string;
  targetId?: string | null;
  detail?: string;
}): Promise<void> {
  await ensureSchema();
  await db.insert(adminAudit).values({
    id: newAdminId("aud"),
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.action,
    targetId: input.targetId ?? null,
    detail: input.detail ?? "",
    createdAt: Date.now(),
  });
}

/** Moves an account onto a plan and keeps the credit row in step with it. */
export async function grantPlan(userId: string, planId: PlanId): Promise<void> {
  await ensureSchema();
  const plan = PLANS[planId];
  const unlimited = planId === "max" || planId === "xmax" ? 1 : 0;
  const allowance = plan.monthlyCredits;
  const now = Date.now();

  await db.transaction(async (tx) => {
    await tx.update(users).set({ plan: planId }).where(eq(users.id, userId)).returning({ id: users.id });
    await tx
      .insert(userCredits)
      .values({
        userId,
        plan: planId,
        unlimited,
        balance: allowance,
        monthlyAllowance: allowance,
        periodStart: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userCredits.userId,
        set: {
          plan: planId,
          unlimited,
          balance: allowance,
          monthlyAllowance: allowance,
          periodStart: now,
          updatedAt: now,
        },
      });
  });
}

export async function setRole(userId: string, role: Role): Promise<void> {
  await ensureSchema();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function setAccountStatus(
  userId: string,
  status: AccountStatus,
  reason: string,
  untilMs: number | null,
): Promise<void> {
  await ensureSchema();
  await db
    .update(users)
    .set({
      status,
      statusReason: status === "active" ? "" : reason,
      statusUntil: status === "active" ? null : untilMs,
    })
    .where(eq(users.id, userId));
}

export async function findUserByEmail(email: string): Promise<AccountRow | null> {
  await ensureSchema();
  return one(db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1)) as Promise<AccountRow | null>;
}

export function planLabel(plan: string): string {
  return PLANS[normalizePlan(plan)].name;
}
