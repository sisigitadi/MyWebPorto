import { ProfileData } from "@/lib/dummy-data";
import { safeJsonLd } from "@/lib/json-ld";

export function JsonLdSchema({ profile }: { profile: ProfileData }) {
  const baseUrl = ((process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "")).replace(/\/$/, "");

  const personId = `${baseUrl}/#sigitadi`;
  const websiteId = `${baseUrl}/#website`;

  // 1. Person Schema (E-E-A-T Authority Entity)
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: profile.name,
    jobTitle: profile.headline || "Senior Web Developer & Full Stack Engineer",
    description: profile.bio,
    image: profile.avatarUrl || `${baseUrl}/opengraph-image`,
    url: baseUrl,
    email: profile.email ? `mailto:${profile.email}` : undefined,
    telephone: profile.phone ? `tel:${profile.phone}` : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.location || "Jakarta",
      addressCountry: "ID",
    },
    sameAs: [
      profile.socialLinks?.github,
      profile.socialLinks?.linkedin,
      profile.socialLinks?.instagram,
      profile.socialLinks?.twitter,
      profile.socialLinks?.medium,
      profile.socialLinks?.youtube,
      profile.socialLinks?.tiktok,
      profile.socialLinks?.telegram,
      profile.socialLinks?.facebook,
      profile.socialLinks?.discord,
      profile.socialLinks?.slack,
      profile.socialLinks?.reddit,
      profile.socialLinks?.portfolio,
    ].filter(Boolean),
    knowsAbout: [
      "Web Development",
      "Full Stack Engineering",
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Node.js",
      "PostgreSQL",
      "Cloud Architecture",
      "Artificial Intelligence & LLMs",
      ...(profile.skills || []),
    ],
    worksFor: {
      "@type": "Organization",
      name: "Freelance & Independent Creator",
    },
  };

  // 2. ProfilePage Schema (Google Search 2024+ Rich Result Standard)
  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${baseUrl}/#webpage`,
    url: baseUrl,
    name: `${profile.name} — Portofolio & Workstation`,
    isPartOf: {
      "@type": "WebSite",
      "@id": websiteId,
      name: "Sigit Web Porto",
      url: baseUrl,
    },
    mainEntity: {
      "@id": personId,
    },
    description: profile.bio,
    inLanguage: "id-ID",
    dateCreated: "2024-01-01T00:00:00Z",
    dateModified: new Date().toISOString(),
  };

  // 3. WebSite Schema (Bing & Google Sitelinks & Brand Knowledge Graph)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    url: baseUrl,
    name: "Sigit Web Porto",
    description: "Portofolio interaktif SigitOS dengan sistem modern, karya aplikasi web unggulan, dan integrasi kecerdasan buatan.",
    publisher: {
      "@id": personId,
    },
    inLanguage: ["id-ID", "en-US"],
  };

  // 4. Professional Services Schema (SEM & Local / Commercial Intent)
  const professionalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `Jasa Pembuatan Website & Aplikasi Web — ${profile.name}`,
    image: `${baseUrl}/opengraph-image`,
    url: baseUrl,
    telephone: profile.phone,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.location || "Jakarta",
      addressCountry: "ID",
    },
    areaServed: {
      "@type": "Country",
      name: "Indonesia",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Layanan Pengembangan Web & AI",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Jasa Pembuatan Website & Aplikasi Full Stack",
            description: "Pengembangan sistem web modern berbasis Next.js, React, Node.js, dan arsitektur cloud serverless berkinerja tinggi.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Integrasi AI & Automasi Sistem",
            description: "Penerapan solusi Large Language Models, AI Agent, chatbot interaktif, dan automasi cerdas untuk bisnis.",
          },
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(profilePageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(professionalServiceSchema) }}
      />
    </>
  );
}
