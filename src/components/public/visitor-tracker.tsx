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
    // sendBeacon: fire-and-forget, never holds page load / network-quiet
    // (a hanging fetch keeps Lighthouse waiting for network idle).
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics must never break the page */
    });
  }, [pathname]);

  return null;
}
