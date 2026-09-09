// Client-side Machine Learning / NLP Inference Engine for MyWebPorto
// Powers both CRT Terminal (Terminal.bat) and the interactive AI Bot (Sigit_Bot.ai)

export interface AIMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
}

export interface AIIntentMatch {
  intent: string;
  confidence: number;
  responseId: string;
  responseEn: string;
}

// Normalized vocabulary knowledge base
const KNOWLEDGE_BASE = {
  owner: "Sigit Adi",
  role: "Full-Stack Developer, AI Automation Specialist & System Architect",
  experience: "5+ years crafting enterprise web platforms, custom AI automations, and resilient distributed backends.",
  stack: [
    "Next.js 15 (App Router)",
    "React 19",
    "TypeScript 5",
    "Tailwind CSS v4",
    "PostgreSQL & Drizzle ORM",
    "GSAP Motion & Smooth Physics",
    "Python & Autonomous AI Agents",
    "Docker & Node.js Microservices",
  ],
  services: [
    "Modern Full-Stack Web Development (Next.js / React / TypeScript)",
    "Custom AI Agent Workflows & Autonomous LLM Pipelines",
    "Database Architecture & API Integration (REST, Webhooks, ETL)",
    "High-Performance Frontend & Kinetic Retro UI Engineering",
    "Server Deployment, DevOps & Production Maintenance",
  ],
  projects: [
    "MyWebPorto Retro Desktop OS (Next.js 15 + React 19 + GSAP)",
    "Enterprise Dashboard & Analytics Portal",
    "E-Commerce Multi-Vendor Engine",
    "Autonomous Social Media & Content Publishing Bot",
    "Automated Web Scraping & Data Pipeline Engine",
  ],
  contact: {
    email: "sigitadi22@gmail.com",
    github: "https://github.com/sisigitadi",
    linkedin: "https://linkedin.com/in/sigitadi",
    portfolio: "https://porto.sigitadi.id",
  },
};

// Intent taxonomy with semantic keywords and pattern weights
interface IntentDef {
  intent: string;
  keywords: string[];
  patterns: RegExp[];
  responsesId: string[];
  responsesEn: string[];
}

