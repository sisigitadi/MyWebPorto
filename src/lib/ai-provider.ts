/**
 * Cloud AI provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Default: OFF — Sigit_Bot berjalan lokal via TF-IDF (`ai-engine.ts`, nol
 * egress). Aktif bila AI_PROVIDER=<provider> + <PROVIDER>_API_KEY terisi
 * non-placeholder. Daftar provider, default base URL/model, dan nama env var
 * ada di registry `ai-providers.ts`; pengiriman per gaya API:
 *   - gemini      → submitToGemini (di sini, REST generateContent) untuk
 *     askSigitBot/Redaksi (prompt string, single-turn); submitToGeminiMessages
 *     (ChatMessage[]) untuk RetroBot multi-turn (riwayat + konteks halaman).
 *   - openai-chat → submitToOpenAI (ai-openai.ts, /v1/chat/completions)
 *   - anthropic   → submitToAnthropic (ai-anthropic.ts, /v1/messages)
 * Prompt hanya berisi data KATALOG PUBLIK (profil ringkas, judul layanan/proyek/
 * artikel) — tidak pernah PII, secret, atau isi database mentah. Lihat SECURITY.md.
 */

import { isPlaceholderKey } from "@/lib/env";
import { resolveCloudAIConfig, type ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";
import { getProviderMeta, isCloudProvider } from "@/lib/ai-providers";
import type { ChatMessage } from "@/lib/ai-openai";

// Satu sumber kebenaran untuk daftar provider: registry ai-providers.ts.
// (Import type untuk dipakai lokal + re-export agar modul lain tak perlu
//  mengimpornya dari cloud-ai-config.)
import type { CloudProvider } from "@/lib/cloud-ai-config";
export type { CloudProvider };

export interface LiveContext {
  ownerName: string;
  headline: string;
  skills: string[];
  services: string[];
  // slug boleh hilang: `buildCloudPrompt` memakai judul saja, dan pengirim
  // (EngineContext di ai-engine.ts) mengizinkan slug null untuk data lama.
  projects: { title: string; slug?: string | null }[];
  articles: { title: string; slug?: string | null }[];
}

/**
 * Provider cloud yang aktif: "off" (default, 100% lokal) atau salah satu dari
 * registry ai-providers.ts (gemini, openai, anthropic, deepseek, groq,
 * openrouter, together, mistral, xai).
 */
export function getCloudProvider(): CloudProvider {
  const provider = (process.env.AI_PROVIDER || "off").toLowerCase();
  return isCloudProvider(provider) ? provider : "off";
}

/**
 * Env-only legacy: membaca AI_PROVIDER + <PROVIDER>_API_KEY/_MODEL langsung
 * dari process.env, TIDAK membaca pengaturan admin (tabel settings). App memakai
 * resolveCloudAIConfig()/getCloudAIStatus() yang menggabungkan keduanya; dua
 * fungsi ini tetap diekspor untuk pemanggil langsung & test lama — jangan pakai
 * di jalur yang harus mencerminkan pengaturan admin.
 */
export function isCloudAIEnabled(): boolean {
  const provider = getCloudProvider();
  const meta = getProviderMeta(provider);
  if (!meta?.envKey) return false;
  return !isPlaceholderKey(process.env[meta.envKey]);
}

export function getCloudAIModel(): string {
  // Setiap provider punya daftar model sendiri (lihat registry); env var
  // model per-provider dipakai bila diisi, jika tidak ambil default hemat.
  const meta = getProviderMeta(getCloudProvider());
  const fromEnv = meta?.envModel ? process.env[meta.envModel] : undefined;
  return (fromEnv || meta?.defaultModel || "gemini-2.5-flash").trim();
}

/**
 * Susun prompt ringkas dari konteks publik + pertanyaan user (dipotong aman).
 *
 * `custom` (opsional): persona/instruksi tambahan dari pengaturan admin
 * (Sigit_Bot → Prompt & Gaya Jawaban). Bila diisi, instruksi default diganti
 * dengan milik admin; bila kosong, jatuh ke persona default.
 */
export function buildCloudPrompt(
  query: string,
  ctx: LiveContext,
  lang: "id" | "en",
  custom?: { systemPrompt?: string; answerStyle?: "concise" | "detailed" | "friendly" }
): string {
  const q = query.trim().slice(0, 500);
  const skills = ctx.skills.slice(0, 12).join(", ");
  const services = ctx.services.slice(0, 8).join("; ");
  const projects = ctx.projects
    .slice(0, 8)
    .map((p) => p.title)
    .join("; ");
  const articles = ctx.articles
    .slice(0, 8)
    .map((a) => a.title)
    .join("; ");
  const langLine = styleLine(lang, custom?.answerStyle);
  const customBlock = custom?.systemPrompt?.trim()
    ? `\n${custom.systemPrompt.trim().slice(0, 2000)}`
    : defaultPersonaLine(ctx, lang);
  return [
    `You are Sigit_Bot, AI assistant for ${ctx.ownerName}'s portfolio website (${ctx.headline}).`,
    customBlock,
    `Public catalog — skills: ${skills}.`,
    `Services: ${services}.`,
    `Projects: ${projects}.`,
    `Articles: ${articles}.`,
    "Only answer questions about the owner, skills, services, projects, articles, hiring contact, or general technology topics. For anything else, politely redirect to those topics.",
    langLine,
    `Visitor question: ${q}`,
  ].join("\n");
}

/** Baris instruksi bahasa + gaya jawaban (dipakai prompt & messages). */
function styleLine(
  lang: "id" | "en",
  style?: "concise" | "detailed" | "friendly"
): string {
  const s = style || "concise";
  if (lang === "en") {
    if (s === "detailed")
      return "Answer in English, structured and informative (3-6 short paragraphs or bullets), professional tone.";
    if (s === "friendly")
      return "Answer in English, warm and friendly tone, concise (max 5 sentences).";
    return "Answer in English, concise (max 5 sentences), professional tone.";
  }
  if (s === "detailed")
    return "Jawab dalam Bahasa Indonesia, terstruktur dan informatif (3-6 paragraf/poin pendek), nada profesional.";
  if (s === "friendly")
    return "Jawab dalam Bahasa Indonesia, nada hangat dan ramah, ringkas (maksimal 5 kalimat).";
  return "Jawab dalam Bahasa Indonesia, ringkas (maksimal 5 kalimat), nada profesional.";
}

/** Persona default bila admin tidak mengisi Prompt di pengaturan Cloud AI. */
function defaultPersonaLine(ctx: LiveContext, lang: "id" | "en"): string {
  return lang === "en"
    ? `Persona: helpful, knowledgeable assistant for ${ctx.ownerName}'s portfolio. You may also answer general technology questions (web development, AI, tools, best practices).`
    : `Persona: asisten yang membantu dan berpengetahuan untuk portofolio ${ctx.ownerName}. Anda juga boleh menjawab pertanyaan teknologi umum (pengembangan web, AI, tools, best practice).`;
}

/**
 * Versi messages (system + user) untuk API chat-style (OpenAI-compatible).
 * Isi prompt identik dengan buildCloudPrompt — hanya format yang berbeda —
 * agar jawaban kedua provider konsisten.
 */
export function buildCloudMessages(
  query: string,
  ctx: LiveContext,
  lang: "id" | "en",
  custom?: { systemPrompt?: string; answerStyle?: "concise" | "detailed" | "friendly" }
): { role: "system" | "user"; content: string }[] {
  const q = query.trim().slice(0, 500);
  const skills = ctx.skills.slice(0, 12).join(", ");
  const services = ctx.services.slice(0, 8).join("; ");
  const projects = ctx.projects
    .slice(0, 8)
    .map((p) => p.title)
    .join("; ");
  const articles = ctx.articles
    .slice(0, 8)
    .map((a) => a.title)
    .join("; ");
  const langLine = styleLine(lang, custom?.answerStyle);
  const customBlock = custom?.systemPrompt?.trim()
    ? `\n${custom.systemPrompt.trim().slice(0, 2000)}`
    : defaultPersonaLine(ctx, lang);
  const system = [
    `You are Sigit_Bot, AI assistant for ${ctx.ownerName}'s portfolio website (${ctx.headline}).`,
    customBlock,
    `Public catalog — skills: ${skills}.`,
    `Services: ${services}.`,
    `Projects: ${projects}.`,
    `Articles: ${articles}.`,
    "Only answer questions about the owner, skills, services, projects, articles, hiring contact, or general technology topics. For anything else, politely redirect to those topics.",
    langLine,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: q },
  ];
}

