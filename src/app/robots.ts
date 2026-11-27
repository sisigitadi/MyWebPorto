import { MetadataRoute } from "next";
import { canonicalBaseUrl, canonicalHostname } from "@/lib/canonical-host";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = canonicalBaseUrl();
  const host = canonicalHostname();

  return {
    rules: [
      {
        // /_next/ sengaja TIDAK diblokir agar crawler JS bisa render UI.
        // /api/media/ dan /api/og diizinkan agar thumbnail & OpenGraph card di sitemap/JSON-LD terindeks.
        userAgent: "*",
        allow: ["/", "/api/media/", "/api/og"],
        disallow: [
          "/admin/",
          "/sign-in/",
          "/sign-up/",
          "/api/",
          "/order/",
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "MSNBot",
          "BingPreview",
          "Slurp",
          "DuckDuckBot",
          "Baiduspider",
          "YandexBot",
        ],
        allow: ["/", "/api/media/", "/api/og"],
        disallow: [
          "/admin/",
          "/sign-in/",
          "/sign-up/",
          "/api/",
          "/order/",
        ],
      },
      // Search-oriented Generative AI Bots & Copilot
      {
        userAgent: [
          "PerplexityBot",
          "GPTBot",
          "OAI-SearchBot", // ChatGPT Search
          "ChatGPT-User",
          "Google-Extended", // Gemini / AI Overviews
          "ClaudeBot",
          "anthropic-ai",
          "Applebot-Extended",
        ],
        allow: ["/", "/proyek/", "/artikel/", "/toko/", "/feed.xml", "/llms.txt", "/api/media/", "/api/og"],
        disallow: [
          "/admin/",
          "/sign-in/",
          "/sign-up/",
          "/api/",
          "/order/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host,
  };
}
