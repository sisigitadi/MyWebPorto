"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "./actions";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  buildStorageKey,
  deleteBunny,
  isBunnyConfigured,
  listBunny,
  putBunny,
  validateImageFile,
  type MediaItem,
} from "@/lib/storage";

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

    // Validasi terpusat (whitelist MIME kecuali SVG, max 20MB, magic bytes,
    // ekstensi dari MIME) — lihat src/lib/storage.ts.
    const validated = await validateImageFile({
      type: file.type,
      size: file.size,
      arrayBuffer: () => file.arrayBuffer(),
    });
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }
    const { buffer, mime, extension } = validated.image;
    const originalName = typeof file.name === "string" ? file.name : "image";

    // Bunny Storage bila terkonfigurasi (persisten, wajib di prod/Vercel).
    if (isBunnyConfigured()) {
      const key = buildStorageKey(originalName, extension);
      const remote = await putBunny(key, buffer, mime);
      if (!remote.ok || !remote.url) {
        console.error("uploadImage: Bunny gagal:", remote.error);
        return { success: false, error: remote.error || "Upload ke Bunny Storage gagal. Coba lagi." };
      }
      revalidatePath("/", "layout");
      revalidatePath("/proyek", "layout");
      revalidatePath("/artikel", "layout");
      revalidatePath("/admin", "layout");
      return { success: true, url: remote.url };
    }

    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
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

async function requireAdmin(): Promise<string | null> {
  try {
    await verifyAdmin();
    return null;
  } catch (authErr) {
    return authErr instanceof Error ? authErr.message : "Akses ditolak.";
  }
}

/** Daftar media: Bunny (bila terkonfigurasi) + uploads lokal. Admin only. */
export async function listMedia(): Promise<{ items: MediaItem[]; remote: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return { items: [], remote: false, error: denied };

  if (isBunnyConfigured()) {
    return { items: await listBunny(), remote: true };
  }
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const names = await fs.readdir(uploadDir);
    const items: MediaItem[] = [];
    for (const name of names.slice(0, 200)) {
      if (name.startsWith(".") || name.includes("/") || name.includes("\\")) continue;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      if (!["jpg", "png", "webp", "gif", "avif", "bmp"].includes(ext)) continue;
      try {
        const st = await fs.stat(path.join(uploadDir, name));
        if (!st.isFile()) continue;
        items.push({
          key: name,
          name,
          url: `/uploads/${name}`,
          size: st.size,
          lastChanged: st.mtime.toISOString(),
          remote: false,
        });
      } catch {
        continue;
      }
    }
    items.sort((a, b) => (b.lastChanged || "").localeCompare(a.lastChanged || ""));
    return { items: items.slice(0, 100), remote: false };
  } catch {
    return { items: [], remote: false };
  }
}

/** Hapus 1 media (basename saja — anti traversal). Admin only. */
export async function deleteMedia(key: string): Promise<{ success: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return { success: false, error: denied };

  const safe = (key || "").split("/").pop()?.split("\\").pop() || "";
  if (!safe || safe === "." || safe === ".." || safe.startsWith(".")) {
    return { success: false, error: "Nama berkas tidak valid." };
  }

  if (isBunnyConfigured()) {
    const ok = await deleteBunny(safe);
    if (ok) {
      revalidatePath("/admin", "layout");
      return { success: true };
    }
    return { success: false, error: "Gagal menghapus dari Bunny Storage." };
  }

  try {
    await fs.unlink(path.join(process.cwd(), "public", "uploads", safe));
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch {
    return { success: false, error: "Berkas tidak ditemukan." };
  }
}
