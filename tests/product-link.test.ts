import { describe, expect, it } from "vitest";
import { getProductSlug, normalizePurchaseType, slugifyProduct } from "@/lib/product-link";

describe("slugifyProduct", () => {
  it("menormalisasi judul menjadi slug ramah URL", () => {
    expect(slugifyProduct("Kelas AI Otomasi 2026!")).toBe("kelas-ai-otomasi-2026");
    expect(slugifyProduct("  E-Book   Premium ")).toBe("e-book-premium");
  });

  it("menghapus diakritik dan memangkas strip tepi", () => {
    expect(slugifyProduct("Café & Résumé")).toBe("cafe-resume");
    expect(slugifyProduct("---promo---")).toBe("promo");
  });
});

describe("getProductSlug", () => {
  it("memakai slug produk bila tersedia", () => {
    expect(getProductSlug({ id: "prod-1", title: "Judul", slug: "Slug Custom!" })).toBe("slug-custom");
  });

  it("fallback ke title lalu id", () => {
    expect(getProductSlug({ id: "prod-2", title: "Template Portofolio", slug: "" })).toBe("template-portofolio");
    expect(getProductSlug({ id: "prod-3", title: "!!!", slug: "" })).toBe("prod-3");
  });
});

describe("normalizePurchaseType", () => {
  it("menerima nilai purchase_type yang valid apa adanya", () => {
    expect(normalizePurchaseType("whatsapp")).toBe("whatsapp");
    expect(normalizePurchaseType("external")).toBe("external");
    expect(normalizePurchaseType("referral")).toBe("referral");
    expect(normalizePurchaseType("affiliate")).toBe("affiliate");
  });

  it("meringkas nilai tak dikenal dari database ke whatsapp", () => {
    // Drizzle mengetik kolom text sebagai string; data lama/kotor bisa berisi apa saja.
    expect(normalizePurchaseType("cod" as string)).toBe("whatsapp");
    expect(normalizePurchaseType(null)).toBe("whatsapp");
    expect(normalizePurchaseType(undefined)).toBe("whatsapp");
    expect(normalizePurchaseType("")).toBe("whatsapp");
  });
});
