/**
 * Anthropic Claude provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Berbeda dari OpenAI-compatible: pakai POST /v1/messages dengan header
 * `x-api-key` + `anthropic-version`, dan system prompt dikirim sebagai FIELD
 * TOP-LEVEL `system`, bukan sebagai pesan role "system". Responsnya berupa
 * array blok konten (hanya tipe "text" yang diambil).
 *
 * Endpoint model: GET {baseUrl}/models dengan header yang sama → daftar model
 * aktif (lihat ai-models.ts). Default OFF; tidak pernah throw; prompt hanya
 * katalog publik (SECURITY.md), persis seperti ai-provider.ts & ai-openai.ts.
 *
 * Env (semua server-side, TIDAK boleh prefix NEXT_PUBLIC_):
 *   ANTHROPIC_API_KEY   — key rahasia (console.anthropic.com)
 *   ANTHROPIC_BASE_URL  — default https://api.anthropic.com/v1
 *   ANTHROPIC_MODEL     — default claude-3-5-haiku-latest
 */

import { isPlaceholderKey } from "@/lib/env";
import type { ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";
import type { ChatMessage } from "@/lib/ai-openai";

/** Versi API Anthropic yang dipakai (wajib dikirim sebagai header). */
const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicResult {
  success: boolean;
  text: string;
}

export interface AnthropicCallOptions {
  /**
   * Config yang sudah di-resolve (dari pengaturan admin atau env). Bila tidak
   * diberikan, jatuh ke env — menjaga kompatibilitas pemanggil langsung.
   */
  config?: ResolvedCloudAIConfig;
  /** Batas token output (default 300 — jawaban bot). Redaksi memakai lebih. */
  maxTokens?: number;
  /** Batas panjang karakter hasil sebelum dikembalikan (default 2000). */
  maxChars?: number;
}

function anthropicBaseUrl(cfg?: ResolvedCloudAIConfig): string {
  const raw = (
    cfg?.baseUrl ||
    process.env.ANTHROPIC_BASE_URL ||
    "https://api.anthropic.com/v1"
  ).trim();
  return raw.replace(/\/+$/, "");
}

function anthropicKey(cfg?: ResolvedCloudAIConfig): string {
  return (cfg?.apiKey || process.env.ANTHROPIC_API_KEY || "").trim();
}

function anthropicModel(cfg?: ResolvedCloudAIConfig): string {
  return (
    cfg?.model ||
    (process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest").trim()
  );
}

interface AnthropicPayload {
  model: string;
  max_tokens: number;
  temperature: number;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

/**
 * Susun payload /v1/messages dari prompt string atau array ChatMessage.
 *
 * Aturan Anthropic yang diterapkan di sini:
 *  - role "system" dipindah ke field top-level `system` (boleh kosong).
 *  - pesan pertama WAJIB role "user" (asisten di awal di-drop).
 *  - role yang sama berturut-turut di-merge (API menolak yang tidak
 *    bergantian) — penting untuk RetroBot yang menempel konteks halaman sebagai
 *    pesan "user" kedua.
 */
function buildPayload(
  prompt: string | ChatMessage[],
  model: string,
  maxTokens: number
): AnthropicPayload {
  let system = "";
  const raw: ChatMessage[] =
    typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt.slice(-9);

  const conversation: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    if (m.role === "system") {
      system = [system, m.content].filter(Boolean).join("\n\n");
      continue;
    }
    conversation.push({ role: m.role, content: m.content });
  }

  while (conversation.length && conversation[0].role === "assistant") {
    conversation.shift();
  }
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of conversation) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      merged.push({ role: m.role, content: m.content });
    }
  }
  if (!merged.length) merged.push({ role: "user", content: "." });

  const payload: AnthropicPayload = {
    model,
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: merged,
  };
  if (system.trim()) payload.system = system.trim().slice(0, 8000);
  return payload;
}


/**
 * Panggil /v1/messages non-streaming. Menerima prompt string (dibungkus user
 * tunggal) atau array ChatMessage. Tidak pernah throw.
 */
export async function submitToAnthropic(
  prompt: string | ChatMessage[],
  options: AnthropicCallOptions = {}
): Promise<AnthropicResult> {
  const cfg = options.config;
  const apiKey = anthropicKey(cfg);
  // Fail-closed: key placeholder/kosong → lokal, tidak ada egress.
  if (isPlaceholderKey(apiKey)) return { success: false, text: "" };
  const baseUrl = anthropicBaseUrl(cfg);
  const model = anthropicModel(cfg);
  // Default 300 token / 2000 char untuk jawaban bot; Redaksi memakai nilai
  // lebih besar lewat opsi (draft konten panjang) — pemanggil lama tak terpengaruh.
  const maxTokens = options.maxTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;

  try {
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(buildPayload(prompt, model, maxTokens)),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return { success: false, text: "" };

    const data = (await response.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const text = (data.content || [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text || "")
      .join("");
    if (!text.trim()) return { success: false, text: "" };
    return { success: true, text: text.trim().slice(0, maxChars) };
  } catch {
    return { success: false, text: "" };
  }
}
