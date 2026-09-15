import { auth } from "@clerk/nextjs/server";
import { isPlaceholderKey, isProduction } from "@/lib/env";

/** ADMIN_CLERK_ID terisi dengan nilai asli (bukan placeholder). */
export function isAdminOwnerConfigured(): boolean {
  const adminClerkId = process.env.ADMIN_CLERK_ID;
  return Boolean(adminClerkId) && adminClerkId !== "user_xxxxxxxxxxxxxxxxx";
}

/**
 * Verifikasi apakah request mutasi berasal dari Admin yang terotentikasi.
 * Mencegah Broken Access Control (OWASP A01) pada Server Actions.
 * Fail-closed di produksi:
 *  - Clerk keys masih placeholder            -> tolak.
 *  - ADMIN_CLERK_ID tidak diset / placeholder -> tolak (jangan fail-open
 *    ke semua user Clerk yang bisa mendaftar).
 * Di luar produksi, bypass dev tetap diizinkan agar lokal bisa dikerjakan.
 */
export async function verifyAdmin(): Promise<void> {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!isPlaceholderKey(publishableKey)) {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Akses ditolak: Anda harus login sebagai admin untuk melakukan tindakan ini.");
    }
    if (!isAdminOwnerConfigured()) {
      if (isProduction()) {
        throw new Error("Akses ditolak: ADMIN_CLERK_ID belum dikonfigurasi di lingkungan produksi.");
      }
      return;
    }
    if (userId !== process.env.ADMIN_CLERK_ID) {
      throw new Error("Akses ditolak: Akun Anda bukan administrator website ini.");
    }
    return;
  }
  if (isProduction()) {
    throw new Error("Akses ditolak: konfigurasi autentikasi belum lengkap di lingkungan produksi.");
  }
}
