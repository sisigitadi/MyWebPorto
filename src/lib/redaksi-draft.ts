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
import { submitToGemini, sanitizeProviderError, type CloudAIResult } from "@/lib/ai-provider";
import { submitToOpenAI } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { getApiStyle } from "@/lib/ai-providers";
import { isPlaceholderKey } from "@/lib/env";
import {
  INTERNAL_LINKS_MARKER,
  internalLinksPromptBlock,
  seoGeoPromptBlock,
  seoScopeFor,
} from "@/lib/seo-rules";
import type { RedaksiContentType } from "@/lib/redaksi-meta";
import {
  getRedaksiType,
  isRedaksiContentType,
  metaFieldFor,
  seoFieldsFor,
} from "@/lib/redaksi-meta";
import { remediateDraft, type DraftSeoReport } from "@/lib/seo-remediate";
import { analyzeSeo } from "@/lib/seo-keywords";

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

/**
 * Terjemahkan kegagalan provider menjadi kalimat yang bisa ditindaklanjuti.
 *
 * Setiap kode dipetakan ke tindakan yang SPESIFIK, karena pesan generik
 * ("provider gagal") membuat admin mengganti provider dan kunci berulang
 * padahal masalahnya bisa di luar sana — mis. langganan relay yang belum
 * aktif (HTTP 403), yang sama sekali tidak selesai dengan ganti kunci.
 *
 * `detail` (cuplikan pesan asli provider) disertakan karena sering jadi satu-
 *-satunya petunjuk spesifik, mis. "insufficient_user_quota".
 */
export function describeProviderFailure(
  provider: string,
  reason?: string,
  detail?: string
): string {
  const suffix = detail ? ` — provider menjawab: ${detail}` : "";
  switch (reason) {
    case "unconfigured":
      return "Provider atau API key belum dikonfigurasi. Isi di God Mode → Pengaturan Cloud AI.";
    case "status_400":
      return `Permintaan ditolak (HTTP 400). Biasanya nama model tidak dikenali oleh provider — periksa kembali field Model di Pengaturan Cloud AI.${suffix}`;
    case "status_401":
      return `API key ditolak (HTTP 401). Kunci salah, kedaluwarsa, atau tidak punya akses ke model tersebut.${suffix}`;
    case "status_402":
      return `Pembayaran diperlukan (HTTP 402). Saldo atau kredit provider habis.${suffix}`;
    case "status_403":
      return `Akses ditolak (HTTP 403). Tiga kemungkinan penyebab: langganan/quota akun provider belum aktif, kunci tidak punya izin model ini, atau IP diblokir.${suffix}`;
    case "status_404":
      return `Model atau endpoint tidak ditemukan (HTTP 404). Nama model tidak tersedia di provider ini — cek daftar model provider.${suffix}`;
    case "status_429":
      return `Kuota habis atau permintaan dibatasi (HTTP 429). Tunggu, atau ganti provider.${suffix}`;
    case "status_500":
    case "status_502":
    case "status_503":
    case "status_504":
      return `Layanan provider sedang bermasalah (HTTP ${reason.replace("status_", "")}). Coba lagi beberapa saat lagi.${suffix}`;
    case "empty_cloud":
      return "Provider membalas 200 tetapi isi jawabannya kosong. Coba lagi atau ganti model.";
    case "network":
      return "Tidak ada respons dari provider (timeout atau jaringan). Periksa koneksi, lalu coba lagi.";
    default:
      return `Provider (${provider}) gagal merespons${reason ? ` (${reason})` : ""}.${suffix}`;
  }
}

/**
 * Susun prompt lengkap untuk sebuah tipe konten.
 *
 * Dua hal di sini yang menentukan apakah bantuan AI benar-benar sinkron dengan
 * Analisis SEO:
 *  1. Blok persyaratan SEO+GEO menurunkan angkanya dari `seo-rules.ts` SESUAI
 *     SKOP tipe. Tanpa ini, model diminta menulis 600 kata untuk testimoni yang
 *     field-nya dibatasi 2.000 karakter, dan drafnya justru ditolak Zod.
 *  2. Aturan yang tidak berlaku (slug, meta, internal link) tidak ikut
 *     dicetak, jadi model tidak membuang token dan tidak mengarang.
 *
 * Diekspor supaya kontrak ini bisa diuji tanpa memanggil provider.
 */
