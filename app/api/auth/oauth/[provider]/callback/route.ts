import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession, hashPassword, newId } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, providerConfig, originOf, decodeJwtPayload } from "@/lib/oauth";

const AVATAR_COLORS = ["#1084fe", "#7c5cff", "#0ea472", "#e0703a", "#c23c8f"];

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const cfg = providerConfig(provider);
  const origin = originOf(req);
  const fail = (reason: string) => {
    const url = new URL("/sign-in", origin);
    url.searchParams.set("oauth", reason);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/" });
    return res;
  };

  if (!cfg || !cfg.clientId || !cfg.clientSecret) return fail("unconfigured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";

  if (!code || !state || cookieState !== `${provider}.${state}`) return fail("state");

  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;

  // Exchange the authorization code for tokens.
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; id_token?: string };
  if (!tokenData.access_token) return fail("token");

  // Resolve the account email and display name from the provider.
  let email = "";
  let name = "";
  if (cfg.id === "google" && tokenData.id_token) {
    const payload = decodeJwtPayload(tokenData.id_token);
    email = typeof payload.email === "string" ? payload.email : "";
    name = typeof payload.name === "string" && payload.name ? payload.name : email.split("@")[0];
  } else {
    const profileRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
    });
    const profile = (await profileRes.json().catch(() => ({}))) as { email?: string | null; login?: string; name?: string | null };
    if (profile.email) {
      email = profile.email;
    } else {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
      });
      const emails = (await emailsRes.json().catch(() => ({}))) as { email: string; primary: boolean; verified: boolean }[];
      email = Array.isArray(emails) ? (emails.find((e) => e.primary && e.verified)?.email ?? "") : "";
    }
    name = profile.name || profile.login || email.split("@")[0];
  }
  if (!email) return fail("email");

  // Sign in the matching account, otherwise create one for this OAuth identity.
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  let userId = existing?.id;
  if (!userId) {
    userId = newId("usr");
    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash: hashPassword(newId("oauth") + newId("salt")),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    });
  }
  await createSession(userId);

  const res = NextResponse.redirect(new URL("/app", origin));
  res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/" });
  return res;
}
