/**
 * Generate gambar (cover) via Gemini image models — SERVER-ONLY.
 *
 * Kebutuhan: composer Redaksi wajib diisi `imageUrl` untuk artikel, proyek,
 * dan produk, tapi admin tidak punya stok gambar yang layak.
 * Kesalahan yang paling sering terjadi di sini adalah gambar hasil AI yang
 * memuat teks acak (huruf gibberish) — itu dicegah lewat prompt.
 *
 * Model dicek langsung ke ListModels (probe 2026-10-05, key aktif):
 *   gemini-3.1-flash-lite-image, gemini-3.1-flash-image,
 *   gemini-3-pro-image, gemini-3.1-flash-image-preview,
 *   gemini-3-pro-image-preview, gemini-2.5-flash-image
 * → `IMAGE_MODEL_FALLBACKS` memakai urutan paling murah/cepat ke paling
 *whomois, bukan urutan alfabet.
 *
 * Kontrak: TIDAK PERNAH throw. Semua kegagalan dikembalikan sebagai
 * `{ ok: false, error }` supaya pemanggil (server action) tidak perlu
 * try/catch dan UI bisa menampilkan pesan yang bisa ditindaklanjuti.
 */

import { isPlaceholderKey } from "@/lib/env";

/** Urutan fallback: flash-lite → flash → pro (murah & cepat dulu). */
export const IMAGE_MODEL_FALLBACKS: readonly string[] = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
];

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 90_000;

export interface CoverPromptInput {
  title: string;
  description?: string | null;
  /** Cuplikan isi konten — sumber utama untuk menentukan visual. */
  body?: string | null;
  /** "artikel" | "proyek" | "produk" — supaya gaya dan rasio sesuai. */
  contentType?: string | null;
}

/**
 * Prompt cover. Dua aturan yang paling menentukan kualitas hasil:
 * 1. **Larangan eksplisit teks/logo/watermark** — image model sering
 *    menghasilkan huruf pseudografis yang membuat cover terlihat rusak.
 * 2. **Rasio 16:9** —cover dipakai sebagai og:image (1200×630) sekaligus
 *    thumbnail katalog, jadi satu gambar cukup untuk semua surface.
 */
