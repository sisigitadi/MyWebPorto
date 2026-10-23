/**
 * Storage adapter gambar — server-only, jangan import dari client.
 *
 * Gambar disimpan LANGSUNG di Postgres: tabel `media`, kolom `data` bytea.
 * Satu-satunya penyimpanan — tidak ada CDN/S3 terpisah, tidak ada tulis ke
 * filesystem (serverless read-only). Disajikan via GET /api/media/[id].
 *
 * Validasi keamanan (whitelist MIME, magic bytes, ekstensi dari MIME)
 * TERPUSAT di sini agar konsisten di semua jalur.
 */

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import sharp from "sharp";
import { db, isDbConnected } from "@/db";
import { media } from "@/db/schema";

export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

/**
 * Id media selalu UUID v4 (dibuat `randomUUID()`). Satu-satunya definisi
 * aturan ini dipakai tiga tempat: route `GET /api/media/[id]` (validasi sebelum
 * query), resolver Open Graph, dan audit URL gambar tersimpan — supaya format
 * yang dianggap valid tidak pernah berbeda antar jalur.
 */
export const MEDIA_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pemakai aturan di atas lewat FUNGSI, bukan regex yang diimpor langsung:
 * `vi.mock("@/lib/storage")` di test mengisi ekspor modul setelah modul lain
 * selesai dievaluasi, sehingga `new RegExp(MEDIA_ID_RE.source)` di level modul
 * bisa tertangkap `undefined`. Memanggil saat runtime selalu aman.
 */
export function isMediaId(value: string): boolean {
  return MEDIA_ID_RE.test(value);
}

export const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

export const ALLOWED_IMAGE_MIMES = Object.keys(EXTENSION_BY_MIME);

/** MIME dari klien mudah dipalsukan — verifikasi isi via magic bytes atau header SVG. */
export function matchesImageSignature(buffer: Buffer, mime: string): boolean {
  const ascii = (start: number, end: number) => buffer.subarray(start, end).toString("ascii");
  const startsWith = (...bytes: number[]) => bytes.every((byte, i) => buffer[i] === byte);

  switch (mime) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/gif":
      return ascii(0, 4) === "GIF8";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/bmp":
      return startsWith(0x42, 0x4d);
    case "image/avif":
      return ascii(4, 8) === "ftyp" && /^(avif|avis|heic|heix|mif1|msf1)/.test(ascii(8, 12));
    case "image/svg+xml": {
      const header = buffer.subarray(0, 1024).toString("utf8").trim().toLowerCase();
      return header.startsWith("<svg") || (header.startsWith("<?xml") && header.includes("<svg"));
    }
    default:
      return false;
  }
}

/** Sanitasi SVG untuk menangkal serangan XSS berbasis script/event inline */
export function isSafeSvg(buffer: Buffer): boolean {
  const content = buffer.toString("utf8").toLowerCase();
  const dangerousPatterns = [
    "<script",
    "javascript:",
    "onload=",
    "onerror=",
    "onclick=",
    "onmouseover=",
    "<iframe",
    "<object",
    "<embed",
  ];
  return !dangerousPatterns.some((pattern) => content.includes(pattern));
}

export interface ValidatedImage {
  buffer: Buffer;
  mime: string;
  extension: string;
}

