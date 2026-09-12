import { notFound } from "next/navigation";
import { getArticles, getProfile } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
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
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: new Date(article.createdAt).toISOString(),
      modifiedTime: new Date(article.updatedAt || article.createdAt).toISOString(),
      authors: ["Sigit Adi Pranoto"],
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
  const { slug } = await params;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  const [articles, profile] = await Promise.all([getArticles(), getProfile()]);
  const article = articles.find((a) => a.slug === slug && a.published);

  if (!article) {
    notFound();
  }

  const pageUrl = `${baseUrl}/artikel/${article.slug}`;
  const relatedArticles = articles.filter((a) => a.id !== article.id && a.published);

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
      name: profile.name || "Sigit Adi Pranoto",
      url: baseUrl,
    },
    publisher: {
      "@type": "Person",
      name: profile.name || "Sigit Adi Pranoto",
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
