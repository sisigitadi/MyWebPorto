/**
 * Resolver gambar untuk Open Graph — SERVER-ONLY.
 *
 * Hasilnya berupa **data URL** (`data:image/png;base64,…`) — bukan Buffer.
 * Alasan (diuji langsung terhadap next/og yang dibundel Next 16):
 * - Buffer/Uint8Array mentah untuk PNG/JPEG MELEMPAR "First argument to
 *   DataView constructor must be an ArrayBuffer" karena parser dimensi
 *   next/og memanggil `new DataView(A)` — lihat fungsi Js/Ps di
 *   node_modules/next/dist/compiled/@vercel/og/index.node.js.
 * - data URL melewati cabang base64 yang meng-decode dulu → aman untuk
 *   PNG, JPEG, dan GIF.
 * - WEBP/AVIF/BMP ditolak keras oleh satori ("Unsupported image type")
 *   meski lolos whitelist upload — bila diteruskan, route /opengraph-image
 *   akan 500. Karena itu ada whitelist SATORI_MIMES di bawah; format itu
 *   tetap tampil benar di <img> halaman, hanya OG yang jatuh ke monogram.
 *
 * Tiga bentuk referensi gambar yang didukung:
 * 1. `/api/media/<uuid>` → ambil bytea dari tabel media (jalur utama).
 * 2. `/uploads/<file>`    → legacy: baca dari public/ (file upload lama yang
 *    .git-ignored TIDAK ikut ter-deploy ke Vercel — bila tidak ada, jatuh ke
 *    fallback monogram dengan warning).
 * 3. `http(s)://...`      → fetch remote.
 *
 * Tidak pernah throw: gagal resolve → null → pemanggil merender fallback
 * monogram inisial. Path traversal pada referensi legacy diblokir eksplisit.
 *
 * Jangan import dari client.
 */
import { readFile } from "fs/promises";
import path from "path";
import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_SIZE, getMedia, isMediaId, matchesImageSignature } from "@/lib/storage";

export interface ResolvedOgImage {
  /** Data URL siap pakai sebagai <img src> di satori. */
  src: string;
  /** MIME hasil deteksi magic bytes (bukan tebakan dari ekstensi/header). */
  mime: string;
}

/**
 * Satu-satunya format yang diterima satori (qI di next/og: png, apng, jpeg,
 * gif, svg). AVIF/WEBP/BMP ada di whitelist upload tapi MELEMPAR di satori.
 */
const SATORI_MIMES = ["image/png", "image/jpeg", "image/gif"];

/**
 * Path media + capture id. Validasi UUID memakai `isMediaId()` (sumber
 * kebenaran yang sama dengan route `/api/media/[id]`), dipanggil saat runtime —
 * bukan regex yang dirakit dari impor modul lain di level modul ini.
 */
const MEDIA_PATH_RE = /^\/api\/media\/([^/]+)$/i;

/** Deteksi MIME dari isi berkas — lebih dipercaya daripada ekstensi/header. */
export function detectImageMime(buffer: Buffer): string | null {
  return ALLOWED_IMAGE_MIMES.find((m) => matchesImageSignature(buffer, m)) || null;
}

/**
 * Buffer valid → data URL siap-<img>; selain itu (bukan gambar, format yang
 * ditolak satori, atau terlalu besar) → null agar jatuh ke monogram, bukan 500.
 */
function toRenderable(buffer: Buffer): ResolvedOgImage | null {
  const mime = detectImageMime(buffer);
  if (!mime) {
    console.warn("resolveOgImage: buffer bukan gambar yang dikenali; pakai fallback.");
    return null;
  }
  if (!SATORI_MIMES.includes(mime)) {
    console.warn(`resolveOgImage: format ${mime} tidak didukung satori; pakai fallback monogram.`);
    return null;
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    console.warn("resolveOgImage: gambar melebihi batas; pakai fallback.");
    return null;
  }
  return { src: `data:${mime};base64,${buffer.toString("base64")}`, mime };
}

async function resolveMediaById(id: string): Promise<ResolvedOgImage | null> {
  const row = await getMedia(id);
  if (!row) return null;
  return toRenderable(row.buffer);
}

async function resolveLegacyUpload(relativeUrl: string): Promise<ResolvedOgImage | null> {
  const publicDir = path.join(process.cwd(), "public");
  // path.join menormalkan "..", lalu hasilnya wajib tetap di dalam public/ —
  // referensi ini berasal dari DB sehingga tidak boleh lolos traversal.
  const resolved = path.join(publicDir, relativeUrl);
  const root = path.join(publicDir, path.sep);
  if (!resolved.startsWith(root)) {
    console.warn("resolveOgImage: legacy path di luar public/, ditolak:", relativeUrl);
    return null;
  }
  try {
    const buffer = await readFile(resolved);
    return toRenderable(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  } catch (err) {
    // Wajar di serverless: public/uploads di-.gitignore sehingga file lama
    // tidak ikut ter-deploy.
    console.warn("resolveOgImage: legacy upload tidak dapat dibaca:", relativeUrl, err);
    return null;
  }
}

async function resolveRemoteUrl(url: string): Promise<ResolvedOgImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("resolveOgImage: remote fetch gagal:", url, res.status);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return toRenderable(buffer);
  } catch (err) {
    console.warn("resolveOgImage: remote fetch error:", url, err);
    return null;
  }
}

/**
 * Ubah referensi gambar (path media/legacy atau URL absolut) menjadi data URL.
 * Mengembalikan null bila kosong, tidak dikenali, atau gagal di-resolve —
 * pemanggil lalu merender fallback monogram inisial.
 */
export async function resolveOgImageSrc(
  src: string | null | undefined
): Promise<ResolvedOgImage | null> {
  const url = (src || "").trim();
  if (!url) return null;

  const mediaMatch = MEDIA_PATH_RE.exec(url);
  if (mediaMatch && isMediaId(mediaMatch[1])) return resolveMediaById(mediaMatch[1]);

  if (/^https?:\/\//i.test(url)) return resolveRemoteUrl(url);

  if (url.startsWith("/uploads/")) return resolveLegacyUpload(url);

  console.warn("resolveOgImage: bentuk referensi tidak dikenal:", url);
  return null;
}
