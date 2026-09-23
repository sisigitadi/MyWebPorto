/**
 * Resolusi konfigurasi Cloud AI — SERVER-ONLY.
 *
 * Dua sumber, dengan prioritas:
 *   1. Pengaturan admin (tabel `settings`, diisi dari form /admin/system).
 *   2. Environment variable (AI_PROVIDER + <PROVIDER>_API_KEY/_MODEL/_BASE_URL).
 *
 * Sebelumnya hanya env — jadi mengganti provider/model harus redeploy. Dengan
 * lapisan ini, admin bisa mengisi key dari UI tanpa menyentuh Vercel.
 *
 * Daftar provider & default-nya (base URL, model, nama env var) diatur terpusat
 * di `ai-providers.ts` (registry client-safe); modul ini hanya membaca registry
 * itu, tidak mendaftar ulang.
 *
 * Key TIDAK PERNAH dikembalikan mentah ke client: lihat maskKey() dan
 * getCloudAIConfigForAdmin(). Pemakaian rahasia hanya terjadi di server
 * (submitToGemini / submitToOpenAI / submitToAnthropic / route /api/retrobot).
 */
import { isPlaceholderKey } from "@/lib/env";
import { getSetting, setSetting } from "@/lib/settings";
import { getProviderMeta, isCloudProvider } from "@/lib/ai-providers";

export type CloudProvider =
  | "off"
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "groq"
  | "openrouter"
  | "together"
  | "mistral"
  | "xai";

/** Bentuk pengaturan Cloud AI yang disimpan di tabel settings (key "cloud_ai"). */
export interface StoredCloudAIConfig {
  provider?: CloudProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  authMode?: "api_key" | "oauth";
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
  authMode: "api_key" | "oauth";
  baseUrl: string;
  systemPrompt: string;
  answerStyle: "concise" | "detailed" | "friendly";
  /** Asal nilai efektif — ditampilkan di UI agar admin tahu mana yang dipakai. */
  source: "admin" | "env";
}

const SETTING_KEY = "cloud_ai";

// Default saat provider "off" (tidak dipakai untuk panggilan apa pun — murni
// agar UI/status tetap menampilkan placeholder). Dilestarikan dari versi lama
// agar test & tampilan tidak berubah.
const FALLBACK_BASE_URL = "https://api.openai.com/v1";
const FALLBACK_MODEL = "gemini-2.5-flash";

function envProvider(): CloudProvider {
  const p = (process.env.AI_PROVIDER || "off").toLowerCase();
  return isCloudProvider(p) ? p : "off";
}

/**
 * Config efektif: pengaturan admin menimpa env per-field, field yang kosong
 * jatuh ke env, lalu default. Memanggil DB sekali; bungkus dengan cache
 * per-request bila ini jadi hot path.
 */
export async function resolveCloudAIConfig(): Promise<ResolvedCloudAIConfig> {
  const stored = await getSetting<StoredCloudAIConfig>(SETTING_KEY);

  const provider: CloudProvider = isCloudProvider(stored?.provider)
    ? stored.provider
    : envProvider();
  // Metadata provider (base URL/model default + nama env var). Null untuk
  // "off" → semua field jatuh ke FALLBACK_*.
  const meta = getProviderMeta(provider);

  const apiKey = (stored?.apiKey || (meta?.envKey ? process.env[meta.envKey] : "") || "").trim();
  const baseUrl = (
    stored?.baseUrl ||
    (meta?.envBaseUrl ? process.env[meta.envBaseUrl] : "") ||
    meta?.defaultBaseUrl ||
    FALLBACK_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");
  const model = (
    stored?.model ||
    (meta?.envModel ? process.env[meta.envModel] : "") ||
    meta?.defaultModel ||
    FALLBACK_MODEL
  ).trim();
  const authMode: "api_key" | "oauth" = stored?.authMode === "oauth" ? "oauth" : "api_key";
  
  const systemPrompt = (stored?.systemPrompt || "").trim();
  const styleRaw = (stored?.answerStyle || "").toLowerCase();
  const answerStyle: "concise" | "detailed" | "friendly" =
    styleRaw === "detailed" || styleRaw === "friendly" ? styleRaw : "concise";

  return {
    provider,
    apiKey,
    model,
    authMode,
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
  authMode: "api_key" | "oauth";
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
    authMode: cfg.authMode,
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
  const provider: CloudProvider = isCloudProvider(input.provider) ? input.provider : "off";
  const meta = getProviderMeta(provider);
  let model = (input.model || "").trim().slice(0, 64);

  // Audit & safeguard: jika model kosong atau tidak sesuai dengan provider (misal provider gemini tapi model gpt-*),
  // otomatis fallback ke defaultModel provider tersebut agar tidak terjadi error "tidak merespons".
  if (!model || (provider === "gemini" && model.startsWith("gpt-")) || (provider === "openai" && model.startsWith("gemini-"))) {
    model = meta?.defaultModel || FALLBACK_MODEL;
  }

  const baseUrl = (input.baseUrl || "").trim().slice(0, 256).replace(/\/+$/, "");
  const apiKey = (input.apiKey || "").trim().slice(0, 256);
  // systemPrompt dibatasi 2000 char (cukup untuk persona + konteks; prompt
  // penuh katalog publik tetap dibangun server-side, lihat ai-provider.ts).
  const systemPrompt = (input.systemPrompt || "").trim().slice(0, 2000);
  const styleRaw = (input.answerStyle || "").toLowerCase();
  const answerStyle: "concise" | "detailed" | "friendly" =
    styleRaw === "detailed" || styleRaw === "friendly" ? styleRaw : "concise";
  const authMode: "api_key" | "oauth" = input.authMode === "oauth" ? "oauth" : "api_key";

  const next: StoredCloudAIConfig = { provider, model, baseUrl, authMode, answerStyle };
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
