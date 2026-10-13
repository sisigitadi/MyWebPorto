/**
 * WhatsApp Baileys Service Manager — SERVER-ONLY.
 * Singleton socket manager yang mempertahankan koneksi WhatsApp Web dan
 * merespons pesan secara real-time.
 */

import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import type { WABotState } from "./wa-types";
import { getWABotConfig } from "./wa-storage";
import { generateWhatsAppReply } from "./wa-engine";

// Lokasi penyimpanan sesi Baileys
const isVercel = Boolean(process.env.VERCEL);
const SESSIONS_DIR = isVercel
  ? path.join("/tmp", "my-web-porto-wa-session")
  : path.join(process.cwd(), "data", "wa-session");

interface GlobalWABotContainer {
  state: WABotState;
  socket: unknown | null;
  isStarting: boolean;
}

const g = globalThis as unknown as { __waBotContainer?: GlobalWABotContainer };

if (!g.__waBotContainer) {
  g.__waBotContainer = {
    state: {
      status: "DISCONNECTED",
      qrCodeDataUrl: null,
      connectedPhone: null,
      connectedPushName: null,
      lastActive: null,
      error: null,
      battery: null,
      messagesCount: {
        incoming: 0,
        replied: 0,
      },
    },
    socket: null,
    isStarting: false,
  };
}

const container = g.__waBotContainer;

export function getWABotState(): WABotState {
  return { ...container.state };
}

function updateState(update: Partial<WABotState>) {
  container.state = {
    ...container.state,
    ...update,
    lastActive: new Date().toISOString(),
  };
}

