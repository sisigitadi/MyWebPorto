import { MetadataRoute } from "next";
import { getProjects, getArticles } from "@/lib/actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [projects, articles] = await Promise.all([getProjects(), getArticles()]);

  const staticRoutes = ["", "/proyek"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const projectRoutes = projects
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/proyek/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const articleRoutes = articles
    .filter((a) => a.published)
    .map((a) => ({
      url: `${baseUrl}/artikel/${a.slug}`,
      lastModified: new Date(a.updatedAt || a.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...projectRoutes, ...articleRoutes];
}
