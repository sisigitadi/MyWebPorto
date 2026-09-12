import type { Metadata } from "next";
import { getProfile } from "@/lib/actions";

export async function generateDynamicMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const appUrl = ((process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "")).replace(/\/$/, "");

  const title = `${profile.name} — ${profile.headline}`;
  const description = profile.bio;

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: title,
      template: `%s | ${profile.name}`,
    },
    description,
    keywords: [
      profile.name,
      profile.headline,
      "Full Stack Developer",
      "Portfolio Developer Indonesia",
      "Next.js Developer",
      "React",
      "TypeScript",
      "Jasa Pembuatan Website",
      "Software Engineer Jakarta",
      "AI Developer Indonesia",
      "Artificial Intelligence Indonesia",
      "Generative AI Indonesia",
      "LLM Integration",
      "Cybersecurity Indonesia",
      "Web Security Audit",
      "OWASP Developer",
      "Linux Server Hardening",
      "Windows Security",
      "macOS Security",
      "DevSecOps Indonesia",
      ...(profile.skills || []),
    ],
    authors: [{ name: profile.name, url: appUrl }],
    creator: profile.name,
    publisher: profile.name,
    alternates: {
      canonical: appUrl,
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: appUrl,
      title,
      description,
      siteName: `${profile.name} Portfolio`,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${profile.name} - Web Developer & Tech Creator`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: profile.socialLinks?.twitter ? `@${profile.socialLinks.twitter.split("/").pop()}` : "@developer",
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
