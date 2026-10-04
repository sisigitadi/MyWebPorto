/**
 * OpenAI-compatible provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Bekerja dengan endpoint OpenAI maupun layanan yang kompatibel dengan
 * /v1/chat/completions (DeepSeek, Groq, Together, OpenRouter, Ollama, dsb.)
 * cukup dengan mengatur OPENAI_BASE_URL. Mirip `ai-provider.ts` (Gemini):
 * default OFF, tidak pernah throw, prompt hanya katalog publik (SECURITY.md).
 *
 * Env (semua server-side, TIDAK boleh prefix NEXT_PUBLIC_):
 *   AI_PROVIDER=openai        — opt-in
 *   OPENAI_API_KEY            — key rahasia
 *   OPENAI_BASE_URL           — default https://api.openai.com/v1
 *   OPENAI_MODEL              — default gpt-4o-mini
 */

import { isPlaceholderKey } from "@/lib/env";
import type { ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIStreamOptions {
  signal?: AbortSignal;
}

export interface OpenAIResult {
  success: boolean;
  text: string;
}

/** Nama provider untuk log/badge — tidak pernah membocorkan key. */
export function getProviderName(): string {
  return "openai";
}

/** Base URL endpoint (tanpa trailing slash). */
export function getOpenAIBaseUrl(): string {
  const raw = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim();
  return raw.replace(/\/+$/, "");
}

/** Model yang dipakai; default hemat untuk portofolio. */
export function getOpenAIModel(): string {
  return (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
}

/** True bila AI_PROVIDER=openai DAN key terisi non-placeholder. */
export function isOpenAIEnabled(): boolean {
  const provider = (process.env.AI_PROVIDER || "off").toLowerCase();
  if (provider !== "openai") return false;
  return !isPlaceholderKey(process.env.OPENAI_API_KEY);
}

export interface OpenAICallOptions {
  /**
   * Config yang sudah di-resolve (dari pengaturan admin atau env). Bila tidak
   * diberikan, jatuh ke env — menjaga kompatibilitas pemanggil lama.
   */
  config?: ResolvedCloudAIConfig;
  /** Batas token output (default 300 — jawaban bot). Redaksi memakai lebih. */
  maxTokens?: number;
  /** Batas panjang karakter hasil sebelum dikembalikan (default 2000). */
  maxChars?: number;
}

/**
 * Ekstrak teks jawaban dari respons /v1/chat/completions. Mendukung DUA bentuk:
 *  1. JSON utuh: choices[].message.content (OpenAI & mayoritas kompatibel).
 *  2. SSE `data: {...}` per baris berisi choices[].delta.content — beberapa
 *     gateway/relay mengabaikan `stream:false` dan SELALU memakai SSE. Tanpa
 *     toleransi ini, pemanggil non-streaming (terminal/Redaksi) melihat parse
 *     JSON gagal → dianggap "cloud gagal" dan salah jatuh ke lokal.
 */
function extractChatContent(raw: string): string {
  try {
    const data = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content || "";
  } catch {
    // Bentuk SSE: rangkai delta.content dari tiap baris data: {...}.
    let out = "";
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        out += chunk.choices?.[0]?.delta?.content ?? "";
      } catch {
        // Baris parsial / bukan JSON — dilewati.
      }
    }
    return out;
  }
}

/**
 * Baca alasan kegagalan dari respons non-2xx provider OpenAI-compatible.
 * Diutamakan field `error.code` (mis. "model_not_found", "invalid_api_key"):
 * pendek, diagnostic, dan tidak membocorkan rahasia — langsung masuk ke meta SSE
 * `fallbackReason` di route /api/retrobot agar admin segera tahu penyebabnya.
 * Jatuh ke `status_<http>` bila body tak terbaca/ter-parse (mis. proxy buta).
 */
