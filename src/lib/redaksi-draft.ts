/**
 * Pembuatan draf konten berbasis Cloud AI untuk Redaksi — SERVER-ONLY.
 *
 * MENGIKUTI KONSEP & FORMAT YANG SUDAH ADA (bukan format baru):
 *  - Format penyimpanan tetap Zod schema di validations.ts; hasil AI divalidasi
 *    ulang di sini (safeParse) SEBELUM dikembalikan ke client, dan disimpan
 *    akhirnya lewat action save* yang memvalidasi schema PENUH kedua kalinya.
 *  - Isi panjang tetap TEKS POLOS markdown-ish (## , ### , > , ```) yang dirender
 *    FormattedText — sama dengan ContentEditor. Tidak ada HTML.
 *  - Provider & key memakai resolveCloudAIConfig() (pengaturan admin > env),
 *    default OFF; key placeholder → gagal dengan pesan jelas (fail-closed).
 *
 * KEAMANAN: prompt hanya berisi instruksi + ringkasan profil PUBLIK (nama,
 * headline, keahlian). Tidak pernah PII, secret, atau isi DB mentah. AI TIDAK
 * boleh menghasilkan URL gambar — field seperti itu dibuang saat parsing.
 */
import { z } from "zod";
import { resolveCloudAIConfig } from "@/lib/cloud-ai-config";
import { submitToGemini } from "@/lib/ai-provider";
import { submitToOpenAI } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { getApiStyle } from "@/lib/ai-providers";
import { isPlaceholderKey } from "@/lib/env";
import type { RedaksiContentType } from "@/lib/redaksi-meta";
import { isRedaksiContentType } from "@/lib/redaksi-meta";

// ============================================================
// SKEMA DRAF — lenient tapi terbatas (aman); validasi penuh saat simpan
// ============================================================
// Field wajib selain isi (mis. imageUrl proyek/produk) sengaja OPSIONAL di sini:
// Redaksi fokus pada penulisan teks; aset & slug final diisi admin lewat form
// yang sama, lalu action save* memvalidasi schema PENUH.

const ArticleDraftSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  slug: z.string().max(100).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().min(10).max(50000),
  tags: z.array(z.string().max(30)).max(20).default([]),
});

const ProjectDraftSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  slug: z.string().max(100).optional(),
  summary: z.string().max(500).optional(),
  description: z.string().min(10).max(10000),
  techStacks: z.array(z.string().max(40)).max(30).default([]),
});

const ServiceDraftSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().min(5).max(5000),
});

const ProductDraftSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  slug: z.string().max(100).optional(),
  description: z.string().min(5).max(5000),
  priceLabel: z.string().max(100).optional(),
  category: z.string().max(60).optional(),
});

const TestimonialDraftSchema = z.object({
  clientName: z.string().min(2).max(100).optional(),
  clientRole: z.string().max(100).optional(),
  content: z.string().min(5).max(2000),
});

const ProfileDraftSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  headline: z.string().min(2).max(200).optional(),
  bio: z.string().min(10).max(5000),
  skills: z.array(z.string().max(50)).max(50).default([]),
});

export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;
export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;
export type ServiceDraft = z.infer<typeof ServiceDraftSchema>;
export type ProductDraft = z.infer<typeof ProductDraftSchema>;
export type TestimonialDraft = z.infer<typeof TestimonialDraftSchema>;
export type ProfileDraft = z.infer<typeof ProfileDraftSchema>;

export type RedaksiDraft =
  | { type: "article"; data: ArticleDraft }
  | { type: "project"; data: ProjectDraft }
  | { type: "service"; data: ServiceDraft }
  | { type: "product"; data: ProductDraft }
  | { type: "testimonial"; data: TestimonialDraft }
  | { type: "profile"; data: ProfileDraft };

export type DraftResult =
  | { ok: true; draft: RedaksiDraft }
  | { ok: false; error: string };

// ============================================================
// PROMPT
// ============================================================

function fieldList(type: RedaksiContentType): string {
  switch (type) {
    case "article":
      return "JSON dengan kunci: title, slug, summary, content, tags (array string).";
    case "project":
      return "JSON dengan kunci: title, slug, summary, description, techStacks (array string).";
    case "service":
      return "JSON dengan kunci: title, description.";
    case "product":
      return "JSON dengan kunci: title, slug, description, priceLabel, category.";
    case "testimonial":
      return "JSON dengan kunci: clientName, clientRole, content.";
    case "profile":
      return "JSON dengan kunci: name, headline, bio, skills (array string).";
  }
}

