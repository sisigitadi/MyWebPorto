import { notFound } from "next/navigation";
import { getArticles, getProfile } from "@/lib/actions";
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
  const articles = await getArticles();
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "Artikel Tidak Ditemukan",
    };
  }

  const title = article.title;
  const description = article.summary;
  const images = article.imageUrl
    ? [
        {
          url: article.imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ]
    : [];

  return {
    title: `${title} - Artikel & Wawasan`,
    description,
    openGraph: {
      title: `${title} - Artikel & Wawasan`,
      description,
      images,
      type: "article",
      publishedTime: new Date(article.createdAt).toISOString(),
      tags: article.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;
  const [articles, profile] = await Promise.all([getArticles(), getProfile()]);
  const article = articles.find((a) => a.slug === slug && a.published);

  if (!article) {
    notFound();
  }

  const relatedArticles = articles.filter((a) => a.id !== article.id && a.published);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.summary,
            image: article.imageUrl || undefined,
            datePublished: new Date(article.createdAt).toISOString(),
            dateModified: new Date(article.updatedAt || article.createdAt).toISOString(),
            author: {
              "@type": "Person",
              name: profile.name || "Sigit Wasis Subekti",
            },
            keywords: (article.tags || []).join(", "),
          }),
        }}
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
