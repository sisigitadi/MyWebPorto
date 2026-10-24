/**
 * Metadata & Tipe Data untuk Kartu Detail Profil (Sigit_Profile.exe).
 * Murni tipe dan data default client-safe (TANPA dependensi server/db/fs).
 */

export interface TechCategory {
  id: string;
  title: string;
  titleEn?: string | null;
  iconName: "code" | "layout" | "server" | "shield" | "cpu" | "database";
  items: string[];
}

export interface CareerItem {
  id: string;
  period: string;
  periodEn?: string | null;
  role: string;
  roleEn?: string | null;
  company: string;
  description: string;
  descriptionEn?: string | null;
  badges: string[];
}

export interface WorkPreferences {
  statusBadge: string;
  statusBadgeEn?: string | null;
  locationTimezone: string;
  locationTimezoneEn?: string | null;
  collaborationTypes: Array<{
    title: string;
    titleEn?: string | null;
  }>;
  responseTimeSla: string;
  responseTimeSlaEn?: string | null;
  slaDescription?: string | null;
  slaDescriptionEn?: string | null;
  contactPrompt: string;
  contactPromptEn?: string | null;
}

export interface CredentialItem {
  id: string;
  title: string;
  titleEn?: string | null;
  issuer: string;
  year: string;
  badgeText?: string | null;
}

export interface PhilosophyItem {
  id: string;
  principle: string;
  principleEn?: string | null;
  detail: string;
  detailEn?: string | null;
}

export interface ProfileCardsConfig {
  techStack: TechCategory[];
  careerTimeline: CareerItem[];
  workPreferences: WorkPreferences;
  credentials: CredentialItem[];
  philosophy: PhilosophyItem[];
}

/**
 * Data default lengkap yang mencerminkan profil profesional Sigit Adi Irianto.
 * Digunakan saat data belum diisi di database (tabel settings) atau sebagai fallback.
 */
