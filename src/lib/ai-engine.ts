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

/**
 * Konteks live yang dipakai engine untuk merangkai jawaban.
 *
 * SEBELUMNYA engine punya `KNOWLEDGE_BASE` statik (nama, role, stack, daftar
 * proyek, email "x@sigitadi.id") yang ditulis tangan di sini — jadi jawaban
 * bot bisa bertentangan dengan data yang sebenarnya diatur admin di DB
 * (mis. email diubah di admin → bot masih menyebut yang lama). Context ini
 * diisi oleh pemanggil: terminal dari props SSR, `askSigitBot` dari DB —
 * sama seperti jalur cloud sudah lakukan via `LiveContext` di ai-provider.
 */
export interface EngineContext {
  ownerName: string;
  headline: string;
  headlineEn?: string | null;
  bio: string;
  bioEn?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  availableForHire?: boolean;
  skills: string[];
  services: string[];
  projects: { title: string; slug?: string | null }[];
  articles: { title: string; slug?: string | null }[];
  socialLinks?: {
    github?: string | null;
    linkedin?: string | null;
    portfolio?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    telegram?: string | null;
  };
}

/** Potong teks panjang (bio) di batas kata agar jawaban bot tidak meledak. */
function clampText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Judul terjemahan bila admin mengisi varian EN, jika tidak pakai default. */
function localized(ctx: EngineContext, lang: "id" | "en"): { name: string; headline: string; bio: string } {
  return {
    name: ctx.ownerName,
    headline: lang === "en" ? ctx.headlineEn || ctx.headline : ctx.headline,
    bio: lang === "en" ? ctx.bioEn || ctx.bio : ctx.bio,
  };
}

/** Rangkai daftar kontak hanya dari field yang benar-benar terisi. */
function contactBullets(ctx: EngineContext, lang: "id" | "en"): string[] {
  const labels =
    lang === "en"
      ? {
          email: "Direct Email",
          wa: "WhatsApp",
          gh: "GitHub",
          li: "LinkedIn",
          port: "Portfolio",
          mailer: "Instant Mailer: open the Contact window (Sigit_Mailer.exe)",
        }
      : {
          email: "Email Langsung",
          wa: "WhatsApp",
          gh: "GitHub",
          li: "LinkedIn",
          port: "Portfolio Resmi",
          mailer: "Form Mailer: gunakan jendela Kontak (Sigit_Mailer.exe)",
        };
  const lines: string[] = [];
  if (ctx.email) lines.push(`• ${labels.email}: ${ctx.email}`);
  if (ctx.phone) lines.push(`• ${labels.wa}: ${ctx.phone}`);
  if (ctx.socialLinks?.github) lines.push(`• ${labels.gh}: ${ctx.socialLinks.github}`);
  if (ctx.socialLinks?.linkedin) lines.push(`• ${labels.li}: ${ctx.socialLinks.linkedin}`);
  if (ctx.socialLinks?.portfolio) lines.push(`• ${labels.port}: ${ctx.socialLinks.portfolio}`);
  lines.push(`• ${labels.mailer}`);
  return lines;
}

// Intent taxonomy with semantic keywords and pattern weights.
// `build` merangkai jawaban dari EngineContext agar selalu sinkron dengan data admin.
interface IntentDef {
  intent: string;
  keywords: string[];
  patterns: RegExp[];
  build: (ctx: EngineContext, lang: "id" | "en") => string[];
}

