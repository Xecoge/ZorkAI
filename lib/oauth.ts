import type { NextRequest } from "next/server";

export const OAUTH_STATE_COOKIE = "zork_oauth_state";

export type OAuthProviderConfig = {
  id: "google" | "github";
  clientId?: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
};

export function providerConfig(provider: string): OAuthProviderConfig | null {
  if (provider === "google") {
    return {
      id: "google",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
    };
  }
  if (provider === "github") {
    return {
      id: "github",
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
    };
  }
  return null;
}

export function isOAuthConfigured(provider: "google" | "github"): boolean {
  const cfg = providerConfig(provider);
  return !!cfg?.clientId && !!cfg?.clientSecret;
}

// The public origin as seen by the browser (Vercel sets x-forwarded-*).
export function originOf(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

// Read the email/name out of a profile response without pulling a JWT library.
export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) return {};
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