async function readUpstreamError(res: Response, fallback: string): Promise<string> {
  try {
    const raw = await res.text();
    const code = (JSON.parse(raw) as { error?: { code?: unknown } })?.error?.code;
    if (typeof code === "string" && code.trim()) return code.trim().slice(0, 64);
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Panggil chat completions non-streaming. Menerima prompt string (dibungkus
 * user tunggal) atau array ChatMessage (system + user + riwayat).
 * Tidak pernah throw.
 */
export async function submitToOpenAI(
  prompt: string | ChatMessage[],
  options: OpenAICallOptions = {}
): Promise<OpenAIResult> {
  const cfg = options.config;
  const apiKey = cfg?.apiKey || process.env.OPENAI_API_KEY || "";
  if (isPlaceholderKey(apiKey)) return { success: false, text: "" };
  const baseUrl = cfg?.baseUrl || getOpenAIBaseUrl();
  const model = cfg?.model || getOpenAIModel();
  // Default 300 token / 2000 char untuk jawaban bot; Redaksi memakai nilai lebih
  // besar lewat opsi (draft konten panjang) — pemanggil lama tak terpengaruh.
  const maxTokens = options.maxTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;

  const messages: ChatMessage[] =
    typeof prompt === "string"
      ? [
          {
            role: "system",
            content:
              "You are Sigit_Bot, a retro Windows 95-era assistant for a portfolio website. Answer concisely (max 5 sentences).",
          },
          { role: "user", content: prompt.slice(0, maxChars) },
        ]
      : prompt.slice(-9);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return { success: false, text: "" };

    // Beberapa gateway/relay OpenAI-compatible mengabaikan `stream:false` dan
    // SELALU membalas SSE (`data: {...}` per baris). extractChatContent menang
    // ani kedua bentuk (JSON utuh maupun SSE) agar jalur non-streaming
    // (terminal/Redaksi) tidak keliru menganggap cloud gagal.
    const text = extractChatContent(await response.text());
    if (!text.trim()) return { success: false, text: "" };
    return { success: true, text: text.trim().slice(0, maxChars) };
  } catch {
    return { success: false, text: "" };
  }
}

/**
 * Streaming chat completions. Mengembalikan ReadableStream berisi SSE mentah
 * `data: {...}\n\n` sebagaimana dikirim OpenAI (choices[].delta.content).
 * Pemanggil (route handler) bertanggung jawab mem-parse & meneruskan ke client.
 * Tidak pernah throw: pada gagal, stream berisi satu event error lalu selesai.
 */
export function submitToOpenAIStream(
  messages: ChatMessage[],
  options: OpenAIStreamOptions & OpenAICallOptions = {}
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const cfg = options.config;
  const apiKey = cfg?.apiKey || process.env.OPENAI_API_KEY || "";
  const baseUrl = cfg?.baseUrl || getOpenAIBaseUrl();
  const model = cfg?.model || getOpenAIModel();

  return new ReadableStream({
    async start(controller) {
      // Fail-closed: key placeholder/kosong → stream error yang bisa
      // ditangani route sebagai fallback ke jawaban lokal.
      if (isPlaceholderKey(apiKey)) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "unconfigured" })}\n\n`)
        );
        controller.close();
        return;
      }

      let upstream: Response;
      try {
        upstream = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            // System prompt selalu di depan; riwayat percakapan menyusul.
            messages: messages.slice(-9),
            max_tokens: 300,
            temperature: 0.4,
            stream: true,
          }),
          signal: options.signal,
        });
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "network" })}\n\n`)
        );
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        // Teruskan alasan gagal yang sebenarnya: hampir semua gateway/relay
        // OpenAI-compatible membalas {error:{code,message}} yang sangat
        // diagnostic (mis. "model_not_found", "invalid_api_key"). code-nya
        // (string pendek, tak menyimpan rahasia) naik ke route → meta SSE
        // fallbackReason, agar admin langsung tahu kenapa jatuh ke lokal.
        // Jatuh ke status_<http> bila body tak terbaca (mis. proxy buta).
        const reason = await readUpstreamError(upstream, `status_${upstream.status}`);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: reason })}\n\n`)
        );
        controller.close();
        return;
      }

      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          // Teruskan chunk mentah; parsing SSE dilakukan di route handler
          // (satu tempat saja, konsisten dengan format event yang diemit).
          controller.enqueue(value);
        }
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "aborted" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}
