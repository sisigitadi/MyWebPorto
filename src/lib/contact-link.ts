interface ContactPrefillOptions {
  subject: string;
  body: string;
}

/**
 * Tujuan tombol "hubungi saya" — selalu URL bersih. JANGAN bawa query
 * pre-fill: "/?contactSubject=…&contactBody=…" menciptakan satu varian
 * homepage per artikel/proyek/layanan, semua dengan HTML identik dengan "/",
 * yang Google tandai "Crawled - currently not indexed" (lihat redirect 308 di
 * src/proxy.ts).
 */
export const CONTACT_SECTION_HREF = "/#kontak";

/**
 * Menyimpan pre-fill form kontak di sessionStorage (client-only) supaya
 * subject/body sampai ke form tanpa membuat varian URL baru. ContactSection
 * membaca nilai ini sekali saat mount lalu menghapusnya (one-shot handoff).
 */
export function prefillContact({ subject, body }: ContactPrefillOptions): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("contactSubject", subject);
    sessionStorage.setItem("contactBody", body);
  } catch {
    // sessionStorage tidak tersedia (mode privat, dll) — link tetap mengarah
    // ke section kontak, hanya tanpa pre-fill.
  }
}
