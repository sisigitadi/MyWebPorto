/**
 * Konfigurasi SEO/SEM (Google Search Console, Bing Webmaster, IndexNow, Open
 * Graph) — SERVER-ONLY.
 *
 * Sama filosofinya dengan cloud-ai-config.ts: pengaturan admin (tabel
 * `settings`, key "seo") menimpa environment variable per-field, sehingga
 * token verifikasi & key IndexNow bisa diisi / diganti dari /admin/seo tanpa
 * menyentuh deployment Vercel.
 *
 * Yang disimpan:
 * - googleVerification → <meta name="google-site-verification" content="…">
 * - bingVerification   → <meta name="msvalidate.01" content="…">
 * - indexNowKey        → key IndexNow: dipakai submit & dilayani di /{key}.txt
 * - ogTitle / ogDescription / ogImageUrl / ogImageAlt → override Open Graph
 *   default (default: diturunkan dari profil pemilik di lib/seo.ts).
 *
 * Token verifikasi & key IndexNow BUKAN rahasia — dokumentasi Google dan
 * IndexNow justru meminta nilai ini dipublikasikan (meta tag publik / file
 * statis {key}.txt di root). Karena itu ada fallback konstanta di bawah yang
 * nilainya sama persis dengan file statis yang sudah ter-commit di public/.
 * Tetap di-mask di tampilan admin (konsistensi dengan maskKey cloud-ai) dan
 * field token kosong saat submit = "pertahankan yang sudah ada".
 *
 * Jangan import dari komponen client.
 */
import type { Metadata } from "next";
import { getSetting, setSetting } from "@/lib/settings";

export interface StoredSeoConfig {
  googleVerification?: string;
  bingVerification?: string;
  indexNowKey?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  ogImageAlt?: string;
}

export interface ResolvedSeoConfig {
  googleVerification: string;
  bingVerification: string;
  indexNowKey: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogImageAlt: string;
  /** Asal nilai efektif — ditampilkan di UI agar admin tahu mana yang dipakai. */
  source: "admin" | "env" | "default";
}

const SETTING_KEY = "seo";

// Fallback terakhir (bukan rahasia — lihat catatan di atas). Dijaga agar
// produksi tidak kehilangan meta tag verifikasi sebelum admin membuka
// /admin/seo. Timpa lewat settings atau env untuk berganti properti.
const PUBLIC_DEFAULT_GOOGLE_VERIFICATION = "nO80bNSBPyrM7VQYvpPKCmgcQVBuJ_7Ydaxhfsk5Vbw";
const PUBLIC_DEFAULT_BING_VERIFICATION = "e5b871c984924b179571fcfdca565780";

/** Token verifikasi Google/Bing & key IndexNow: [A-Za-z0-9_-] 8–128 karakter. */
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;
/** URL gambar: absolut http(s) atau path relatif (mis. /uploads/og.png). */
const SAFE_IMAGE_URL_RE = /^(https?:\/\/|\/)/i;

function envGoogle(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "").trim();
}
function envBing(): string {
  return (process.env.NEXT_PUBLIC_BING_VERIFICATION || "").trim();
}
function envIndexNowKey(): string {
  return (process.env.INDEXNOW_KEY || "").trim();
}

function hasAnyAdminOverride(stored: StoredSeoConfig | null): boolean {
  return Boolean(
    stored &&
      (stored.googleVerification ||
        stored.bingVerification ||
        stored.indexNowKey ||
        stored.ogTitle ||
        stored.ogDescription ||
        stored.ogImageUrl ||
        stored.ogImageAlt)
  );
}

/**
 * Config efektif: pengaturan admin menimpa env per-field; token verifikasi
 * yang kosong jatuh ke fallback publik, key IndexNow yang kosong jatuh ke ""
 * (submit dilewati diam-diam — lihat lib/indexnow.ts).
 */
export async function resolveSeoConfig(): Promise<ResolvedSeoConfig> {
  const stored = await getSetting<StoredSeoConfig>(SETTING_KEY);

  const googleVerification = (
    stored?.googleVerification ||
    envGoogle() ||
    PUBLIC_DEFAULT_GOOGLE_VERIFICATION
  ).trim();
  const bingVerification = (
    stored?.bingVerification ||
    envBing() ||
    PUBLIC_DEFAULT_BING_VERIFICATION
  ).trim();
  const indexNowKey = (stored?.indexNowKey || envIndexNowKey()).trim();
  const ogTitle = (stored?.ogTitle || "").trim();
  const ogDescription = (stored?.ogDescription || "").trim();
  const ogImageUrl = (stored?.ogImageUrl || "").trim();
  const ogImageAlt = (stored?.ogImageAlt || "").trim();

  const source: ResolvedSeoConfig["source"] = hasAnyAdminOverride(stored)
    ? "admin"
    : envGoogle() || envBing() || envIndexNowKey()
      ? "env"
      : "default";

  return {
    googleVerification,
    bingVerification,
    indexNowKey,
    ogTitle,
    ogDescription,
    ogImageUrl,
    ogImageAlt,
    source,
  };
}

/**
 * Bentuk `verification` Metadata Next.js untuk <head>. Hanya memasukkan key
 * yang tidak kosong — content kosong memicu warning "empty verification tag".
 */
export async function resolveVerification(): Promise<NonNullable<Metadata["verification"]>> {
  const cfg = await resolveSeoConfig();
  const other: Record<string, string> = {};
  if (cfg.bingVerification) other["msvalidate.01"] = cfg.bingVerification;
  return {
    google: cfg.googleVerification || undefined,
    other,
  };
}


