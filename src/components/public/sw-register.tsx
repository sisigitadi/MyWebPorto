"use client";

import { useEffect } from "react";

/** Daftarkan service worker sekali saat online. Gagal diam-diam bila tak didukung. */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Jangan ganggu preview/dev yang butuh HMR selalu segar? SW hanya fallback
    // navigasi sehingga aman berdampingan dengan Fast Refresh.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
