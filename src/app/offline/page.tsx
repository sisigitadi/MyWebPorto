import Link from "next/link";

/** Halaman fallback offline (di-cache service worker). */
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e] text-[#37ff9b] font-mono p-6">
      <div className="max-w-md text-center space-y-4 border border-[#37ff9b]/30 rounded p-8">
        <p className="text-sm tracking-widest opacity-70">SIGIT_OS // OFFLINE</p>
        <h1 className="text-xl font-bold">Tidak ada koneksi</h1>
        <p className="text-xs leading-relaxed opacity-80">
          Perangkat Anda sedang offline. Sambungkan internet lalu muat ulang untuk kembali ke workstation.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[#37ff9b] text-black text-xs font-bold rounded hover:brightness-110"
        >
          Coba Lagi
        </Link>
      </div>
    </main>
  );
}
