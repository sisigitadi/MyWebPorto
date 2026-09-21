/**
 * Peta path section SigitOS yang sering diketik polos ke anchor homepage-nya.
 *
 * Section homepage (theme SigitOS: Layanan/Proyek/Toko/Artikel/Terminal/
 * Testimoni/Kontak) hidup sebagai **anchor** — `https://sigitadi.id/#layanan` —
 * bukan rute sendiri. Pengguna yang mengetik `sigitadi.id/layanan` polos (atau
 * backlink tebak/materi cetak) mendapat **404**, dan Google Search Console
 * berpotensi melaporkannya sebagai "Not found (404)" (boros crawl budget).
 *
 * Kunci = pathname polos (dinormalisasi: lowercase + tanpa trailing slash);
 * nilai = anchor section di homepage. `src/proxy.ts` memakai tabel ini untuk
 * me-redirect 308 ke `/#anchor` — fragment (#…) tidak diindeks Google sebagai
 * URL terpisah, jadi kanonik tetap `/` (tidak menciptakan varian baru; sama
 * prinsipnya dengan konsolidasi pre-fill kontak).
 *
 * GOTCHA: id section di DOM untuk app "Toko" adalah **`produk`**
 * (`products-section.tsx`), bukan `toko` (nama app di taskbar). Karena itu
 * `/toko` → `#produk` — konsisten dengan tombol "Kembali ke Toko" di halaman
 * detail produk (`product-detail-content.tsx`).
 *
 * JANGAN tambahkan `/proyek` atau `/artikel` ke tabel ini — keduanya rute
 * nyata (halaman katalog). `/toko/[slug]` juga rute nyata; hanya path polos
 * `/toko` yang tidak punya halaman katalog.
 */
export const SECTION_PATH_REDIRECTS: Readonly<Record<string, string>> = {
  "/layanan": "#layanan",
  "/toko": "#produk",
  "/terminal": "#terminal",
  "/testimoni": "#testimoni",
};

/**
 * Resolve pathname polos ke anchor section (`"#…"`), atau `null` bila pathname
 * bukan section virtual (rute nyata / path asing). Murni (tanpa I/O) agar mudah
 * diuji — lihat `tests/section-redirects.test.ts`.
 */
export function resolveSectionRedirect(pathname: string): string | null {
  // Trailing slash dibersihkan (`/layanan/` ≡ `/layanan`); lowercase karena
  // nama section selalu lowercase di DOM.
  const normalized = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  return SECTION_PATH_REDIRECTS[normalized] ?? null;
}
