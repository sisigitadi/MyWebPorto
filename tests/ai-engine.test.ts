import { describe, expect, it } from "vitest";
import { detectLanguage, queryAIEngine, type EngineContext } from "@/lib/ai-engine";

const CTX: EngineContext = {
  ownerName: "Sigit Adi",
  headline: "Full-Stack Developer & AI Automation Specialist",
  headlineEn: "Full-Stack Developer & AI Automation Specialist",
  bio: "Membangun aplikasi web modern performa tinggi dan solusi integrasi AI.",
  bioEn: "Building high-performance web apps and AI integration solutions.",
  location: "Indonesia",
  email: "hello@sigitadi.id",
  phone: "6281234567890",
  availableForHire: true,
  skills: ["Next.js 15", "React 19", "TypeScript", "PostgreSQL", "GSAP"],
  services: ["Pembuatan Web App Kustom", "Integrasi AI & Chatbot"],
  projects: [{ title: "MyWebPorto Retro OS", slug: "mywebporto-retro-os" }],
  articles: [{ title: "Arsitektur Next.js 15", slug: "arsitektur-nextjs-15" }],
  socialLinks: {
    github: "https://github.com/sisigitadi",
    linkedin: "https://linkedin.com/in/sigitadi",
    portfolio: "https://sigitadi.id",
  },
};

describe("detectLanguage", () => {
  it("mendeteksi Bahasa Indonesia", () => {
    expect(detectLanguage("siapa sigit adi dan apa keahliannya?")).toBe("id");
  });

  it("mendeteksi Bahasa Inggris", () => {
    expect(detectLanguage("what projects have you built? show me skills")).toBe("en");
  });

  it("memakai default bila ambigu", () => {
    expect(detectLanguage("xyz 123", "en")).toBe("en");
    expect(detectLanguage("xyz 123", "id")).toBe("id");
  });
});