/** Hasil panggilan cloud (gemini/openai). success=false → fallback lokal. */
export interface CloudAIResult {
  success: boolean;
  text: string;
}

/** Panggil Gemini via REST (tanpa SDK). Tidak pernah throw. */
export async function submitToGemini(
  prompt: string,
  options: { config?: ResolvedCloudAIConfig; maxOutputTokens?: number; maxChars?: number } = {}
): Promise<CloudAIResult> {
  // Key & model bisa datang dari pengaturan admin (tabel settings) atau env.
  const cfg = options.config ?? (await resolveCloudAIConfig());
  const apiKey = cfg.apiKey;
  if (isPlaceholderKey(apiKey)) {
    return { success: false, text: "" };
  }
  const model = cfg.model;
  // Batas default 300 token & 2000 char cocok untuk jawaban bot pendek. Redaksi
  // memakai nilai lebih besar lewat opsi (draft artikel panjang); tidak mengubah
  // pemanggilan yang sudah ada.
  const maxOutputTokens = options.maxOutputTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      return { success: false, text: "" };
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text.trim()) return { success: false, text: "" };
    return { success: true, text: text.trim().slice(0, maxChars) };
  } catch {
    return { success: false, text: "" };
  }
}

/**
 * Panggil Gemini multi-turn via REST (generateContent). Menerima array
 * ChatMessage — SAMA PERSIS bentuknya dengan submitToAnthropic /
 * submitToOpenAIStream — sehingga RetroBot bisa meneruskan riwayat chat +
 * konteks halaman ke Gemini, bukan hanya prompt string tunggal.
 *
 * Pemetaan dari format OpenAI-style:
 *  - role "assistant" → role Gemini "model".
 *  - role "system" TIDAK ada di generateContent (legacy): persona dilekatkan
 *    ke awal pesan "user" pertama — setara dengan apa yang buildCloudPrompt
 *    lakukan untuk versi string (isi identik, hanya format yang beda).
 *  - role sama berturut-turut digabung (Gemini generateContent juga menolak
 *    pesan tak bergantian); pesan pertama wajib "user" (leading "model"
 *    di-drop). Maksimal 9 pesan terakhir, sama seperti anthropic.
 *
 * Tidak pernah throw — gagal → {success:false} → fallback lokal.
 */
