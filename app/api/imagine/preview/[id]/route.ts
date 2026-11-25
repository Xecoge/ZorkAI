import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// Deterministic SVG "poster" art for Imagine prompts while no image provider is
// configured. Pure vector art derived from the prompt text — clearly labeled in
// the Imagine UI as a preview, never as a photoreal generation.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const seedStr = id + (searchParams.get("p") || "");
  const h = hash(seedStr);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 80)) % 360;
  const circles = Array.from({ length: 6 }, (_, i) => {
    const x = ((h >> (i * 3)) % 800) + 80;
    const y = ((h >> (i * 4 + 2)) % 600) + 100;
    const r = 60 + ((h >> (i * 5)) % 180);
    const o = 0.08 + (((h >> i) % 12) / 100);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${(hue + i * 24) % 360} 60% 60%)" opacity="${o.toFixed(2)}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 30% 88%)"/>
    <stop offset="1" stop-color="hsl(${hue2} 34% 72%)"/>
  </linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  ${circles}
</svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=86400" },
  });
}
