import { describe, expect, it } from "vitest";
import { getProductSlug, slugifyProduct } from "@/lib/product-link";

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
