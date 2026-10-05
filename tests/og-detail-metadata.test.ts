import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Integrasi test generateMetadata halaman detail artikel & proyek.
 *
 * Bug yang dicegah: kedua halaman mengembalikan objek openGraph sendiri, dan
 * Next.js MENG-*REPLACE* seluruh openGraph layout (bukan merge per-field).
 * Tanpa `images`, og:image + twitter:image hilang total sehingga share ke
 * WhatsApp/Telegram/X tidak menampilkan gambar — padahal twitter:card tetap
 * `summary_large_image` (kartu kosong).
 *
 * Komponen UI client di-mock agar gsap/lucide tidak ikut dimuat; data article
 * / project di-mock juga supaya test tidak membaca database.
 */

vi.mock("@/components/public/article-detail-content", () => ({
  ArticleDetailContent: () => null,
}));
vi.mock("@/components/public/project-detail-content", () => ({
  ProjectDetailContent: () => null,
}));
vi.mock("@/components/public/product-detail-content", () => ({
  ProductDetailContent: () => null,
}));
vi.mock("@/lib/features-config", () => ({
  resolveFeatures: vi.fn(async () => ({
    enable_articles: true,
    enable_terminal: true,
    enable_store_cart: true,
    maintenance_mode: false,
  })),
}));

const getArticlesMock = vi.fn();
const getProjectsMock = vi.fn();
const getProductsMock = vi.fn();
const getProfileMock = vi.fn();

