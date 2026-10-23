import { NextResponse } from "next/server";
import { recordVisitorHit } from "@/lib/visitor-analytics";

export const runtime = "nodejs";

/**
 * Endpoint internal pencatat kunjungan (hit beacon) - Dinonaktifkan.
 */
export async function POST() {
  return NextResponse.json(
    { ok: true, disabled: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
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
