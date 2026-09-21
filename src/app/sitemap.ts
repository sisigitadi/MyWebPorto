import { MetadataRoute } from "next";
import { getProjects, getArticles, getProducts } from "@/lib/actions";
import { getProductSlug } from "@/lib/product-link";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // PENTING: harus sama dengan domain di Vercel env & GSC property (tanpa trailing slash)
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  // image:loc wajib URL absolut (skema + host) — kolom DB kadang menyimpan path relatif /uploads/...
  // Catatan XML: '&' query-string (mis. ?q=80&w=800) wajib di-escape jadi '&amp;'
  // karena serializer sitemap Next.js tidak meng-escape otomatis.
  const toAbsoluteImageUrl = (url: string): string => {
    const absolute = /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    return absolute.replace(/&/g, "&amp;");
  };
  const [projects, articles, products] = await Promise.all([getProjects(), getArticles(), getProducts()]);

  // SEO: varian "?lang=id" / "?lang=en" TIDAK diiklankan sebagai alternate di
  // sitemap. i18n 100% client-side, sehingga HTML kedua varian identik dengan
  // kanoniknya — GSC mengelompokkannya "Alternate page with proper canonical
  // tag" (duplikat yang boros crawl budget). "?lang=" tetap berfungsi sebagai
  // deep-link/toggle.

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
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
      images: p.thumbnailUrl ? [toAbsoluteImageUrl(p.thumbnailUrl)] : undefined,
    }));

  const articleRoutes: MetadataRoute.Sitemap = articles
    .filter((a) => a.published)
    .map((a) => ({
      url: `${baseUrl}/artikel/${a.slug}`,
      lastModified: new Date(a.updatedAt || a.createdAt || Date.now()),
      changeFrequency: "weekly" as const,
      priority: a.featured ? 0.85 : 0.75,
      images: a.imageUrl ? [toAbsoluteImageUrl(a.imageUrl)] : undefined,
    }));

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/toko/${getProductSlug(p)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: p.thumbnailUrl ? [toAbsoluteImageUrl(p.thumbnailUrl)] : undefined,
    }));

  return [...staticRoutes, ...projectRoutes, ...articleRoutes, ...productRoutes];
}
