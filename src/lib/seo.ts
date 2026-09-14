import type { Metadata } from "next";

export interface LlmsEntry {
  title: string;
  slug: string;
  summary?: string | null;
}

export interface LlmsProfile {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
}

/**
 * Bangun llms.txt (AI-crawler friendly) dari data katalog publik.
 * Murni (tanpa I/O) agar mudah diuji — route di app/llms.txt/route.ts yang mengambil data.
 */
export function buildLlmsTxt(input: {
  baseUrl: string;
  profile: LlmsProfile;
  services: string[];
  projects: LlmsEntry[];
  articles: LlmsEntry[];
}): string {
  const { baseUrl, profile, services, projects, articles } = input;
  const lines: string[] = [
    `# ${profile.name}`,
    "",
    `> ${profile.headline}`,
    "",
    profile.bio,
    "",
    "## Layanan",
    "",
    ...services.slice(0, 12).map((s) => `- ${s}`),
    "",
    "## Proyek",
    "",
    ...projects
      .slice(0, 20)
      .map((p) => `- [${p.title}](${baseUrl}/proyek/${p.slug})${p.summary ? `: ${p.summary}` : ""}`),
    "",
    "## Artikel",
    "",
    ...articles
      .slice(0, 20)
      .map((a) => `- [${a.title}](${baseUrl}/artikel/${a.slug})${a.summary ? `: ${a.summary}` : ""}`),
    "",
    `## Kontak\n\n- ${baseUrl}/#kontak`,
    "",
  ];
  return lines.join("\n");
}
import { getProfile } from "@/lib/actions";

export async function generateDynamicMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

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
