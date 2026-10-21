"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TRACKER_URL = "/api/visitor-hit";

/**
 * Anonymous visit beacon → internal Postgres Neon hit counter.
 * No cookies, no third-party analytics; raw IPs are never stored
 * (salted SHA-256 hash only, UU PDP friendly).
 */
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname || "/";
    // Optimasi Vercel Free: hindari spam hit berulang pada sesi yang sama
    // (mis. navigasi antar-tab internal / refresh cepat). Hit untuk path yang sama
    // hanya dicatat 1x per 10 menit per tab sesi.
    try {
      const sessionKey = `sigitos_hit_${path}`;
      const lastHit = window.sessionStorage?.getItem(sessionKey);
      const now = Date.now();
      if (lastHit && now - Number(lastHit) < 10 * 60 * 1000) {
        return;
      }
      window.sessionStorage?.setItem(sessionKey, String(now));
    } catch {
      // sessionStorage diblokir / private mode — lanjutkan pencatatan biasa
    }

    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* fallback ke edge header jika intl tidak tersedia */
    }

    let connection: string | undefined;
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as unknown as {
        connection?: { effectiveType?: string };
      }) : undefined;
      if (nav?.connection?.effectiveType) {
        connection = nav.connection.effectiveType.toUpperCase();
      }
    } catch {
      /* ignore */
    }

    const payload = {
      path: pathname || "/",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      timezone,
      connection,
    };
    const body = JSON.stringify(payload);
    // fetch + keepalive: credentials "omit" tanpa cookie (sesuai desain anonim
    // tracker), dan keepalive menjaga pengiriman saat navigasi/unload tanpa
    // menahan network-idle Lighthouse.
    fetch(TRACKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "omit",
      keepalive: true,
    }).catch(() => {
      /* analytics must never break the page */
    });
  }, [pathname]);

  return null;
}
