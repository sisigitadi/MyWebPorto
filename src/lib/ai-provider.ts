/**
 * Cloud AI provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Default: OFF — Sigit_Bot berjalan lokal via TF-IDF (`ai-engine.ts`, nol egress).
 * Aktif hanya bila: AI_PROVIDER=gemini + GEMINI_API_KEY terisi non-placeholder.
 * Prompt hanya berisi data KATALOG PUBLIK (profil ringkas, judul layanan/proyek/
 * artikel) — tidak pernah PII, secret, atau isi database mentah. Lihat SECURITY.md.
 */

import { isPlaceholderKey } from "@/lib/env";

export interface LiveContext {
  ownerName: string;
  headline: string;
  skills: string[];
  services: string[];
  projects: { title: string; slug: string }[];
  articles: { title: string; slug: string }[];
}

export function isCloudAIEnabled(): boolean {
  const provider = (process.env.AI_PROVIDER || "off").toLowerCase();
  if (provider !== "gemini") return false;
  return !isPlaceholderKey(process.env.GEMINI_API_KEY);
}

export function getCloudAIModel(): string {
  return process.env.AI_MODEL || "gemini-2.5-flash";
}

/** Susun prompt ringkas dari konteks publik + pertanyaan user (dipotong aman). */
export function buildCloudPrompt(query: string, ctx: LiveContext, lang: "id" | "en"): string {
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
  const langLine =
    lang === "en"
      ? "Answer in English, concise (max 5 sentences), professional tone."
      : "Jawab dalam Bahasa Indonesia, ringkas (maksimal 5 kalimat), nada profesional.";
  return [
    `You are Sigit_Bot, AI assistant for ${ctx.ownerName}'s portfolio website (${ctx.headline}).`,
    `Public catalog — skills: ${skills}.`,
    `Services: ${services}.`,
    `Projects: ${projects}.`,
    `Articles: ${articles}.`,
    "Only answer questions about the owner, skills, services, projects, articles, or hiring contact. For anything else, politely redirect to those topics.",
    langLine,
    `Visitor question: ${q}`,
  ].join("\n");
}

export interface CloudAIResult {
  success: boolean;
  text: string;
}

/** Panggil Gemini via REST (tanpa SDK). Tidak pernah throw. */
export async function submitToGemini(prompt: string): Promise<CloudAIResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (isPlaceholderKey(apiKey)) {
    return { success: false, text: "" };
  }
  const model = getCloudAIModel();
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
