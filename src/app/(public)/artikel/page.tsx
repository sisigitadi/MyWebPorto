import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@/lib/actions";
import { resolveFeatures } from "@/lib/features-config";
import { safeJsonLd } from "@/lib/json-ld";
import { localeAlternates } from "@/lib/seo";
import { ArticlesCatalogContent } from "@/components/public/articles-catalog-content";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Artikel & Wawasan Teknologi — Sigit Adi Irianto",
  description: "Kumpulan artikel mendalam, panduan arsitektur software engineering, tips Next.js, integrasi sistem AI, dan wawasan teknologi.",
  alternates: localeAlternates(`${baseUrl}/artikel`),
  openGraph: {
    title: "Artikel & Wawasan Teknologi — Sigit Adi Irianto",
    description: "Kumpulan artikel mendalam, panduan arsitektur software, Next.js, dan AI.",
    url: `${baseUrl}/artikel`,
    type: "website",
    images: [`${baseUrl}/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artikel & Wawasan Teknologi — Sigit Adi Irianto",
    description: "Kumpulan tulisan teknis dan panduan pengembangan aplikasi modern.",
    images: [`${baseUrl}/opengraph-image`],
  },
};

export const revalidate = 60;

export default async function ArticlesPage() {
  // Gate feature flag (settings.features): app Artikel OS di-exclude dari
  // daftar OS (os-desktop-manager); route artikel sendiri mengembalikan 404
  // supaya "off" benar-benar off — termasuk untuk mesin pencari.
  const features = await resolveFeatures();
  if (!features.enable_articles) notFound();

  const articles = await getArticles();
  const publishedArticles = articles.filter((a) => a.published);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Katalog Artikel",
        item: `${baseUrl}/artikel`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Artikel & Wawasan Teknologi Software Engineering",
    description: "Daftar publikasi dan wawasan seputar software development, cloud, dan AI.",
    url: `${baseUrl}/artikel`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: publishedArticles.map((a, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: a.title,
        url: `${baseUrl}/artikel/${a.slug}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      <ArticlesCatalogContent articles={publishedArticles} />
    </>
  );
}
