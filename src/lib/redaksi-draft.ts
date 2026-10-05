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
 *
 * SINKRONISASI DENGAN ANALYZER SEO+GEO: semua angka ambang (panjang judul,
 * meta, minimal kata, density, minimal H2, internal link) TIDAK ditulis di
 * sini, tapi diturunkan dari `seo-rules.ts` — modul yang sama dengan yang
 * dipakai `analyzeSeo`. Dulu prompt ini bahkan melarang link markdown,
 * sementara analyzer menghitung `](/` sebagai internal link wajib; sekarang
 * link internal justru diminta, dengan daftar path yang boleh dipakai supaya
 * model tidak mengarang URL.
 */
import { z } from "zod";
import { resolveCloudAIConfig } from "@/lib/cloud-ai-config";
import { submitToGemini } from "@/lib/ai-provider";
import { submitToOpenAI } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { getApiStyle } from "@/lib/ai-providers";
import { isPlaceholderKey } from "@/lib/env";
import {
  INTERNAL_LINKS_MARKER,
  internalLinksPromptBlock,
  seoGeoPromptBlock,
} from "@/lib/seo-rules";
import type { RedaksiContentType } from "@/lib/redaksi-meta";
import { getRedaksiType, isRedaksiContentType } from "@/lib/redaksi-meta";
import { remediateDraft, type DraftSeoReport } from "@/lib/seo-remediate";

export type { DraftSeoReport };

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
  | { ok: true; draft: RedaksiDraft; seoReport: DraftSeoReport }
  | { ok: false; error: string };

/**
 * Laporan hasil sinkronisasi SEO+GEO yang ikut dikembalikan bersama draf, agar
 * UI bisa menampilkan apa yang sudah diperbaiki dan apa yang masih perlu
 * ditangani manusia. Didefinisikan di `seo-remediate.ts` (murni) supaya tipe
 * ini bisa diimpor komponen client tanpa menarik modul server ke browser.
 */

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
    "DILARANG menulis tag HTML, URL gambar, atau tautan ke luar situs (http/https).",
    "TAUTAN internal BOLEH dipakai dan WAJIB ada minimal satu: tulis persis [teks anchor](/path) memakai path dari daftar halaman di bawah. Jangan mengarang path yang tidak ada di daftar.",
    `Bahasa jawaban: ${langLabel}.`,
    "",
    fieldList(type),
    "- slug: kebab-case, huruf kecil, tanpa spasi/tanda baca.",
    "- Output HANYA satu objek JSON yang valid. Tanpa kalimat pembuka, tanpa penjelasan, tanpa pembungkus markdown.",
    "",
    seoGeoPromptBlock(lang),
    "",
    INTERNAL_LINKS_MARKER,
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
  const draft = { type, data: result.data } as RedaksiDraft;
  return { ok: true, draft, seoReport: { applied: [], remaining: [] } };
}

function generateLocalFallbackDraft(type: RedaksiContentType, brief: string): RedaksiDraft {
  const briefTrim = brief.trim();
  const slug = briefTrim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  switch (type) {
    case "article":
      return {
        type,
        data: {
          title: briefTrim,
          slug: slug || "artikel-baru",
          summary: `Ringkasan singkat untuk ${briefTrim}.`,
          content: `## Pendahuluan\n\n${briefTrim}\n\n### Pembahasan\n\nArtikel ini disusun secara otomatis berdasarkan brief yang Anda berikan. Anda dapat memperluas penjelasan, menambahkan sub-bagian, dan memformat teks menggunakan editor.\n\n### Kesimpulan\n\nTerus kembangkan konten agar semakin menarik bagi pembaca portofolio.`,
          tags: ["artikel", "portofolio"],
        },
      };
    case "project":
      return {
        type,
        data: {
          title: briefTrim,
          slug: slug || "proyek-baru",
          summary: `Proyek inovatif: ${briefTrim}`,
          description: `Deskripsi lengkap mengenai proyek ${briefTrim}. Dibangun dengan teknologi modern, berfokus pada performa, skalabilitas, dan pengalaman pengguna yang optimal.`,
          techStacks: ["TypeScript", "Next.js", "Tailwind CSS"],
        },
      };
    case "service":
      return {
        type,
        data: {
          title: briefTrim,
          description: `Layanan profesional dalam bidang ${briefTrim}. Solusi handal dan terukur untuk kebutuhan digital Anda.`,
        },
      };
    case "product":
      return {
        type,
        data: {
          title: briefTrim,
          slug: slug || "produk-baru",
          description: `Produk digital unggulan: ${briefTrim}. Siap pakai dan dirancang dengan standar kualitas tinggi.`,
          priceLabel: "Hubungi untuk Harga",
          category: "Software",
        },
      };
    case "testimonial":
      return {
        type,
        data: {
          clientName: "Klien Terverifikasi",
          clientRole: "Project Manager",
          content: briefTrim,
        },
      };
    case "profile":
      return {
        type,
        data: {
          name: "Sigit Adi",
          headline: briefTrim,
          bio: `Profesional berpengalaman dalam pengembangan perangkat lunak dan teknologi web. Fokus pada ${briefTrim}.`,
          skills: ["TypeScript", "React", "Next.js", "Node.js"],
        },
      };
  }
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Buat draf konten via Cloud AI, lalu SINKRONKAN dengan aturan SEO+GEO yang
 * sama dengan analyzer: draf dirapikan (judul/slug/deskripsi, ringkasan pembuka
 * GEO, internal link dari daftar halaman terbit), lalu laporan perbaikannya
 * dikembalikan agar admin tahu apa yang berubah.
 *
 * verifyAdmin tetap tanggung jawab pemanggil (server action). Fail-closed:
 * provider off / key placeholder / provider tidak terjangkau / hasil tidak valid
 * → { ok:false, error } dalam Bahasa Indonesia.
 */
export async function draftContentWithAI(
  type: RedaksiContentType,
  brief: string,
  lang: "id" | "en" = "id",
  publicCtx?: DraftPublicContext,
  related?: readonly { title: string; href: string }[]
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
  const prompt = buildPrompt(type, briefTrim, lang)
    .replace(PROFILE_CONTEXT_MARKER, ctx)
    .replace(INTERNAL_LINKS_MARKER, internalLinksPromptBlock(related || []));
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
    console.warn(`[Redaksi AI] Cloud provider (${cfg.provider}) gagal merespons / jaringan error. Menggunakan draf lokal pintar (smart local fallback).`);
    return applySeoSync(type, generateLocalFallbackDraft(type, briefTrim), related);
  }

  const parsed = parseDraft(type, text);
  if (!parsed.ok) return parsed;
  return { ok: true, draft: parsed.draft, seoReport: parsed.seoReport };
}

