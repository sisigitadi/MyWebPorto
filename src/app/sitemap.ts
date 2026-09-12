import { MetadataRoute } from "next";
import { getProjects, getArticles, getProducts } from "@/lib/actions";
import { getProductSlug } from "@/lib/product-link";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";
  const [projects, articles, products] = await Promise.all([getProjects(), getArticles(), getProducts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
      images: [`${baseUrl}/opengraph-image`],
    },
    {
      url: `${baseUrl}/proyek`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artikel`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/proyek/${p.slug}`,
      lastModified: new Date(p.createdAt || Date.now()),
      changeFrequency: "weekly" as const,
      priority: p.featured ? 0.85 : 0.75,
      images: p.thumbnailUrl ? [p.thumbnailUrl] : undefined,
    }));

  const articleRoutes: MetadataRoute.Sitemap = articles
    .filter((a) => a.published)
    .map((a) => ({
      url: `${baseUrl}/artikel/${a.slug}`,
      lastModified: new Date(a.updatedAt || a.createdAt || Date.now()),
      changeFrequency: "weekly" as const,
      priority: a.featured ? 0.85 : 0.75,
      images: a.imageUrl ? [a.imageUrl] : undefined,
    }));

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/toko/${getProductSlug(p)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: p.thumbnailUrl ? [p.thumbnailUrl] : undefined,
    }));

  return [...staticRoutes, ...projectRoutes, ...articleRoutes, ...productRoutes];
}
