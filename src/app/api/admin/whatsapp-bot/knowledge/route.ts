import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getWABotConfig, saveWABotConfig } from "@/lib/whatsapp-bot/wa-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await verifyAdmin();
    const config = await getWABotConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Akses ditolak";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const updated = await saveWABotConfig(body);
    return NextResponse.json({ success: true, config: updated, message: "Pengaturan bot & knowledge base berhasil disimpan!" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
