"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { playOS } from "@/lib/os-sound";

/**
 * Lapisan suara global SigitOS:
 * - Ketukan pelan setiap tombol chrome retro (vt-btn / vt-titlebar-btn).
 * - Nada "nav" tiap pindah rute (halaman detail/katalog).
 * Dipasang sekali di layout publik; tidak me-render apa pun.
 */
export function OSSoundLayer() {
  const pathname = usePathname();

  // Nada pindah halaman (rute Next.js di luar desktop OS)
  useEffect(() => {
    playOS("nav");
  }, [pathname]);

  // Ketukan tombol retro di seluruh aplikasi publik
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".vt-btn, .vt-titlebar-btn")) {
        playOS("click");
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
