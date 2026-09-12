"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "./actions";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Tidak ada file yang dipilih." };
    }

    // Flexible mime types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
      "image/avif",
      "image/bmp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, SVG, GIF, AVIF, atau BMP.",
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

    const originalExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = originalExtension.replace(/[^a-z0-9]/g, "") || "jpg";
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${safeExtension}`;
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
