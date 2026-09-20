/**
 * Registry metadata provider Cloud AI — MURNI DATA, tidak ada import server-only.
 *
 * Dipakai di dua sisi sekaligus: form client `/admin/system` (daftar pilihan
 * provider, placeholder, default base URL/model) DAN resolusi server
 * (`cloud-ai-config.ts`, `ai-models.ts`, dispatcher di `actions.ts`). Karena
 * itu modul ini WAJIB bebas import yang menyentuh DB/fs — nilai yang
 * terangkum di sini hanya konstanta publik (label, URL endpoint, nama env var),
 * tidak pernah API key.
 *
 * Penambahan provider baru = tambah satu entry di PROVIDER_METAS + satu baris
 * di union CloudProvider (cloud-ai-config.ts). TypeScript akan menolak kalau
 * entry registry kurang dari union (exhaustiveness check).
 */

import type { CloudProvider } from "@/lib/cloud-ai-config";

/**
 * Bentuk protokol yang dipakai provider:
 *  - "gemini"     — REST generateContent (Google AI Studio).
 *  - "openai-chat"— POST /v1/chat/completions (OpenAI & semua yang kompatibel:
 *    DeepSeek, Groq, OpenRouter, Together, Mistral, xAI, Ollama, dsb.).
 *  - "anthropic"  — POST /v1/messages (Claude; header x-api-key, system prompt
 *    sebagai field top-level, bukan role "system").
 *  - "off"        — tanpa cloud (mesin lokal TF-IDF).
 */
export type ApiStyle = "gemini" | "openai-chat" | "anthropic";

export interface ProviderMeta {
  id: CloudProvider;
  label: string;
  hint: string;
  apiStyle: ApiStyle | "off";
  /** Base URL endpoint (tanpa trailing slash). "" untuk gemini (endpoint tetap). */
  defaultBaseUrl: string;
  /** Model hemat default untuk portofolio. */
  defaultModel: string;
  /** Nama env var yang menyimpan API key provider ini (server-only). */
  envKey: string;
  /** Nama env var yang menyimpan override model. */
  envModel: string;
  /** Nama env var yang menyimpan override base URL ("" = tidak didukung). */
  envBaseUrl: string;
  /** Placeholder field key di form (format key publik provider). */
  keyPlaceholder: string;
}

/**
 * Daftar lengkap provider. Kunci = id provider; urutan array = urutan di UI.
 */
const PROVIDER_METAS: Record<CloudProvider, ProviderMeta> = {
  off: {
    id: "off",
    label: "OFF — 100% lokal (TF-IDF)",
    hint: "Default. Nol egress, tidak butuh key, jawaban tetap masuk akal untuk pertanyaan katalog.",
    apiStyle: "off",
    defaultBaseUrl: "",
    defaultModel: "",
    envKey: "",
    envModel: "",
    envBaseUrl: "",
    keyPlaceholder: "API Key",
  },
  gemini: {
    id: "gemini",
    label: "Gemini (Google AI Studio)",
    hint: "Dipakai hanya jika confidence jawaban lokal rendah. Dapatkan key di aistudio.google.com (gratis).",
    apiStyle: "gemini",
    // Endpoint Gemini tetap (generativelanguage.googleapis.com) — baseUrl
    // diabaikan untuk style ini; lihat ai-models.ts & ai-provider.ts.
    defaultBaseUrl: "",
    defaultModel: "gemini-2.5-flash",
    envKey: "GEMINI_API_KEY",
    envModel: "AI_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "AIza…",
  },
  openai: {
    id: "openai",
    label: "OpenAI-compatible — custom (OpenAI / Ollama / lainnya)",
    hint: "Endpoint /v1/chat/completions apapun. Isi Base URL & Model sesuai penyedia; untuk Ollama pakai http://localhost:11434/v1.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    envModel: "OPENAI_MODEL",
    envBaseUrl: "OPENAI_BASE_URL",
    keyPlaceholder: "sk-…",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    hint: "Model keluarga Claude (messages API). Dapatkan key di console.anthropic.com.",
    apiStyle: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-latest",
    envKey: "ANTHROPIC_API_KEY",
    envModel: "ANTHROPIC_MODEL",
    envBaseUrl: "ANTHROPIC_BASE_URL",
    keyPlaceholder: "sk-ant…",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    hint: "deepseek-chat / deepseek-reasoner. Dapatkan key di platform.deepseek.com.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    envModel: "DEEPSEEK_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "sk-…",
  },
  groq: {
    id: "groq",
    label: "Groq (Llama / Mixtral, sangat cepat)",
    hint: "Inferensi cepat model open-source. Dapatkan key di console.groq.com (gratis).",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    envModel: "GROQ_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "gsk_…",
  },

  openrouter: {
    id: "openrouter",
    label: "OpenRouter (ratusan model, satu key)",
    hint: "Agregator: Gemini, Claude, GPT, Llama, DeepSeek, dll. Format model wajib prefix vendor, mis. google/gemini-2.5-flash.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    envKey: "OPENROUTER_API_KEY",
    envModel: "OPENROUTER_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "sk-or-…",
  },
  together: {
    id: "together",
    label: "Together AI",
    hint: "Hosting model open-source (Llama, Qwen, DeepSeek). Dapatkan key di api.together.xyz.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    envKey: "TOGETHER_API_KEY",
    envModel: "TOGETHER_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "…",
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    hint: "Model keluarga Mistral (hemat & multibahasa). Dapatkan key di console.mistral.ai.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    envKey: "MISTRAL_API_KEY",
    envModel: "MISTRAL_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "…",
  },
  xai: {
    id: "xai",
    label: "xAI Grok",
    hint: "Model keluarga Grok. Dapatkan key di console.x.ai.",
    apiStyle: "openai-chat",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    envKey: "XAI_API_KEY",
    envModel: "XAI_MODEL",
    envBaseUrl: "",
    keyPlaceholder: "xai-…",
  },
};

/** Daftar berurutan untuk dropdown UI (off pertama = default). */
export const PROVIDERS: ProviderMeta[] = Object.values(PROVIDER_METAS);

/** Semua id provider yang valid (termasuk "off"). */
export const CLOUD_PROVIDER_IDS: readonly CloudProvider[] = Object.keys(
  PROVIDER_METAS
) as CloudProvider[];

/** Type guard: nilai dari form/env cuma boleh jadi provider yang dikenal. */
export function isCloudProvider(value: unknown): value is CloudProvider {
  return (
    typeof value === "string" &&
    (CLOUD_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

/** Metadata provider, atau null bila tidak dikenal (fail-closed ke "off"). */
export function getProviderMeta(
  id: CloudProvider | string | undefined | null
): ProviderMeta | null {
  if (!id) return null;
  return (PROVIDER_METAS as Record<string, ProviderMeta>)[id] ?? null;
}

/** Gaya API provider; "off" bila tidak ada cloud / tidak dikenal. */
export function getApiStyle(
  id: CloudProvider | string | undefined | null
): ApiStyle | "off" {
  return getProviderMeta(id)?.apiStyle ?? "off";
}
