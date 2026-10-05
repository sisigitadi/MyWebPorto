import { describe, expect, it } from "vitest";
import { absoluteImageUrl, buildLlmsTxt } from "@/lib/seo";

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

  it("memasukkan section toko bila ada produk publish", () => {
    const out = buildLlmsTxt({
      baseUrl: "https://sigitadi.id",
      profile: { name: "Sigit Adi", headline: "AI Engineer", bio: "Membangun web.", skills: [] },
      services: [],
      projects: [],
      articles: [],
      products: [{ title: "Jasa Audit Web", slug: "audit-web", summary: "Audit keamanan." }],
    });
    expect(out).toContain("## Toko");
    expect(out).toContain("[Jasa Audit Web](https://sigitadi.id/toko/audit-web)");
  });

  it("tidak menampilkan section toko bila tidak ada produk", () => {
    const out = buildLlmsTxt({
      baseUrl: "https://sigitadi.id",
      profile: { name: "Sigit Adi", headline: "AI Engineer", bio: "Membangun web.", skills: [] },
      services: [],
      projects: [],
      articles: [],
    });
    expect(out).not.toContain("## Toko");
  });
});

describe("absoluteImageUrl (og:image halaman detail)", () => {
  const base = "https://sigitadi.id";

  it("fallback ke kartu /opengraph-image saat cover kosong/null", () => {
    expect(absoluteImageUrl(null, base)).toBe("https://sigitadi.id/opengraph-image");
    expect(absoluteImageUrl(undefined, base)).toBe("https://sigitadi.id/opengraph-image");
    expect(absoluteImageUrl("", base)).toBe("https://sigitadi.id/opengraph-image");
    expect(absoluteImageUrl("   ", base)).toBe("https://sigitadi.id/opengraph-image");
  });

  it("URL absolut CDN diteruskan apa adanya", () => {
    const cdn = "https://images.unsplash.com/photo-1550751827?w=800";
    expect(absoluteImageUrl(cdn, base)).toBe(cdn);
  });

  it("path relatif (upload DB maupun legacy) dipasangkan baseUrl tanpa ganda slash", () => {
    expect(absoluteImageUrl("/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35", base)).toBe(
      "https://sigitadi.id/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35"
    );
    expect(absoluteImageUrl("/uploads/avatar.png", base)).toBe(
      "https://sigitadi.id/uploads/avatar.png"
    );
    // Tanpa leading slash pun tetap valid.
    expect(absoluteImageUrl("uploads/avatar.png", base)).toBe(
      "https://sigitadi.id/uploads/avatar.png"
    );
  });

  it("baseUrl dengan trailing slash tidak menghasilkan // ganda", () => {
    expect(absoluteImageUrl("/uploads/a.png", "https://sigitadi.id/")).toBe(
      "https://sigitadi.id/uploads/a.png"
    );
  });

  it("mengabaikan whitespace di sekeliling referensi", () => {
    expect(absoluteImageUrl("  /uploads/a.png  ", base)).toBe(
      "https://sigitadi.id/uploads/a.png"
    );
  });
});
