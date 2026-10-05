/**
 * Redirect host duplikat ke host kanonik — murni (tanpa I/O), dipakai proxy.
 *
 * Masalah yang diselesaikan: situs ini pernah punya versi lama (HTML statis,
 * `ai-engineer.html`/`secops-engineer.html`) di subdomain `porto.sigitadi.id`
 * yang masih terservlet 200 + canonical ke dirinya sendiri. Dua salinan utuh
 * dengan otoritas yang sama memecah backlink dan sinyal crawl — Google memilih
 * satu tanpa sebab yang jelas, dan GSC melaporkan URL lama itu sebagai
 * "Alternate page with proper canonical tag" / "Crawled - currently not
 * indexed".
 *
 * Aturannya sengaja sempit: HANYA subdomain dari domain kanonik yang
 * di-redirect (`porto.`, `www.`, alias lain). Host lain — termasuk preview
 * deployment Vercel (`*.vercel.app`), localhost saat dev, dan domain custom
 * lain — sengaja tidak disentuh agar share tautan preview tidak rusak.
 *
 * Catatan: untuk `porto.sigitadi.id` yang masih menyajikan situs lama, kode
 * ini baru berlaku setelah domain tersebut diarahkan ke deployment ini.
 * Langkah infra (hapus alias domain / DNS) tetap diperlukan — lihat
 * CHANGELOG.
 */

/** Host kanonik dari env, mis. `NEXT_PUBLIC_APP_URL=https://sigitadi.id` → `sigitadi.id`. */
export function canonicalHostname(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/+$/, "");
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "sigitadi.id";
  }
}

/** Buang port dev (localhost:3000 → localhost) dan normalisasi huruf. */
function normalizeHostname(hostname: string | null | undefined): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Apakah host ini alias yang harus diarahkan ke apex? Hanya subdomain dari
 * domain kanonik (termasuk `www.`) dan bukan hostnya sendiri.
 */
export function isAliasHostname(
  hostname: string | null | undefined,
  canonical: string = canonicalHostname()
): boolean {
  const host = normalizeHostname(hostname);
  const apex = normalizeHostname(canonical);
  if (!host || !apex) return false;
  if (host === apex) return false;
  return host === `www.${apex}` || host.endsWith(`.${apex}`);
}

/**
 * URL tujuan absolut (path + query dipertahankan) bila host perlu
 * di-redirect, atau null bila host sudah benar / bukan alias.
 */
export function resolveHostRedirectUrl(
  input: { hostname?: string | null; pathname?: string; search?: string },
  canonical: string = canonicalHostname()
): string | null {
  if (!isAliasHostname(input.hostname, canonical)) return null;
  const apex = normalizeHostname(canonical);
  const path = input.pathname && input.pathname !== "/" ? input.pathname : "/";
  const search = input.search || "";
  return `https://${apex}${path}${search}`;
}