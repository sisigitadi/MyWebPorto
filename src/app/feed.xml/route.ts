import { getArticles } from "@/lib/actions";

/** RSS 2.0 artikel publik — GET /feed.xml (max 20 terbaru). */
export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  let articles: Awaited<ReturnType<typeof getArticles>> = [];
  try {
    articles = (await getArticles()).filter((a) => a.published).slice(0, 20);
  } catch {
    articles = [];
  }

  const items = articles
    .map((a) => {
      const url = `${baseUrl}/artikel/${a.slug}`;
      const pubDate = new Date(a.createdAt || Date.now()).toUTCString();
      const desc = a.summary || a.content.slice(0, 200);
      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(desc)}</description>`,
        ...(a.tags || []).map((t) => `      <category>${escapeXml(t)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml("Sigit Adi — Artikel Teknis")}</title>`,
    `    <link>${escapeXml(`${baseUrl}/artikel`)}</link>`,
    `    <description>${escapeXml("Artikel AI, cybersecurity, Linux, Windows, macOS, dan studi kasus proyek.")}</description>`,
    "    <language>id-ID</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${baseUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
