import { notFound } from "next/navigation";
import { getProjects, getProfile, getArticles } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { localeAlternates, shareImage, extractFaqFromContent, buildFaqPageSchema, formatSeoTitle } from "@/lib/seo";
import { canonicalBaseUrl } from "@/lib/canonical-host";
import { ProjectDetailContent } from "@/components/public/project-detail-content";

interface ProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Optimasi Vercel Free: cache 24 jam di CDN Edge; pembaruan ditangani on-demand oleh revalidatePath.
export const revalidate = 86400;
// dynamicParams = true memungkinkan proyek baru yang diterbitkan di database tetap dapat diakses publik via ISR on-demand
export const dynamicParams = true;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const baseUrl = canonicalBaseUrl();
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: "Proyek Tidak Ditemukan",
    };
  }

  // Format judul SEO optimal (maks 60 karakter) agar tidak ditandai 'Title too long' oleh Bing/Google
  const pageTitle = formatSeoTitle(project.title);
  const description = project.summary;
  const url = `${baseUrl}/proyek/${slug}`;
  // Gambar share: thumbnail proyek; bila kosong → kartu /opengraph-image (avatar).
  // WAJIB diisi — objek openGraph di sini meng-*replace* seluruh openGraph
  // layout, jadi tanpa `images` halaman ini kehilangan og:image total.
  const image = shareImage(project.thumbnailUrl, baseUrl, project.title);
  return {
    title: {
      absolute: pageTitle,
    },
    description,
    alternates: localeAlternates(url),
    openGraph: {
      title: pageTitle,
      description,
      url,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image.url],
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const baseUrl = canonicalBaseUrl();
  const [projects, profile, articles] = await Promise.all([
    getProjects(),
    getProfile(),
    getArticles(),
  ]);
  const project = projects.find((p) => p.slug === slug && p.published);

  if (!project) {
    notFound();
  }

  const pageUrl = `${baseUrl}/proyek/${project.slug}`;

  // Proyek terkait berdasarkan kesamaan tech stack & featured
  const currentStack = new Set((project.techStack || []).map((s) => s.toLowerCase()));
  const relatedProjects = projects
    .filter((p) => p.id !== project.id && p.published)
    .map((p) => {
      let score = 0;
      if (p.featured) score += 2;
      for (const st of p.techStack || []) {
        if (currentStack.has(st.toLowerCase())) score += 3;
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.p);

  // Artikel teknis terkait (cross-linking proyek -> artikel)
  const relatedArticles = articles
    .filter((a) => a.published)
    .map((a) => {
      let score = 0;
      const aTags = (a.tags || []).map((t) => t.toLowerCase());
      for (const t of aTags) {
        if (currentStack.has(t)) score += 3;
        if (project.title.toLowerCase().includes(t)) score += 2;
      }
      return { a, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.a);

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
        name: "Proyek",
        item: `${baseUrl}/proyek`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.title,
        item: pageUrl,
      },
    ],
  };

  const faqItems = extractFaqFromContent(project.description);
  const faqSchema = buildFaqPageSchema(faqItems);

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    headline: project.title,
    description: project.summary,
    image: project.thumbnailUrl,
    url: pageUrl,
    applicationCategory: "DeveloperApplication, WebApplication",
    operatingSystem: "Web Browser, Cross-Platform (Windows, macOS, Linux, Android, iOS)",
    author: {
      "@type": "Person",
      name: profile.name,
      url: baseUrl,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: project.techStack?.join(", "),
    softwareRequirements: project.techStack?.join(", "),
  };

  const caseStudyArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${project.title} - Studi Kasus & Arsitektur Sistem`,
    description: project.summary,
    articleBody: project.description,
    image: project.thumbnailUrl,
    url: pageUrl,
    datePublished: new Date(project.createdAt).toISOString(),
    inLanguage: "id-ID",
    author: {
      "@type": "Person",
      name: profile.name,
      url: baseUrl,
    },
    publisher: {
      "@type": "Person",
      name: profile.name,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(caseStudyArticleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
        />
      )}
      <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar">
        <ProjectDetailContent
          project={project}
          profile={profile}
          relatedProjects={relatedProjects}
          relatedArticles={relatedArticles}
        />
      </div>
    </>
  );
}
