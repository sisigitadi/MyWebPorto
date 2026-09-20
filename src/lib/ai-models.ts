/**
 * Daftar model yang tersedia di provider (server-only).
 *
 * Dipakai form /admin/system untuk mengisi field Model otomatis setelah Base
 * URL + API Key dimasukkan — sebelumnya admin harus mengetik nama model secara
 * manual (rawan salah, apal untuk provider compat seperti Ollama/Groq/DeepSeek).
 *
 * Endpoint:
 *   - openai-compatible: GET {baseUrl}/models  → { data: [{ id }] }
 *   - gemini:            GET https://generativelanguage.googleapis.com/v1beta/models
 *                         → { models: [{ name: "models/gemini-2.5-flash",
 *                            supportedGenerationMethods: ["generateContent"] }] }
 *
 * Tidak pernah throw: gagal → { error } yang ditampilkan di form.
 * Key hanya dipakai di server, tidak pernah dikembalikan ke client.
 */
import type { CloudProvider } from "@/lib/cloud-ai-config";
import { getApiStyle, getProviderMeta } from "@/lib/ai-providers";

export interface ModelListResult {
  models: string[];
  error?: string;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Sama dengan ai-anthropic.ts — Anthropic wajib header versi API.
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Ambi daftar model AKTIF dari provider (realtime — dipanggil sesudah admin
 * memilih provider & mengisi key). `apiKey` wajib; base URL wajib untuk gaya
 * openai-chat/anthropic (default diambil dari registry bila kosong).
 */
export async function listCloudModels(
  provider: CloudProvider,
  apiKey: string,
  baseUrl: string
): Promise<ModelListResult> {
  const style = getApiStyle(provider);
  if (style === "off") return { models: [], error: "Provider dimatikan." };
  const key = (apiKey || "").trim();
  if (!key) return { models: [], error: "API Key wajib diisi untuk mengambil daftar model." };

  // Provider preset (groq/deepseek/dst.) punya base URL default di registry;
  // argumen baseUrl (dari form) menang bila diisi.
  const meta = getProviderMeta(provider);

  try {
    if (style === "gemini") {
      const res = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return { models: [], error: `Gagal (${res.status}) — periksa API Key Gemini.` };
      }
      const data = (await res.json()) as {
        models?: {
          name?: string;
          supportedGenerationMethods?: string[];
        }[];
      };
      const models = (data.models || [])
        // Hanya model yang mendukung generateContent (bukan image/embedding-only).
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => (m.name || "").replace(/^models\//, ""))
        .filter((id) => id)
        .sort();
      if (!models.length) return { models: [], error: "Tidak ada model generateContent ditemukan untuk key ini." };
      return { models };
    }

    const base = (baseUrl || meta?.defaultBaseUrl || "https://api.openai.com/v1")
      .trim()
      .replace(/\/+$/, "");
    if (!base) return { models: [], error: "Base URL wajib diisi." };

    if (style === "anthropic") {
      // Anthropic: GET {base}/models, header x-api-key + anthropic-version.
      // Response shape mirip OpenAI ({ data: [{ id }] }).
      const res = await fetch(`${base}/models`, {
        method: "GET",
        headers: {
          "x-api-key": key,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return { models: [], error: `Gagal (${res.status}) — periksa API Key Anthropic.` };
      }
      const data = (await res.json()) as { data?: { id?: string }[] };
      const models = (data.data || [])
        .map((m) => (m.id || "").trim())
        .filter((id) => id)
        .sort();
      if (!models.length) return { models: [], error: "Provider tidak mengembalikan model apa pun." };
      return { models };
    }

    // OpenAI-compatible
    const res = await fetch(`${base}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { models: [], error: `Gagal (${res.status}) — periksa API Key & Base URL.` };
    }
    const data = (await res.json()) as { data?: { id?: string }[] };
    const models = (data.data || [])
      .map((m) => (m.id || "").trim())
      .filter((id) => id)
      .sort();
    if (!models.length) return { models: [], error: "Provider tidak mengembalikan model apa pun." };
    return { models };
  } catch {
    return {
      models: [],
      error: "Tidak dapat menjangkau provider (timeout/network). Coba lagi sebentar.",
    };
  }
}
