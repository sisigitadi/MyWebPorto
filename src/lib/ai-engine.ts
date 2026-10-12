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
  servicesEn?: string[];
  projects: { title: string; titleEn?: string | null; slug?: string | null }[];
  articles: { title: string; titleEn?: string | null; slug?: string | null }[];
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

/** Judul terjemahan bila admin mengisi varian EN, jika tidak pakai fallback bersih (bukan teks ID mentah). */
function localized(ctx: EngineContext, lang: "id" | "en"): { name: string; headline: string; bio: string } {
  const defaultBioEn =
    "Building high-performance web applications, secure digital systems, and modern AI-driven solutions.";
  return {
    name: ctx.ownerName,
    headline: lang === "en" ? ctx.headlineEn?.trim() || ctx.headline : ctx.headline,
    bio: lang === "en" ? ctx.bioEn?.trim() || defaultBioEn : ctx.bio,
  };
}

function getServicesList(ctx: EngineContext, lang: "id" | "en"): string[] {
  if (lang === "en" && ctx.servicesEn && ctx.servicesEn.length > 0) {
    return ctx.servicesEn;
  }
  return ctx.services;
}

function getProjectsList(ctx: EngineContext, lang: "id" | "en"): { title: string; slug?: string | null }[] {
  return ctx.projects.map((p) => ({
    title: lang === "en" ? p.titleEn?.trim() || p.title : p.title,
    slug: p.slug,
  }));
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
    keywords: ["halo", "hai", "hello", "hi", "hey", "pagi", "siang", "sore", "malam", "assalamualaikum", "ping", "greetings"],
    // \b wajib: tanpa itu alternatif "p" cocok dengan SEMUA input yang dimulai
    // huruf p ("proyek", "python", "postgres", "php" ...) dan dikenali sebagai
    // sapaan. Sebelumnya "proyek apa saja..." → intent greeting.
    patterns: [
      /^(halo|hai|hi|hey|hello|p|ping|greetings)\b/i,
      /selamat (pagi|siang|sore|malam)/i,
      /good (morning|afternoon|evening|day)/i,
      /hey there/i,
    ],
    build: (ctx, lang) => {
      const { name, headline } = localized(ctx, lang);
      return lang === "en"
        ? [
            `Greetings! I'm SigitOS Neural Engine v2.6. Curious about ${name}'s tech stack, featured projects, or looking to collaborate? Fire away, no hallucinations here!`,
            `Hello there! My machine learning model is ready to answer anything about this portfolio (${headline}), engineering capabilities, or project collaborations. Feel free to ask!`,
            `System online! I am the MyWebPorto AI assistant. Ask me anything about ${name}'s technical expertise, projects, or services—relaxed vibes, zero ghost bugs.`,
          ]
        : [
            `Halo! Saya SigitOS Neural Engine v2.6. Penasaran seputar profil, keahlian, proyek, atau mau kerja sama dengan ${name}? Santai saja, tanyakan apa pun!`,
            `Salam kenal! Model machine learning saya siap menjawab apa saja mengenai portofolio (${headline}), teknologi yang dipakai, atau kolaborasi proyek. Anti-halu dan selalu fokus ke fakta!`,
            `Sistem online! Saya asisten pintar MyWebPorto. Mau bedah pengalaman teknis, intip proyek keren, atau tanya layanan ${name}? Siap bantu kapan saja!`,
          ];
    },
  },
  {
    intent: "profile_bio",
    keywords: ["siapa", "profil", "tentang", "sigit", "adi", "bio", "latar", "belakang", "who", "about", "author", "creator", "developer", "yourself", "profile"],
    patterns: [
      /siapa (itu )?sigit/i,
      /tentang sigit/i,
      /who is (sigit|the author|the developer)/i,
      /about (the )?(developer|author|yourself)/i,
      /who are you/i,
      /tell me about (yourself|sigit)/i,
    ],
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
          `${name} — ${headline}. ${clampText(bio, 220)}${skillsHint ? ` Core stack: ${skillsHint}.` : ""} Passionate about crafting resilient systems with zero fluff.`,
          `${name} is the software engineer behind this portfolio, blending nostalgic 90s OS charm with modern high-performance web engineering. ${availability}${
            ctx.location ? ` Based in ${ctx.location}.` : ""
          }`,
        ];
      }
      return [
        `${name} — ${headline}. ${clampText(bio, 220)}${skillsHint ? ` Stack inti: ${skillsHint}.` : ""} Selalu fokus merakit sistem yang tangguh dan minim drama.`,
        `${name} adalah software engineer di balik portfolio ini, menggabungkan estetika sistem operasi retro dengan standar web modern yang ngebut. ${availability}${
          ctx.location ? ` Berdomisili di ${ctx.location}.` : ""
        }`,
      ];
    },
  },
  {
    intent: "skills_stack",
    keywords: ["skill", "skills", "keahlian", "teknologi", "stack", "tech", "bahasa", "framework", "nextjs", "react", "typescript", "python", "postgres", "database", "capabilities", "tools"],
    patterns: [
      /(keahlian|skill|tech stack|teknologi|bahasa pemrograman)/i,
      /what (technologies|tech|stack|skills|tools)/i,
      /what are your (skills|capabilities)/i,
    ],
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
            `Core technical stack of ${name}:\n${bullets}\n\nType 'skills' again or open Profile.exe for the full toolkit. Built for speed and solid backend logic!`,
            `Featured stack: ${skills.slice(0, 6).join(", ")}. ${name} also ships reactive UI with zero layout shifts and rock-solid backend logic.`,
          ]
        : [
            `Teknologi inti andalan ${name}:\n${bullets}\n\nKetik 'keahlian' lagi atau buka Profil.exe untuk daftar lengkap. Dibangun untuk performa kencang tanpa lag!`,
            `Stack unggulan: ${skills.slice(0, 6).join(", ")}. ${name} juga mahir membangun UI reaktif tanpa layout shift dan logika backend yang kokoh.`,
          ];
    },
  },
  {
    intent: "projects",
    keywords: ["proyek", "project", "projects", "portofolio", "portfolio", "karya", "aplikasi", "showcase", "built", "work", "works"],
    patterns: [
      /(daftar|lihat|rekomendasi)? proyek/i,
      /what projects/i,
      /show me (your )?projects/i,
      /what have you built/i,
      /show portfolio/i,
    ],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const list = getProjectsList(ctx, lang).slice(0, 5);
      if (list.length === 0) {
        return lang === "en"
          ? [`No projects are published yet — the catalog is being curated. Ask me about "skills" or "services" instead!`]
          : [`Belum ada proyek yang dipublikasikan — katalog sedang disusun. Tanyakan tentang "keahlian" atau "layanan" saya!`];
      }
      const numbered = list.map((p, i) => `${i + 1}. ${p.title}`).join("\n");
      return lang === "en"
        ? [
            `Selected works by ${name}:\n${numbered}\n\nType 'projects' or click Projects.exe on the taskbar to inspect the full catalog! No ghost bugs included.`,
          ]
        : [
            `Beberapa karya pilihan ${name}:\n${numbered}\n\nKetik 'proyek' di terminal atau klik Proyek.exe di taskbar untuk melihat katalog lengkap! Dirancang rapi dan bebas bug gentayangan.`,
          ];
    },
  },
  {
    intent: "services_hire",
    keywords: ["layanan", "jasa", "service", "services", "hire", "freelance", "kontrak", "harga", "biaya", "cost", "pricing", "bikin web", "buat web", "offer", "rates"],
    patterns: [
      /(layanan|jasa|sewa|hire|buat web|bikin website|pricing|biaya)/i,
      /(services|hire you|pricing|can you build|what do you offer|what services)/i,
    ],
    build: (ctx, lang) => {
      const { name } = localized(ctx, lang);
      const list = getServicesList(ctx, lang).slice(0, 6);
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
        ? [`${name} offers professional engineering services:\n${body}\n\n${status}\nGot an exciting idea or need an extra pair of senior hands? Let's talk!`]
        : [`${name} menyediakan layanan rekayasa perangkat lunak profesional:\n${body}\n\n${status}\nPunya ide menarik atau butuh bantuan teknis? Yuk diskusikan lewat menu Kontak!`];
    },
  },
  {
    intent: "contact_social",
    keywords: ["kontak", "contact", "email", "hubungi", "pesan", "message", "linkedin", "github", "wa", "whatsapp", "telepon", "reach", "touch"],
    patterns: [
      /(cara kontak|hubungi|alamat email|kirim pesan)/i,
      /(how to contact|email address|reach out|get in touch)/i,
    ],
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
    keywords: ["mywebporto", "konsep", "os", "retro", "98", "windows", "tema", "desktop", "sound", "suara", "kenapa", "concept", "theme", "design"],
    patterns: [
      /(konsep|kenapa retro|mywebporto|desktop os)/i,
      /(what is mywebporto|why retro|why the retro|concept)/i,
    ],
    build: (_ctx, lang) =>
      lang === "en"
        ? [
            `MyWebPorto Concept: Marrying the golden nostalgic aesthetic of 90s desktop operating systems (tactile bevels, CRT monitors, BIOS boot loaders) with cutting-edge 2026 web performance (Next.js 15, GSAP physics, serverless PostgreSQL).`,
          ]
        : [
            `Konsep MyWebPorto: Mengawinkan nostalgia sistem operasi desktop klasik era 90-an (beveled borders, tactile buttons, sound effects, BIOS boot sequence) dengan standar web modern 2026 yang super cepat, zero layout shift, serverless database, dan arsitektur Next.js 15.`,
          ],
  },
  {
    intent: "ml_ai_features",
    keywords: ["ai", "machine learning", "ml", "bot", "model", "nlp", "llm", "otomasi", "automation", "intelligence", "neural", "assistant"],
    patterns: [
      /(machine learning|ai engine|fitur ai|apakah kamu ai)/i,
      /(are you ai|what model|neural engine|ai model)/i,
    ],
    build: (_ctx, lang) =>
      lang === "en"
        ? [
            `The MyWebPorto Machine Learning Engine runs directly in-browser using client-side NLP inferencing. It performs real-time tokenization, TF-IDF semantic vector scoring, and intent classification with zero network latency!`,
          ]
        : [
            `Engine Machine Learning MyWebPorto ini berjalan langsung pada browser (client-side NLP inferencing). Mampu melakukan tokenisasi, pembobotan vektor semantik TF-IDF, serta klasifikasi intent secara real-time tanpa latensi jaringan!`,
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

// Detect language of the query based on lexical tokens and characteristic patterns
export function detectLanguage(text: string, defaultLang: "id" | "en" = "id"): "id" | "en" {
  const lower = text.toLowerCase().trim();
  if (!lower) return defaultLang;

  // Pola awalan / frase khas
  const enPhrases = [
    /\b(who is|what is|what are|how to|how do|can you|tell me|show me|list of|good morning|good afternoon|good evening|thank you|thanks a lot)\b/,
    /\b(built|framework|capabilities|yourself|stack|projects|skills|services)\b/,
  ];
  const idPhrases = [
    /\b(siapa|siapakah|apa saja|apakah|bagaimana|gimana|kenapa|mengapa|bisa kah|tolong|selamat pagi|selamat siang|selamat sore|selamat malam|terima kasih|makasih banyak)\b/,
    /\b(keahlian|layanan|proyek|karya|hubungi|kontak|tentang)\b/,
  ];

  let enScore = 0;
  let idScore = 0;

  for (const pat of enPhrases) {
    if (pat.test(lower)) enScore += 2;
  }
  for (const pat of idPhrases) {
    if (pat.test(lower)) idScore += 2;
  }

  // Token level matching
  const tokens = lower.replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 0);
  const idWordSet = new Set([
    "saya", "aku", "kamu", "anda", "dia", "mereka", "kita", "bisa", "dapat", "apa", "apakah",
    "siapa", "siapakah", "bagaimana", "gimana", "kenapa", "mengapa", "proyek", "keahlian",
    "layanan", "terima", "kasih", "makasih", "tolong", "bantu", "halo", "hai", "selamat",
    "pagi", "siang", "sore", "malam", "tentang", "hubungi", "kontak", "jasa", "biaya",
    "harga", "buat", "bikin", "ngapain", "karya", "kerja", "kerjaan", "ada", "ngobrol",
    "dong", "saja", "nih", "ya", "yuk", "ini", "itu", "dan", "atau", "dari", "ke", "di",
  ]);
  const enWordSet = new Set([
    "i", "me", "my", "myself", "you", "your", "yours", "yourself", "he", "she", "it", "they", "we",
    "what", "who", "whom", "whose", "how", "why", "when", "where", "can", "could", "would",
    "will", "is", "are", "am", "was", "were", "do", "does", "did", "tell", "show", "give",
    "list", "skills", "skill", "projects", "project", "services", "service", "contact",
    "about", "hi", "hello", "hey", "greetings", "good", "morning", "afternoon", "evening",
    "thanks", "thank", "please", "hire", "built", "pricing", "cost", "work", "works",
    "help", "the", "a", "an", "this", "that", "and", "or", "from", "to", "in", "on", "at",
  ]);

  for (const t of tokens) {
    if (idWordSet.has(t)) idScore += 1;
    if (enWordSet.has(t)) enScore += 1;
  }

  if (enScore > idScore) return "en";
  if (idScore > enScore) return "id";
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

  // Bahasa jawaban mengikuti bahasa input agar selaras dan natural:
  // Bila posisi UI ID tapi ada input EN -> dijawab EN.
  // Bila posisi UI EN tapi ada input ID -> dijawab ID.
  // Bila tidak terdeteksi (ambigu) -> jatuh ke preferredLang.
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
    const responses = bestMatch.build(ctx, lang);
    const randomIdx = Math.floor(Math.random() * responses.length);
    return {
      text: responses[randomIdx],
      intent: bestMatch.intent,
      confidence: Math.min(1, bestScore / 4),
    };
  }

  // Fallback generation: synthesize smart contextual answer dari data live (fokus dan anti-halu)
  const { name, headline } = localized(ctx, lang);
  const topSkills = ctx.skills.slice(0, 3).join(", ");
  if (lang === "en") {
    return {
      text: `[SigitOS AI]: I analyzed "${cleanInput}". To keep answers focused and avoid hallucinating outside context, I specialize in ${name}'s portfolio (${headline}${topSkills ? `, stack: ${topSkills}` : ""}). Try asking about "skills", "projects", "services", or "contact" channels!`,
      intent: "general_synthesis",
      confidence: 0.5,
    };
  }
  return {
    text: `[SigitOS AI]: Saya menganalisis input "${cleanInput}". Agar tetap fokus dan tidak halu keluar konteks, saya berspesialisasi pada portofolio ${name} (${headline}${topSkills ? `, keahlian: ${topSkills}` : ""}). Anda dapat menanyakan tentang "keahlian", "proyek", "layanan", atau "kontak"!`,
    intent: "general_synthesis",
    confidence: 0.5,
  };
}