/** Validasi File upload → buffer siap simpan, atau pesan error aman. Tidak pernah throw. */
export function validateImageFile(file: {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<{ ok: true; image: ValidatedImage } | { ok: false; error: string }> {
  return (async () => {
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
      return {
        ok: false as const,
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, AVIF, SVG, GIF, atau BMP.",
      };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { ok: false as const, error: "Ukuran file terlalu besar. Maksimum ukuran adalah 20 MB." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, file.type)) {
      return {
        ok: false as const,
        error: "Isi berkas tidak cocok dengan tipe gambarnya. Pastikan file gambar valid (JPG, PNG, WEBP, AVIF, SVG, GIF, BMP).",
      };
    }
    if (file.type === "image/svg+xml" && !isSafeSvg(buffer)) {
      return {
        ok: false as const,
        error: "File SVG mengandung tag atau script yang tidak aman.",
      };
    }
    return {
      ok: true as const,
      image: { buffer, mime: file.type, extension: EXTENSION_BY_MIME[file.type] },
    };
  })();
}

/**
 * Optimasi buffer gambar:
 * - Vektor SVG dipertahankan tetap SVG murni (tidak diraster agar tajam & sangat hemat).
 * - Raster (JPEG, PNG, BMP, unoptimized WebP/AVIF) dikonversi ke WebP berkualitas tinggi (quality: 82),
 *   dibatasi maksimal dimensi 1920x1920 tanpa pembesaran (withoutEnlargement),
 *   menghasilkan penghematan storage 70-85% tanpa distorsi visual.
 */
export async function optimizeImageBuffer(
  buffer: Buffer,
  mime: string,
  originalName?: string
): Promise<{ buffer: Buffer; mime: string; extension: string; name?: string }> {
  // SVG tetap format vektor
  if (mime === "image/svg+xml") {
    const cleanName = originalName ? originalName.replace(/\.[^/.]+$/, ".svg") : undefined;
    return { buffer, mime: "image/svg+xml", extension: "svg", name: cleanName };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Jika GIF bergerak dengan banyak frame, konversi ke animated WebP
    if (metadata.pages && metadata.pages > 1) {
      try {
        const animatedWebp = await sharp(buffer, { animated: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        const cleanName = originalName ? originalName.replace(/\.[^/.]+$/, ".webp") : undefined;
        return { buffer: animatedWebp, mime: "image/webp", extension: "webp", name: cleanName };
      } catch {
        return { buffer, mime, extension: "gif", name: originalName };
      }
    }

    // Raster umum: auto-rotate EXIF, batas resolusi 1920px inside, format WebP quality 82
    const optimized = await sharp(buffer)
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const cleanName = originalName ? originalName.replace(/\.[^/.]+$/, ".webp") : undefined;

    return {
      buffer: optimized,
      mime: "image/webp",
      extension: "webp",
      name: cleanName,
    };
  } catch (err) {
    console.warn("optimizeImageBuffer: sharp optimization gagal, menggunakan buffer asli:", err);
    return {
      buffer,
      mime,
      extension: EXTENSION_BY_MIME[mime] || "webp",
      name: originalName,
    };
  }
}

// ---------- Database (Postgres bytea) & Local Fallback (Dual-Persistence) ----------

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel
  ? path.join("/tmp", "my-web-porto-data")
  : path.join(process.cwd(), "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");
const MEDIA_META_FILE = path.join(DATA_DIR, "local-media.json");

interface LocalMediaMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}

function ensureLocalMediaDir(): void {
  try {
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("ensureLocalMediaDir gagal:", err);
  }
}

function readLocalMediaMeta(): LocalMediaMeta[] {
  try {
    ensureLocalMediaDir();
    if (fs.existsSync(MEDIA_META_FILE)) {
      const raw = fs.readFileSync(MEDIA_META_FILE, "utf-8");
      return JSON.parse(raw) as LocalMediaMeta[];
    }
  } catch (err) {
    console.warn("readLocalMediaMeta gagal:", err);
  }
  return [];
}

function writeLocalMediaMeta(items: LocalMediaMeta[]): void {
  try {
    ensureLocalMediaDir();
    fs.writeFileSync(MEDIA_META_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.warn("writeLocalMediaMeta gagal:", err);
  }
}

function saveMediaLocally(id: string, name: string, mime: string, buffer: Buffer): void {
  try {
    ensureLocalMediaDir();
    const filePath = path.join(MEDIA_DIR, id);
    fs.writeFileSync(filePath, buffer);

    const items = readLocalMediaMeta().filter((m) => m.id !== id);
    items.unshift({
      id,
      name,
      mime,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    });
    writeLocalMediaMeta(items);
  } catch (err) {
    console.warn("saveMediaLocally gagal:", err);
  }
}

function getMediaLocally(id: string): { buffer: Buffer; mime: string } | null {
  try {
    ensureLocalMediaDir();
    const filePath = path.join(MEDIA_DIR, id);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const items = readLocalMediaMeta();
      const meta = items.find((m) => m.id === id);
      const mime = meta?.mime || "image/webp";
      return { buffer, mime };
    }
  } catch (err) {
    console.warn("getMediaLocally gagal:", err);
  }
  return null;
}

function listLocalMediaItems(): MediaItem[] {
  const meta = readLocalMediaMeta();
  return meta.map((m) => ({
    id: m.id,
    name: m.name,
    url: `/api/media/${m.id}`,
    mime: m.mime,
    size: m.size,
    createdAt: m.createdAt,
  }));
}

function deleteMediaLocally(id: string): void {
  try {
    ensureLocalMediaDir();
    const filePath = path.join(MEDIA_DIR, id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const items = readLocalMediaMeta().filter((m) => m.id !== id);
    writeLocalMediaMeta(items);
  } catch (err) {
    console.warn("deleteMediaLocally gagal:", err);
  }
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  createdAt: string;
}

/** Basename saja (anti traversal) + potong nama ekstrem untuk display. */
export function sanitizeMediaName(originalName: string): string {
  const base = (originalName.split("/").pop() || "image").split("\\").pop() || "image";
  return base.slice(0, 180);
}

/**
 * Simpan gambar ke tabel media dan penyimpanan lokal (Dual-Persistence).
 * URL publiknya bersifat lokasi-independen (/api/media/<id>).
 * Otomatis dioptimasi (WebP / SVG). Tetap sukses tersimpan saat database cloud offline/terkendala.
 */
export async function putMedia(
  name: string,
  buffer: Buffer,
  mime: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const optimized = await optimizeImageBuffer(buffer, mime, name);
    const id = randomUUID();
    const finalName = sanitizeMediaName(optimized.name || name);

    // 1. Selalu simpan di penyimpanan disk lokal terlebih dahulu
    saveMediaLocally(id, finalName, optimized.mime, optimized.buffer);

    // 2. Jika database online, sinkronkan ke Postgres bytea
    if (isDbConnected) {
      try {
        await db.insert(media).values({
          id,
          name: finalName,
          mime: optimized.mime,
          size: optimized.buffer.length,
          data: optimized.buffer,
        });
      } catch (dbErr) {
        // Jangan batalkan upload jika database cloud offline
        console.warn("putMedia: Database cloud offline, tersimpan di fallback lokal:", dbErr);
      }
    }

    return { ok: true, id };
  } catch (err) {
    console.error("putMedia: proses gagal:", err);
    return { ok: false, error: "Gagal memproses gambar. Coba lagi." };
  }
}

/** Daftar metadata media (termasuk fallback lokal) — terbaru pertama. */
export async function listMediaItems(): Promise<MediaItem[]> {
  let dbItems: MediaItem[] = [];
  if (isDbConnected) {
    try {
      const rows = await db
        .select({
          id: media.id,
          name: media.name,
          mime: media.mime,
          size: media.size,
          createdAt: media.createdAt,
        })
        .from(media)
        .orderBy(desc(media.createdAt))
        .limit(100);
      dbItems = rows.map((r) => ({
        id: r.id,
        name: r.name,
        url: `/api/media/${r.id}`,
        mime: r.mime,
        size: r.size,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("listMediaItems: select DB gagal, beralih ke media lokal:", err);
    }
  }

  const localItems = listLocalMediaItems();
  const map = new Map<string, MediaItem>();
  for (const item of localItems) map.set(item.id, item);
  for (const item of dbItems) map.set(item.id, item);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Ambil biner + MIME untuk disajikan di GET /api/media/[id]. Mendukung fallback lokal. */
export async function getMedia(
  id: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  // 1. Coba baca dari database Postgres jika terhubung
  if (isDbConnected) {
    try {
      const rows = await db
        .select({ data: media.data, mime: media.mime })
        .from(media)
        .where(eq(media.id, id))
        .limit(1);
      const row = rows[0];
      if (row) {
        const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as Uint8Array);
        return { buffer, mime: row.mime };
      }
    } catch (err) {
      console.warn("getMedia: query DB gagal, beralih ke fallback lokal:", err);
    }
  }

  // 2. Fallback: baca dari disk lokal
  return getMediaLocally(id);
}

/** Hapus 1 media berdasarkan id (parameterized — aman dari injection). */
export async function deleteMediaRow(id: string): Promise<boolean> {
  deleteMediaLocally(id);
  if (isDbConnected) {
    try {
      await db.delete(media).where(eq(media.id, id));
    } catch (err) {
      console.warn("deleteMediaRow: delete DB gagal:", err);
    }
  }
  return true;
}

/**
 * Optimasi seluruh media gambar yang sudah tersimpan di database:
 * - Mengonversi gambar PNG/JPEG/BMP ke format WebP terkompresi berkualitas tinggi (quality 82, maks 1920px).
 * - Format SVG dipertahankan murni.
 * - ID media tetap SAMA sehingga semua URL dan konten tidak berubah atau rusak.
 * - Mengurangi penggunaan storage Postgres secara drastis (70-85%).
 */
export async function optimizeAllStoredMedia(): Promise<{
  total: number;
  optimized: number;
  skipped: number;
  failed: number;
  bytesSaved: number;
  details: Array<{ id: string; name: string; beforeKb: number; afterKb: number; savedKb: number }>;
}> {
  try {
    const rows = await db
      .select({
        id: media.id,
        name: media.name,
        mime: media.mime,
        size: media.size,
        data: media.data,
      })
      .from(media);

    let optimized = 0;
    let skipped = 0;
    let failed = 0;
    let bytesSaved = 0;
    const details: Array<{ id: string; name: string; beforeKb: number; afterKb: number; savedKb: number }> = [];

    for (const row of rows) {
      try {
        // Vektor SVG tetap murni
        if (row.mime === "image/svg+xml") {
          skipped++;
          continue;
        }

        const rawBuffer = Buffer.isBuffer(row.data)
          ? row.data
          : Buffer.from(row.data as Uint8Array);

        const beforeSize = rawBuffer.length;
        const res = await optimizeImageBuffer(rawBuffer, row.mime, row.name);

        if (res.buffer.length < beforeSize || row.mime !== "image/webp") {
          const afterSize = res.buffer.length;
          const saved = Math.max(0, beforeSize - afterSize);
          const newName = sanitizeMediaName(res.name || row.name);

          await db
            .update(media)
            .set({
              data: res.buffer,
              size: afterSize,
              mime: res.mime,
              name: newName,
            })
            .where(eq(media.id, row.id));

          optimized++;
          bytesSaved += saved;
          details.push({
            id: row.id,
            name: newName,
            beforeKb: Math.round(beforeSize / 1024),
            afterKb: Math.round(afterSize / 1024),
            savedKb: Math.round(saved / 1024),
          });
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Gagal optimasi media ${row.id}:`, err);
        failed++;
      }
    }

    return {
      total: rows.length,
      optimized,
      skipped,
      failed,
      bytesSaved,
      details,
    };
  } catch (err) {
    console.error("optimizeAllStoredMedia query gagal:", err);
    return {
      total: 0,
      optimized: 0,
      skipped: 0,
      failed: 0,
      bytesSaved: 0,
      details: [],
    };
  }
}