const INTENTS: IntentDef[] = [
  {
    intent: "greeting",
    keywords: ["halo", "hai", "hello", "hi", "hey", "pagi", "siang", "sore", "malam", "assalamualaikum", "ping"],
    // \b wajib: tanpa itu alternatif "p" cocok dengan SEMUA input yang dimulai
    // huruf p ("proyek", "python", "postgres", "php" ...) dan dikenali sebagai
    // sapaan. Sebelumnya "proyek apa saja..." → intent greeting.
    patterns: [/^(halo|hai|hi|hey|hello|p|ping)\b/i, /selamat (pagi|siang|sore|malam)/i],
    build: (ctx, lang) => {
      const { name, headline } = localized(ctx, lang);
      return lang === "en"
        ? [
            `Greetings! I am the SigitOS Neural Engine v2.6. How can I assist you regarding ${name}'s profile, tech stack, projects, or hire inquiries?`,
            `Hello! My machine learning model is ready to answer anything about this portfolio (${headline}), engineering capabilities, or project collaborations.`,
            `System online! I am the MyWebPorto AI assistant. Feel free to ask anything regarding ${name}'s technical expertise, services, or projects.`,
          ]
        : [
            `Halo! Saya SigitOS Neural Engine v2.6. Ada yang bisa saya bantu terkait profil, keahlian, proyek, atau kolaborasi dengan ${name}?`,
            `Salam kenal! Model machine learning saya siap menjawab pertanyaan Anda mengenai portfolio (${headline}), teknologi yang digunakan, atau penawaran kerja sama.`,
            `Sistem online! Saya asisten pintar MyWebPorto. Silakan tanyakan apa saja seputar pengalaman teknis, layanan, atau portofolio ${name}.`,
          ];
    },
  },
  {
    intent: "profile_bio",
    keywords: ["siapa", "profil", "tentang", "sigit", "adi", "bio", "latar", "belakang", "who", "about", "author", "creator"],
    patterns: [/siapa (itu )?sigit/i, /tentang sigit/i, /who is (sigit|the author|the developer)/i, /about (the )?developer/i],
    build: (ctx, lang) => {
      const { name, headline, bio } = localized(ctx, lang);
      const skillsHint = ctx.skills.slice(0, 4).join(", ");
      const availability =
        ctx.availableForHire === false
          ? lang === "en"
            ? "Currently focused on ongoing engagements, but open to discuss future collaborations."
            : "Saat ini sedang fokus pada proyek yang berjalan, namun terbuka untuk diskusi kolaborasi mendatang."
          : lang === "en"
            ? "Open for freelance and full-time inquiries worldwide."
            : "Terbuka untuk kerja sama freelance maupun full-time.";
      if (lang === "en") {
        return [
          `${name} — ${headline}. ${clampText(bio, 220)}${skillsHint ? ` Core stack: ${skillsHint}.` : ""}`,
          `${name} is a software engineer behind this portfolio, combining retro operating-system aesthetics with modern web standards. ${availability}${
            ctx.location ? ` Based in ${ctx.location}.` : ""
          }`,
        ];
      }
      return [
        `${name} — ${headline}. ${clampText(bio, 220)}${skillsHint ? ` Stack inti: ${skillsHint}.` : ""}`,
        `${name} adalah software engineer di balik portfolio ini, menggabungkan estetika sistem operasi retro dengan standar web modern. ${availability}${
          ctx.location ? ` Berdomisili di ${ctx.location}.` : ""
        }`,
      ];
    },
  },
  {
    intent: "skills_stack",
    keywords: ["skill", "skills", "keahlian", "teknologi", "stack", "tech", "bahasa", "framework", "nextjs", "react", "typescript", "python", "postgres", "database"],
    patterns: [/(keahlian|skill|tech stack|teknologi|bahasa pemrograman)/i, /what (technologies|tech|stack|skills)/i],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const skills = ctx.skills.slice(0, 10);
      if (skills.length === 0) {
        return lang === "en"
          ? [`The skill list for ${name} is being updated. Try asking about "projects", "services", or "contact" in the meantime!`]
          : [`Daftar keahlian ${name} sedang diperbarui. Sementara itu, tanyakan tentang "proyek", "layanan", atau "kontak"!`];
      }
      const bullets = skills.map((s) => `• ${s}`).join("\n");
      return lang === "en"
        ? [
            `Core technical stack of ${name}:\n${bullets}\nType 'skills' again or open Profil.exe for the full list.`,
            `Featured stack: ${skills.slice(0, 6).join(", ")}. ${name} also ships reactive UI with zero layout shifts and solid backend logic.`,
          ]
        : [
            `Teknologi inti ${name}:\n${bullets}\nKetik 'keahlian' lagi atau buka Profil.exe untuk daftar lengkap.`,
            `Stack unggulan: ${skills.slice(0, 6).join(", ")}. ${name} juga mahir membangun UI reaktif tanpa layout shift dan logika backend yang kokoh.`,
          ];
    },
  },
  {
    intent: "projects",
    keywords: ["proyek", "project", "projects", "portofolio", "portfolio", "karya", "aplikasi", "showcase", "built", "work"],
    patterns: [/(daftar|lihat|rekomendasi)? proyek/i, /what projects/i, /show me projects/i],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const list = ctx.projects.slice(0, 5);
      if (list.length === 0) {
        return lang === "en"
          ? [`No projects are published yet — the catalog is being curated. Ask me about "skills" or "services" instead!`]
          : [`Belum ada proyek yang dipublikasikan — katalog sedang disusun. Tanyakan tentang "keahlian" atau "layanan" saya!`];
      }
      const numbered = list.map((p, i) => `${i + 1}. ${p.title}`).join("\n");
      return lang === "en"
        ? [
            `Selected works by ${name}:\n${numbered}\nType 'projects' or click Projects.exe on the taskbar to inspect the full catalog!`,
          ]
        : [
            `Beberapa karya pilihan ${name}:\n${numbered}\nKetik 'proyek' di terminal atau klik Proyek.exe di taskbar untuk melihat katalog lengkap!`,
          ];
    },
  },
  {
    intent: "services_hire",
    keywords: ["layanan", "jasa", "service", "services", "hire", "freelance", "kontrak", "harga", "biaya", "cost", "pricing", "bikin web", "buat web"],
    patterns: [/(layanan|jasa|sewa|hire|buat web|bikin website|pricing|biaya)/i, /(services|hire you|pricing|can you build)/i],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const list = ctx.services.slice(0, 6);
      const status = ctx.availableForHire
        ? lang === "en"
          ? "Current status: Available for freelance and contract engagements!"
          : "Status saat ini: Tersedia untuk proyek freelance maupun kontrak!"
        : lang === "en"
          ? "Current status: Currently engaged — reach out via the Contact menu to discuss scheduling."
          : "Status saat ini: Sedang berkerja di proyek yang berjalan — hubungi via menu Kontak untuk membicarakan jadwal.";
      const body =
        list.length > 0
          ? list.map((s) => `• ${s}`).join("\n")
          : lang === "en"
            ? "The service catalog is being updated."
            : "Daftar layanan sedang diperbarui.";
      return lang === "en"
        ? [`${name} offers professional engineering services:\n${body}\n${status}`]
        : [`${name} menyediakan layanan rekayasa perangkat lunak profesional:\n${body}\n${status}`];
    },
  },
  {
    intent: "contact_social",
    keywords: ["kontak", "contact", "email", "hubungi", "pesan", "message", "linkedin", "github", "wa", "whatsapp", "telepon"],
    patterns: [/(cara kontak|hubungi|alamat email|kirim pesan)/i, /(how to contact|email address|reach out)/i],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const lines = contactBullets(ctx, lang);
      return lang === "en"
        ? [`You can reach ${name} through:\n${lines.join("\n")}`]
        : [`Anda dapat menghubungi ${name} melalui:\n${lines.join("\n")}`];
    },
  },
  {
    intent: "mywebporto_concept",
    keywords: ["mywebporto", "konsep", "os", "retro", "98", "windows", "tema", "desktop", "sound", "suara", "kenapa"],
    patterns: [/(konsep|kenapa retro|mywebporto|desktop os)/i, /(what is mywebporto|why retro)/i],
    build: () => [
      `Konsep MyWebPorto: Mengawinkan nostalgia sistem operasi desktop klasik era 90-an (beveled borders, tactile buttons, sound effects, BIOS boot sequence) dengan standar web modern 2026 yang super cepat, zero layout shift, serverless database, dan arsitektur Next.js 15.`,
      `MyWebPorto Concept: Marrying the golden nostalgic aesthetic of 90s desktop operating systems (tactile bevels, CRT monitors, BIOS boot loaders) with cutting-edge 2026 web performance (Next.js 15, GSAP physics, serverless PostgreSQL).`,
    ],
  },
  {
    intent: "ml_ai_features",
    keywords: ["ai", "machine learning", "ml", "bot", "model", "nlp", "llm", "otomasi", "automation", "intelligence"],
    patterns: [/(machine learning|ai engine|fitur ai|apakah kamu ai)/i, /(are you ai|what model)/i],
    build: () => [
      `Engine Machine Learning MyWebPorto ini berjalan langsung pada browser (client-side NLP inferencing). Mampu melakukan tokenisasi, pembobotan vektor semantik TF-IDF, serta klasifikasi intent secara real-time tanpa latensi jaringan!`,
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
  ctx: EngineContext,
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

  // Bahasa jawaban mengikuti bahasa UI (preferredLang), BUKAN teks pertanyaan.
  // Sebelumnya memakai detectLanguage(cleanInput, preferredLang) yang mendeteksi
  // bahasa dari teks pertanyaan — jadi saat UI = EN tapi user bertanya dalam
  // Bahasa Indonesia ("siapa sigit adi?"), jawaban tetap keluar dalam Bahasa
  // Indonesia. detectLanguage hanya dipakai untuk saran terjemahan otomatis di
  // form admin, bukan untuk menentukan bahasa jawaban bot.
  const lang = preferredLang;
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
    const responses = bestMatch.build(ctx, lang);
    const randomIdx = Math.floor(Math.random() * responses.length);
    return {
      text: responses[randomIdx],
      intent: bestMatch.intent,
      confidence: Math.min(1, bestScore / 4),
    };
  }

  // Fallback generation: synthesize smart contextual answer dari data live
  const { name, headline } = localized(ctx, lang);
  const topSkills = ctx.skills.slice(0, 3).join(", ");
  if (lang === "en") {
    return {
      text: `[Neural Model 2.6]: I analyzed "${cleanInput}". While not directly matching a static route, ${name} is ${headline}${topSkills ? ` with core skills in ${topSkills}` : ""}. Try asking about "skills", "projects", "services", or "contact" channels!`,
      intent: "general_synthesis",
      confidence: 0.5,
    };
  }
  return {
    text: `[Neural Model 2.6]: Saya menganalisis input "${cleanInput}". Meskipun belum ada rute langsung, ${name} adalah ${headline}${topSkills ? ` dengan keahlian inti di ${topSkills}` : ""}. Anda dapat menanyakan tentang "keahlian", "proyek", "layanan", atau "kontak"!`,
    intent: "general_synthesis",
    confidence: 0.5,
  };
}