function intentLine(type: RedaksiContentType): string {
  switch (type) {
    case "article":
      return "Tulis sebuah ARTIKEL teknis yang informatif dan orisinal.";
    case "project":
      return "Tulis deskripsi PROYEK portofolio yang meyakinkan (studi kasus).";
    case "service":
      return "Tulis deskripsi LAYANAN profesional dengan manfaat yang jelas.";
    case "product":
      return "Tulis deskripsi PRODUK digital yang menarik untuk dibeli.";
    case "testimonial":
      return "Tulis draf TESTIMONI klien yang terdengar autentik (admin wajib memverifikasi keasliannya sebelum publish).";
    case "profile":
      return "Tulis ulang BIO PROFIL pemilik situs yang ringkas dan profesional.";
  }
}

/**
 * Konteks profil PUBLIK untuk AI (nama, headline, keahlian). Disuntikkan oleh
 * pemanggil (server action) agar modul ini tidak perlu mengimpor actions.ts
 * (mencegah circular import). Hanya data yang tampil di situs publik — tidak
 * ada PII/secret. Bila tidak diberikan, prompt andalkan brief pengguna.
 */
export interface DraftPublicContext {
  name?: string;
  headline?: string;
  skills?: string[];
}

function contextLine(ctx?: DraftPublicContext): string {
  if (!ctx) return "Konteks pemilik situs tidak tersedia; andalkan brief pengguna.";
  const skills = (ctx.skills || []).slice(0, 10).join(", ");
  return `Konteks pemilik situs (publik): nama="${ctx.name || ""}", headline="${ctx.headline || ""}", keahlian=${skills}.`;
}

export const PROFILE_CONTEXT_MARKER = "PROFILE_CONTEXT_MARKER";

function buildPrompt(type: RedaksiContentType, brief: string, lang: "id" | "en"): string {
  const langLabel = lang === "en" ? "Inggris" : "Bahasa Indonesia";
  return [
    "Anda adalah asisten redaksi untuk situs portofolio pemilik.",
    intentLine(type),
    "",
    "FORMAT ISI PANJANG: teks polos bertanda. Gunakan '## ' untuk judul bagian, '### ' untuk sub bagian, '> ' untuk kutipan, dan blok kode diapit tiga backtick (```).",
    "DILARANG menulis tag HTML, link markdown [teks](url), atau URL gambar apa pun.",
    `Bahasa jawaban: ${langLabel}.`,
    "",
    fieldList(type),
    "- slug: kebab-case, huruf kecil, tanpa spasi/tanda baca.",
    "- Output HANYA satu objek JSON yang valid. Tanpa kalimat pembuka, tanpa penjelasan, tanpa pembungkus markdown.",
    "",
    "Brief dari admin:",
    brief.trim().slice(0, 1500),
    "",
    PROFILE_CONTEXT_MARKER,
  ].join("\n");
}

// ============================================================
// PARSING
// ============================================================

/**
 * Ekstrak objek JSON dari jawaban model. Model kadang membungkus dengan
 * ```json ... ```, menambahkan teks di sekitarnya, atau menggabung beberapa
 * objek. Kita ambil braces '{' ... '}' pertama yang seimbang (sadar string).
 * Tidak pernah throw.
 */
export function extractJsonObject(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return null;
}

/** Normalisasi field array yang kadang dikirim sebagai string dipisah kama. */
function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "")))
      .filter((v) => v.length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;\n]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