export async function startWABot(): Promise<{ success: boolean; message: string }> {
  if (container.state.status === "CONNECTED") {
    return { success: true, message: "Bot WhatsApp sudah terhubung!" };
  }

  if (container.isStarting) {
    return { success: true, message: "Bot sedang dalam proses menghubungkan..." };
  }

  container.isStarting = true;
  updateState({ status: "CONNECTING", error: null });

  try {
    // Dynamic import Baileys untuk kompatibilitas Next.js server runtime
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { DisconnectReason, fetchLatestBaileysVersion } = baileys;
    const initMultiFileAuth = baileys.useMultiFileAuthState;

    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    const { state: authState, saveCreds } = await initMultiFileAuth(SESSIONS_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307] as [number, number, number],
    }));

    // Inisialisasi Baileys Socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sock: any = makeWASocket({
      version,
      auth: authState,
      printQRInTerminal: false,
      browser: ["MyWebPorto Admin", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    container.socket = sock;

    // Simpan kredensial saat ada pembaruan sesi
    sock.ev.on("creds.update", saveCreds);

    // Monitor event koneksi & QR code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          updateState({
            status: "QR_READY",
            qrCodeDataUrl: qrDataUrl,
            error: null,
          });
        } catch (qrErr) {
          console.error("[wa-service] QR generation error:", qrErr);
        }
      }

      if (connection === "close") {
        container.socket = null;
        container.isStarting = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;

        console.log("[wa-service] Koneksi ditutup, status code:", statusCode);

        if (statusCode === DisconnectReason?.loggedOut) {
          updateState({
            status: "DISCONNECTED",
            qrCodeDataUrl: null,
            connectedPhone: null,
            connectedPushName: null,
            error: "Sesi dikeluarkan (Logged out). Silakan scan QR ulang.",
          });
          // Bersihkan folder sesi
          try {
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
          } catch {
            // abaikan
          }
        } else {
          updateState({
            status: "DISCONNECTED",
            qrCodeDataUrl: null,
            error: lastDisconnect?.error?.message || "Koneksi terputus.",
          });
          if (shouldReconnect) {
            console.log("[wa-service] Mencoba rekoneksi dalam 5 detik...");
            setTimeout(() => {
              startWABot().catch(console.error);
            }, 5000);
          }
        }
      } else if (connection === "open") {
        container.isStarting = false;
        const userJid = sock.user?.id || "";
        const phone = userJid.split(":")[0] || userJid.split("@")[0] || "Terhubung";
        const pushName = sock.user?.name || "Admin";

        updateState({
          status: "CONNECTED",
          qrCodeDataUrl: null,
          connectedPhone: phone,
          connectedPushName: pushName,
          error: null,
        });

        console.log(`[wa-service] WhatsApp Bot Terhubung! Nomor: ${phone}`);
      }
    });

    // Monitor Pesan Masuk
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sock.ev.on("messages.upsert", async (m: any) => {
      try {
        if (!m.messages || m.messages.length === 0) return;
        const msg = m.messages[0];

        // 1. Abaikan pesan dari diri sendiri
        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid || "";

        // 2. Abaikan pesan dari Grup (hanya chat personal)
        if (remoteJid.endsWith("@g.us") || remoteJid.includes("-")) return;

        // 3. Abaikan pesan siaran status WhatsApp
        if (remoteJid === "status@broadcast") return;

        // Ambil isi teks pesan
        const messageContent =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          "";

        if (!messageContent.trim()) return;

        const botConfig = await getWABotConfig();
        if (!botConfig.enabled || !botConfig.autoReply) return;

        const senderPhone = remoteJid.replace("@s.whatsapp.net", "");
        const senderName = msg.pushName || "Pelanggan";

        // Cek pengecualian nomor admin
        if (
          botConfig.adminExclusions &&
          botConfig.adminExclusions.some((exc) => senderPhone.includes(exc.trim()))
        ) {
          return;
        }

        updateState({
          messagesCount: {
            incoming: container.state.messagesCount.incoming + 1,
            replied: container.state.messagesCount.replied,
          },
        });

        // 4. Simulasi Typing (Human-like Typing Presence)
        try {
          await sock.sendPresenceUpdate("composing", remoteJid);
        } catch {
          // abaikan bila presence gagal
        }

        const delayMs = Math.max(1000, (botConfig.delaySeconds || 2) * 1000);
        await new Promise((r) => setTimeout(r, delayMs));

        // 5. Generate AI Reply berbasis knowledge
        const aiResult = await generateWhatsAppReply(
          messageContent,
          senderPhone,
          senderName
        );

        if (aiResult && aiResult.reply) {
          await sock.sendMessage(remoteJid, { text: aiResult.reply });

          try {
            await sock.sendPresenceUpdate("paused", remoteJid);
          } catch {
            // abaikan
          }

          updateState({
            messagesCount: {
              incoming: container.state.messagesCount.incoming,
              replied: container.state.messagesCount.replied + 1,
            },
          });
        }
      } catch (msgErr) {
        console.error("[wa-service] Error handling message:", msgErr);
      }
    });

    return { success: true, message: "Proses inisialisasi bot dimulai..." };
  } catch (err: unknown) {
    container.isStarting = false;
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateState({ status: "ERROR", error: errorMsg });
    return { success: false, message: `Gagal memulai bot: ${errorMsg}` };
  }
}

export async function stopWABot(): Promise<{ success: boolean; message: string }> {
  try {
    if (container.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = container.socket as any;
      s.end?.(new Error("Admin stopped bot"));
      container.socket = null;
    }
    container.isStarting = false;
    updateState({
      status: "DISCONNECTED",
      qrCodeDataUrl: null,
      error: null,
    });
    return { success: true, message: "Bot WhatsApp berhasil dihentikan." };
  } catch (err) {
    return { success: false, message: `Gagal menghentikan bot: ${err}` };
  }
}

export async function logoutWABot(): Promise<{ success: boolean; message: string }> {
  try {
    await stopWABot();
    if (fs.existsSync(SESSIONS_DIR)) {
      fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    }
    updateState({
      status: "DISCONNECTED",
      qrCodeDataUrl: null,
      connectedPhone: null,
      connectedPushName: null,
      error: null,
    });
    return { success: true, message: "Sesi WhatsApp berhasil dikeluarkan & dibersihkan." };
  } catch (err) {
    return { success: false, message: `Gagal logout: ${err}` };
  }
}

export async function restartWABot(): Promise<{ success: boolean; message: string }> {
  await stopWABot();
  await new Promise((r) => setTimeout(r, 1500));
  return await startWABot();
}