export function buildCoverImagePrompt(input: CoverPromptInput): string {
  const title = (input.title || "").trim() || "Konten portofolio";
  const description = (input.description || "").trim().slice(0, 400);
  const body = (input.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
  const kind = (input.contentType || "artikel").toLowerCase();

  // Key mengikuti `RedaksiContentType` yang dipakai composer/action
  // ("article"/"project"/"product"); alias Bahasa Indonesia tetap diterima
  // supaya prompt builder aman dipanggil dari mana saja.
  const roleByKind: Record<string, string> = {
    article: "sampul artikel blog",
    artikel: "sampul artikel blog",
    project: "cover portofolio untuk studi kasus proyek",
    proyek: "cover portofolio untuk studi kasus proyek",
    product: "cover produk digital yang dijual",
    produk: "cover produk digital yang dijual",
  };

  return [
    `Buat gambar ${roleByKind[kind] || roleByKind.article} dengan rasio 16:9.`,
    "",
    `Judul: ${title}`,
    description ? `Deskripsi: ${description}` : "",
    body ? `Isi (cuplikan): ${body}` : "",
    "",
    "GAYA: ilustrasi digital modern dan editorial; warna bold dan kontras;",
    "bentuk geometris bersih; pencahayaan sinematik lembut; komposisi bernapas.",
    "",
    "LARANGAN (penting):",
    "- Jangan menulis teks, huruf, angka, atau watermark apa pun di dalam gambar.",
    "- Jangan menampilkan logo, brand dagang, atau wajah orang yang kenali.",
    "- Jangan menambahkan border atau frame.",
    "",
    "Objek utama di tengah, sisanya ruang kosong sederhana agar judul konten",
    "bisa ditambahkan oleh situs tanpa menutupi elemen penting.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export interface GeneratedImage {
  buffer: Buffer;
  /** MIME yang diklaim provider (belum diverifikasi magic bytes). */
  mime: string;
  model: string;
}

/**
 * Ambil inline image dari `candidates[].content.parts[]`. Gemini_image
 * mengembalikan gambar sebagai base64 di dalam `inlineData`.
 */
export function pickInlineImage(
  body: unknown
): { mime: string; data: string } | null {
  const candidates = (body as { candidates?: unknown[] })?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  for (const candidate of candidates) {
    const parts = (candidate as { content?: { parts?: unknown[] } })?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const inline = (part as { inlineData?: { mimeType?: string; data?: string } })
        ?.inlineData;
      if (inline?.data && typeof inline.data === "string" && inline.data.length > 0) {
        return { mime: inline.mimeType || "image/png", data: inline.data };
      }
    }
  }
  return null;
}

/** Model yang dicoba: override env > daftar fallback. */
export function imageModelChain(envModel?: string | null): string[] {
  const override = (envModel || "").trim();
  if (override) return [override];
  return [...IMAGE_MODEL_FALLBACKS];
}

export type GenerateResult =
  | { ok: true; image: GeneratedImage }
  | { ok: false; error: string };

/**
 * Panggil satu model image. Non-2xx → pesan ringkas yang menyebut status
 * supaya quota (429) vs key salah (401/403) vs model salah (404) bisa
 * dibedakan di log admin.
 */
async function callGeminiImage(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string
): Promise<{ ok: true; buffer: Buffer; mime: string } | { ok: false; error: string }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models/${model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const snippet = detail.replace(/\s+/g, " ").slice(0, 160);
      return {
        ok: false,
        error: `${model} gagal (HTTP ${res.status})${snippet ? `: ${snippet}` : ""}`,
      };
    }

    const body = await res.json().catch(() => null);
    const inline = pickInlineImage(body);
    if (!inline) {
      // Teks-only sering terjadi saat safety filter menolak prompt.
      return {
        ok: false,
        error: `${model} tidak mengembalikan gambar (prompt ditolak filter atau respons kosong)`,
      };
    }
    const buffer = Buffer.from(inline.data, "base64");
    if (buffer.length === 0) {
      return { ok: false, error: `${model} mengembalikan gambar kosong` };
    }
    return { ok: true, buffer, mime: inline.mime };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${model} gagal: ${message}` };
  }
}

/**
 * Generate satu cover, mencoba model satu per satu sampai berhasil.
 * Placeholder key langsung ditolak tanpa menyentuh network.
 */
export async function generateCoverImage(input: {
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
  prompt: string;
}): Promise<GenerateResult> {
  if (!input.apiKey || isPlaceholderKey(input.apiKey)) {
    return { ok: false, error: "API key Gemini belum dikonfigurasi di /admin/cloud-ai." };
  }
  const baseUrl = (input.baseUrl || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
  const models = imageModelChain(input.model);

  const errors: string[] = [];
  for (const model of models) {
    const res = await callGeminiImage(input.apiKey, baseUrl, model, input.prompt);
    if (res.ok) {
      return { ok: true, image: { buffer: res.buffer, mime: res.mime, model } };
    }
    errors.push(res.error);
  }
  // 429 di ketiga model biasanya berarti kuota akun habis, bukan model mati —
  //error tanpa petunjuk membuat admin mengira fiturnya yang rusak.
  const allQuotaBlocked = errors.every((e) => e.includes("429"));
  const hint = allQuotaBlocked
    ? " Kemungkinan kuota Gemini habis untuk semua model — tunggu reset kuota atau ganti API key di /admin/cloud-ai."
    : "";
  return {
    ok: false,
    error: `Gagal membuat gambar di semua model.${hint} ${errors.join(" | ")}`,
  };
}