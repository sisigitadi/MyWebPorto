import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

  return {
    rules: [
      {
        // Catatan: /_next/ sengaja TIDAK diblokir. Situs ini sangat bergantung
        // pada JS (shell OS desktop, window manager, RetroBot) — memblokir
        // /_next/static/*.js membuat crawler render halaman kosong. Rule bot
        // khusus di bawah memang tidak memblokirnya; konsistenkan di sini.
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/sign-in/", "/sign-up/", "/api/"],
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
        allow: "/",
        disallow: [
          "/admin/",
          "/sign-in/",
          "/sign-up/",
          "/api/",
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
        // allow: "/" sudah mencakup semuanya — list ini deklaratif: konten
        // yang sengaja dipromosikan ke mesin jawab AI.
        allow: ["/", "/proyek/", "/artikel/", "/toko/", "/feed.xml", "/llms.txt"],
        disallow: [
          "/admin/",
          "/sign-in/",
          "/sign-up/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
