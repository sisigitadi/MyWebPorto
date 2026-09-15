import { Metadata } from "next";
import { getProjects } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { localeAlternates } from "@/lib/seo";
import { ProjectsCatalogContent } from "@/components/public/projects-catalog-content";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Daftar Proyek & Portofolio Karya Digital",
  description: "Jelajahi seluruh karya, studi kasus aplikasi web full-stack, sistem berbasis AI, dan solusi digital yang dikembangkan oleh Sigit Adi Irianto.",
  alternates: localeAlternates(`${baseUrl}/proyek`),
  openGraph: {
    title: "Daftar Proyek & Portofolio Karya Digital — Sigit Adi Irianto",
    description: "Jelajahi portofolio lengkap pengembangan web dan solusi teknologi modern.",
    url: `${baseUrl}/proyek`,
    type: "website",
    images: [`${baseUrl}/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daftar Proyek & Portofolio — Sigit Adi Irianto",
    description: "Katalog portofolio aplikasi web modern dan integrasi sistem AI.",
    images: [`${baseUrl}/opengraph-image`],
  },
};

export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await getProjects();
  const publishedProjects = projects.filter((p) => p.published);

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
        name: "Katalog Proyek",
        item: `${baseUrl}/proyek`,
      },
    ],
  };

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Katalog Proyek & Portofolio Software Engineer",
    description: "Kumpulan studi kasus proyek web modern, open-source tools, dan sistem AI.",
    url: `${baseUrl}/proyek`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: publishedProjects.map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: p.title,
        url: `${baseUrl}/proyek/${p.slug}`,
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionPageSchema) }}
      />
      <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar">
        <ProjectsCatalogContent projects={publishedProjects} />
      </div>
    </>
  );
}
