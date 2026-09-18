/**
 * Cloud AI provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Default: OFF — Sigit_Bot berjalan lokal via TF-IDF (`ai-engine.ts`, nol egress).
 * Aktif bila AI_PROVIDER=gemini + GEMINI_API_KEY, atau AI_PROVIDER=openai +
 * OPENAI_API_KEY (OpenAI-compatible; lihat juga ai-openai.ts).
 * Prompt hanya berisi data KATALOG PUBLIK (profil ringkas, judul layanan/proyek/
 * artikel) — tidak pernah PII, secret, atau isi database mentah. Lihat SECURITY.md.
 */

import { isPlaceholderKey } from "@/lib/env";
import { resolveCloudAIConfig, type ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";

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
 * Provider cloud yang aktif: "off" (default, 100% lokal), "gemini", atau
 * "openai" (OpenAI-compatible — lihat ai-openai.ts, mendukung base URL ubahan).
 */
export type CloudProvider = "off" | "gemini" | "openai";

export function getCloudProvider(): CloudProvider {
  const provider = (process.env.AI_PROVIDER || "off").toLowerCase();
  if (provider === "gemini" || provider === "openai") return provider;
  return "off";
}

export function isCloudAIEnabled(): boolean {
  const provider = getCloudProvider();
  if (provider === "gemini") return !isPlaceholderKey(process.env.GEMINI_API_KEY);
  if (provider === "openai") return !isPlaceholderKey(process.env.OPENAI_API_KEY);
  return false;
}

export function getCloudAIModel(): string {
  // OpenAI-compatible punya daftar model sendiri (gpt-4o-mini, deepseek-chat,
  // llama-3.3-70b, …) — tidak bisa memakai default Gemini.
  if (getCloudProvider() === "openai") {
    return (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  }
  return process.env.AI_MODEL || "gemini-2.5-flash";
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
  options: { config?: ResolvedCloudAIConfig } = {}
): Promise<CloudAIResult> {
  // Key & model bisa datang dari pengaturan admin (tabel settings) atau env.
  const cfg = options.config ?? (await resolveCloudAIConfig());
  const apiKey = cfg.apiKey;
  if (isPlaceholderKey(apiKey)) {
    return { success: false, text: "" };
  }
  const model = cfg.model;
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
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(15_000),
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
    return { success: true, text: text.trim().slice(0, 2000) };
  } catch {
    return { success: false, text: "" };
  }
}
