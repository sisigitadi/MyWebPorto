import { Metadata } from "next";
import { getProjects } from "@/lib/actions";
import { ProjectsCatalogContent } from "@/components/public/projects-catalog-content";

export const metadata: Metadata = {
  title: "Daftar Proyek & Portofolio",
  description: "Jelajahi seluruh karya, proyek aplikasi web, dan solusi digital yang telah saya kembangkan.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const publishedProjects = projects.filter((p) => p.published);

  return <ProjectsCatalogContent projects={publishedProjects} />;
}
