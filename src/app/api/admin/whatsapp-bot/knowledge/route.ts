import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { ValidationError } from "@/lib/error-utils";
import { getWABotConfig, saveWABotConfig } from "@/lib/whatsapp-bot/wa-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await verifyAdmin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Akses ditolak";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  try {
    const config = await getWABotConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat konfigurasi";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Akses ditolak";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload JSON tidak valid" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "Payload harus berupa objek" }, { status: 400 });
  }

  try {
    const updated = await saveWABotConfig(body as Record<string, unknown>);
    return NextResponse.json({
      success: true,
      config: updated,
      message: "Pengaturan bot & knowledge base berhasil disimpan!",
    });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Gagal menyimpan";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
