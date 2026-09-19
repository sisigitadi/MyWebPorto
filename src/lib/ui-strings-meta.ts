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
  { key: "hero_available_badge", label: "Badge Ketersediaan", group: "Hero", maxLength: 80, hint: "Pita status di hero section." },
  { key: "hero_verified_badge", label: "Badge Terverifikasi", group: "Hero", maxLength: 60, hint: "Pita verifikasi di hero section." },
  { key: "hero_cta_projects", label: "Tombol CTA — Proyek", group: "Hero", maxLength: 40 },
  { key: "hero_cta_portfolio", label: "Tombol CTA — Portofolio", group: "Hero", maxLength: 40 },
  { key: "hero_skills_label", label: "Label Keahlian Utama", group: "Hero", maxLength: 40 },
  { key: "hero_contact_heading", label: "Heading Hubungi Saya", group: "Hero", maxLength: 60 },
  { key: "services_eyebrow", label: "Eyebrow Section Layanan", group: "Services", maxLength: 60 },
  { key: "services_title", label: "Judul Section Layanan", group: "Services", maxLength: 80 },
  { key: "services_subtitle", label: "Subjudul Section Layanan", group: "Services", maxLength: 160 },
  { key: "services_cta", label: "Tombol CTA Layanan", group: "Services", maxLength: 60 },
  { key: "projects_eyebrow", label: "Eyebrow Section Proyek", group: "Projects", maxLength: 60 },
  { key: "projects_title", label: "Judul Section Proyek", group: "Projects", maxLength: 80 },
  { key: "projects_view_all", label: "Tombol Lihat Semua Proyek", group: "Projects", maxLength: 40 },
  { key: "products_eyebrow", label: "Eyebrow Section Produk", group: "Products", maxLength: 60 },
  { key: "products_title", label: "Judul Section Produk", group: "Products", maxLength: 80 },
  { key: "testi_eyebrow", label: "Eyebrow Section Testimoni", group: "Testimoni", maxLength: 60 },
  { key: "testi_title", label: "Judul Section Testimoni", group: "Testimoni", maxLength: 80 },
  { key: "articles_eyebrow", label: "Eyebrow Section Artikel", group: "Artikel", maxLength: 100 },
  { key: "articles_title", label: "Judul Section Artikel", group: "Artikel", maxLength: 100 },
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
