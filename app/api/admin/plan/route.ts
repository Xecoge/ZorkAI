import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isStaff, recordAdminAction, grantPlan, findUserByEmail } from "@/lib/admin";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/ai/config";

// Plan administration for scripts and CI: allowed either with the deployment's
// ADMIN_API_KEY (x-admin-key header) or from a signed-in staff session.
// The web panel uses /api/admin instead; both paths share grantPlan().
function hasAdminKey(req: NextRequest): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false;
  const given = req.headers.get("x-admin-key") ?? "";
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(key, "utf8");
  return a.length === b.length && (a.length === 0 || a.equals(b));
}

export async function POST(req: NextRequest) {
  const viewer = await getSessionUser();
  const byKey = hasAdminKey(req);
  if (!byKey && !(viewer && isStaff(viewer))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const planId = String(body?.plan || "") as PlanId;
  if (!email || !PLAN_ORDER.includes(planId)) {
    return NextResponse.json({ error: "Provide an email and a valid plan." }, { status: 400 });
  }

  const target = await findUserByEmail(email);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await grantPlan(target.id, planId);
  if (viewer) {
    await recordAdminAction({
      actor: viewer,
      action: "set-plan",
      targetId: target.id,
      detail: `api → ${planId}`,
    });
  }
  return NextResponse.json({
    ok: true,
    email,
    plan: planId,
    planName: PLANS[planId].name,
    unlimited: planId === "max" || planId === "xmax",
  });
}
