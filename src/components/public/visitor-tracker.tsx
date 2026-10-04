"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const WORKER_URL = "https://portofolio-visitor-tracker.si-sigitadi.workers.dev";

/**
 * Anonymous visit beacon → self-hosted Cloudflare Worker hit counter.
 * No cookies, no third-party analytics; raw IPs are never stored
 * (salted SHA-256 hash only, UU PDP friendly).
 */
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = {
      path: pathname || "/",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    };
    const url = `${WORKER_URL}/hit`;
    const body = JSON.stringify(payload);
    // fetch + keepalive (bukan sendBeacon): beacon sesuai spesifikasi SELALU
    // berjalan dengan credentials mode "include", dan Blob application/json
    // memicu preflight — worker membalas Access-Control-Allow-Origin: * tanpa
    // Allow-Credentials, sehingga preflight DITOLAK browser dan hit tidak
    // pernah terkirim (analytics mati + error CORS di console, terverifikasi
    // 2026-10-04). fetch dengan credentials "omit" lolos preflight wildcard,
    // tetap tanpa cookie (sesuai desain anonim tracker), dan keepalive menjaga
    // pengiriman saat unload tanpa menahan network-idle Lighthouse.
    fetch(url, {
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
