import { NextRequest, NextResponse } from "next/server";
import { recordVisitorHit, VISITOR_ANALYTICS_ENABLED } from "@/lib/visitor-analytics";

export const runtime = "nodejs";

// In-memory rate limiting: maksimal 15 permintaan per menit per IP
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  if (!VISITOR_ANALYTICS_ENABLED) {
    return NextResponse.json(
      { ok: true, disabled: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const now = Date.now();
    const rate = ipRateLimit.get(ip);

    if (rate && now < rate.resetAt) {
      if (rate.count >= 15) {
        return NextResponse.json(
          { ok: true, rateLimited: true },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }
      rate.count++;
    } else {
      ipRateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    }

    // Pembersihan berkala jika map terlalu besar
    if (ipRateLimit.size > 2000) {
      for (const [k, v] of ipRateLimit.entries()) {
        if (now >= v.resetAt) ipRateLimit.delete(k);
      }
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
