/**
 * Test analyzer SEO Redaksi (`src/lib/seo-keywords.ts`).
 *
 * Murni semua — tidak ada I/O, network, atau database. Yang diuji adalah
 * keputusan yang akan dilihat admin: kata kunci utama, each finding, ambang
 * panjang, density, dan saran internal link.
 */
import { describe, expect, it } from "vitest";
import {
  analyzeSeo,
  averageSentenceWords,
  countPhrase,
  extractKeywordCandidates,
  pickPrimaryKeyword,
  slugify,
  suggestInternalLinks,
  tokenize,
} from "@/lib/seo-keywords";

const LONG_BODY = [
  "## Mengapa optimasi gambar nextjs penting",
  "Optimasi gambar di Next.js memotong byte yang dikirim ke browser.",
  "Cache immutable membuat gambar hanya diunduh sekali.",
  "Pilih format AVIF supaya ukuran file mengecil.",
  "Lazy loading menunda gambar yang tidak terlihat.",
  "## Cache immutable explained",
  "Header immutable aman karena nama aset berubah saat konten berubah.",
  "## Format modern",
  "AVIF lebih kecil dari WebP dan JPEG untuk foto.",
].join("\n");

const ids = (r: { findings: { id: string }[] }): string[] => r.findings.map((f) => f.id);

describe("tokenize", () => {
  it("membuang markdown, HTML, dan stopword", () => {
    const words = tokenize("## Optimasi **gambar** di Next.js dan WordPress <b>2024</b>");
    expect(words).toContain("optimasi");
    expect(words).toContain("gambar");
    expect(words).toContain("next.js");
    expect(words).toContain("wordpress");
    expect(words).not.toContain("dan");
    expect(words).not.toContain("di");
    // Angka murni bukan keyword.
    expect(words).not.toContain("2024");
  });

  it("tidak melempar untuk input kosong", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(undefined as unknown as string)).toEqual([]);
  });
});

describe("extractKeywordCandidates", () => {
  it("menghasilkan frasa multi kata dan memberi skor lebih tinggi dari satu kata", () => {
    const candidates = extractKeywordCandidates(LONG_BODY);
    const terms = candidates.map((c) => c.term);
    expect(terms).toContain("optimasi gambar");
    const phrase = candidates.find((c) => c.term === "optimasi gambar");
    expect(phrase).toBeDefined();
    expect(phrase!.score).toBeGreaterThanOrEqual(phrase!.count);
  });

  it("membuang frasa yang mengandung stopword", () => {
    const terms = extractKeywordCandidates("kucing dan anjing di rumah").map((c) => c.term);
    expect(terms.some((t) => t.includes(" dan "))).toBe(false);
    expect(terms).toContain("kucing");
  });

  it("konten kosong tidak menghasilkan kandidat apa pun", () => {
    expect(extractKeywordCandidates("")).toEqual([]);
  });
});

describe("pickPrimaryKeyword", () => {
  it("menganut frasa yang sudah ada di judul", () => {
    const candidates = extractKeywordCandidates(LONG_BODY);
    const primary = pickPrimaryKeyword(candidates, "Optimasi Gambar di Next.js: Panduan Praktis");
    expect(primary).toContain("optimasi");
  });

  it("null bila tidak ada kandidat", () => {
    expect(pickPrimaryKeyword([], "Judul")).toBeNull();
  });
});

describe("slugify", () => {
  it("menghasilkan slug huruf kecil dengan tanda hubung", () => {
    expect(slugify("Optimasi Gambar di Next.js 16")).toBe("optimasi-gambar-next.js");
  });

  it("membatasi jumlah kata", () => {
    expect(slugify("kucing anjing bebek burung ikan", 3)).toBe("kucing-anjing-bebek");
  });
});

describe("countPhrase & averageSentenceWords", () => {
  it("menghitung kemunculan frasa utuh", () => {
    expect(countPhrase("cache immutable dan cache immutable lagi", "cache immutable")).toBe(2);
    expect(countPhrase("cache immutable", "")).toBe(0);
  });

  it("menghitung rata-rata kata per kalimat", () => {
    expect(averageSentenceWords("Ini satu dua. Tiga empat lima enam.")).toBe(4);
    expect(averageSentenceWords("")).toBe(0);
  });
});

