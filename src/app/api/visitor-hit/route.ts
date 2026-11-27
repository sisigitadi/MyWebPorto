import { NextRequest, NextResponse } from "next/server";
import { recordVisitorHit, VISITOR_ANALYTICS_ENABLED } from "@/lib/visitor-analytics";
import { rateLimit, cleanupRateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";

function extractClientIp(headers: Headers): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "127.0.0.1";
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  if (!VISITOR_ANALYTICS_ENABLED) {
    return NextResponse.json(
      { ok: true, disabled: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const ip = extractClientIp(req.headers);
    const rl = rateLimit(`visitor-hit:${ip}`, 15, 60_000);
    cleanupRateLimits();

    if (!rl.allowed) {
      return NextResponse.json(
        { ok: true, rateLimited: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch {
      // payload kosong tetap diperbolehkan
    }

    const res = await recordVisitorHit(req.headers, payload);
    return NextResponse.json(res, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