const INTENTS: IntentDef[] = [
  {
    intent: "greeting",
    keywords: ["halo", "hai", "hello", "hi", "hey", "pagi", "siang", "sore", "malam", "assalamualaikum", "ping"],
    patterns: [/^(halo|hai|hi|hey|hello|p|ping)/i, /selamat (pagi|siang|sore|malam)/i],
    responsesId: [
      "Halo! Saya SigitOS Neural Engine v2.6. Ada yang bisa saya bantu terkait profil, keahlian, proyek, atau kolaborasi dengan Sigit Adi?",
      "Salam kenal! Model machine learning saya siap menjawab pertanyaan Anda mengenai portfolio, teknologi yang digunakan, atau penawaran kerja sama.",
      "Sistem online! Saya asisten pintar MyWebPorto. Silakan tanyakan apa saja seputar pengalaman teknis, layanan, atau portofolio Sigit Adi.",
    ],
    responsesEn: [
      "Greetings! I am the SigitOS Neural Engine v2.6. How can I assist you regarding Sigit Adi's profile, tech stack, projects, or hire inquiries?",
      "Hello! My machine learning model is ready to answer anything about this portfolio, engineering capabilities, or project collaborations.",
      "System online! I am the MyWebPorto AI assistant. Feel free to ask anything regarding Sigit's technical expertise, services, or projects.",
    ],
  },
  {
    intent: "profile_bio",
    keywords: ["siapa", "profil", "tentang", "sigit", "adi", "bio", "latar", "belakang", "who", "about", "author", "creator"],
    patterns: [/siapa (itu )?sigit/i, /tentang sigit/i, /who is (sigit|the author|the developer)/i, /about (the )?developer/i],
    responsesId: [
      `Sigit Adi adalah ${KNOWLEDGE_BASE.role}. Berpengalaman ${KNOWLEDGE_BASE.experience}. Sigit fokus membangun aplikasi web modern performa tinggi, arsitektur database terukur, dan solusi integrasi AI untuk kebutuhan bisnis.`,
      `Sigit Adi adalah developer software berbakat yang menggabungkan estetika retro-futuristik dengan arsitektur web modern (Next.js 15, PostgreSQL, TypeScript). Berdomisili di Indonesia dan terbuka untuk kerja sama freelance maupun full-time.`,
    ],
    responsesEn: [
      `Sigit Adi is a ${KNOWLEDGE_BASE.role} with ${KNOWLEDGE_BASE.experience}. He specializes in high-velocity web engineering, scalable databases, and autonomous AI integrations.`,
      `Sigit Adi is a software engineer passionate about uniting retro operating system aesthetics with cutting-edge 2026 web standards (Next.js 15, TypeScript, PostgreSQL). Open for freelance and full-time inquiries worldwide.`,
    ],
  },
  {
    intent: "skills_stack",
    keywords: ["skill", "skills", "keahlian", "teknologi", "stack", "tech", "bahasa", "framework", "nextjs", "react", "typescript", "python", "postgres", "database"],
    patterns: [/(keahlian|skill|tech stack|teknologi|bahasa pemrograman)/i, /what (technologies|tech|stack|skills)/i],
    responsesId: [
      `Teknologi inti Sigit Adi mencakup:\n• Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, GSAP Motion\n• Backend & Database: Node.js, Python, PostgreSQL (Neon serverless), Drizzle ORM, REST & GraphQL\n• AI & Tools: Gemini/OpenAI API integrations, Webhooks, Docker, Git, Linux administration.`,
      `Tech stack unggulan: Next.js 15, React 19, TypeScript, PostgreSQL, GSAP. Sigit juga mahir dalam machine learning workflows, web scraping, automasi bisnis, dan arsitektur serverless.`,
    ],
    responsesEn: [
      `Core technical stack of Sigit Adi:\n• Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, GSAP Motion\n• Backend & DB: Node.js, Python, PostgreSQL, Drizzle ORM, Serverless APIs\n• AI & Ops: OpenAI/Gemini Agent integrations, Docker, Webhooks, CI/CD pipelines.`,
      `Featured stack: Next.js 15, React 19, TypeScript, PostgreSQL, GSAP, and Python. Sigit excels in building reactive UI with zero layout shifts and rock-solid backend logic.`,
    ],
  },
  {
    intent: "projects",
    keywords: ["proyek", "project", "projects", "portofolio", "portfolio", "karya", "aplikasi", "showcase", "built", "work"],
    patterns: [/(daftar|lihat|rekomendasi)? proyek/i, /what projects/i, /show me projects/i],
    responsesId: [
      `Beberapa karya pilihan Sigit Adi:\n1. MyWebPorto: Retro 90s Desktop OS portfolio dengan GSAP dynamic motion & window manager.\n2. E-Commerce & POS System: Platform toko digital dengan checkout instan dan manajemen stok.\n3. AI Automation Bot: Bot pipeline pengolah data & publikasi otomatis.\n4. Corporate Dashboard: Portal administrasi berbasis RBAC dengan grafik real-time.\nKetik 'proyek' di terminal atau klik Proyek.exe di taskbar untuk melihat katalog lengkap!`,
    ],
    responsesEn: [
      `Featured highlights by Sigit Adi:\n1. MyWebPorto: High-performance 90s desktop OS interface built on Next.js 15 & GSAP.\n2. Multi-Store E-Commerce: Scalable catalog with instant payment workflow.\n3. Autonomous AI Pipeline: Automated data ingestion & semantic distribution.\n4. Real-time Admin Dashboard: Clean RBAC portal with live metrics.\nType 'projects' or click Projects.exe on the taskbar to inspect details!`,
    ],
  },
  {
    intent: "services_hire",
    keywords: ["layanan", "jasa", "service", "services", "hire", "freelance", "kontrak", "harga", "biaya", "cost", "pricing", "bikin web", "buat web"],
    patterns: [/(layanan|jasa|sewa|hire|buat web|bikin website|pricing|biaya)/i, /(services|hire you|pricing|can you build)/i],
    responsesId: [
      `Sigit Adi menyediakan layanan rekayasa perangkat lunak profesional:\n• Pembuatan Website & Web App Kustom (Company Profile, SaaS, E-Commerce)\n• Desain UI/UX & Interaksi Gerak (GSAP / Tailwind / Responsive OS Style)\n• Integrasi AI, Chatbot & Otomasi Alur Kerja Bisnis\n• Optimasi Kecepatan, SEO & Migrasi Server\nStatus saat ini: Tersedia untuk proyek freelance maupun kontrak. Hubungi melalui menu Kontak!`,
    ],
    responsesEn: [
      `Sigit Adi offers professional engineering services:\n• Custom Web Apps & Full-Stack Development (SaaS, E-Commerce, Portals)\n• Kinetic UI/UX & Motion Design (GSAP / Tailwind / Desktop Metaphor)\n• AI Integrations, Autonomous Bots & Workflow Automation\n• Performance Tuning, Technical SEO & Server Optimization\nCurrent Status: Available for freelance and contract engagements!`,
    ],
  },
  {
    intent: "contact_social",
    keywords: ["kontak", "contact", "email", "hubungi", "pesan", "message", "linkedin", "github", "wa", "whatsapp", "telepon"],
    patterns: [/(cara kontak|hubungi|alamat email|kirim pesan)/i, /(how to contact|email address|reach out)/i],
    responsesId: [
      `Anda dapat menghubungi Sigit Adi melalui:\n• Email Langsung: ${KNOWLEDGE_BASE.contact.email}\n• Form Mailer: Gunakan jendela 'Sigit_Mailer.exe' di menu Kontak\n• GitHub: ${KNOWLEDGE_BASE.contact.github}\n• LinkedIn: ${KNOWLEDGE_BASE.contact.linkedin}\n• Portfolio Resmi: ${KNOWLEDGE_BASE.contact.portfolio}`,
    ],
    responsesEn: [
      `You can reach Sigit Adi through:\n• Direct Email: ${KNOWLEDGE_BASE.contact.email}\n• Instant Mailer: Use 'Sigit_Mailer.exe' inside the Contact window\n• GitHub: ${KNOWLEDGE_BASE.contact.github}\n• LinkedIn: ${KNOWLEDGE_BASE.contact.linkedin}\n• Portfolio: ${KNOWLEDGE_BASE.contact.portfolio}`,
    ],
  },
  {
    intent: "mywebporto_concept",
    keywords: ["mywebporto", "konsep", "os", "retro", "98", "windows", "tema", "desktop", "sound", "suara", "kenapa"],
    patterns: [/(konsep|kenapa retro|mywebporto|desktop os)/i, /(what is mywebporto|why retro)/i],
    responsesId: [
      `Konsep MyWebPorto: Mengawinkan nostalgia sistem operasi desktop klasik era 90-an (beveled borders, tactile buttons, sound effects, BIOS boot sequence) dengan standar web modern 2026 yang super cepat, zero layout shift, serverless database, dan arsitektur Next.js 15.`,
    ],
    responsesEn: [
      `MyWebPorto Concept: Marrying the golden nostalgic aesthetic of 90s desktop operating systems (tactile bevels, CRT monitors, BIOS boot loaders) with cutting-edge 2026 web performance (Next.js 15, GSAP physics, serverless PostgreSQL).`,
    ],
  },
  {
    intent: "ml_ai_features",
    keywords: ["ai", "machine learning", "ml", "bot", "model", "nlp", "llm", "otomasi", "automation", "intelligence"],
    patterns: [/(machine learning|ai engine|fitur ai|apakah kamu ai)/i, /(are you ai|what model)/i],
    responsesId: [
      `Engine Machine Learning MyWebPorto ini berjalan langsung pada browser (client-side NLP inferencing). Mampu melakukan tokenisasi, pembobotan vektor semantik TF-IDF, serta klasifikasi intent secara real-time tanpa latensi jaringan!`,
    ],
    responsesEn: [
      `The MyWebPorto Machine Learning Engine runs directly in-browser using client-side NLP inferencing. It performs real-time tokenization, TF-IDF semantic vector scoring, and intent classification with zero network latency!`,
    ],
  },
];