export const DEFAULT_PROFILE_CARDS: ProfileCardsConfig = {
  techStack: [
    {
      id: "core-languages",
      title: "Bahasa & Pondasi",
      titleEn: "Core Languages",
      iconName: "code",
      items: ["TypeScript", "JavaScript (ESNext)", "Python", "SQL (Postgres & SQLite)", "Bash/Shell"],
    },
    {
      id: "frontend-ui",
      title: "Frontend & UI",
      titleEn: "Frontend & UI Architecture",
      iconName: "layout",
      items: ["Next.js 16 (App Router)", "React 19", "Tailwind CSS", "GSAP Animation", "Lucide Icons", "Radix UI Primitives"],
    },
    {
      id: "backend-cloud",
      title: "Backend & Data",
      titleEn: "Backend & Cloud Systems",
      iconName: "server",
      items: ["Node.js", "FastAPI / Python", "PostgreSQL", "Drizzle ORM", "Docker / Containers", "Vercel & Edge CDN"],
    },
    {
      id: "security-ai",
      title: "Keamanan & AI",
      titleEn: "Cybersecurity & AI Integration",
      iconName: "shield",
      items: ["Google Gemini API", "Wazuh SIEM", "Cloudflare Security", "DDoS Mitigation", "Audit Keamanan Web", "TF-IDF Local AI"],
    },
  ],
  careerTimeline: [
    {
      id: "role-2024-now",
      period: "2024 — Sekarang",
      periodEn: "2024 — Present",
      role: "Lead Full-Stack Developer & AI Architect",
      roleEn: "Lead Full-Stack Developer & AI Architect",
      company: "Independent / SigitOS Tech",
      description: "Merancang dan membangun aplikasi web production-ready dengan arsitektur Next.js 16, integrasi sistem AI agentic, bot interaktif, dan otomasi workflow digital.",
      descriptionEn: "Designing and engineering production-ready web apps with Next.js 16 architecture, agentic AI integration, interactive bots, and digital workflow automation.",
      badges: ["Next.js", "TypeScript", "Gemini AI", "Drizzle"],
    },
    {
      id: "role-2022-2024",
      period: "2022 — 2024",
      periodEn: "2022 — 2024",
      role: "Senior Software Engineer",
      roleEn: "Senior Software Engineer",
      company: "Digital Solutions & Tech Consulting",
      description: "Mengembangkan sistem backend performa tinggi, pipeline integrasi pembayaran, manajemen aset media serverless, dan optimasi query basis data.",
      descriptionEn: "Engineered high-performance backend systems, payment integration pipelines, serverless media management, and relational database query optimization.",
      badges: ["PostgreSQL", "Node.js", "React", "REST API"],
    },
    {
      id: "role-2020-2022",
      period: "2020 — 2022",
      periodEn: "2020 — 2022",
      role: "Web Application & Security Specialist",
      roleEn: "Web Application & Security Specialist",
      company: "Cyber & Infrastructure Projects",
      description: "Implementasi monitoring keamanan SIEM dengan Wazuh, audit kerentanan aplikasi web, penanganan serangan DDoS, dan pemeliharaan server Linux.",
      descriptionEn: "Implemented Wazuh SIEM security monitoring, web vulnerability audits, DDoS attack mitigation, and hardened Linux infrastructure operations.",
      badges: ["Wazuh SIEM", "Linux", "Security Audit", "Python"],
    },
  ],
  workPreferences: {
    statusBadge: "TERSEDIA UNTUK FREELANCE, KONTRAK & KONSULTASI",
    statusBadgeEn: "AVAILABLE FOR FREELANCE, CONTRACT & CONSULTING",
    locationTimezone: "Jakarta, Indonesia (WIB // UTC+7) — Siap Remote Global",
    locationTimezoneEn: "Jakarta, Indonesia (WIB // UTC+7) — Global Remote Ready",
    collaborationTypes: [
      {
        title: "Pembuatan Web App & MVP Cepat (Next.js & TypeScript)",
        titleEn: "Web App & Rapid MVP Development (Next.js & TypeScript)",
      },
      {
        title: "Integrasi AI, Bot Otomasi & Sistem WhatsApp",
        titleEn: "AI Integration, Automation Bots & WhatsApp Systems",
      },
      {
        title: "Audit Keamanan Web, Hardening & Konsultasi SIEM",
        titleEn: "Web Security Audits, Hardening & SIEM Consulting",
      },
      {
        title: "Perbaikan Performa, SEO & Aksesibilitas (Lighthouse 100)",
        titleEn: "Performance, SEO & Accessibility Remediation (Lighthouse 100)",
      },
    ],
    responseTimeSla: "< 2 Jam Kerja (Senin — Sabtu, 08:00 — 21:00 WIB)",
    responseTimeSlaEn: "< 2 Business Hours (Mon — Sat, 08:00 — 21:00 WIB)",
    slaDescription: "Pesan yang masuk melalui form kontak maupun WhatsApp ditinjau cepat dengan penilaian teknis langsung.",
    slaDescriptionEn: "Inquiries received via the contact form or WhatsApp are reviewed promptly with direct technical feasibility feedback.",
    contactPrompt: "Tertarik berkolaborasi atau membutuhkan salinan CV resmi? Klik tombol di bawah untuk mengirim pesan langsung via formulir kontak.",
    contactPromptEn: "Interested in collaborating or need an official CV copy? Click the button below to reach out directly via the contact form.",
  },
  credentials: [
    {
      id: "cred-ctf",
      title: "CTF Judge & Cyber Challenge Author",
      titleEn: "CTF Judge & Cyber Challenge Author",
      issuer: "Cyber Competitions & Security Community",
      year: "2024",
      badgeText: "SECURITY VERIFIED",
    },
    {
      id: "cred-siem",
      title: "Wazuh SIEM & Threat Monitoring Specialist",
      titleEn: "Wazuh SIEM & Threat Monitoring Specialist",
      issuer: "SecOps Engineering Operations",
      year: "2023",
      badgeText: "HARDENED",
    },
    {
      id: "cred-lighthouse",
      title: "100/100 Lighthouse Performance, A11y, Best Practices & SEO",
      titleEn: "100/100 Lighthouse Performance, A11y, Best Practices & SEO",
      issuer: "Continuous Integration Quality Gate",
      year: "2026",
      badgeText: "PERFECT SCORE",
    },
    {
      id: "cred-fullstack",
      title: "Production Next.js & Serverless Architecture",
      titleEn: "Production Next.js & Serverless Architecture",
      issuer: "Enterprise Web Engineering Standards",
      year: "2025",
      badgeText: "PRODUCTION READY",
    },
  ],
  philosophy: [
    {
      id: "phil-type-safety",
      principle: "Type Safety & Zero Runtime Surprises",
      principleEn: "Type Safety & Zero Runtime Surprises",
      detail: "Setiap data diverifikasi ketat sejak boundary input hingga basis data menggunakan TypeScript dan skema validasi.",
      detailEn: "Every piece of data is strictly typed and validated from input boundaries down to the database layer.",
    },
    {
      id: "phil-resilience",
      principle: "Resilient & Offline-First Design",
      principleEn: "Resilient & Offline-First Design",
      detail: "Situs harus tetap berfungsi dan informatif meskipun jaringan bermasalah atau layanan cloud pihak ketiga mengalami downtime.",
      detailEn: "The system remains functional and informative even when third-party cloud services or unstable networks occur.",
    },
    {
      id: "phil-zero-bloat",
      principle: "Zero Unnecessary Bloat",
      principleEn: "Zero Unnecessary Bloat",
      detail: "Mengutamakan solusi rekayasa native dan efisien dibandingkan menumpuk dependensi berat yang memperlambat pengalaman pengguna.",
      detailEn: "Prioritize lean, native engineering solutions over heavy dependencies that degrade visitor performance.",
    },
    {
      id: "phil-character",
      principle: "Strong Character & Accessible Craft",
      principleEn: "Strong Character & Accessible Craft",
      detail: "Desain dengan estetika retro OS yang unik dan berkarakter tanpa mengorbankan aksesibilitas, SEO, dan kontras navigasi.",
      detailEn: "Unique retro OS aesthetic and craftsmanship without sacrificing accessibility, high contrast, and SEO fidelity.",
    },
  ],
};