export interface OgMeta {
  title: string;
  description: string;
  /** "/opengraph-image" (dinamis, 1200×630) bila tidak ada override. */
  imageUrl: string;
  imageAlt: string;
  /** True bila ada salah satu override OG — dipakai label "kustom" di UI. */
  overridden: boolean;
}

/**
 * OG efektif: override admin bila ada, kalau tidak diturunkan dari profil.
 * Dipakai bersama oleh generateDynamicMetadata (lib/seo.ts) dan route
 * /opengraph-image.tsx agar pratinjau dan tag selalu sinkron.
 */
export async function resolveOgMeta(input: {
  name: string;
  headline?: string | null;
  bio?: string | null;
}): Promise<OgMeta> {
  const cfg = await resolveSeoConfig();
  const defaultTitle = `${input.name} — ${input.headline || "Web Developer"}`;
  const defaultDescription = input.bio || "";
  return {
    title: cfg.ogTitle || defaultTitle,
    description: cfg.ogDescription || defaultDescription,
    imageUrl: cfg.ogImageUrl || "/opengraph-image",
    imageAlt: cfg.ogImageAlt || `${input.name} — Portofolio`,
    overridden: Boolean(cfg.ogTitle || cfg.ogDescription || cfg.ogImageUrl),
  };
}

/** Mask token untuk tampilan admin — tidak pernah mengembalikan nilai mentah. */
export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "••••";
  return `••••••••${token.slice(-4)}`;
}


/** Versi aman untuk client/UI admin: token hanya menampilkan 4 karakter terakhir. */
export interface AdminSeoView {
  googleVerification: string;
  bingVerification: string;
  indexNowKey: string;
  hasGoogle: boolean;
  hasBing: boolean;
  hasIndexNowKey: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogImageAlt: string;
  source: ResolvedSeoConfig["source"];
}

export async function getSeoConfigForAdmin(): Promise<AdminSeoView> {
  const cfg = await resolveSeoConfig();
  return {
    googleVerification: maskToken(cfg.googleVerification),
    bingVerification: maskToken(cfg.bingVerification),
    indexNowKey: maskToken(cfg.indexNowKey),
    hasGoogle: Boolean(cfg.googleVerification),
    hasBing: Boolean(cfg.bingVerification),
    hasIndexNowKey: Boolean(cfg.indexNowKey),
    ogTitle: cfg.ogTitle,
    ogDescription: cfg.ogDescription,
    ogImageUrl: cfg.ogImageUrl,
    ogImageAlt: cfg.ogImageAlt,
    source: cfg.source,
  };
}

/** Buang whitespace & validasi format token; string kosong = "tidak diubah". */
function sanitizeToken(raw: string | undefined, fieldName: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (!TOKEN_RE.test(v)) {
    throw new Error(
      `${fieldName} tidak valid: hanya huruf, angka, tanda hubung (-), dan garis bawah (_), 8–128 karakter.`
    );
  }
  return v;
}

/**
 * Simpan pengaturan dari form /admin/seo.
 *
 * Token (googleVerification, bingVerification, indexNowKey): string kosong =
 * "pertahankan yang sudah tersimpan" — agar admin bisa ganti OG tanpa
 * mengetik ulang token. Field OG (bukan rahasia): string kosong = bersihkan
 * override, kembali ke default profil.
 *
 * Validasi format token dilakukan di sini (server-side); verifyAdmin() tetap
 * tanggung jawab server action pemanggil.
 */
export async function saveSeoConfig(input: StoredSeoConfig): Promise<void> {
  const googleVerification = sanitizeToken(input.googleVerification, "Token verifikasi Google");
  const bingVerification = sanitizeToken(input.bingVerification, "Token verifikasi Bing (msvalidate.01)");
  const indexNowKey = sanitizeToken(input.indexNowKey, "Key IndexNow");

  const ogTitle = (input.ogTitle || "").trim().slice(0, 100);
  const ogDescription = (input.ogDescription || "").trim().slice(0, 300);
  const ogImageUrl = (input.ogImageUrl || "").trim().slice(0, 500);
  const ogImageAlt = (input.ogImageAlt || "").trim().slice(0, 200);

  if (ogImageUrl && !SAFE_IMAGE_URL_RE.test(ogImageUrl)) {
    throw new Error("URL gambar Open Graph tidak valid — harus diawali http://, https://, atau / (path lokal).");
  }

  const next: StoredSeoConfig = {
    // Field OG disimpan apa adanya (termasuk string kosong = hapus override).
    ogTitle,
    ogDescription,
    ogImageUrl,
    ogImageAlt,
  };

  // Token: hanya ambil yang baru bila diisi; yang kosong pertahankan yang ada.
  const needExisting = !googleVerification || !bingVerification || !indexNowKey;
  const existing = needExisting ? await getSetting<StoredSeoConfig>(SETTING_KEY) : null;

  if (googleVerification) next.googleVerification = googleVerification;
  else if (existing?.googleVerification) next.googleVerification = existing.googleVerification;

  if (bingVerification) next.bingVerification = bingVerification;
  else if (existing?.bingVerification) next.bingVerification = existing.bingVerification;

  if (indexNowKey) next.indexNowKey = indexNowKey;
  else if (existing?.indexNowKey) next.indexNowKey = existing.indexNowKey;

  await setSetting(SETTING_KEY, next);
}
