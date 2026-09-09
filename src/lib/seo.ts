import type { Metadata } from "next";
import { getProfile } from "@/lib/actions";

export async function generateDynamicMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
      ...profile.skills,
    ],
    authors: [{ name: profile.name, url: appUrl }],
    creator: profile.name,
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: appUrl,
      title,
      description,
      siteName: `${profile.name} Portfolio`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: profile.socialLinks?.twitter ? `@${profile.socialLinks.twitter.split('/').pop()}` : "@developer",
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
    alternates: {
      canonical: appUrl,
    },
  };
}
