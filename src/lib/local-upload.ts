"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "./actions";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Ekstensi file ditentukan dari MIME yang sudah lolos whitelist, BUKAN dari nama
 * file kiriman klien. Tanpa ini, `Content-Type: image/png` + `name: evil.html`
 * akan tersimpan sebagai /uploads/*.html dan disajikan sebagai dokumen HTML dari
 * origin kita — jalur stored XSS.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
};

/**
 * MIME dari klien mudah dipalsukan, jadi isi berkasnya ikut diverifikasi lewat
 * magic bytes. Berkas yang Content-Type-nya tidak cocok dengan signature-nya ditolak.
 */
function matchesImageSignature(buffer: Buffer, mime: string): boolean {
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

/**
 * Upload an image file locally to public/uploads
 * @param formData FormData containing `file`
 * @returns { success: boolean, url?: string, error?: string }
 */
export async function uploadImageLocal(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    try {
      await verifyAdmin();
    } catch (authErr) {
      return {
        success: false,
        error: authErr instanceof Error ? authErr.message : "Akses upload ditolak.",
      };
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return { success: false, error: "Tidak ada file yang dipilih." };
    }

    // Flexible mime types.
    // NOTE: SVG is intentionally EXCLUDED — SVG can embed inline <script>
    // and event handlers, which is an XSS vector when served from our origin.
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/bmp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }

    // Keep this below next.config.ts serverActions.bodySizeLimit.
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: "Ukuran file terlalu besar. Maksimum ukuran adalah 20 MB.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!matchesImageSignature(buffer, file.type)) {
      return {
        success: false,
        error: "Isi berkas tidak cocok dengan tipe gambarnya. Pastikan file benar-benar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }

    const safeExtension = EXTENSION_BY_MIME[file.type];
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${safeExtension}`;
    if (process.env.VERCEL) {
      console.warn("uploadImageLocal: Vercel FS ephemeral — file tidak persisten, gunakan Bunny CDN/S3 untuk prod");
    }
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;

    revalidatePath("/", "layout");
    revalidatePath("/proyek", "layout");
    revalidatePath("/artikel", "layout");
    revalidatePath("/admin", "layout");

    return { success: true, url: publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat upload gambar.";
    return { success: false, error: message };
  }
}
