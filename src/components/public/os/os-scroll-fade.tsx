"use client";

import React, { useEffect, useState } from "react";

/**
 * Indikator "masih ada konten di bawah" untuk window SigitOS.
 *
 * NN/g "Illusion of Completeness": pengguna awam sering tidak menyadari
 * bahwa sebuah area bisa di-scroll, terutama bila konten terlihat rapi
 * sampai ke tepi bawah. Gradien halus + chevron di sini memberi sinyal
 * visual bahwa konten berlanjut ke bawah.
 *
 * - Hanya tampil bila konten memang bisa di-scroll lebih jauh.
 * - Hilang saat pengguna sudah di dasar (tidak menyesatkan).
 * - Non-intrusif: pointer-events-none, aria-hidden (dekoratif).
 */
export function ScrollFade({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => {
      // +2 toleransi untuk pembulatan sub-pixel di browser.
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setCanScroll(remaining > 2);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    // Konten dimuat async (gambar, section) — cek ulang setelah render.
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = window.setTimeout(check, 400);

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [containerRef]);

  if (!canScroll) return null;

  return (
    <div
      aria-hidden="true"
      className="vt-scroll-fade pointer-events-none absolute bottom-0 left-0 right-0 h-8 flex items-end justify-center"
    >
      <span className="vt-scroll-fade-chevron animate-bounce">▾</span>
    </div>
  );
}