export function parseDraft(type: RedaksiContentType, raw: string): DraftResult {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    return { ok: false, error: "AI tidak mengembalikan JSON yang dapat dibaca. Tulis brief yang lebih spesifik lalu coba lagi." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "JSON dari AI tidak valid (syntax error). Silakan coba lagi." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Hasil AI bukan objek." };
  }

  // Buang field yang TIDAK boleh dihasilkan AI: aset gambar & field sensitif
  // (AI dilarang mengarang URL aset; admin yang mengunggah).
  const src = parsed as Record<string, unknown>;
  delete src.imageUrl;
  delete src.avatarUrl;
  delete src.gallery;
  delete src.cvUrl;
  delete src.paymentQrUrl;
  delete src.socialLinks;
  // Array selalu dinormalisasi (model sering mengirim string dipisah koma).
  for (const key of Object.keys(src)) {
    if (/^(tags|techStacks|skills)$/.test(key)) {
      src[key] = coerceStringArray(src[key]);
    }
  }

  const schemas = {
    article: ArticleDraftSchema,
    project: ProjectDraftSchema,
    service: ServiceDraftSchema,
    product: ProductDraftSchema,
    testimonial: TestimonialDraftSchema,
    profile: ProfileDraftSchema,
  } as const;

  const result = schemas[type].safeParse(src);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg = first ? `${first.path.join(".")}: ${first.message}` : "validasi gagal";
    return {
      ok: false,
      error: `Draf AI tidak memenuhi format: ${msg}. Perbaiki brief dan coba lagi.`,
    };
  }
  return { ok: true, draft: { type, data: result.data } as RedaksiDraft };
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Buat draf konten via Cloud AI. verifyAdmin tetap tanggung jawab pemanggil
 * (server action). Fail-closed: provider off / key placeholder / provider tidak
 * terjangkau / hasil tidak valid → { ok:false, error } dalam Bahasa Indonesia.
 */
export async function draftContentWithAI(
  type: RedaksiContentType,
  brief: string,
  lang: "id" | "en" = "id",
  publicCtx?: DraftPublicContext
): Promise<DraftResult> {
  if (!isRedaksiContentType(type)) {
    return { ok: false, error: "Tipe konten tidak dikenal." };
  }
  const briefTrim = (brief || "").trim();
  if (briefTrim.length < 4) {
    return { ok: false, error: "Brief minimal 4 karakter — jelaskan topik/poin yang ingin ditulis." };
  }

  const cfg = await resolveCloudAIConfig();
  if (getApiStyle(cfg.provider) === "off") {
    return {
      ok: false,
      error: "Cloud AI sedang OFF. Aktifkan provider (Gemini / OpenAI-compatible / Anthropic Claude / Groq / DeepSeek / OpenRouter / Together / Mistral / xAI) di God Mode → Pengaturan Cloud AI sebelum memakai bantuan AI.",
    };
  }
  if (isPlaceholderKey(cfg.apiKey)) {
    return {
      ok: false,
      error: "API Key Cloud AI belum terisi (placeholder). Lengkapi dulu di God Mode → Pengaturan Cloud AI.",
    };
  }

  const ctx = contextLine(publicCtx);
  const prompt = buildPrompt(type, briefTrim, lang).replace(PROFILE_CONTEXT_MARKER, ctx);
  // Isi panjang (artikel/proyek/profil) butuh token jauh lebih besar daripada
  // jawaban bot; layanan/testimoni/produk tetap kecil.
  const isLong = type === "article" || type === "project" || type === "profile";
  const maxOutputTokens = isLong ? 2400 : 700;
  const maxChars = isLong ? 20000 : 5000;

  // Instruksi redaksi sama untuk semua gaya API; hanya format pesan yang beda.
  const redaksiMessages = [
    {
      role: "system" as const,
      content:
        "Anda adalah asisten redaksi untuk situs portofolio. Tulis konten orisinal sesuai brief. Output HANYA JSON valid.",
    },
    { role: "user" as const, content: prompt },
  ];

  let text = "";
  try {
    const style = getApiStyle(cfg.provider);
    if (style === "anthropic") {
      const res = await submitToAnthropic(redaksiMessages, {
        config: cfg,
        maxTokens: maxOutputTokens,
        maxChars,
      });
      text = res.success ? res.text : "";
    } else if (style === "openai-chat") {
      const res = await submitToOpenAI(redaksiMessages, {
        config: cfg,
        maxTokens: maxOutputTokens,
        maxChars,
      });
      text = res.success ? res.text : "";
    } else {
      const res = await submitToGemini(prompt, { config: cfg, maxOutputTokens, maxChars });
      text = res.success ? res.text : "";
    }
  } catch {
    text = "";
  }

  if (!text.trim()) {
    return {
      ok: false,
      error: `Provider (${cfg.provider}) tidak merespons. Periksa koneksi, key, dan nama model (${cfg.model}) di pengaturan Cloud AI.`,
    };
  }

  return parseDraft(type, text);
}



