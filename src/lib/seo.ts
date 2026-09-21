import type { Metadata } from "next";
import { resolveOgMeta, resolveVerification } from "@/lib/seo-config";

export interface LlmsEntry {
  title: string;
  slug: string;
  summary?: string | null;
}

export interface LlmsProfile {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
}

/**
 * Bangun llms.txt (AI-crawler friendly) dari data katalog publik.
 * Murni (tanpa I/O) agar mudah diuji — route di app/llms.txt/route.ts yang mengambil data.
 */
export function buildLlmsTxt(input: {
  baseUrl: string;
  profile: LlmsProfile;
  services: string[];
  projects: LlmsEntry[];
  articles: LlmsEntry[];
  products?: LlmsEntry[];
}): string {
  const { baseUrl, profile, services, projects, articles, products } = input;
  const lines: string[] = [
    `# ${profile.name}`,
    "",
    `> ${profile.headline}`,
    "",
    profile.bio,
    "",
    "## Layanan",
    "",
    ...services.slice(0, 12).map((s) => `- ${s}`),
    "",
    "## Proyek",
    "",
    ...projects
      .slice(0, 20)
      .map((p) => `- [${p.title}](${baseUrl}/proyek/${p.slug})${p.summary ? `: ${p.summary}` : ""}`),
    "",
    "## Artikel",
    "",
    ...articles
      .slice(0, 20)
      .map((a) => `- [${a.title}](${baseUrl}/artikel/${a.slug})${a.summary ? `: ${a.summary}` : ""}`),
    "",
    ...(products && products.length > 0
      ? [
          "## Toko",
          "",
          ...products
            .slice(0, 20)
            .map((p) => `- [${p.title}](${baseUrl}/toko/${p.slug})${p.summary ? `: ${p.summary}` : ""}`),
        ]
      : []),
    "",
    `## Kontak\n\n- ${baseUrl}/#kontak`,
    "",
  ];
  return lines.join("\n");
}
import { getProfile } from "@/lib/actions";

/**
 * Kanonik (tanpa query) untuk satu URL absolut.
 *
 * Catatan SEO: helper ini dulu juga memancarkan hreflang id-ID/en/x-default ke
 * varian "?lang=". Karena i18n 100% client-side, HTML "/?lang=id" dan
 * "/?lang=en" identik dengan kanoniknya — GSC mengelompokkannya sebagai
 * "Alternate page with proper canonical tag" (duplikat yang boros crawl
 * budget; untuk varian pre-fill kontak Google memakai label "Crawled -
 * currently not indexed"). Varian "?lang=" tidak lagi diiklankan
 * dari sitemap maupun metadata; tetap berfungsi sebagai deep-link/toggle
 * bahasa client-side (lihat src/lib/i18n.tsx). Helper ini tetap dipanggil
 * eksplisit per-halaman karena alternates di halaman menimpa milik layout
 * sepenuhnya (tidak ada merge) — tanpa ini kanonik hilang di /proyek & /artikel.
 */
export function localeAlternates(canonicalUrl: string): { canonical: string } {
  return {
    canonical: canonicalUrl.replace(/[?#].*$/, ""),
  };
}

export async function generateDynamicMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

  const title = `${profile.name} — ${profile.headline}`;
  const description = profile.bio;

  // Open Graph & token verifikasi: override admin (settings "seo") → turunan
  // profil. Dipakai bersama route /opengraph-image.tsx agar tag & gambar
  // selalu sinkron dengan pratinjau di /admin/seo.
  const og = await resolveOgMeta({
    name: profile.name,
    headline: profile.headline,
    bio: profile.bio,
  });
  const verification = await resolveVerification();

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: title,
      template: `%s | ${profile.name}`,
    },
    description,
    keywords: [
      profile.name,
      profile.headline,
      "Full Stack Developer",
      "Portfolio Developer Indonesia",
      "Next.js Developer",
      "React",
      "TypeScript",
      "Jasa Pembuatan Website",
      "Software Engineer Jakarta",
      "AI Developer Indonesia",
      "Artificial Intelligence Indonesia",
      "Generative AI Indonesia",
      "LLM Integration",
      "Cybersecurity Indonesia",
      "Web Security Audit",
      "OWASP Developer",
      "Linux Server Hardening",
      "Windows Security",
      "macOS Security",
      "DevSecOps Indonesia",
      ...(profile.skills || []),
    ],
    authors: [{ name: profile.name, url: appUrl }],
    creator: profile.name,
    publisher: profile.name,
    alternates: localeAlternates(appUrl),
    openGraph: {
      type: "website",
      // Locale default situs ini id-ID. Varian "?lang=en" TIDAK dideklarasikan
      // sebagai hreflang: i18n 100% client-side → HTML-nya identik dengan
      // kanonik, dan GSC melaporkan varian itu sebagai "Alternate page with
      // proper canonical tag". Lihat catatan di localeAlternates().
      locale: "id_ID",
      url: appUrl,
      title: og.title,
      description: og.description,
      siteName: `${profile.name} Portfolio`,
      images:
        og.imageUrl === "/opengraph-image"
          ? [
              {
                url: "/opengraph-image",
                width: 1200,
                height: 630,
                alt: og.imageAlt,
              },
            ]
          : [{ url: og.imageUrl, alt: og.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      creator: profile.socialLinks?.twitter ? `@${profile.socialLinks.twitter.split("/").pop()}` : "@developer",
      images: [og.imageUrl],
    },
    // Token verifikasi Google Search Console & Bing Webmaster (msvalidate.01).
    verification,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
