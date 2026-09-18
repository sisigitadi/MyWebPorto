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

export interface ModelListResult {
  models: string[];
  error?: string;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Ambi daftar model. `apiKey` wajib; untuk openai, `baseUrl` wajib (default
 * https://api.openai.com/v1). Untuk gemini, baseUrl diabaikan (endpoint tetap).
 */
export async function listCloudModels(
  provider: CloudProvider,
  apiKey: string,
  baseUrl: string
): Promise<ModelListResult> {
  if (provider === "off") return { models: [], error: "Provider dimatikan." };
  const key = (apiKey || "").trim();
  if (!key) return { models: [], error: "API Key wajib diisi untuk mengambil daftar model." };

  try {
    if (provider === "gemini") {
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

    // OpenAI-compatible
    const base = (baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    if (!base) return { models: [], error: "Base URL wajib diisi." };
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
