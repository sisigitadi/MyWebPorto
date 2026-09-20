/**
 * Helper IndexNow (Bing & Search Engine Network) — server-only.
 *
 * Dipakai dua arah:
 * - `src/app/api/indexnow/route.ts` (manual, admin-only + rate-limit)
 * - `src/lib/actions.ts` (auto-ping best-effort tiap save/delete, tanpa throw)
 *
 * Jangan import dari komponen client.
 */

import { isPlaceholderKey } from "@/lib/env";
import { resolveSeoConfig } from "@/lib/seo-config";

/**
 * Key IndexNow dibaca dari pengaturan admin (tabel settings, diisi dari form
 * /admin/seo) atau env INDEXNOW_KEY — pengaturan admin lebih diprioritaskan.
 * Sengaja TIDAK ada default hardcoded: tanpa keduanya submit dilewati diam-diam
 * — mencegah key lama dipakai terus setelah rotasi dan memisahkan concerns
 * dengan token verifikasi Bing di layout. Rotasi key dari admin langsung
 * efektif karena file /{key}.txt dilayani dinamis oleh app/[indexnowKey].
 */
export function getIndexNowBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
}

export async function getIndexNowKey(): Promise<string> {
  const cfg = await resolveSeoConfig();
  return cfg.indexNowKey;
}

/** Hanya URL http(s) absolut di host sendiri yang boleh disubmit. */
export function filterOwnUrls(urls: unknown[], baseUrl: string = getIndexNowBaseUrl()): string[] {
  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return [];
  }
  return urls
    .filter((u): u is string => typeof u === "string")
    .slice(0, 100)
    .filter((u) => {
      try {
        const parsed = new URL(u);
        return (
          (parsed.protocol === "https:" || parsed.protocol === "http:") &&
          parsed.host === host
        );
      } catch {
        return false;
      }
    });
}

export interface IndexNowResult {
  success: boolean;
  status: number | null;
  submittedCount: number;
  skipped?: boolean;
}

/**
 * Kirim URL ke IndexNow. Tidak pernah throw — kegagalan dilaporkan via result.
 * Dilewati diam-diam bila key placeholder (dev tanpa konfigurasi).
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const clean = filterOwnUrls(urls);
  if (clean.length === 0) {
    return { success: false, status: null, submittedCount: 0, skipped: true };
  }
  const key = await getIndexNowKey();
  if (isPlaceholderKey(key)) {
    return { success: false, status: null, submittedCount: 0, skipped: true };
  }
  const base = getIndexNowBaseUrl();
  const hostName = new URL(base).host;
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: hostName,
        key,
        keyLocation: `${base}/${key}.txt`,
        urlList: clean,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const success = response.ok || response.status === 200 || response.status === 202;
    return { success, status: response.status, submittedCount: clean.length };
  } catch {
    return { success: false, status: null, submittedCount: 0 };
  }
}

/** URL kanonis detail untuk auto-ping setelah save. */
export function detailUrl(kind: "proyek" | "artikel" | "toko", slug: string): string {
  return `${getIndexNowBaseUrl()}/${kind}/${slug}`;
}

/** URL katalog untuk auto-ping setelah delete. */
export function catalogUrl(kind: "proyek" | "artikel"): string {
  return `${getIndexNowBaseUrl()}/${kind}`;
}