export function buildPrompt(type: RedaksiContentType, brief: string, lang: "id" | "en"): string {
  const langLabel = lang === "en" ? "Inggris" : "Bahasa Indonesia";
  const scope = seoScopeFor(type);
  const lines = [
    "Anda adalah asisten redaksi untuk situs portofolio pemilik.",
    intentLine(type),
    "",
    "FORMAT ISI PANJANG: teks polos bertanda. Gunakan '## ' untuk judul bagian, '### ' untuk sub bagian, '> ' untuk kutipan, dan blok kode diapit tiga backtick (```).",
    "DILARANG menulis tag HTML, URL gambar, atau tautan ke luar situs (http/https).",
  ];
  if (scope.internalLinkMin > 0) {
    lines.push(
      "TAUTAN internal BOLEH dipakai dan WAJIB ada minimal satu: tulis persis [teks anchor](/path) memakai path dari daftar halaman di bawah. Jangan mengarang path yang tidak ada di daftar."
    );
  }
  lines.push(
    `Bahasa jawaban: ${langLabel}.`,
    "",
    fieldList(type)
  );
  if (scope.slug) {
    lines.push("- slug: kebab-case, huruf kecil, tanpa spasi/tanda baca.");
  }
  lines.push(
    "- Output HANYA satu objek JSON yang valid. Tanpa kalimat pembuka, tanpa penjelasan, tanpa pembungkus markdown.",
    "",
    seoGeoPromptBlock(lang, scope),
    ""
  );
  if (scope.internalLinkMin > 0) {
    lines.push(INTERNAL_LINKS_MARKER, "");
  }
  lines.push(
    "Brief dari admin:",
    brief.trim().slice(0, 1500),
    "",
    PROFILE_CONTEXT_MARKER,
  );
  return lines.join("\n");
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
  return { ok: true, draft, seoReport: { applied: [], remaining: [], usedFallback: false } };
}

/**
 * Kerangka lokal saat provider gagal (kuota habis / jaringan). INI BUKAN hasil
 * AI — hanya kerangka yang(admin isi. Yang penting kerangka ini sudah mengikuti
 * aturan struktur yang sama dengan draf AI (ringkasan pembuka, minimal 3 H2,
 * sub-judul berbentuk pertanyaan, satu daftar), supaya waktu admin terbuang
 * bukan pada pekerjaan format.
 *
 * Yang TIDAK bisa dan tidak boleh dikarang di sini: fakta berangka, angka, dan
 * pengalaman nyata. Semuanya butuh data asli. Kerangka hanya memberi tempat untuk
 * meletakkannya, dan temuan GEO "belum ada fakta berangka" sengaja dibiarkan
 * menyala supaya admin tahu itu belum terpenuhi.
 *
 * Diekspor agar kelengkapan GEO-nya bisa dikunci test: kerangka ini adalah
 * satu-satunya draf yang muncul tanpa lewat model, jadi tidak boleh
 * diam-diam turun standarnya.
 */
export function generateLocalFallbackDraft(type: RedaksiContentType, brief: string): RedaksiDraft {
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
          content: [
            `Halaman ini membahas ${briefTrim}. Tulis ringkasan mandiri di sini yang`,
            `langsung menjawab topiknya dalam beberapa kalimat, sebelum sub-judul pertama —`,
            `mesin answer mengutip bagian ini apa adanya. Cantumkan satu fakta berangka`,
            `yang nyata, misalnya waktu muat 250 ms atau penghematan 40%.`,
            ``,
            `## Apa itu ${briefTrim}?`,
            ``,
            `Jelaskan definisinya dalam satu atau dua kalimat. Jawaban ini akan dikutip`,
            `utuh oleh mesin answer, jadi langsung ke inti dan tanpa jargon.`,
            ``,
            `## Mengapa ${briefTrim} penting?`,
            ``,
            `Uraikan dampaknya, lalu tambahkan angka nyata di sini — ukuran, durasi,`,
            `jumlah, atau persentase — supaya klaimnya bisa diverifikasi dan layak dikutip.`,
            ``,
            `## Bagaimana cara mulai menggunakan ${briefTrim}?`,
            ``,
            `- Langkah pertama yang perlu disiapkan.`,
            `- Langkah kedua dan prasyaratnya.`,
            `- Langkah ketiga, termasuk kesalahan umum yang sering terjadi.`,
            ``,
            `### Apa kesalahan yang paling sering terjadi?`,
            ``,
            `Sebutkan satu kesalahan umum beserta cara memperbaikinya.`,
            ``,
            `## Kesimpulan`,
            ``,
            `Ringkas poin utama dan arahkan pembaca ke langkah berikutnya.`,
          ].join("\n"),
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
  // Isi panjang butuh token jauh lebih besar daripada jawaban pendek. Batas
  // lamanya (2.400) hampir tidak menyisakan ruang untuk amplop JSON di sekitar
  // 600 kata isi: begitu terpotong, `extractJsonObject` tidak menemukan kurung
  // penutup dan SELURUH draf dibuang dengan pesan "AI tidak mengembalikan JSON".
  // Ini plafon, bukan biaya: model hanya memakai yang benar-benar perlu.
  const scope = seoScopeFor(type);
  const isLong = scope.minWords >= 400;
  const maxOutputTokens = isLong ? 4096 : 900;
  const maxChars = isLong ? 24000 : 6000;

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
  let providerError: string | undefined;
  try {
    const style = getApiStyle(cfg.provider);
    const run = async (): Promise<CloudAIResult> => {
      if (style === "anthropic") {
        return submitToAnthropic(redaksiMessages, {
          config: cfg,
          maxTokens: maxOutputTokens,
          maxChars,
        });
      }
      if (style === "openai-chat") {
        return submitToOpenAI(redaksiMessages, {
          config: cfg,
          maxTokens: maxOutputTokens,
          maxChars,
        });
      }
      return submitToGemini(prompt, { config: cfg, maxOutputTokens, maxChars });
    };
    const res = await run();
    text = res.success ? res.text : "";
    if (!res.success) providerError = describeProviderFailure(cfg.provider, res.reason, res.detail);
  } catch (err) {
    // Throwable tak terduga (mis. fetch gagal sebelum sempat mengembalikan
    // result) tetap harus dijelaskan, bukan hilang jadi teks kosong.
    providerError = `Panggilan provider melempar error: ${sanitizeProviderError(
      err instanceof Error ? err.message : String(err),
      cfg.apiKey
    )}`;
    text = "";
  }

  // SATU-SATUNYA titik yang mengubah draf menjadi DraftResult. Baik jawaban
  // model maupun kerangka lokal wajib lewat sini, sehingga tidak ada lagi
  // jalur yang mengembalikan draf tanpa dirapikan. Dulu jalur model langsung
  // mengembalikan hasil parse apa adanya: tombol "Bantuan AI" tidak pernah
  // memperbaiki apa pun, jadi "Analisis SEO" yang ditekan sesudahnya
  // menunjukkan temuan yang sama seperti sebelumnya.
  let draft: RedaksiDraft;
  let usedFallback = false;
  if (text.trim()) {
    const parsed = parseDraft(type, text);
    if (!parsed.ok) return parsed;
    draft = parsed.draft;
  } else {
    console.warn(`[Redaksi AI] Cloud provider (${cfg.provider}) gagal merespons / jaringan error. Menggunakan draf lokal pintar (smart local fallback).`);
    draft = generateLocalFallbackDraft(type, briefTrim);
    usedFallback = true;
  }

  const synced = applySeoSync(type, draft, related, usedFallback);
  return { ...synced, seoReport: { ...synced.seoReport, providerError } };
}