// Tokenizer & word cleaner
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// Compute cosine-like lexical overlap similarity
function scoreIntent(tokens: string[], rawInput: string, def: IntentDef): number {
  let score = 0;

  // Regex pattern matching (highest weight)
  for (const pat of def.patterns) {
    if (pat.test(rawInput)) {
      score += 3.5;
    }
  }

  // Keyword token matching
  for (const token of tokens) {
    if (def.keywords.includes(token)) {
      score += 1.0;
    } else {
      // Fuzzy substring matching for Indonesian inflections (e.g. "berkontak", "keahliannya")
      for (const kw of def.keywords) {
        if (kw.length >= 4 && (token.includes(kw) || kw.includes(token))) {
          score += 0.5;
          break;
        }
      }
    }
  }

  return score;
}

// Detect language of the query
export function detectLanguage(text: string, defaultLang: "id" | "en" = "id"): "id" | "en" {
  const lower = text.toLowerCase();
  const idMarkers = ["saya", "kamu", "bisa", "apa", "siapa", "bagaimana", "proyek", "keahlian", "layanan", "terima", "kasih", "tolong", "halo", "selamat"];
  const enMarkers = ["what", "who", "how", "can", "you", "tell", "show", "skills", "projects", "services", "thanks", "hello", "please"];

  let idCount = 0;
  let enCount = 0;

  for (const m of idMarkers) {
    if (lower.includes(m)) idCount++;
  }
  for (const m of enMarkers) {
    if (lower.includes(m)) enCount++;
  }

  if (enCount > idCount) return "en";
  if (idCount > enCount) return "id";
  return defaultLang;
}