vi.mock("@/lib/actions", () => ({
  getArticles: (...args: unknown[]) => getArticlesMock(...args),
  getProjects: (...args: unknown[]) => getProjectsMock(...args),
  getProducts: (...args: unknown[]) => getProductsMock(...args),
  getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

const BASE = "https://sigitadi.id";

function articleFixture(imageUrl: string | null) {
  return {
    id: "art-1",
    slug: "judul-artikel",
    title: "Judul Artikel",
    summary: "Ringkasan artikel.",
    content: "Isi artikel yang cukup panjang.",
    imageUrl,
    tags: ["Next.js"],
    featured: false,
    published: true,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function projectFixture(thumbnailUrl: string) {
  return {
    id: "prj-1",
    slug: "proyek-keren",
    title: "Proyek Keren",
    summary: "Ringkasan proyek.",
    description: "Deskripsi proyek.",
    thumbnailUrl,
    techStack: ["Next.js"],
    featured: false,
    published: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const params = (slug: string) => Promise.resolve({ slug });

/**
 * Tipe `openGraph.images` adalah `OGImage | Array<OGImage>` dan `twitter.images`
 * `TwitterImage | Array<TwitterImage>`, di mana satu item bisa string, URL, atau
 * deskriptor { url, alt, ... }. Karena itu nilai dinormalisasi dulu di sini —
 * meng-index union langsung tidak lolos tsc.
 */
function firstImageUrl(images: unknown): string | undefined {
  const item = Array.isArray(images) ? images[0] : images;
  if (item == null) return undefined;
  if (typeof item === "string") return item;
  if (item instanceof URL) return item.href;
  if (typeof item === "object" && "url" in item) {
    const url = (item as { url: unknown }).url;
    if (url instanceof URL) return url.href;
    if (typeof url === "string") return url;
  }
  return undefined;
}

/**
 * `Twitter` di Next adalah union yang termasuk `TwitterMetadata` (tanpa `card`),
 * jadi akses `md.twitter.card` ditolak tsc. Narrowing dengan `in` adalah cara
 * sah untuk mengambilnya tanpa `any`/suppress.
 */
function twitterCard(md: { twitter?: unknown }): unknown {
  const tw = md.twitter;
  return tw && typeof tw === "object" && "card" in tw ? (tw as { card: unknown }).card : undefined;
}

beforeEach(() => {
  getArticlesMock.mockReset();
  getProjectsMock.mockReset();
  getProfileMock.mockReset();
  process.env.NEXT_PUBLIC_APP_URL = BASE;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("generateMetadata — halaman detail artikel", () => {
  it("cover tersedia → og:image & twitter:image memakai cover itu", async () => {
    const cover = "https://images.unsplash.com/photo-1550751827?w=800";
    getArticlesMock.mockResolvedValue([articleFixture(cover)]);

    const { generateMetadata } = await import("@/app/(public)/artikel/[slug]/page");
    const md = await generateMetadata({ params: params("judul-artikel") });

    // Cover konten tidak diberi dimensi karangan — lihat shareImage di lib/seo.
    expect(md.openGraph?.images).toEqual([{ url: cover, alt: "Judul Artikel" }]);
    expect(md.twitter?.images).toEqual([cover]);
    expect(md.twitter?.card).toBe("summary_large_image");
    // Field lain tetap utuh (openGraph article khas).
    expect(md.openGraph?.type).toBe("article");
    expect(md.openGraph?.publishedTime).toBe("2026-01-01T00:00:00.000Z");
  });

  it("cover kosong → fallback ke kartu /opengraph-image (berisi avatar)", async () => {
    getArticlesMock.mockResolvedValue([articleFixture(null)]);

    const { generateMetadata } = await import("@/app/(public)/artikel/[slug]/page");
    const md = await generateMetadata({ params: params("judul-artikel") });

    // Kartu OG hasil generate sendiri: dimensi dan MIME diketahui pasti, dan
    // WhatsApp/Facebook butuh og:image:width/height/type untuk merender.
    expect(md.openGraph?.images).toEqual([
      {
        url: `${BASE}/opengraph-image`,
        alt: "Judul Artikel",
        width: 1200,
        height: 630,
        type: "image/png",
      },
    ]);
    expect(md.twitter?.images).toEqual([`${BASE}/opengraph-image`]);
  });

  it("cover path relatif upload → dijadikan URL absolut", async () => {
    getArticlesMock.mockResolvedValue([articleFixture("/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35")]);

    const { generateMetadata } = await import("@/app/(public)/artikel/[slug]/page");
    const md = await generateMetadata({ params: params("judul-artikel") });

    expect(md.openGraph?.images?.[0]).toEqual({
      url: `${BASE}/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35`,
      alt: "Judul Artikel",
    });
  });

  it("artikel tidak ada → hanya judul, tanpa og:image palsu", async () => {
    getArticlesMock.mockResolvedValue([]);

    const { generateMetadata } = await import("@/app/(public)/artikel/[slug]/page");
    const md = await generateMetadata({ params: params("tidak-ada") });

    expect(md.title).toBe("Artikel Tidak Ditemukan");
    expect(md.openGraph).toBeUndefined();
  });
});

describe("generateMetadata — halaman detail proyek", () => {
  it("thumbnail tersedia → og:image & twitter:image memakai thumbnail itu", async () => {
    const thumb = "https://6aa37cdc9422e77b387b9b2e.imgix.net/thumb.png";
    getProjectsMock.mockResolvedValue([projectFixture(thumb)]);

    const { generateMetadata } = await import("@/app/(public)/proyek/[slug]/page");
    const md = await generateMetadata({ params: params("proyek-keren") });

    expect(md.openGraph?.images).toEqual([{ url: thumb, alt: "Proyek Keren" }]);
    expect(md.twitter?.images).toEqual([thumb]);
    expect(md.twitter?.card).toBe("summary_large_image");
  });

  it("thumbnail kosong → fallback ke kartu /opengraph-image (berisi avatar)", async () => {
    getProjectsMock.mockResolvedValue([projectFixture("")]);

    const { generateMetadata } = await import("@/app/(public)/proyek/[slug]/page");
    const md = await generateMetadata({ params: params("proyek-keren") });

    expect(md.openGraph?.images).toEqual([
      {
        url: `${BASE}/opengraph-image`,
        alt: "Proyek Keren",
        width: 1200,
        height: 630,
        type: "image/png",
      },
    ]);
    expect(md.twitter?.images).toEqual([`${BASE}/opengraph-image`]);
  });

  it("proyek tidak ada → hanya judul, tanpa og:image palsu", async () => {
    getProjectsMock.mockResolvedValue([]);

    const { generateMetadata } = await import("@/app/(public)/proyek/[slug]/page");
    const md = await generateMetadata({ params: params("tidak-ada") });

    expect(md.title).toBe("Proyek Tidak Ditemukan");
    expect(md.openGraph).toBeUndefined();
  });
});

describe("generateMetadata — halaman detail produk", () => {
  function productFixture(thumbnailUrl: string) {
    return {
      id: "prd-1",
      slug: "produk-keren",
      title: "Produk Keren",
      description: "Deskripsi produk yang cukup panjang untuk dipotong.",
      thumbnailUrl,
      price: 100000,
      published: true,
    };
  }

  beforeEach(() => {
    getProductsMock.mockReset();
  });

  it("og:image dan twitter:image MENUNJUK GAMBAR YANG SAMA", async () => {
    const thumb = "https://images.unsplash.com/photo-1517842645767?w=600";
    getProductsMock.mockResolvedValue([productFixture(thumb)]);

    const { generateMetadata } = await import("@/app/(public)/toko/[slug]/page");
    const md = await generateMetadata({ params: params("produk-keren") });

    const ogImageUrl = firstImageUrl(md.openGraph?.images);
    const twImageUrl = firstImageUrl(md.twitter?.images);

    expect(ogImageUrl).toBeDefined();
    expect(twImageUrl).toBe(ogImageUrl);
    expect(ogImageUrl).toBe(thumb);
  });

  it("twitter:title juga judul produk, bukan warisan judul profil layout", async () => {
    getProductsMock.mockResolvedValue([productFixture("https://cdn/x.png")]);

    const { generateMetadata } = await import("@/app/(public)/toko/[slug]/page");
    const md = await generateMetadata({ params: params("produk-keren") });

    expect(twitterCard(md)).toBe("summary_large_image");
    expect(md.twitter?.title).toBe(md.openGraph?.title);
    expect(md.twitter?.title).toBe("Produk Keren");
    expect(md.twitter?.description).toBe(md.openGraph?.description);
  });

  it("thumbnail path relatif → keduanya jadi URL absolut yang identik", async () => {
    getProductsMock.mockResolvedValue([productFixture("/api/media/abc-123")]);

    const { generateMetadata } = await import("@/app/(public)/toko/[slug]/page");
    const md = await generateMetadata({ params: params("produk-keren") });

    const ogUrl = firstImageUrl(md.openGraph?.images);
    const twUrl = firstImageUrl(md.twitter?.images);

    expect(ogUrl).toBe(`${BASE}/api/media/abc-123`);
    expect(twUrl).toBe(ogUrl);
    expect(ogUrl).not.toContain("//api");
  });

  it("thumbnail kosong → keduanya fallback ke kartu /opengraph-image", async () => {
    getProductsMock.mockResolvedValue([productFixture("")]);

    const { generateMetadata } = await import("@/app/(public)/toko/[slug]/page");
    const md = await generateMetadata({ params: params("produk-keren") });

    const ogUrl = firstImageUrl(md.openGraph?.images);
    const twUrl = firstImageUrl(md.twitter?.images);

    expect(ogUrl).toBe(`${BASE}/opengraph-image`);
    expect(twUrl).toBe(ogUrl);
  });
});
