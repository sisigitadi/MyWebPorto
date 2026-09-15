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
});