describe("queryAIEngine", () => {
  it("mengklasifikasikan sapaan", () => {
    const res = queryAIEngine("halo, selamat pagi!", CTX);
    expect(res.intent).toBe("greeting");
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("mengklasifikasikan pertanyaan profil", () => {
    const res = queryAIEngine("siapa itu sigit adi?", CTX);
    expect(res.intent).toBe("profile_bio");
  });

  it("memberi fallback general_synthesis untuk input asing", () => {
    const res = queryAIEngine("asdfghjkl qwerty zzzz", CTX);
    expect(res.intent).toBe("general_synthesis");
    expect(res.confidence).toBe(0.5);
  });

  it("menolak input kosong", () => {
    expect(queryAIEngine("   ", CTX).intent).toBe("empty");
  });

  it("merangkai jawaban dari konteks live, bukan hardcode", () => {
    const res = queryAIEngine("apa saja keahlianmu?", CTX);
    expect(res.intent).toBe("skills_stack");
    // Skill yang ada di konteks harus muncul; tidak ada skill phantom lama
    expect(res.text).toContain("Next.js 15");
  });

  it("memakai varian EN dari konteks bila admin mengisi", () => {
    const res = queryAIEngine("what is your tech stack?", CTX, "en");
    expect(res.text).toContain("Next.js 15");
  });

  it("kontak hanya mencantumkan channel yang terisi", () => {
    const res = queryAIEngine("bagaimana cara menghubungimu?", CTX);
    expect(res.intent).toBe("contact_social");
    expect(res.text).toContain("hello@sigitadi.id");
    expect(res.text).toContain("https://github.com/sisigitadi");
  });

  it("tidak mencantumkan kontak kosong", () => {
    const res = queryAIEngine("how do I contact you?", { ...CTX, email: null, socialLinks: {} }, "en");
    expect(res.text).not.toContain("hello@sigitadi.id");
    expect(res.text).toContain("WhatsApp");
  });

  it("mencantumkan judul proyek dari konteks", () => {
    const res = queryAIEngine("proyek apa saja yang pernah dibuat?", CTX);
    expect(res.intent).toBe("projects");
    expect(res.text).toContain("MyWebPorto Retro OS");
  });

  it("mencantumkan judul layanan dari konteks", () => {
    const res = queryAIEngine("layanan apa yang tersedia?", CTX);
    expect(res.intent).toBe("services_hire");
    expect(res.text).toContain("Pembuatan Web App Kustom");
  });

  it("graceful bila konteks kosong (skill/proyek belum diisi)", () => {
    const res = queryAIEngine("apa keahlianmu?", {
      ...CTX,
      skills: [],
      projects: [],
      services: [],
    });
    expect(res.intent).toBe("skills_stack");
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("status availableForHire = false tidak mengklaim tersedia", () => {
    const res = queryAIEngine("apakah bisa dihire?", { ...CTX, availableForHire: false }, "en");
    expect(res.intent).toBe("services_hire");
    expect(res.text.toLowerCase()).not.toContain("available for freelance and contract engagements!");
  });

  it("menjamin respon EN untuk mywebporto_concept 100% berbahasa Inggris", () => {
    for (let i = 0; i < 5; i++) {
      const res = queryAIEngine("what is the concept of mywebporto?", CTX, "en");
      expect(res.intent).toBe("mywebporto_concept");
      expect(res.text).toContain("MyWebPorto Concept");
      expect(res.text).not.toContain("Konsep MyWebPorto");
    }
  });

  it("menjamin respon EN untuk ml_ai_features 100% berbahasa Inggris", () => {
    for (let i = 0; i < 5; i++) {
      const res = queryAIEngine("tell me about the ai model and neural engine", CTX, "en");
      expect(res.intent).toBe("ml_ai_features");
      expect(res.text).toContain("Machine Learning Engine");
      expect(res.text).not.toContain("Engine Machine Learning");
    }
  });

  it("memakai judul layanan EN (servicesEn) bila bahasa adalah en", () => {
    const ctxWithEn: EngineContext = {
      ...CTX,
      services: ["Pembuatan Web App Kustom"],
      servicesEn: ["Custom Web App Development"],
    };
    const res = queryAIEngine("what services do you offer?", ctxWithEn, "en");
    expect(res.intent).toBe("services_hire");
    expect(res.text).toContain("Custom Web App Development");
    expect(res.text).not.toContain("Pembuatan Web App Kustom");
  });

  it("memakai judul proyek EN (titleEn) bila bahasa adalah en", () => {
    const ctxWithEn: EngineContext = {
      ...CTX,
      projects: [{ title: "Dasbor SOC", titleEn: "SOC Dashboard", slug: "soc" }],
    };
    const res = queryAIEngine("what projects have you built?", ctxWithEn, "en");
    expect(res.intent).toBe("projects");
    expect(res.text).toContain("SOC Dashboard");
    expect(res.text).not.toContain("Dasbor SOC");
  });

  it("mengenali sapaan dan profil dalam bahasa Inggris dengan intent yang tepat", () => {
    const greet = queryAIEngine("hello, good morning", CTX, "en");
    expect(greet.intent).toBe("greeting");
    expect(greet.text).toMatch(/Greetings|Hello|System online/);

    const who = queryAIEngine("who are you?", CTX, "en");
    expect(who.intent).toBe("profile_bio");
    expect(who.text).toContain("Sigit Adi");
  });

  it("menjawab dalam bahasa Inggris saat input EN meskipun pilihan bahasa UI adalah id", () => {
    const res = queryAIEngine("who is sigit adi?", CTX, "id");
    expect(res.intent).toBe("profile_bio");
    // Karena input EN, teks jawaban harus dalam English meskipun preferredLang = 'id'
    expect(detectLanguage(res.text)).toBe("en");
    expect(res.text).toContain("Sigit Adi");
  });

  it("menjawab dalam bahasa Indonesia saat input ID meskipun pilihan bahasa UI adalah en", () => {
    const res = queryAIEngine("siapa itu sigit adi?", CTX, "en");
    expect(res.intent).toBe("profile_bio");
    // Karena input ID, teks jawaban harus dalam Bahasa Indonesia meskipun preferredLang = 'en'
    expect(detectLanguage(res.text)).toBe("id");
    expect(res.text).toContain("Sigit Adi");
  });
});

