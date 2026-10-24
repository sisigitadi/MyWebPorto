"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "./admin-auth";
import {
  deleteMediaRow,
  listMediaItems,
  putMedia,
  validateImageFile,
  optimizeAllStoredMedia,
  type MediaItem,
} from "@/lib/storage";

/**
 * Upload gambar ke database (tabel media, bytea Postgres).
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
    const { buffer, mime } = validated.image;
    const originalName = typeof file.name === "string" ? file.name : "image";

    const stored = await putMedia(originalName, buffer, mime);
    if (!stored.ok) {
      return { success: false, error: stored.error };
    }

    revalidatePath("/");
    revalidatePath("/(public)", "layout");
    revalidatePath("/admin/media");

    return { success: true, url: `/api/media/${stored.id}` };
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

/** Daftar media dari database. Admin only. */
export async function listMedia(): Promise<{ items: MediaItem[]; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return { items: [], error: denied };

  return { items: await listMediaItems() };
}

/** Hapus 1 media berdasarkan id. Admin only. */
export async function deleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return { success: false, error: denied };

  const ok = await deleteMediaRow(id);
  if (!ok) {
    return { success: false, error: "Gagal menghapus gambar dari database." };
  }

  revalidatePath("/admin/media");
  return { success: true };
}

/** Optimasi seluruh media gambar yang sudah tersimpan di database. Admin only. */
export async function optimizeMediaStorage(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    total: number;
    optimized: number;
    skipped: number;
    failed: number;
    savedKb: number;
  };
}> {
  const denied = await requireAdmin();
  if (denied) return { success: false, error: denied };

  try {
    const res = await optimizeAllStoredMedia();
    const savedKb = Math.round(res.bytesSaved / 1024);
    revalidatePath("/");
    revalidatePath("/(public)", "layout");
    revalidatePath("/admin/media");
    return {
      success: true,
      message: `Berhasil mengoptimalkan ${res.optimized} gambar (hemat ${savedKb} KB).`,
      stats: {
        total: res.total,
        optimized: res.optimized,
        skipped: res.skipped,
        failed: res.failed,
        savedKb,
      },
    };
  } catch (err) {
    console.error("optimizeMediaStorage gagal:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengoptimasi media storage.",
    };
  }
}
