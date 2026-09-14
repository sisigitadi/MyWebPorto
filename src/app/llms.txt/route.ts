import { getArticles, getProfile, getProjects, getServices } from "@/lib/actions";
import { buildLlmsTxt } from "@/lib/seo";

/** llms.txt dinamis untuk AI crawler — GET /llms.txt (diizinkan di robots.ts). */
export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  try {
    const [profile, services, projects, articles] = await Promise.all([
      getProfile(),
      getServices(),
      getProjects(),
      getArticles(),
    ]);
    const body = buildLlmsTxt({
      baseUrl,
      profile: {
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills || [],
      },
      services: services.filter((s) => s.published !== false).map((s) => s.title),
      projects: projects.filter((p) => p.published).map((p) => ({ title: p.title, slug: p.slug, summary: p.summary })),
      articles: articles.filter((a) => a.published).map((a) => ({ title: a.title, slug: a.slug, summary: a.summary })),
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("# Unavailable\n", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
