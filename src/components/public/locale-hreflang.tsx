import { localeAlternates } from "@/lib/seo";

/**
 * Emit <link rel="alternate" hreflang> untuk SATU halaman.
 *
 * Dipakai sebagai pelengkap metadata `alternates` di Next.js. Ada satu kasus
 * yang tidak bisa ditangani metadata: di path root ("/"), normalisasi URL
 * Next.js men-drop query string, sehingga "/?lang=en" ter-render sebagai "/"
 * (hreflang untuk semua bahasa menunjuk ke URL yang sama — sinyal yang tidak
 * berguna bagi Google). <link> manual di JSX di-hoist React 19 ke <head>
 * tanpa normalisasi itu, jadi query-nya bertahan.
 *
 * Hanya perlu dipasang di homepage; sub-path sudah benar via metadata.
 */
export function LocaleHrefLang({ canonicalUrl }: { canonicalUrl: string }) {
  const alternates = localeAlternates(canonicalUrl);
  const languages = alternates?.languages ?? {};
  return (
    <>
      {Object.entries(languages).map(([hreflang, href]) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </>
  );
}
