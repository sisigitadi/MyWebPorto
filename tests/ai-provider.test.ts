import { describe, expect, it, afterEach } from "vitest";
import {
  buildCloudPrompt,
  buildCloudMessages,
  isCloudAIEnabled,
  type LiveContext,
} from "@/lib/ai-provider";

const OLD_PROVIDER = process.env.AI_PROVIDER;
const OLD_KEY = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (OLD_PROVIDER === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = OLD_PROVIDER;
  if (OLD_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = OLD_KEY;
});

const CTX: LiveContext = {
  ownerName: "Sigit Adi",
  headline: "AI Engineer",
  skills: ["Next.js", "TypeScript"],
  services: ["Web Development"],
  projects: [{ title: "MyWebPorto", slug: "mywebporto" }],
  articles: [{ title: "Intro AI", slug: "intro-ai" }],
};

describe("isCloudAIEnabled", () => {
  it("OFF secara default (privat, tanpa egress)", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    expect(isCloudAIEnabled()).toBe(false);
  });

  it("ON hanya bila provider + key valid", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "xxxx-placeholder";
    expect(isCloudAIEnabled()).toBe(false);
    process.env.GEMINI_API_KEY = "AIzaRealKey123";
    expect(isCloudAIEnabled()).toBe(true);
  });
});

describe("buildCloudPrompt", () => {
  it("memotong query panjang dan memakai katalog publik", () => {
    const prompt = buildCloudPrompt("a".repeat(9000), CTX, "id");
    expect(prompt).toContain("Sigit Adi");
    expect(prompt).toContain("MyWebPorto");
    expect(prompt).toContain("Bahasa Indonesia");
    expect(prompt.length).toBeLessThan(3000);
  });

  it("mendukung mode English", () => {
    expect(buildCloudPrompt("hi", CTX, "en")).toContain("Answer in English");
  });

  it("memasukkan systemPrompt kustom admin bila diberikan", () => {
    const custom = {
      systemPrompt: "Kamu adalah Sigit_Bot, asisten retro. Jawab ramah.",
      answerStyle: "friendly" as const,
    };
    const prompt = buildCloudPrompt("halo", CTX, "id", custom);
    expect(prompt).toContain("Kamu adalah Sigit_Bot, asisten retro. Jawab ramah.");
    // Gaya friendly mengubah instruksi bahasa.
    expect(prompt).toContain("nada hangat dan ramah");
  });

  it("persona default muncul bila systemPrompt kosong", () => {
    const prompt = buildCloudPrompt("halo", CTX, "id", { systemPrompt: "", answerStyle: "concise" });
    expect(prompt).toContain("Persona:");
    expect(prompt).toContain("teknologi umum");
  });

  it("answerStyle detailed memperpanjang instruksi", () => {
    const p = buildCloudPrompt("halo", CTX, "en", { answerStyle: "detailed" });
    expect(p).toContain("structured and informative");
  });
});

describe("buildCloudMessages", () => {
  it("system + user, konsisten dengan buildCloudPrompt", () => {
    const custom = { systemPrompt: "Persona X.", answerStyle: "detailed" as const };
    const msgs = buildCloudMessages("halo", CTX, "id", custom);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toBe("halo");
    expect(msgs[0].content).toContain("Persona X.");
    expect(msgs[0].content).toContain("terstruktur dan informatif");
  });
});