/**
 * Titik sinkronisasi tunggal: draf (dari model ATAU fallback lokal) dirapikan
 * terhadap aturan yang sama dengan analyzer, lalu dianalisis ulang dengan
 * analyzer itu juga untuk menghitung sisa masalah dan skornya. Tidak ada I/O —
 * daftar `related` sudah diteruskan dari server action.
 *
 * Diekspor karena ini titik di mana "bantuan AI" dan "analisa SEO" bertemu:
 * test memverifikasi bahwa draf yang sudah disinkronkan dianalisis dengan
 * standar yang sama.
 */
export function applySeoSync(
  type: RedaksiContentType,
  draft: RedaksiDraft,
  related?: readonly { title: string; href: string }[],
  usedFallback = false
): Extract<DraftResult, { ok: true }> {
  const tdef = getRedaksiType(type);
  if (!tdef) {
    return { ok: true, draft, seoReport: { applied: [], remaining: [], usedFallback } };
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
    type,
  });

  const next: Record<string, unknown> = { ...data };
  if (fixed.title) next[tdef.titleField] = fixed.title;
  // Hanya tipe yang punya slug di schema yang boleh diperbaiki.
  if (fixed.slug && typeof next.slug === "string") next.slug = fixed.slug;
  // `metaKey` hanya diisi untuk tipe yang punya field deskripsi terpisah; pada
  // produk dan layanan `description` adalah isi, bukan meta, jadi memotongnya
  // ke 165 karakter akan menghapus isi kartu.
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
    return { ok: true, draft, seoReport: { applied: [], remaining: [], usedFallback } };
  }

  // Skor dihitung dengan pemetaan field yang PERSIS sama dengan yang akan
  // dikirim composer ke "Analisis SEO" (seoFieldsFor), jadi kedua layar bisa
  // dibandingkan tanpa mungkin berbeda angka.
  const fields = seoFieldsFor(type, reparsed.data as Record<string, unknown>);
  const analysis = analyzeSeo({
    type,
    title: fields.title,
    slug: fields.slug,
    meta: fields.meta,
    content: fields.body,
    related: related ? related.map((l) => ({ title: l.title, href: l.href })) : [],
  });

  return {
    ok: true,
    draft: { type, data: reparsed.data } as RedaksiDraft,
    seoReport: {
      applied: fixed.applied,
      remaining: fixed.remaining,
      usedFallback,
      score: analysis.score,
      geoScore: analysis.geoScore,
    } as DraftSeoReport,
  };
}



