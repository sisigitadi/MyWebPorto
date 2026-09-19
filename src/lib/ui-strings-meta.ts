/**
 * Metadata teks UI yang bisa diedit admin — murni data, TANPA import server.
 *
 * Dilarang mengimpor @/lib/i18n di sini: file itu "use client", sementara file
 * ini diimpor oleh ui-strings-config.ts (server-only, bawaan drizzle/fs/db).
 * Default teks diambil dari translations hanya di sisi client (form & provider).
 *
 * Sumber kebenaran tunggal untuk: key apa saja yang boleh ditimpa, label
 * manusiawi di form admin, batas panjang per key, dan sanitasi plain-text.
 * Key dengan interpolasi dinamis (os_nav_page, os_nav_of, …) sengaja
 * DIKELUARKAN dari daftar ini — admin tidak boleh merusak format string.
 */

export type UIStringLang = "id" | "en";
export const UI_STRING_LANGS = ["id", "en"] as const;

/** Batas panjang kancing untuk data DB usang (baca-jalan). */
export const MAX_KEY_LENGTH = 500;

interface EditableKeyDef {
  key: string;
  /** Label di form admin. */
  label: string;
  /** Kelompok di form (Hero, Services, …). */
  group: string;
  /** Batas panjang nilai yang disimpan. */
  maxLength: number;
  /** Di mana teks ini muncul — bantuan admin, bukan teknis. */
  hint?: string;
}

export const EDITABLE_KEYS = [
  // Hero
  { key: "hero_available_badge", label: "Badge Ketersediaan", group: "Hero", maxLength: 80, hint: "Pita status di hero section." },
  { key: "hero_cta_portfolio", label: "Tombol CTA — Portofolio", group: "Hero", maxLength: 40 },
  { key: "hero_cta_contact", label: "Tombol CTA — Kontak", group: "Hero", maxLength: 40 },
  // Services
  { key: "services_badge", label: "Badge Section Layanan", group: "Services", maxLength: 60, hint: "Pita label di atas judul section." },
  { key: "services_title", label: "Judul Section Layanan", group: "Services", maxLength: 80 },
  { key: "services_subtitle", label: "Subjudul Section Layanan", group: "Services", maxLength: 160 },
  { key: "services_cta", label: "Tombol CTA Layanan", group: "Services", maxLength: 60 },
  // Projects
  { key: "projects_badge", label: "Badge Section Proyek", group: "Projects", maxLength: 60, hint: "Pita label di atas judul section." },
  { key: "projects_title", label: "Judul Section Proyek", group: "Projects", maxLength: 80 },
  { key: "projects_page_subtitle", label: "Subjudul Section Proyek", group: "Projects", maxLength: 160 },
  { key: "projects_detail_btn", label: "Tombol Detail Proyek", group: "Projects", maxLength: 40 },
  // Products
  { key: "products_badge", label: "Badge Section Produk", group: "Products", maxLength: 60, hint: "Pita label di atas judul section." },
  { key: "products_title", label: "Judul Section Produk", group: "Products", maxLength: 80 },
  // Testimoni
  { key: "testi_badge", label: "Badge Section Testimoni", group: "Testimoni", maxLength: 60, hint: "Pita label di atas judul section." },
  { key: "testi_title", label: "Judul Section Testimoni", group: "Testimoni", maxLength: 80 },
  { key: "testi_subtitle", label: "Subjudul Section Testimoni", group: "Testimoni", maxLength: 160 },
  // Artikel
  { key: "articles_badge", label: "Badge Section Artikel", group: "Artikel", maxLength: 100, hint: "Pita label di atas judul section." },
  { key: "articles_title", label: "Judul Section Artikel", group: "Artikel", maxLength: 100 },
  { key: "articles_subtitle", label: "Subjudul Section Artikel", group: "Artikel", maxLength: 160 },
  // Kontak
  { key: "contact_eyebrow", label: "Eyebrow Section Kontak", group: "Kontak", maxLength: 100 },
  { key: "contact_title", label: "Judul Section Kontak", group: "Kontak", maxLength: 80 },
  { key: "contact_subtitle", label: "Subjudul Section Kontak", group: "Kontak", maxLength: 160 },
] as const satisfies readonly EditableKeyDef[];

export type StringKey = (typeof EDITABLE_KEYS)[number]["key"];

export const EDITABLE_KEY_SET: Set<string> = new Set(EDITABLE_KEYS.map((k) => k.key));

/** Overlay per bahasa: hanya key terdaftar, hanya string. */
export interface UIStringsOverlay {
  id: Partial<Record<StringKey, string>>;
  en: Partial<Record<StringKey, string>>;
}

/** Batas panjang untuk sebuah key (default aman bila key tak dikenal). */
export function maxLengthForKey(key: string): number {
  return EDITABLE_KEYS.find((k) => k.key === key)?.maxLength ?? 0;
}

/**
 * Sanitasi plain-text: buang tag HTML → buang char kontrol → collapse
 * whitespace → trim (urutan eksekusi kode di bawah). Sengaja TIDAK memotong
 * ke maxLength — penolakan panjang adalah
 * tugas saveUIStrings() supaya pelanggaran ditolak keras, bukan diam-diam
 * dipendekkan. Pemanggil read-path (resolveUIStrings) membuang value terlalu
 * panjang, bukan memotongnya.
 */
export function sanitizeStringValue(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, "") // buang tag HTML apa pun
    .replace(/[\u0000-\u001f\u007f]/g, "") // buang char kontrol
    .replace(/\s+/g, " ") // collapse whitespace (termasuk newline jadi spasi)
    .trim();
}
