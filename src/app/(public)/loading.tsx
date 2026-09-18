/**
 * Loading state route group (public).
 *
 * Sebelumnya route group ini TIDAK punya loading.tsx: saat navigasi ke
 * halaman yang datanya belum siap (ISR revalidate / dynamic), area konten
 * kosong total lalu konten muncul mendadak — itulah yang membuat
 * perpindahan terasa "patah", tidak seperti single page app.
 *
 * Dengan file ini Next.js menampilkan skeleton retro SigitOS seketika saat
 * navigasi dimulai (instant loading state), lalu konten asli menggantikannya
 * dengan transisi vt-page-in dari template.tsx. Jendela OS + menubar +
 * taskbar tetap terlihat (layout tidak ikut me-remount).
 */
export default function PublicLoading() {
  return (
    <div
      className="flex-1 min-h-0 w-full flex items-center justify-center p-6 vt-crt-panel"
      role="status"
      aria-live="polite"
    >
      <div className="vt-window w-full max-w-sm">
        {/* Titlebar ala jendela SigitOS */}
        <div className="vt-titlebar py-1.5 px-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold text-white tracking-wide">
            <span className="hidden sm:inline">SigitOS_Viewer :: </span>Loading...
          </span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 bg-[var(--vt-chrome)] border border-[#5a5750]" />
            <span className="h-2.5 w-2.5 bg-[var(--vt-chrome)] border border-[#5a5750]" />
            <span className="h-2.5 w-2.5 bg-[#9a968e] border border-[#5a5750]" />
          </div>
        </div>

        {/* Body: progress bar blok retro + pesan kernel */}
        <div className="p-4 space-y-3 bg-[var(--vt-paper)]">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[var(--vt-ink)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            <span className="mobile-safe-inline">
              SIGIT_KERNEL :: memuat modul halaman ...
            </span>
          </div>

          {/* Progress bar segmentasi blok (bukan smooth — autentik Win9x) */}
          <div className="vt-card-inset h-4 w-full p-0.5 flex gap-0.5 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 bg-[var(--vt-navy)] vt-loading-block"
                style={{ animationDelay: `${i * 55}ms` }}
              />
            ))}
          </div>

          <p className="font-mono text-[10px] text-[var(--vt-ink)] opacity-70">
            Mohon tunggu — mengambil data dari disk C:\ ...
          </p>
        </div>
      </div>
    </div>
  );
}
