import { MetadataRoute } from "next";
import { getProjects, getArticles, getProducts } from "@/lib/actions";
import { getProductSlug } from "@/lib/product-link";
import { canonicalBaseUrl } from "@/lib/canonical-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // PENTING: harus sama dengan domain di Vercel env & GSC property (tanpa trailing slash)
  const baseUrl = canonicalBaseUrl();
  // image:loc wajib URL absolut (skema + host) — kolom DB menyimpan path relatif /api/media/<id>
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

  // Dapatkan timestamp terbaru dari koleksi konten untuk 'lastModified' jujur
  // pada halaman katalog (/artikel, /proyek, /toko) dan homepage (/).
  // Ini mencegah sinyal palsu 'new Date()' harian sekaligus memberi tahu Googlebot
  // secara presisi kapan konten baru diterbitkan atau diperbarui.
  const getLatestTimestamp = (
    items: Array<{ updatedAt?: string | null; createdAt?: string | null }>
  ): Date | undefined => {
    let latestMs: number | undefined;
    for (const item of items) {
      const raw = item.updatedAt || item.createdAt;
      if (!raw) continue;
      const ms = new Date(raw).getTime();
      if (!Number.isNaN(ms)) {
        if (!latestMs || ms > latestMs) latestMs = ms;
      }
    }
    return latestMs ? new Date(latestMs) : undefined;
  };

  const latestProjectDate = getLatestTimestamp(projects.filter((p) => p.published));
  const latestArticleDate = getLatestTimestamp(articles.filter((a) => a.published));
  const latestProductDate = getLatestTimestamp(products.filter((p) => p.published));

  const allTimestamps = [latestProjectDate, latestArticleDate, latestProductDate]
    .filter((d): d is Date => Boolean(d))
    .map((d) => d.getTime());
  const latestGlobalDate = allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)) : undefined;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: latestGlobalDate,
      changeFrequency: "daily" as const,
      priority: 1.0,
      images: [`${baseUrl}/opengraph-image`],
    },
    {
      url: `${baseUrl}/proyek`,
      lastModified: latestProjectDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artikel`,
      lastModified: latestArticleDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/toko`,
      lastModified: latestProductDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/proyek/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.createdAt || Date.now()),
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
      lastModified: p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt!) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: p.thumbnailUrl ? [toAbsoluteImageUrl(p.thumbnailUrl)] : undefined,
    }));

  return [...staticRoutes, ...projectRoutes, ...articleRoutes, ...productRoutes];
}
