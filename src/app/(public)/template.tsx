/**
 * Template route group (public).
 *
 * Berbeda dari layout.tsx yang persisten antar navigasi, template.tsx di-
 * remount Next.js pada SETIAP pindah halaman. Di sinilah animasi transisi
 * masuk (vt-page-in di globals.css) diputar ulang, sehingga konten halaman
 * baru "menyala" lembut seperti jendela CRT — perpindahan antar halaman
 * terasa mulus seperti SPA, bukan pop mendadak.
 *
 * Server component biasa: animasinya murni CSS, tanpa biaya hydrasi.
 */
export default function PublicTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="vt-page-in flex flex-col flex-1 min-h-0 w-full">
      {children}
    </div>
  );
}
