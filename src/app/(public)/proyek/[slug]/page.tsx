import { notFound } from "next/navigation";
import { getProjects, getProfile } from "@/lib/actions";
import { ProjectDetailContent } from "@/components/public/project-detail-content";

interface ProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: "Proyek Tidak Ditemukan",
    };
  }

  return {
    title: `${project.title} - Portofolio`,
    description: project.summary,
    openGraph: {
      title: `${project.title} - Portofolio`,
      description: project.summary,
      images: [
        {
          url: project.thumbnailUrl,
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.summary,
      images: [project.thumbnailUrl],
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const [projects, profile] = await Promise.all([getProjects(), getProfile()]);
  const project = projects.find((p) => p.slug === slug && p.published);

  if (!project) {
    notFound();
  }

  return <ProjectDetailContent project={project} profile={profile} />;
}
