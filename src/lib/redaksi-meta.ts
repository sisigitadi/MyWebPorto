/**
 * Registry tipe konten Redaksi — MURNI DATA, TANPA import server.
 *
 * Sama filosofinya dengan features-meta.ts / os-apps-meta.ts: file ini dipisah
 * dari modul server-only (redaksi-draft.ts, actions.ts) supaya AMAN diimpor ke
 * komponen client (redaksi-composer.tsx, redaksi-automation-form.tsx). Kalau
 * label ditarik dari modul server, seluruh dependensinya (drizzle, fs, db,
 * fetch ke provider AI) ikut masuk bundle browser.
 *
 * Sumber kebenaran tunggal untuk: tipe konten yang bisa ditulis di Redaksi,
 * label/deskripsi, field isi-panjang (memakai ContentEditor), dan field yang
 * dihasilkan/diedit. Format penyimpanan tetap dipegang oleh Zod schema
 * validations.ts — Redaksi TIDAK menciptakan format baru.
 */

export type RedaksiContentType =
  | "article"
  | "project"
  | "service"
  | "product"
  | "testimonial"
  | "profile";

export interface RedaksiTypeDef {
  key: RedaksiContentType;
  /** Label panjang di selector. */
  label: string;
  /** Label pendek untuk tab/chip. */
  short: string;
  description: string;
  /** Field isi-panjang utama yang memakai ContentEditor (markdown-ish polos). */
  bodyField: "content" | "description" | "bio";
  /** Field judul utama (dipakai AI untuk slug & judul). */
  titleField: "title" | "clientName" | "name";
  /** Field array tag/tech (diedit via chip editor); null bila tak ada. */
  listField: "tags" | "techStacks" | "skills" | null;
  /**
   * True bila schema mewajibkan gambar utama (imageUrl) — Redaksi TIDAK
   * menghasilkan URL gambar (AI tidak boleh mengarang aset), jadi field ini
   * wajib diisi admin secara manual sebelum simpan bisa sukses.
   */
  requiresImage: boolean;
}

export const REDAKSI_TYPES: readonly RedaksiTypeDef[] = [
  {
    key: "article",
    label: "Artikel",
    short: "Artikel",
    description: "Tulisan teknis/esai untuk katalog artikel publik dan RSS feed.",
    bodyField: "content",
    titleField: "title",
    listField: "tags",
    requiresImage: false,
  },
  {
    key: "project",
    label: "Proyek",
    short: "Proyek",
    description: "Studi kasus portofolio: deskripsi, tech stack, demo & repo.",
    bodyField: "description",
    titleField: "title",
    listField: "techStacks",
    requiresImage: true,
  },
  {
    key: "service",
    label: "Layanan",
    short: "Layanan",
    description: "Layanan/keahlian yang ditawarkan kepada klien.",
    bodyField: "description",
    titleField: "title",
    listField: null,
    requiresImage: false,
  },
  {
    key: "product",
    label: "Produk (exe digital)",
    short: "Produk",
    description: "Katalog produk digital yang ditampilkan sebagai app/exe OS.",
    bodyField: "description",
    titleField: "title",
    listField: null,
    requiresImage: true,
  },
  {
    key: "testimonial",
    label: "Testimoni",
    short: "Testimoni",
    description: "Ulasan klien untuk bagian testimoni publik.",
    bodyField: "content",
    titleField: "clientName",
    listField: null,
    requiresImage: false,
  },
  {
    key: "profile",
    label: "Profil Pribadi",
    short: "Profil",
    description: "Data pemilik: headline, bio, dan keahlian inti.",
    bodyField: "bio",
    titleField: "name",
    listField: "skills",
    requiresImage: false,
  },
];

/** Cari definisi tipe; undefined bila key tak dikenal. */
export function getRedaksiType(key: string): RedaksiTypeDef | undefined {
  return REDAKSI_TYPES.find((t) => t.key === key);
}

/** True bila string adalah key tipe Redaksi yang dikenal. */
export function isRedaksiContentType(key: string): key is RedaksiContentType {
  return REDAKSI_TYPES.some((t) => t.key === key);
}

/**
 * Field mana yang berperan sebagai meta description per tipe.
 *
 * Hanya artikel dan proyek yang punya ringkasan terpisah. Pada produk dan
 * layanan, field `description` adalah isi kartu DAN sumber meta description
 * (halaman toko memakai `description.slice(0, 160)`), sehingga memandangnya
 * sebagai field meta akan membuat analyzer memotong deskripsi jadi 165
 * karakter. Testimoni dan profil tidak punya field meta sama sekali.
 */
export function metaFieldFor(key: string): "summary" | null {
  if (key === "article" || key === "project") return "summary";
  return null;
}

/** Field yang dipantau analyzer untuk sebuah tipe konten. */
export interface RedaksiSeoFields {
  title: string;
  /** Null bila tipe ini tidak punya slug (layanan, testimoni, profil). */
  slug: string | null;
  /** Null bila tipe ini tidak punya meta description terpisah. */
  meta: string | null;
  body: string;
}

/**
 * Ambil field analyzer dari nilai form mentah.
 *
 * Composer dan sinkronisasi draf AI WAJIB memakai fungsi ini, tidak boleh
 * menebak sendiri field-nya. Dulu keduanya berbeda: sinkronisasi draf memakai
 * `clientName` dan `name` sebagai judul, sedangkan panel analisis mengirim
 * `values.title` yang kosong untuk testimoni dan profil. Akibatnya tiga
 * temuan kritis permanen muncul padahal field-nya memang tidak ada.
 * Mengosongkan field yang tidak berlaku juga membuat analyzer tahu itu
 * bukan kelalaian admin.
 */
export function seoFieldsFor(
  type: RedaksiContentType,
  values: Record<string, unknown>
): RedaksiSeoFields {
  const tdef = getRedaksiType(type);
  const read = (key: string): string =>
    typeof values[key] === "string" ? (values[key] as string) : "";
  if (!tdef) {
    return { title: read("title"), slug: read("slug") || null, meta: null, body: "" };
  }
  const metaKey = metaFieldFor(type);
  return {
    title: read(tdef.titleField),
    slug: read("slug") || null,
    meta: metaKey ? read(metaKey) || null : null,
    body: read(tdef.bodyField),
  };
}
