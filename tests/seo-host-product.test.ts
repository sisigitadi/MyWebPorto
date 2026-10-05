/**
 * Test untuk dua helper SEO baru:
 * 1. `buildProductSchema` — kartu produk structured data (toko/[slug]).
 * 2. `isAliasHostname` / `resolveHostRedirectUrl` — konsolidasi host duplikat.
 *
 * Keduanya murni, jadi diuji tanpa database/network.
 */
import { describe, expect, it } from "vitest";
import { normalizePriceAmount, buildProductSchema } from "@/lib/product-schema";
import { isAliasHostname, resolveHostRedirectUrl } from "@/lib/canonical-host";
import { SITE_BRAND } from "@/lib/seo-config";
import type { ProductData } from "@/lib/dummy-data";

const BASE = "https://sigitadi.id";

/**
 * Akses field hasil schema tanpa melonggarkan tipe ke `any`: schema.org
 * grounded object, jadi setiap properti dibaca lewat helper bertipe unknown.
 */
function field(schema: Record<string, unknown>, key: string): unknown {
  return schema[key];
}

function offer(schema: Record<string, unknown>, key: string): unknown {
  const offers = schema.offers as Record<string, unknown> | undefined;
  return offers?.[key];
}

function makeProduct(overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: "p1",
    slug: "template-portfolio-notion",
    title: "Template Portfolio Notion",
    description: "Template portofolio Notion siap pakai.",
    priceFormatted: "Rp 199.000",
    priceAmount: 199000,
    stock: 5,
    thumbnailUrl: "https://cdn.example.com/thumb.png",
    ctaUrl: "https://sigitadi.id/#kontak",
    published: true,
    ...overrides,
  } as ProductData;
}

describe("normalizePriceAmount", () => {
  it("menerima angka dan string, membulatkan", () => {
    expect(normalizePriceAmount(199000)).toBe(199000);
    expect(normalizePriceAmount("199000")).toBe(199000);
    expect(normalizePriceAmount(199000.4)).toBe(199000);
  });

  it("menolak nilai yang tidak boleh diklaim sebagai harga", () => {
    expect(normalizePriceAmount(null)).toBeNull();
    expect(normalizePriceAmount(0)).toBeNull();
    expect(normalizePriceAmount(-5)).toBeNull();
    expect(normalizePriceAmount("")).toBeNull();
    expect(normalizePriceAmount("hubungi")).toBeNull();
    expect(normalizePriceAmount(Number.NaN)).toBeNull();
  });
});

