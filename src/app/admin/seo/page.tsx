import { ExternalLink, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, getProjects, getArticles, getProducts } from "@/lib/actions";
import { getSeoConfigForAdmin } from "@/lib/seo-config";
import { getIndexNowBaseUrl, getIndexNowKey } from "@/lib/indexnow";
import { SeoConfigForm } from "@/components/admin/seo-config-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "SEO & SEM — Admin",
  description: "Verifikasi Google & Bing, IndexNow, dan Open Graph.",
  robots: { index: false, follow: false },
};

export default async function AdminSeoPage() {
  const [config, profile, projects, articles, products] = await Promise.all([
    getSeoConfigForAdmin(),
    getProfile(),
    getProjects(),
    getArticles(),
    getProducts(),
  ]);

  const baseUrl = getIndexNowBaseUrl();
  const indexNowKey = await getIndexNowKey();
  const indexNowKeyFileUrl = indexNowKey ? `${baseUrl}/${indexNowKey}.txt` : "";

  const published = {
    projects: projects.filter((p) => p.published).length,
    articles: articles.filter((a) => a.published).length,
    products: products.filter((p) => p.published).length,
  };

  const endpoints = [
    { label: "sitemap.xml", href: `${baseUrl}/sitemap.xml`, desc: "Peta situs (GSC & Bing submit ini)" },
    { label: "robots.txt", href: `${baseUrl}/robots.txt`, desc: "Aturan crawl + host directive" },
    { label: "feed.xml", href: `${baseUrl}/feed.xml`, desc: "RSS autodiscovery" },
    { label: "llms.txt", href: `${baseUrl}/llms.txt`, desc: "Konteks untuk AI search (Copilot/Perplexity/GPT)" },
    { label: "opengraph-image", href: `${baseUrl}/opengraph-image`, desc: "Gambar OG dinamis 1200×630" },
    { label: "key file IndexNow", href: indexNowKeyFileUrl, desc: indexNowKey ? "Verifikasi kepemilikan IndexNow" : "Belum ada key terpasang" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" /> SEO &amp; SEM
        </h1>
        <p className="text-sm text-muted-foreground">
          Verifikasi Google Search Console &amp; Bing Webmaster, pengindeksan instan
          IndexNow, dan optimalisasi Open Graph — tanpa redeploy.
        </p>
      </div>

      <SeoConfigForm
        initial={config}
        profile={profile}
        baseUrl={baseUrl}
        indexNowKeyFileUrl={indexNowKeyFileUrl}
      />

      {/* ==================================================
          Status endpoint & inventaris konten terindeks
         ================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4 text-primary" /> Status Endpoint &amp; Konten
          </CardTitle>
          <CardDescription>
            Inventaris URL publik yang dilayani untuk crawler. Domain efektif:{" "}
            <code className="font-mono">{baseUrl}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {endpoints.map((ep) => (
            <div
              key={ep.label}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold font-mono text-xs">{ep.label}</p>
                <p className="text-xs text-muted-foreground truncate">{ep.desc}</p>
              </div>
              {ep.href ? (
                <a
                  href={ep.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                >
                  cek <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">—</span>
              )}
            </div>
          ))}
          <div className="pt-2 text-xs text-muted-foreground">
            Konten terindeks: {published.projects} proyek · {published.articles} artikel ·{" "}
            {published.products} produk (hanya yang dipublikasikan).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
