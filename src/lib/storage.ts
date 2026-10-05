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
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
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
};

export const ALLOWED_IMAGE_MIMES = Object.keys(EXTENSION_BY_MIME);

/** MIME dari klien mudah dipalsukan — verifikasi isi via magic bytes. */
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
    default:
      return false;
  }
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
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { ok: false as const, error: "Ukuran file terlalu besar. Maksimum ukuran adalah 20 MB." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, file.type)) {
      return {
        ok: false as const,
        error: "Isi berkas tidak cocok dengan tipe gambarnya. Pastikan file benar-benar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }
    return {
      ok: true as const,
      image: { buffer, mime: file.type, extension: EXTENSION_BY_MIME[file.type] },
    };
  })();
}

// ---------- Database (Postgres bytea) ----------

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
 * Simpan gambar ke tabel media. URL publiknya bersifat lokasi-independen
 * (path relatif /api/media/<id>) sehingga tetap valid pindah host/CDN.
 */
export async function putMedia(
  name: string,
  buffer: Buffer,
  mime: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const id = randomUUID();
    await db.insert(media).values({
      id,
      name: sanitizeMediaName(name),
      mime,
      size: buffer.length,
      data: buffer,
    });
    return { ok: true, id };
  } catch (err) {
    console.error("putMedia: insert gagal:", err);
    return { ok: false, error: "Gagal menyimpan gambar ke database. Coba lagi." };
  }
}

/** Daftar metadata media (tanpa memuat bytea) — terbaru pertama. */
export async function listMediaItems(): Promise<MediaItem[]> {
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
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      url: `/api/media/${r.id}`,
      mime: r.mime,
      size: r.size,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("listMediaItems: select gagal:", err);
    return [];
  }
}

/** Ambil biner + MIME untuk disajikan di GET /api/media/[id]. */
export async function getMedia(
  id: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const rows = await db
      .select({ data: media.data, mime: media.mime })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as Uint8Array);
    return { buffer, mime: row.mime };
  } catch (err) {
    console.error("getMedia: select gagal:", err);
    return null;
  }
}

/** Hapus 1 media berdasarkan id (parameterized — aman dari injection). */
export async function deleteMediaRow(id: string): Promise<boolean> {
  try {
    await db.delete(media).where(eq(media.id, id));
    return true;
  } catch (err) {
    console.error("deleteMediaRow: delete gagal:", err);
    return false;
  }
}