describe("buildProductSchema — kartu produk", () => {
  it("memancarkan Product + Offer lengkap dengan harga dan stok", () => {
    const schema = buildProductSchema({
      product: makeProduct({ category: "Template" }),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/template-portfolio-notion`,
      brandName: SITE_BRAND,
    });

    expect(field(schema, "@type")).toBe("Product");
    expect(field(schema, "name")).toBe("Template Portfolio Notion");
    expect(field(schema, "url")).toBe(`${BASE}/toko/template-portfolio-notion`);
    expect(field(schema, "sku")).toBe("template-portfolio-notion");
    expect(field(schema, "category")).toBe("Template");
    expect(offer(schema, "@type")).toBe("Offer");
    expect(offer(schema, "price")).toBe("199000");
    expect(offer(schema, "priceCurrency")).toBe("IDR");
    expect(offer(schema, "availability")).toBe("https://schema.org/InStock");
    expect(offer(schema, "seller")).toEqual({ "@type": "Organization", name: SITE_BRAND });
  });

  it("path relatif gambar (upload DB) di-absolut-kan, sama seperti meta tag", () => {
    const schema = buildProductSchema({
      product: makeProduct({
        thumbnailUrl: "/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35",
        gallery: ["/api/media/3f069a13-121d-485a-9daa-7596533d5412"],
      }),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/x`,
      brandName: SITE_BRAND,
    });

    expect(field(schema, "image")).toEqual([
      `${BASE}/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35`,
      `${BASE}/api/media/3f069a13-121d-485a-9daa-7596533d5412`,
    ]);
  });

  it("tidak mengklaim harga bila nominal kosong (produk hubungi-saya)", () => {
    const schema = buildProductSchema({
      product: makeProduct({ priceAmount: null, stock: null }),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/x`,
      brandName: SITE_BRAND,
    });

    expect(schema.offers).toBeUndefined();
    expect(field(schema, "@type")).toBe("Product");
  });

  it("stok habis berarti OutOfStock, bukan InStock", () => {
    const schema = buildProductSchema({
      product: makeProduct({ stock: 0 }),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/x`,
      brandName: SITE_BRAND,
    });

    expect(offer(schema, "availability")).toBe("https://schema.org/OutOfStock");
  });

  it("tidak pernah mengarang rating atau review (produk tidak punya data rating)", () => {
    const schema = buildProductSchema({
      product: makeProduct(),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/x`,
      brandName: SITE_BRAND,
    });

    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
    expect(JSON.stringify(schema)).not.toContain("aggregateRating");
  });

  it("slug kosong jatuh ke id sebagai sku", () => {
    const schema = buildProductSchema({
      product: makeProduct({ slug: null }),
      baseUrl: BASE,
      pageUrl: `${BASE}/toko/x`,
      brandName: SITE_BRAND,
    });

    expect(field(schema, "sku")).toBe("p1");
  });
});

describe("redirect host duplikat ke host kanonik", () => {
  it("menandai subdomain alias (porto./www.) sebagai host yang perlu di-redirect", () => {
    expect(isAliasHostname("porto.sigitadi.id", "sigitadi.id")).toBe(true);
    expect(isAliasHostname("www.sigitadi.id", "sigitadi.id")).toBe(true);
    expect(isAliasHostname("PORTO.Sigitadi.ID", "sigitadi.id")).toBe(true);
    expect(isAliasHostname("porto.sigitadi.id:51371", "sigitadi.id")).toBe(true);
  });

  it("tidak menyentuh host kanonik, localhost, atau preview deployment", () => {
    expect(isAliasHostname("sigitadi.id", "sigitadi.id")).toBe(false);
    expect(isAliasHostname("localhost", "sigitadi.id")).toBe(false);
    expect(isAliasHostname("localhost:51371", "sigitadi.id")).toBe(false);
    expect(isAliasHostname("my-project-abc123.vercel.app", "sigitadi.id")).toBe(false);
    expect(isAliasHostname("", "sigitadi.id")).toBe(false);
    // Tidak fooled: host yang hanya berakhir dengan string apex, bukan subdomain.
    expect(isAliasHostname("notsigitadi.id", "sigitadi.id")).toBe(false);
  });

  it("mempertahankan path dan query saat mengarahkan", () => {
    expect(
      resolveHostRedirectUrl(
        { hostname: "porto.sigitadi.id", pathname: "/proyek/isp", search: "?lang=en" },
        "sigitadi.id"
      )
    ).toBe("https://sigitadi.id/proyek/isp?lang=en");
  });

  it("path root menjadi '/' dan query kosong tidak menambah tanda tanya", () => {
    expect(
      resolveHostRedirectUrl(
        { hostname: "porto.sigitadi.id", pathname: "/", search: "" },
        "sigitadi.id"
      )
    ).toBe("https://sigitadi.id/");
    expect(resolveHostRedirectUrl({ hostname: "porto.sigitadi.id" }, "sigitadi.id")).toBe(
      "https://sigitadi.id/"
    );
  });

  it("host yang benar tidak menghasilkan redirect", () => {
    expect(
      resolveHostRedirectUrl({ hostname: "sigitadi.id", pathname: "/artikel" }, "sigitadi.id")
    ).toBeNull();
  });
});
describe("wiring proxy — alias host benar-benar di-redirect", () => {
  it("308 ke host kanonik, path + query dipertahankan", async () => {
    const { consolidateHostAlias } = await import("@/proxy");
    const { NextRequest } = await import("next/server");
    process.env.NEXT_PUBLIC_APP_URL = "https://sigitadi.id";

    const alias = consolidateHostAlias(
      new NextRequest("https://porto.sigitadi.id/proyek?lang=en")
    );
    expect(alias?.status).toBe(308);
    expect(alias?.headers.get("location")).toBe("https://sigitadi.id/proyek?lang=en");

    // Host kanonik tidak boleh di-redirect (tetap dilayani normal).
    expect(consolidateHostAlias(new NextRequest("https://sigitadi.id/proyek?lang=en"))).toBeNull();
    // Preview Vercel & localhost tidak ikut tersentuh.
    expect(consolidateHostAlias(new NextRequest("http://localhost:51371/proyek"))).toBeNull();
  });
});
