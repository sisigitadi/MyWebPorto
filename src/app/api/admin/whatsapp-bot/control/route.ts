import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  startWABot,
  stopWABot,
  restartWABot,
  logoutWABot,
} from "@/lib/whatsapp-bot/wa-service";
import { clearWAChatLogs } from "@/lib/whatsapp-bot/wa-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    let result = { success: false, message: "Aksi tidak dikenal" };

    switch (action) {
      case "start":
        result = await startWABot();
        break;
      case "stop":
        result = await stopWABot();
        break;
      case "restart":
        result = await restartWABot();
        break;
      case "logout":
        result = await logoutWABot();
        break;
      case "clear_logs":
        await clearWAChatLogs();
        result = { success: true, message: "Log chat berhasil dibersihkan" };
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Aksi tidak didukung" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses aksi";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
