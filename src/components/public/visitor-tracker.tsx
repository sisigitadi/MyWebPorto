"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Pelacak kunjungan publik yang hemat resource (UU PDP Friendly, tanpa cookies).
 * Menggunakan requestIdleCallback dan navigator.sendBeacon agar tidak membebani main thread.
 * Dilengkapi deduplikasi sesi browser agar tidak membebani server saat navigasi berulang.
 */
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Lewati pelacakan pada rute internal admin atau api
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    // Deduplikasi per sesi browser (10 menit per path)
    const sessionKey = `vtr_hit_${pathname}`;
    try {
      const lastHit = window.sessionStorage.getItem(sessionKey);
      const now = Date.now();
      if (lastHit && now - Number(lastHit) < 10 * 60 * 1000) {
        return;
      }
      window.sessionStorage.setItem(sessionKey, String(now));
    } catch {
      // Abaikan jika storage dinonaktifkan di peramban privat
    }

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      connection:
        typeof navigator !== "undefined" && "connection" in navigator
          ? (navigator as unknown as { connection?: { effectiveType?: string } })?.connection?.effectiveType
          : undefined,
    });

    const sendHit = () => {
      try {
        const blob = new Blob([payload], { type: "application/json" });
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/visitor-hit", blob);
        } else {
          fetch("/api/visitor-hit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
            credentials: "omit",
          }).catch(() => {});
        }
      } catch {
        // Abaikan kegagalan jaringan di sisi klien
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(sendHit, { timeout: 2000 });

      return () => {
        if ("cancelIdleCallback" in window) {
          (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
        }
      };
    } else {
      const timer = setTimeout(sendHit, 1200);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return null;
}
