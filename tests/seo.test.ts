import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "@/lib/seo";

describe("buildLlmsTxt", () => {
  it("menyusun markdown profil + katalog dengan link kanonis", () => {
    const out = buildLlmsTxt({
      baseUrl: "https://sigitadi.id",
      profile: { name: "Sigit Adi", headline: "AI Engineer", bio: "Membangun web.", skills: ["Next.js"] },
      services: ["Web Development"],
      projects: [{ title: "MyWebPorto", slug: "mywebporto", summary: "OS retro" }],
      articles: [{ title: "Intro AI", slug: "intro-ai", summary: null }],
    });
    expect(out).toContain("# Sigit Adi");
    expect(out).toContain("## Layanan");
    expect(out).toContain("[MyWebPorto](https://sigitadi.id/proyek/mywebporto)");
    expect(out).toContain("[Intro AI](https://sigitadi.id/artikel/intro-ai)");
    expect(out).toContain("https://sigitadi.id/#kontak");
  });

  it("membatasi jumlah entri agar tetap ringan", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ title: `P${i}`, slug: `p${i}` }));
    const out = buildLlmsTxt({
      baseUrl: "https://sigitadi.id",
      profile: { name: "X", headline: "Y", bio: "Z", skills: [] },
      services: [],
      projects: many,
      articles: many,
    });
    expect(out.match(/\/proyek\/p\d+/g)?.length).toBeLessThanOrEqual(20);
  });
});
