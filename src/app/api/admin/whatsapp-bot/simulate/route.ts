import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { generateWhatsAppReply } from "@/lib/whatsapp-bot/wa-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Akses ditolak";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload JSON tidak valid" }, { status: 400 });
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { success: false, error: "Pesan tidak boleh kosong" },
      { status: 400 }
    );
  }

  try {
    const senderPhone =
      typeof body?.senderPhone === "string" && body.senderPhone.trim()
        ? body.senderPhone.trim()
        : "081234567890";
    const senderName =
      typeof body?.senderName === "string" && body.senderName.trim()
        ? body.senderName.trim()
        : "Admin Tester";

    const result = await generateWhatsAppReply(message, senderPhone, senderName);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memproses simulasi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
