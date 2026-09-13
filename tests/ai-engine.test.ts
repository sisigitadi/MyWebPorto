import { describe, expect, it } from "vitest";
import { detectLanguage, queryAIEngine } from "@/lib/ai-engine";

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
    const res = queryAIEngine("halo, selamat pagi!");
    expect(res.intent).toBe("greeting");
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("mengklasifikasikan pertanyaan profil", () => {
    const res = queryAIEngine("siapa itu sigit adi?");
    expect(res.intent).toBe("profile_bio");
  });

  it("memberi fallback general_synthesis untuk input asing", () => {
    const res = queryAIEngine("asdfghjkl qwerty zzzz");
    expect(res.intent).toBe("general_synthesis");
    expect(res.confidence).toBe(0.5);
  });

  it("menolak input kosong", () => {
    expect(queryAIEngine("   ").intent).toBe("empty");
  });
});
