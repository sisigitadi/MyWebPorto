import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getWABotState } from "@/lib/whatsapp-bot/wa-service";
import { getWAChatLogs } from "@/lib/whatsapp-bot/wa-storage";
import { buildWhatsAppBotKnowledge } from "@/lib/whatsapp-bot/wa-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await verifyAdmin();
    const state = getWABotState();
    const logs = await getWAChatLogs();
    const knowledge = await buildWhatsAppBotKnowledge();

    return NextResponse.json({
      success: true,
      state,
      logs,
      knowledgeSummary: knowledge.rawSummary,
      config: knowledge.config,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Akses ditolak";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