describe("analyzeSeo — artikel yang baik", () => {
  const good = analyzeSeo({
    title: "Optimasi Gambar di Next.js: Panduan Praktis untuk Developer",
    slug: "optimasi-gambar-nextjs",
    meta:
      "Panduan lengkap optimasi gambar di Next.js: cache immutable, format AVIF, dan lazy loading agar situs lebih cepat dan murah biaya host.",
    content: `${LONG_BODY}\n\n## Praktik lanjutan\n\nHubungkan dengan [artikel retro](/artikel/retro) dan [proyek ISP](/proyek/isp). ${" optimally.".repeat(20)}`,
    related: [{ title: "Arsitektur Retro OS Next.js", href: "/artikel/retro" }],
  });

  it("tidak melaporkan critical untuk konten yang sudah rapi", () => {
    expect(ids(good).filter((id) => good.findings.find((f) => f.id === id)?.severity === "critical")).toEqual([]);
  });

  it("tidak memperingatkan slug/meta/judul yang panjangnya pas", () => {
    expect(ids(good)).not.toContain("title-short");
    expect(ids(good)).not.toContain("title-long");
    expect(ids(good)).not.toContain("meta-short");
    expect(ids(good)).not.toContain("meta-long");
    expect(ids(good)).not.toContain("slug-long");
  });

  it("menghitung metrik yang bisa ditampilkan di UI", () => {
    expect(good.metrics.wordCount).toBeGreaterThan(50);
    expect(good.metrics.h2Count).toBe(4);
    expect(good.metrics.internalLinkCount).toBe(2);
    expect(good.metrics.titleLength).toBeGreaterThan(30);
  });

  it("menawarkan judul alternatif dan slug berbasis kata kunci", () => {
    expect(good.suggestions.titles.length).toBeGreaterThan(0);
    expect(good.suggestions.slug.length).toBeGreaterThan(0);
    expect(good.suggestions.slug).toBe(good.suggestions.slug.toLowerCase());
  });
});

describe("analyzeSeo — mendeteksi masalah", () => {
  const bad = analyzeSeo({
    title: "Judul",
    slug: "Slug Dengan Spasi",
    meta: "Pendek.",
    content: "satu dua tiga. satu dua tiga.",
  });

  it("menandai field kosong sebagai critical", () => {
    expect(ids(bad)).toContain("title-short");
    expect(ids(bad)).toContain("slug-format");
    expect(ids(bad)).toContain("meta-short");
    expect(ids(bad)).toContain("content-thin");
    expect(ids(bad)).toContain("content-no-h2");
    expect(ids(bad)).toContain("content-no-internal-link");
  });

  it("konten kosong menandai content-empty dan tidak melempar", () => {
    const empty = analyzeSeo({});
    expect(ids(empty)).toContain("content-empty");
    expect(empty.primaryKeyword).toBeNull();
    expect(empty.suggestions.titles).toEqual([]);
  });

  it("mendeteksi keyword stuffing lewat density", () => {
    const stuffed = analyzeSeo({
      title: "Tutorial stuffing keyword nextjs",
      slug: "tutorial-stuffing-keyword-nextjs",
      meta:
        "Tutorial lengkap yang membahas tutorial stuffing keyword nextjs secara menyeluruh termasuk contoh praktik dan langkah implementasinya di produksi.",
      content: Array.from({ length: 40 }, () => "keyword nextjs diulang terus-menerus.").join("\n"),
    });
    expect(ids(stuffed)).toContain("content-stuffing");
  });

  it("slug kosong adalah critical, bukan sekadar warning", () => {
    const noSlug = analyzeSeo({ title: "Judul cukup panjang untuk uji ini", slug: "", content: LONG_BODY });
    expect(noSlug.findings.find((f) => f.id === "slug-empty")?.severity).toBe("critical");
  });
});

describe("suggestInternalLinks", () => {
  const related = [
    { title: "Optimasi gambar di Next.js", href: "/artikel/gambar" },
    { title: "Katalog produk digital", href: "/toko" },
  ];

  it("memilih halaman yang paling berbagi frasa", () => {
    const suggestions = suggestInternalLinks(related, LONG_BODY, "Optimasi Gambar");
    expect(suggestions[0].href).toBe("/artikel/gambar");
    expect(suggestions[0].sharedTerms.length).toBeGreaterThan(0);
  });

  it("tidak menyuggest apa pun bila tidak ada frasa yang sama", () => {
    expect(suggestInternalLinks([{ title: "Topi Kucing", href: "/a" }], LONG_BODY, "")).toEqual([]);
  });

  it("tidak melempar dengan daftar kosong", () => {
    expect(suggestInternalLinks([], "isi", "judul")).toEqual([]);
  });
});