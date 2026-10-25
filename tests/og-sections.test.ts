import { describe, expect, it, vi } from "vitest";
import { APP_IDS, getAppShareMeta } from "@/lib/os-apps-meta";
import { renderSectionOgElement } from "@/lib/og-section-renderer";

vi.mock("@/lib/actions", () => ({
  getProfile: vi.fn(async () => ({
    name: "Sigit Adi Irianto",
    headline: "Artificial Intelligence | Cybersecurity // Engineer",
    bio: "Saya membantu personal, UMKM dan institusi membangun kebutuhan digitalisasi yang aman, reliable dan mudah digunakan.",
    avatarUrl: "/uploads/profile-avatar.jpg",
  })),
  getTestimonials: vi.fn(async () => [
    {
      id: "test-1",
      clientName: "Hendra Pratama",
      clientRole: "CEO // Tech Enterprise",
      avatarUrl: "https://example.com/client.jpg",
      content: "Kualitas pengerjaan luar biasa rapi dan solutif.",
      rating: 5,
      published: true,
      order: 1,
    },
  ]),
}));

vi.mock("@/lib/seo-config", () => ({
  resolveOgMeta: vi.fn(async (params) => ({
    title: params.name || "Sigit Adi Irianto",
    description: params.headline || "Artificial Intelligence | Cybersecurity // Engineer",
    imageUrl: "/opengraph-image",
    imageAlt: "Sigit Adi Irianto",
  })),
}));

vi.mock("@/lib/og-image", () => ({
  resolveOgImageSrc: vi.fn(async (_src) => ({
    src: "data:image/jpeg;base64,mocked",
    mime: "image/jpeg",
  })),
}));

describe("getAppShareMeta: kelengkapan ogImageUrl untuk tiap bagian", () => {
  it("semua APP_IDS memiliki ogImageUrl yang terdefinisi dan valid", () => {
    for (const appId of APP_IDS) {
      const idMeta = getAppShareMeta(appId, "id", "Sigit Adi Irianto");
      expect(idMeta.ogImageUrl).toBeDefined();
      expect(idMeta.ogImageUrl.length).toBeGreaterThan(0);
      expect(idMeta.ogImageUrl.startsWith("/") || idMeta.ogImageUrl.startsWith("http")).toBe(true);

      const enMeta = getAppShareMeta(appId, "en", "Sigit Adi Irianto");
      expect(enMeta.ogImageUrl).toBeDefined();
      expect(enMeta.ogImageUrl.length).toBeGreaterThan(0);
    }
  });

  it("bagian proyek, artikel, toko mengarah ke route opengraph-image bawaan Next.js", () => {
    expect(getAppShareMeta("proyek", "id").ogImageUrl).toBe("/proyek/opengraph-image");
    expect(getAppShareMeta("artikel", "id").ogImageUrl).toBe("/artikel/opengraph-image");
    expect(getAppShareMeta("toko", "id").ogImageUrl).toBe("/toko/opengraph-image");
  });

  it("bagian layanan, terminal, testimoni, kontak mengarah ke /api/og?section=...", () => {
    expect(getAppShareMeta("layanan", "id").ogImageUrl).toContain("/api/og?section=layanan");
    expect(getAppShareMeta("terminal", "id").ogImageUrl).toContain("/api/og?section=terminal");
    expect(getAppShareMeta("testimoni", "id").ogImageUrl).toContain("/api/og?section=testimoni");
    expect(getAppShareMeta("kontak", "id").ogImageUrl).toContain("/api/og?section=kontak");
  });
});

describe("renderSectionOgElement: visual unik dan avatar terpadu untuk setiap section", () => {
  it("merender elemen JSX valid untuk profil", async () => {
    const el = await renderSectionOgElement({ section: "profil" });
    expect(el).toBeDefined();
    expect(el.type).toBe("div");
  });

  it("merender elemen JSX valid untuk seluruh 8 section", async () => {
    for (const section of APP_IDS) {
      const el = await renderSectionOgElement({ section, lang: "id" });
      expect(el).toBeDefined();
      expect(el.type).toBe("div");
    }
  });

  it("menyertakan avatar di header author chip pada seluruh bagian", async () => {
    for (const section of APP_IDS) {
      const el = await renderSectionOgElement({ section, lang: "id" });
      const serialized = JSON.stringify(el);
      // Top bar author chip menyertakan avatarSrc yang di-resolve
      expect(serialized).toContain("data:image/jpeg;base64,mocked");
      expect(serialized).toContain("sigitadi.id");
    }
  });

  it("menyertakan avatar kontekstual pada kontak, artikel, dan testimoni", async () => {
    const kontakEl = await renderSectionOgElement({ section: "kontak" });
    const kontakJson = JSON.stringify(kontakEl);
    expect(kontakJson).toContain("CONNECT // DIRECT");
    expect(kontakJson).toContain("Available for Hire");

    const artikelEl = await renderSectionOgElement({ section: "artikel" });
    const artikelJson = JSON.stringify(artikelEl);
    expect(artikelJson).toContain("DOC // INSIGHTS");
    expect(artikelJson).toContain("Author // Software Architect");

    const testimoniEl = await renderSectionOgElement({ section: "testimoni" });
    const testimoniJson = JSON.stringify(testimoniEl);
    expect(testimoniJson).toContain("Hendra Pratama");
    expect(testimoniJson).toContain("VERIFIED");
  });

  it("menerima override custom title dan subtitle tanpa error", async () => {
    const el = await renderSectionOgElement({
      section: "layanan",
      title: "Custom Service Title",
      subtitle: "Custom Service Subtitle Description",
      badge: "SIGITOS // CUSTOM",
    });
    expect(el).toBeDefined();
  });
});