export async function submitToGeminiMessages(
  messages: ChatMessage[],
  options: { config?: ResolvedCloudAIConfig; maxOutputTokens?: number; maxChars?: number } = {}
): Promise<CloudAIResult> {
  const cfg = options.config ?? (await resolveCloudAIConfig());
  const apiKey = cfg.apiKey;
  if (isPlaceholderKey(apiKey)) {
    return { success: false, text: "" };
  }
  const model = cfg.model;
  const maxOutputTokens = options.maxOutputTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;

  let systemText = "";
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of messages.slice(-9)) {
    if (m.role === "system") {
      systemText = [systemText, m.content].filter(Boolean).join("\n\n");
      continue;
    }
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${m.content}`;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  // Pesan pertama WAJIB "user"; leading "model" (assistant) di-drop.
  while (contents.length && contents[0].role === "model") {
    contents.shift();
  }
  // Persona "system" dilekatkan ke user pertama (generateContent tak punya
  // role system) — setara buildCloudPrompt untuk versi string.
  if (systemText.trim() && contents.length) {
    contents[0].parts[0].text = `${systemText.trim().slice(0, 8000)}\n\n${contents[0].parts[0].text}`;
  }
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "." }] });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      return { success: false, text: "" };
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text.trim()) return { success: false, text: "" };
    return { success: true, text: text.trim().slice(0, maxChars) };
  } catch {
    return { success: false, text: "" };
  }
}
