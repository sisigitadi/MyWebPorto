import { z } from "zod";
import { getSetting, setSetting } from "@/lib/settings";
import { ValidationError } from "@/lib/error-utils";
import type { WABotConfig, WAChatLogItem, WAKnowledgeFAQ } from "./wa-types";

const SETTING_CONFIG_KEY = "whatsapp_bot_config";
const SETTING_LOGS_KEY = "whatsapp_bot_logs";
const MAX_LOGS = 50;

const FAQItemSchema = z.object({
  id: z.string().min(1).max(100),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(3000),
  category: z.enum(["umum", "produk", "jasa", "pembayaran", "garansi"]),
  enabled: z.boolean(),
  updatedAt: z.string().optional().default(() => new Date().toISOString()),
});

const WABotConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  autoReply: z.boolean().optional(),
  botName: z.string().trim().min(1, "Nama bot wajib diisi").max(80).optional(),
  personaPrompt: z.string().trim().max(4000).optional(),
  businessSOP: z.string().trim().max(4000).optional(),
  adminExclusions: z.array(z.string().trim().max(40)).max(50).optional(),
  delaySeconds: z.number().min(0).max(30).optional(),
  faqs: z.array(FAQItemSchema).max(100).optional(),
});

// Serializes concurrent log mutations so two simultaneous messages don't drop entries.
let logWriteQueue: Promise<void> = Promise.resolve();

export const DEFAULT_FAQS: WAKnowledgeFAQ[] = [
  {
    id: "faq-1",
    question: "Berapa lama proses pembuatan website atau aplikasi?",
    answer: "Pengerjaan website landing page / portofolio biasanya memakan waktu 3-7 hari kerja. Untuk sistem web kustom / aplikasi SaaS berskala medium membutuhkan 2-4 minggu tergantung kompleksitas fitur.",
    category: "jasa",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "faq-2",
    question: "Metode pembayaran apa saja yang diterima?",
    answer: "Kami menerima transfer bank lokal (Bank Mandiri, BNI, BSI), pembayaran instan QRIS (Gopay/OVO/Dana/ShopeePay/BCA), serta pembayaran internasional via PayPal atau Wise.",
    category: "pembayaran",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "faq-3",
    question: "Apakah ada garansi setelah pembuatan selesai?",
    answer: "Ya, setiap proyek pembuatan website dan produk digital mendapatkan garansi pemeliharaan dan perbaikan bug selama 30 hari secara gratis setelah serah terima.",
    category: "garansi",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "faq-4",
    question: "Bagaimana cara melakukan order produk digital?",
    answer: "Anda dapat memilih produk di katalog website kami (sigitadi.id/#produk), memasukkannya ke keranjang belanja, lalu klik checkout via WhatsApp atau hubungi admin langsung untuk konfirmasi instan.",
    category: "produk",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "faq-5",
    question: "Bagaimana jika saya ingin diskusi proyek khusus atau kustom?",
    answer: "Anda bisa langsung menyampaikan detail kebutuhan Anda di chat ini, atau Mas Sigit dapat menjadwalkan sesi meeting online / konsultasi via platform FreelanceOps (freelanceops.sigitadi.id).",
    category: "umum",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_WA_BOT_CONFIG: WABotConfig = {
  enabled: true,
  autoReply: true,
  botName: "Sigit AI Assistant",
  personaPrompt:
    "Anda adalah Sigit AI Assistant, asisten virtual resmi untuk Sigit Adi Irianto (Engineer AI & Cybersecurity). Bersikaplah ramah, profesional, solutif, ringkas, dan sopan. Gunakan Bahasa Indonesia yang natural. Jika customer berbahasa Inggris, balas dalam Bahasa Inggris. Jawab pertanyaan seputar profil, keahlian, jasa pembuatan website/aplikasi, produk digital, harga, nomor rekening pembayaran, dan cara pemesanan dengan akurat berdasarkan data yang diberikan. Jangan mengarang informasi di luar data.",
  businessSOP:
    "Jam operasional balas cepat: 08.00 - 21.00 WIB setiap hari. Di luar jam kerja, AI tetap merespons otomatis dan konfirmasi manual pengiriman pesanan/diskusi teknis akan dilanjutkan di pagi hari. Diskon atau negosiasi harga jasa kustom memerlukan persetujuan langsung dari Mas Sigit.",
  adminExclusions: [],
  delaySeconds: 2,
  faqs: DEFAULT_FAQS,
};

export async function getWABotConfig(): Promise<WABotConfig> {
  try {
    const stored = await getSetting<Partial<WABotConfig>>(SETTING_CONFIG_KEY);
    if (!stored) {
      return { ...DEFAULT_WA_BOT_CONFIG };
    }
    return {
      ...DEFAULT_WA_BOT_CONFIG,
      ...stored,
      faqs: stored.faqs && stored.faqs.length > 0 ? stored.faqs : DEFAULT_FAQS,
    };
  } catch (err) {
    console.error("[wa-storage] Error loading config:", err);
    return { ...DEFAULT_WA_BOT_CONFIG };
  }
}

export async function saveWABotConfig(
  update: Partial<WABotConfig>
): Promise<WABotConfig> {
  const parsed = WABotConfigUpdateSchema.safeParse(update);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message || "Konfigurasi WhatsApp Bot tidak valid."
    );
  }
  const current = await getWABotConfig();
  const merged: WABotConfig = {
    ...current,
    ...parsed.data,
    faqs: parsed.data.faqs || current.faqs,
  };
  await setSetting(SETTING_CONFIG_KEY, merged);
  return merged;
}

export async function getWAChatLogs(): Promise<WAChatLogItem[]> {
  try {
    const logs = await getSetting<WAChatLogItem[]>(SETTING_LOGS_KEY);
    return Array.isArray(logs) ? logs : [];
  } catch {
    return [];
  }
}

export function appendWAChatLog(
  item: Omit<WAChatLogItem, "id" | "timestamp">
): Promise<void> {
  const run = async () => {
    try {
      const logs = await getWAChatLogs();
      const newItem: WAChatLogItem = {
        ...item,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      const updated = [newItem, ...logs].slice(0, MAX_LOGS);
      await setSetting(SETTING_LOGS_KEY, updated);
    } catch (err) {
      console.error("[wa-storage] Failed to append chat log:", err);
    }
  };
  logWriteQueue = logWriteQueue.then(run, run);
  return logWriteQueue;
}

export async function clearWAChatLogs(): Promise<void> {
  const run = async () => {
    await setSetting(SETTING_LOGS_KEY, []);
  };
  logWriteQueue = logWriteQueue.then(run, run);
  return logWriteQueue;
}
