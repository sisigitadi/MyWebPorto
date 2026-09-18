/**
 * Resolusi konfigurasi Cloud AI — SERVER-ONLY.
 *
 * Dua sumber, dengan prioritas:
 *   1. Pengaturan admin (tabel `settings`, diisi dari form /admin/system).
 *   2. Environment variable (AI_PROVIDER, GEMINI_API_KEY, OPENAI_*).
 *
 * Sebelumnya hanya env — jadi mengganti provider/model harus redeploy. Dengan
 * lapisan ini, admin bisa mengisi key dari UI tanpa menyentuh Vercel.
 *
 * Key TIDAK PERNAH dikembalikan mentah ke client: lihat maskKey() dan
 * getCloudAIConfigForAdmin(). Pemakaian rahasia hanya terjadi di server
 * (submitToGemini / submitToOpenAI / route /api/retrobot).
 */
import { isPlaceholderKey } from "@/lib/env";
import { getSetting, setSetting } from "@/lib/settings";

export type CloudProvider = "off" | "gemini" | "openai";

/** Bentuk pengaturan Cloud AI yang disimpan di tabel settings (key "cloud_ai"). */
export interface StoredCloudAIConfig {
  provider?: CloudProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /**
   * Instruksi/persona tambahan untuk Sigit_Bot (opsional). Disisipkan ke system
   * prompt bila diisi; bila kosong, pakai persona default (lihat ai-provider.ts).
   */
  systemPrompt?: string;
  /** Gaya jawaban: "concise" (default) | "detailed" | "friendly". */
  answerStyle?: "concise" | "detailed" | "friendly";
}

export interface ResolvedCloudAIConfig {
  provider: CloudProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  answerStyle: "concise" | "detailed" | "friendly";
  /** Asal nilai efektif — ditampilkan di UI agar admin tahu mana yang dipakai. */
  source: "admin" | "env";
}

const SETTING_KEY = "cloud_ai";

function envProvider(): CloudProvider {
  const p = (process.env.AI_PROVIDER || "off").toLowerCase();
  return p === "gemini" || p === "openai" ? p : "off";
}

/**
 * Config efektif: pengaturan admin menimpa env per-field, field yang kosong
 * jatuh ke env, lalu default. Memanggil DB sekali; bungkus dengan cache
 * per-request bila ini jadi hot path.
 */
export async function resolveCloudAIConfig(): Promise<ResolvedCloudAIConfig> {
  const stored = await getSetting<StoredCloudAIConfig>(SETTING_KEY);

  const provider: CloudProvider = stored?.provider ?? envProvider();
  const apiKey = (stored?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  const baseUrl = (stored?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    .trim()
    .replace(/\/+$/, "");
  const model = (
    stored?.model ||
    (provider === "openai" ? process.env.OPENAI_MODEL : process.env.AI_MODEL) ||
    (provider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash")
  ).trim();
  const systemPrompt = (stored?.systemPrompt || "").trim();
  const styleRaw = (stored?.answerStyle || "").toLowerCase();
  const answerStyle: "concise" | "detailed" | "friendly" =
    styleRaw === "detailed" || styleRaw === "friendly" ? styleRaw : "concise";

  return {
    provider,
    apiKey,
    model,
    baseUrl,
    systemPrompt,
    answerStyle,
    source: stored && (stored.provider || stored.apiKey || stored.model || stored.baseUrl || stored.systemPrompt) ? "admin" : "env",
  };
}

/** True bila provider dipilih DAN key terisi non-placeholder. */
export async function isCloudAIConfigEnabled(): Promise<boolean> {
  const cfg = await resolveCloudAIConfig();
  if (cfg.provider === "off") return false;
  return !isPlaceholderKey(cfg.apiKey);
}

/** Versi aman untuk client/UI admin: key hanya menampilkan 4 karakter terakhir. */
export interface AdminCloudAIView {
  provider: CloudProvider;
  hasKey: boolean;
  maskedKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  answerStyle: "concise" | "detailed" | "friendly";
  source: "admin" | "env";
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (isPlaceholderKey(key)) return "(placeholder)";
  if (key.length <= 8) return "••••";
  return `••••••••${key.slice(-4)}`;
}

export async function getCloudAIConfigForAdmin(): Promise<AdminCloudAIView> {
  const cfg = await resolveCloudAIConfig();
  return {
    provider: cfg.provider,
    hasKey: Boolean(cfg.apiKey) && !isPlaceholderKey(cfg.apiKey),
    maskedKey: maskKey(cfg.apiKey),
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    systemPrompt: cfg.systemPrompt,
    answerStyle: cfg.answerStyle,
    source: cfg.source,
  };
}

/**
 * Simpan pengaturan dari form admin. apiKey kosong = "tidak diubah" (pertahankan
 * key yang ada) — agar admin bisa ganti model tanpa mengetik ulang rahasia.
 * Validasi provider/model di sini; verifikasi identitas (verifyAdmin) tetap
 * tanggung jawab server action pemanggil.
 */
export async function saveCloudAIConfig(input: StoredCloudAIConfig): Promise<void> {
  const provider: CloudProvider =
    input.provider === "gemini" || input.provider === "openai" || input.provider === "off"
      ? input.provider
      : "off";
  const model = (input.model || "").trim().slice(0, 64);
  const baseUrl = (input.baseUrl || "").trim().slice(0, 256).replace(/\/+$/, "");
  const apiKey = (input.apiKey || "").trim().slice(0, 256);
  // systemPrompt dibatasi 2000 char (cukup untuk persona + konteks; prompt
  // penuh katalog publik tetap dibangun server-side, lihat ai-provider.ts).
  const systemPrompt = (input.systemPrompt || "").trim().slice(0, 2000);
  const styleRaw = (input.answerStyle || "").toLowerCase();
  const answerStyle: "concise" | "detailed" | "friendly" =
    styleRaw === "detailed" || styleRaw === "friendly" ? styleRaw : "concise";

  const next: StoredCloudAIConfig = { provider, model, baseUrl, answerStyle };
  if (systemPrompt) next.systemPrompt = systemPrompt;
  if (apiKey) {
    // Hanya simpan key baru bila diisi; string kosong = jangan ubah.
    next.apiKey = apiKey;
  } else {
    const existing = await getSetting<StoredCloudAIConfig>(SETTING_KEY);
    if (existing?.apiKey) next.apiKey = existing.apiKey;
  }

  await setSetting(SETTING_KEY, next);
}