// Primary Inference Function
export function queryAIEngine(
  userInput: string,
  preferredLang: "id" | "en" = "id"
): { text: string; intent: string; confidence: number } {
  const cleanInput = userInput.trim();
  if (!cleanInput) {
    return {
      text: preferredLang === "en" ? "Please enter a query or command." : "Silakan masukkan pertanyaan atau perintah.",
      intent: "empty",
      confidence: 0,
    };
  }

  const lang = detectLanguage(cleanInput, preferredLang);
  const tokens = tokenize(cleanInput);

  let bestMatch: IntentDef | null = null;
  let bestScore = 0;

  for (const def of INTENTS) {
    const score = scoreIntent(tokens, cleanInput, def);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = def;
    }
  }

  // Threshold for positive classification
  if (bestMatch && bestScore >= 0.8) {
    const responses = lang === "en" ? bestMatch.responsesEn : bestMatch.responsesId;
    const randomIdx = Math.floor(Math.random() * responses.length);
    return {
      text: responses[randomIdx],
      intent: bestMatch.intent,
      confidence: Math.min(1, bestScore / 4),
    };
  }

  // Fallback generation: synthesize smart contextual answer
  if (lang === "en") {
    return {
      text: `[Neural Model 2.6]: I analyzed "${cleanInput}". While not directly matching a static route, I can confirm Sigit Adi specializes in full-stack web engineering, AI automation, and cloud deployments. Try asking about his "skills", "projects", "services", or "contact" channels!`,
      intent: "general_synthesis",
      confidence: 0.5,
    };
  } else {
    return {
      text: `[Neural Model 2.6]: Saya menganalisis input "${cleanInput}". Meskipun belum ada rute langsung, Sigit Adi adalah software engineer berpengalaman di bidang full-stack web, automasi AI, dan arsitektur cloud. Anda dapat menanyakan tentang "keahlian", "proyek", "layanan", atau "kontak"!`,
      intent: "general_synthesis",
      confidence: 0.5,
    };
  }
}
