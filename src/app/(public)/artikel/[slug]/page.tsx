import { notFound } from "next/navigation";
import { getArticles, getProfile } from "@/lib/actions";
import { resolveFeatures } from "@/lib/features-config";
import { safeJsonLd } from "@/lib/json-ld";
import { localeAlternates } from "@/lib/seo";
import { ArticleDetailContent } from "@/components/public/article-detail-content";

interface ArticleDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: ArticleDetailPageProps) {
  // Gate feature flag (settings.features): sama seperti gate page di atas —
  // generateMetadata dijalankan Next meskipun page melempar notFound() di
  // dalam Suspense boundary, jadi metadata artikel asli harus diblokir
  // sebelum membaca data apapun.
  const features = await resolveFeatures();
  if (!features.enable_articles) return { title: "Artikel Tidak Ditemukan" };

  const { slug } = await params;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  const articles = await getArticles();
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "Artikel Tidak Ditemukan",
    };
  }

  const title = `${article.title} - Artikel & Wawasan Teknologi`;
  const description = article.summary || article.content.slice(0, 160);
  const url = `${baseUrl}/artikel/${slug}`;
  return {
    title,
    description,
    alternates: localeAlternates(url),
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: new Date(article.createdAt).toISOString(),
      modifiedTime: new Date(article.updatedAt || article.createdAt).toISOString(),
      authors: ["Sigit Adi Irianto"],
      tags: article.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  // Gate feature flag (settings.features): app Artikel OS di-exclude dari
  // daftar OS (os-desktop-manager); route artikel sendiri mengembalikan 404
  // supaya "off" benar-benar off — termasuk untuk mesin pencari.
  const features = await resolveFeatures();
  if (!features.enable_articles) notFound();

  const { slug } = await params;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  const [articles, profile] = await Promise.all([getArticles(), getProfile()]);
  const article = articles.find((a) => a.slug === slug && a.published);

  if (!article) {
    notFound();
  }

  const pageUrl = `${baseUrl}/artikel/${article.slug}`;
  // Terkait: skor = jumlah tag sama, lalu featured, lalu terbaru. Max 3.
  const currentTags = new Set((article.tags || []).map((t) => t.toLowerCase()));
  const relatedArticles = articles
    .filter((a) => a.id !== article.id && a.published)
    .map((a) => ({
      article: a,
      score: (a.tags || []).filter((t) => currentTags.has(t.toLowerCase())).length,
    }))
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      if (Number(y.article.featured) !== Number(x.article.featured)) {
        return Number(y.article.featured) - Number(x.article.featured);
      }
      return +new Date(y.article.createdAt) - +new Date(x.article.createdAt);
    })
    .slice(0, 3)
    .map((x) => x.article);

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
        name: "Artikel",
        item: `${baseUrl}/artikel`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: pageUrl,
      },
    ],
  };

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.summary,
    image: article.imageUrl || `${baseUrl}/opengraph-image`,
    url: pageUrl,
    datePublished: new Date(article.createdAt).toISOString(),
    dateModified: new Date(article.updatedAt || article.createdAt).toISOString(),
    inLanguage: "id-ID",
    author: {
      "@type": "Person",
      name: profile.name || "Sigit Adi Irianto",
      url: baseUrl,
    },
    publisher: {
      "@type": "Person",
      name: profile.name || "Sigit Adi Irianto",
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    keywords: (article.tags || []).join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(blogPostingSchema) }}
      />
      <div className="h-full w-full overflow-y-auto vt-scrollbar">
        <ArticleDetailContent
          article={article}
          profile={profile}
          relatedArticles={relatedArticles}
        />
      </div>
    </>
  );
}