/**
 * Field mana yang berperan sebagai "meta description" per tipe konten. Editor memakai
 * `summary` untuk artikel/proyek dan `description` untuk produk/layanan, jadi
 * remediator harus tahu nama field-nya, bukan menebak.
 */
function metaFieldFor(type: RedaksiContentType): "summary" | "description" | null {
  if (type === "article" || type === "project") return "summary";
  if (type === "product" || type === "service") return "description";
  return null;
}

/**
 * Titik sinkronisasi tunggal: draf (dari model ATAU fallback lokal) dirapikan
 * terhadap aturan yang sama dengan analyzer, lalu dianalisis ulang untuk
 * menghitung sisa masalah. Tidak ada I/O — daftar `related` sudah diteruskan
 * dari server action.
 */
function applySeoSync(
  type: RedaksiContentType,
  draft: RedaksiDraft,
  related?: readonly { title: string; href: string }[]
): Extract<DraftResult, { ok: true }> {
  const tdef = getRedaksiType(type);
  if (!tdef) {
    return { ok: true, draft, seoReport: { applied: [], remaining: [] } };
  }
  const data = draft.data as Record<string, unknown>;
  const metaKey = metaFieldFor(type);
  const fixed = remediateDraft({
    title: typeof data[tdef.titleField] === "string" ? (data[tdef.titleField] as string) : "",
    slug: typeof data.slug === "string" ? (data.slug as string) : "",
    meta: metaKey && typeof data[metaKey] === "string" ? (data[metaKey] as string) : "",
    body: typeof data[tdef.bodyField] === "string" ? (data[tdef.bodyField] as string) : "",
    bodyField: tdef.bodyField,
    related: related ? related.map((l) => ({ title: l.title, href: l.href })) : [],
  });

  const next: Record<string, unknown> = { ...data };
  if (fixed.title) next[tdef.titleField] = fixed.title;
  // Hanya tipe yang punya slug di schema yang boleh diperbaiki.
  if (fixed.slug && typeof next.slug === "string") next.slug = fixed.slug;
  if (metaKey && fixed.meta) next[metaKey] = fixed.meta;
  if (fixed.body) next[tdef.bodyField] = fixed.body;

  // Validasi ulang: remediator tidak boleh membuat draf jadi tidak valid.
  const schemas = {
    article: ArticleDraftSchema,
    project: ProjectDraftSchema,
    service: ServiceDraftSchema,
    product: ProductDraftSchema,
    testimonial: TestimonialDraftSchema,
    profile: ProfileDraftSchema,
  } as const;
  const reparsed = schemas[type].safeParse(next);
  if (!reparsed.success) {
    // Perbaikan yang membuat draf tidak valid lebih berbahaya daripada draf
    // aslinya → pakai draf asli.
    return { ok: true, draft, seoReport: { applied: [], remaining: [] } };
  }

  return {
    ok: true,
    draft: { type, data: reparsed.data } as RedaksiDraft,
    seoReport: { applied: fixed.applied, remaining: fixed.remaining } as DraftSeoReport,
  };
}



