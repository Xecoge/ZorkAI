import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { OAUTH_STATE_COOKIE, providerConfig, originOf } from "@/lib/oauth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const cfg = providerConfig(provider);
  const origin = originOf(req);
  const back = new URL("/sign-in", origin);

  if (!cfg || !cfg.clientId || !cfg.clientSecret) {
    back.searchParams.set("oauth", `${provider}-unconfigured`);
    return NextResponse.redirect(back);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;
  const authorize = new URL(cfg.authorizeUrl);
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", cfg.scope);
  authorize.searchParams.set("state", state);
  if (cfg.id === "google") {
    authorize.searchParams.set("access_type", "online");
    authorize.searchParams.set("prompt", "select_account");
  }

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, `${provider}.${state}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: origin.startsWith("https"),
  });
  return res;
}
