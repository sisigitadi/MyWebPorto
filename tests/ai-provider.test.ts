import { describe, expect, it, afterEach } from "vitest";
import { buildCloudPrompt, isCloudAIEnabled, type LiveContext } from "@/lib/ai-provider";

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
});
