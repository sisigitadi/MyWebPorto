import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { generateWhatsAppReply } from "@/lib/whatsapp-bot/wa-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const message = (body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const result = await generateWhatsAppReply(
      message,
      body.senderPhone || "081234567890",
      body.senderName || "Admin Tester"
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses simulasi";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
