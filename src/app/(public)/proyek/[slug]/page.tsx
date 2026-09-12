import { notFound } from "next/navigation";
import { getProjects, getProfile } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { ProjectDetailContent } from "@/components/public/project-detail-content";

interface ProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const baseUrl = ((process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "")).replace(/\/$/, "");
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: "Proyek Tidak Ditemukan",
    };
  }

  const title = `${project.title} - Portofolio & Studi Kasus`;
  const description = project.summary;
  const url = `${baseUrl}/proyek/${slug}`;
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
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const baseUrl = ((process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "")).replace(/\/$/, "");
  const [projects, profile] = await Promise.all([getProjects(), getProfile()]);
  const project = projects.find((p) => p.slug === slug && p.published);

  if (!project) {
    notFound();
  }

  const pageUrl = `${baseUrl}/proyek/${project.slug}`;

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

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    headline: project.title,
    description: project.summary,
    image: project.thumbnailUrl,
    url: pageUrl,
    applicationCategory: "WebApplication",
    operatingSystem: "Web Browser, Cross-Platform",
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
    softwareRequirements: project.techStack?.join(", "),
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
      <div className="h-full w-full overflow-y-auto vt-scrollbar">
        <ProjectDetailContent project={project} profile={profile} />
      </div>
    </>
  );
}
