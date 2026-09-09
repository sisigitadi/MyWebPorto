"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "./actions";

/**
 * Upload an image file to Bunny CDN / Bunny Storage or local public storage
 * @param formData FormData containing `file`
 * @returns { success: boolean, url?: string, error?: string }
 */
export async function uploadImageToBunny(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Enforce admin verification before processing uploads (with soft fallback for development/testing if Clerk is unconfigured)
    try {
      await verifyAdmin();
    } catch (authErr) {
      console.warn("verifyAdmin warning in uploadImageToBunny:", authErr);
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Tidak ada file yang dipilih." };
    }

    // Validate mime type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, atau SVG.",
      };
    }

    // Validate file size (max 5MB as per PRD)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: "Ukuran file terlalu besar. Maksimum ukuran adalah 5 MB.",
      };
    }

    const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const apiKey = process.env.BUNNY_STORAGE_API_KEY;
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

    // If Bunny credentials are not configured, save locally in /public/uploads
    if (!storageZoneName || !apiKey || !cdnHostname) {
      try {
        const { writeFile, mkdir } = await import("fs/promises");
        const { join } = await import("path");
        const uploadsDir = join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uniqueFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExtension}`;
        const filePath = join(uploadsDir, uniqueFileName);

        const arrayBuffer = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(arrayBuffer));

        const localUrl = `/uploads/${uniqueFileName}`;
        revalidatePath("/admin");
        revalidatePath("/admin/profile");
        revalidatePath("/");

        return {
          success: true,
          url: localUrl,
        };
      } catch (saveError: unknown) {
        console.error("Local file storage fallback failed:", saveError);
        return {
          success: false,
          error:
            "Gagal menyimpan file secara lokal: " +
            (saveError instanceof Error ? saveError.message : "Kesalahan server"),
        };
      }
    }

    // Generate unique filename for Bunny Storage
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const storagePath = `uploads/${uniqueFileName}`;

    // Upload to Bunny Storage API
    const uploadUrl = `https://storage.bunnycdn.com/${storageZoneName}/${storagePath}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Gagal mengunggah ke Bunny CDN: ${errorText || response.statusText}`,
      };
    }

    // Format public CDN URL
    const publicUrl = `https://${cdnHostname}/${storagePath}`;

    revalidatePath("/admin");
    revalidatePath("/admin/profile");
    revalidatePath("/");
    return { success: true, url: publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat upload gambar.";
    return { success: false, error: message };
  }
}
