export const revalidate = 86400;

import { getArticles } from "@/lib/actions";
import { canonicalBaseUrl } from "@/lib/canonical-host";

function stripMarkdownToText(md: string): string {
  return (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** RSS 2.0 artikel publik: GET /feed.xml (max 20 terbaru). */
export async function GET() {
  const baseUrl = canonicalBaseUrl();
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

  const latestTs = articles.reduce((max, a) => {
    const t = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  const lastBuildDate = new Date(latestTs || "2026-01-01T00:00:00Z").toUTCString();

  const items = articles
    .map((a) => {
      const url = `${baseUrl}/artikel/${a.slug}`;
      const pubDate = new Date(a.createdAt || "2026-01-01T00:00:00Z").toUTCString();
      const desc = (a.summary && a.summary.trim()) || stripMarkdownToText(a.content).slice(0, 240);
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
    `    <title>${escapeXml("Sigit Adi: Artikel Teknis")}</title>`,
    `    <link>${escapeXml(`${baseUrl}/artikel`)}</link>`,
    `    <description>${escapeXml("Artikel AI, cybersecurity, Linux, Windows, macOS, dan studi kasus proyek.")}</description>`,
    "    <language>id-ID</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
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
