import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/sign-in/", "/sign-up/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