/**
 * Sanitizer yang memastikan input konfigurasi selalu memenuhi struktur
 * ProfileCardsConfig yang valid dan aman dari crash.
 */
export function sanitizeProfileCards(input: unknown): ProfileCardsConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_PROFILE_CARDS };
  }

  const raw = input as Partial<ProfileCardsConfig>;

  return {
    techStack: Array.isArray(raw.techStack) && raw.techStack.length > 0
      ? raw.techStack.map((cat, idx) => ({
          id: String(cat?.id || `tech-${idx}`),
          title: String(cat?.title || "Kategori"),
          titleEn: cat?.titleEn ? String(cat.titleEn) : null,
          iconName: (["code", "layout", "server", "shield", "cpu", "database"].includes(cat?.iconName)
            ? cat.iconName
            : "code") as TechCategory["iconName"],
          items: Array.isArray(cat?.items) ? cat.items.map(String).filter(Boolean) : [],
        }))
      : DEFAULT_PROFILE_CARDS.techStack,

    careerTimeline: Array.isArray(raw.careerTimeline) && raw.careerTimeline.length > 0
      ? raw.careerTimeline.map((item, idx) => ({
          id: String(item?.id || `career-${idx}`),
          period: String(item?.period || ""),
          periodEn: item?.periodEn ? String(item.periodEn) : null,
          role: String(item?.role || "Software Engineer"),
          roleEn: item?.roleEn ? String(item.roleEn) : null,
          company: String(item?.company || ""),
          description: String(item?.description || ""),
          descriptionEn: item?.descriptionEn ? String(item.descriptionEn) : null,
          badges: Array.isArray(item?.badges) ? item.badges.map(String).filter(Boolean) : [],
        }))
      : DEFAULT_PROFILE_CARDS.careerTimeline,

    workPreferences: raw.workPreferences && typeof raw.workPreferences === "object"
      ? {
          statusBadge: String(raw.workPreferences.statusBadge || DEFAULT_PROFILE_CARDS.workPreferences.statusBadge),
          statusBadgeEn: raw.workPreferences.statusBadgeEn ? String(raw.workPreferences.statusBadgeEn) : null,
          locationTimezone: String(raw.workPreferences.locationTimezone || DEFAULT_PROFILE_CARDS.workPreferences.locationTimezone),
          locationTimezoneEn: raw.workPreferences.locationTimezoneEn ? String(raw.workPreferences.locationTimezoneEn) : null,
          collaborationTypes: Array.isArray(raw.workPreferences.collaborationTypes) && raw.workPreferences.collaborationTypes.length > 0
            ? raw.workPreferences.collaborationTypes.map((c) => ({
                title: String(c?.title || ""),
                titleEn: c?.titleEn ? String(c.titleEn) : null,
              })).filter((c) => Boolean(c.title))
            : DEFAULT_PROFILE_CARDS.workPreferences.collaborationTypes,
          responseTimeSla: String(raw.workPreferences.responseTimeSla || DEFAULT_PROFILE_CARDS.workPreferences.responseTimeSla),
          responseTimeSlaEn: raw.workPreferences.responseTimeSlaEn ? String(raw.workPreferences.responseTimeSlaEn) : null,
          slaDescription: raw.workPreferences.slaDescription !== undefined && raw.workPreferences.slaDescription !== null
            ? String(raw.workPreferences.slaDescription)
            : DEFAULT_PROFILE_CARDS.workPreferences.slaDescription,
          slaDescriptionEn: raw.workPreferences.slaDescriptionEn ? String(raw.workPreferences.slaDescriptionEn) : null,
          contactPrompt: String(raw.workPreferences.contactPrompt || DEFAULT_PROFILE_CARDS.workPreferences.contactPrompt),
          contactPromptEn: raw.workPreferences.contactPromptEn ? String(raw.workPreferences.contactPromptEn) : null,
        }
      : DEFAULT_PROFILE_CARDS.workPreferences,

    credentials: Array.isArray(raw.credentials) && raw.credentials.length > 0
      ? raw.credentials.map((cred, idx) => ({
          id: String(cred?.id || `cred-${idx}`),
          title: String(cred?.title || ""),
          titleEn: cred?.titleEn ? String(cred.titleEn) : null,
          issuer: String(cred?.issuer || ""),
          year: String(cred?.year || ""),
          badgeText: cred?.badgeText ? String(cred.badgeText) : null,
        }))
      : DEFAULT_PROFILE_CARDS.credentials,

    philosophy: Array.isArray(raw.philosophy) && raw.philosophy.length > 0
      ? raw.philosophy.map((phil, idx) => ({
          id: String(phil?.id || `phil-${idx}`),
          principle: String(phil?.principle || ""),
          principleEn: phil?.principleEn ? String(phil.principleEn) : null,
          detail: String(phil?.detail || ""),
          detailEn: phil?.detailEn ? String(phil.detailEn) : null,
        }))
      : DEFAULT_PROFILE_CARDS.philosophy,
  };
}
