/**
 * Test sinkronisasi bantuan AI <-> analyzer SEO/GEO.
 *
 * Semua modul di sini MURNI (tanpa I/O, network, atau database):
 *  - seo-rules.ts   : ambang tunggal + detektor GEO + blok prompt
 *  - seo-keywords.ts: analyzer yang memakai ambang itu
 *  - seo-remediate.ts: perbaikan deterministik atas draf AI
 *
 * Yang diuji adalah kontrak yang membuat keduanya tidak bisa berbeda lagi:
 * angka di prompt HARUS sama dengan angka yang dipakai analyzer.
 */
import { describe, expect, it } from "vitest";
import {
  GEO_RULES,
  SEO_RULES,
  answerFirstWords,
  countListItems,
  countQuotableFacts,
  countQuestionHeadings,
  internalLinksPromptBlock,
  longestParagraphWords,
  scoreFromFindings,
  seoGeoPromptBlock,
} from "@/lib/seo-rules";
import { analyzeSeo } from "@/lib/seo-keywords";
import { remediateDraft } from "@/lib/seo-remediate";

describe("kontrak ambang tunggal", () => {
  it("blok prompt memuat angka yang PERSIS sama dengan analyzer", () => {
    const block = seoGeoPromptBlock("id");
    expect(block).toContain(`${SEO_RULES.title.min}-${SEO_RULES.title.max} karakter`);
    expect(block).toContain(`${SEO_RULES.meta.min}-${SEO_RULES.meta.max} karakter`);
    expect(block).toContain(`${SEO_RULES.slug.maxWords} kata`);
    expect(block).toContain(`${SEO_RULES.content.minWords} kata`);
    expect(block).toContain(`${GEO_RULES.answerFirstMinWords} kata`);
    expect(block).toContain(`${GEO_RULES.questionHeadingsMin} sub-judul`);
    expect(block).toContain(`${SEO_RULES.sentence.maxWords} kata`);
  });

  it("versi Inggris memuat angka yang sama", () => {
    const block = seoGeoPromptBlock("en");
    expect(block).toContain(`${SEO_RULES.title.min}-${SEO_RULES.title.max} characters`);
    expect(block).toContain(`${SEO_RULES.content.minWords} words`);
  });

  it("prompt meminta internal link (dulu dilarang — kontradiksi dengan analyzer)", () => {
    const block = seoGeoPromptBlock("id");
    expect(block).toContain("Internal link");
    expect(block).toContain("](/path)");
    expect(block).not.toMatch(/DILARANG menulis tag HTML, link markdown/);
  });

  it("daftar tautan internal hanya memakai path internal yang diberikan", () => {
    const block = internalLinksPromptBlock([
      { title: "Artikel Satu", href: "/artikel/satu" },
      { title: "Eksternal", href: "https://evil.example.com/x" },
      { title: "Protocol-relative", href: "//evil.example.com" },
    ]);
    expect(block).toContain("/artikel/satu");
    expect(block).not.toContain("evil.example.com");
  });

  it("tanpa halaman terbit, prompt melarang mengarang tautan", () => {
    const block = internalLinksPromptBlock([]);
    expect(block).toMatch(/JANGAN mengarang/);
  });
});

describe("detektor GEO", () => {
  it("countQuotableFacts menghitung nilai unik berangka + satuan", () => {
    const text = "Cache immutable menghemat 40% bandwidth dan 250 ms waktu muat. Ulangi: 40% bandwidth.";
    expect(countQuotableFacts(text)).toBe(2);
  });

  it("countQuotableFacts mengabaikan angka tanpa satuan", () => {
    expect(countQuotableFacts("Ada 3 alasan dan 5 langkah tanpa satuan.")).toBe(0);
  });

  it("countQuestionHeadings mengenali tanda tanya dan kata tanya", () => {
    const text = [
      "## Apa itu optimasi gambar?",
      "## Mengapa Next.js cepat",
      "## Cara mengubah gambar",
      "### Apakah perlu AVIF?",
    ].join("\n");
    expect(countQuestionHeadings(text)).toBe(3);
  });

  it("countListItems menghitung bullet dan bernomor", () => {
    expect(countListItems("- satu\n* dua\n1. tiga\n2. empat\nTeks biasa")).toBe(4);
  });

  it("answerFirstWords hanya menghitung blok sebelum sub-judul pertama", () => {
    const text = ["Ringkasan pembuka yang cukup panjang untuk dihitung.", "## Bagian", "Isi lain."].join(
      "\n\n"
    );
    expect(answerFirstWords(text)).toBe(7);
    expect(answerFirstWords("## Langsung mulai dengan sub-judul\n\nIsi.")).toBe(0);
  });

  it("longestParagraphWords mengabaikan heading, kode, dan daftar", () => {
    const text = ["## Judul panjang sekali tapi bukan paragraf", "satu dua tiga", "- a\n- b"].join(
      "\n\n"
    );
    expect(longestParagraphWords(text)).toBe(3);
  });

  it("scoreFromFindings memotong sesuai severity dan tidak pernah negatif", () => {
    expect(scoreFromFindings([])).toBe(100);
    expect(scoreFromFindings([{ severity: "critical" }])).toBe(75);
    expect(scoreFromFindings([{ severity: "warning" }])).toBe(88);
    expect(scoreFromFindings([{ severity: "opportunity" }])).toBe(95);
    expect(scoreFromFindings(new Array(10).fill({ severity: "critical" }))).toBe(0);
  });
});

describe("analyzeSeo — temuan GEO", () => {
  const thin = analyzeSeo({
    title: "Optimasi Gambar Next.js untuk Developer Pemula",
    slug: "optimasi-gambar-nextjs",
    meta:
      "Panduan lengkap optimasi gambar di Next.js: cache immutable, format AVIF, dan lazy loading agar situs lebih cepat dan murah biaya host.",
    content: "satu dua tiga. satu dua tiga.",
  });

  it("konten tanpa elemen GEO menghasilkan temuan geo-*", () => {
    const ids = thin.findings.map((f) => f.id);
    expect(ids).toContain("geo-no-answer-first");
    expect(ids).toContain("geo-no-question-heading");
    expect(ids).toContain("geo-no-fact");
    expect(ids).toContain("geo-no-list");
  });

  it("metrik GEO terisi di hasil analisis", () => {
    expect(thin.metrics.answerFirstWords).toBe(6);
    expect(thin.metrics.questionHeadings).toBe(0);
    expect(thin.metrics.quotableFacts).toBe(0);
    expect(thin.metrics.listItems).toBe(0);
  });

  it("geoScore hanya memotong temuan GEO, score memotong semua", () => {
    const geoOnly = thin.findings.filter((f) => f.id.startsWith("geo-"));
    expect(thin.geoScore).toBe(scoreFromFindings(geoOnly));
    expect(thin.score).toBe(scoreFromFindings(thin.findings));
    expect(thin.score).toBeLessThan(thin.geoScore);
  });

  it("konten yang sudah GEO-friendly tidak memicu temuan geo-*", () => {
    const summary =
      "Optimasi gambar di Next.js memangkas byte yang dikirim ke browser sampai 40 persen dan memangkas waktu muat sekitar 250 ms pada halaman galeri foto yang berat. Strategi ini menggabungkan format AVIF, header cache immutable, dan lazy loading agar halaman tetap cepat meskipun sudah memuat ratusan gambar.";
    const geo = analyzeSeo({
      title: "Optimasi Gambar di Next.js untuk Developer Pemula",
      slug: "optimasi-gambar-nextjs",
      meta:
        "Panduan lengkap optimasi gambar di Next.js: cache immutable, format AVIF, dan lazy loading agar situs lebih cepat dan murah biaya host.",
      content: [
        summary,
        "## Apa itu optimasi gambar?",
        "Optimasi gambar adalah proses shrunk file tanpa kehilangan kualitas visual yang berarti bagi pengguna.",
        "## Mengapa format AVIF penting?",
        "Format AVIF menghasilkan file 40 persen lebih kecil daripada JPEG untuk foto pada kondisi yang sama.",
        "1. Ubah ke AVIF",
        "2. Aktifkan cache immutable",
        "3. Lazy load gambar di luar viewport",
        "Baca juga [artikel retro](/artikel/retro).",
      ].join("\n\n"),
    });
    expect(geo.findings.map((f) => f.id)).not.toContain("geo-no-answer-first");
    expect(geo.findings.map((f) => f.id)).not.toContain("geo-no-fact");
    expect(geo.findings.map((f) => f.id)).not.toContain("geo-no-list");
  });
});

describe("remediateDraft — perbaikan deterministik", () => {
  const related = [{ title: "Optimasi Gambar di Next.js", href: "/artikel/optimasi-gambar" }];

  it("memotong judul kepanjangan ke batas maksimum tanpa memotong kata", () => {
    const long = "Panduan lengkap optimasi gambar di Next.js dengan Avif Webp Cache Immutable Untuk Pemula";
    const result = remediateDraft({
      title: long,
      slug: "panduan",
      meta: "Deskripsi.",
      body: "Isi artikel.",
      bodyField: "content",
    });
    expect(result.title.length).toBeLessThanOrEqual(SEO_RULES.title.max);
    expect(result.title.endsWith(" ")).toBe(false);
    expect(result.applied.some((a) => a.includes("Judul"))).toBe(true);
  });

  it("membuang kalimat penutup model dari judul", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js\n\nBerikut draf artikelnya:",
      slug: "optimasi-gambar-nextjs",
      meta: "Deskripsi.",
      body: "Isi artikel.",
      bodyField: "content",
    });
    expect(result.title).toBe("Optimasi Gambar Next.js");
  });

  it("menormalkan slug ke kebab-case dan membatasi jumlah kata", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "Optimasi Gambar Next.js 16 dengan Cache Immutable",
      meta: "Deskripsi.",
      body: "Isi artikel.",
      bodyField: "content",
    });
    expect(result.slug).toMatch(/^[a-z0-9.-]+$/);
    expect(result.slug.split("-").length).toBeLessThanOrEqual(SEO_RULES.slug.maxWords);
  });

  it("menyesuaikan deskripsi ke rentang ideal SERP tanpa mengulang frasa", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta: "Pendek.",
      body: "Isi artikel.",
      bodyField: "content",
    });
    // Panjang harus masuk rentang SERP…
    expect(result.meta.length).toBeGreaterThanOrEqual(SEO_RULES.meta.min);
    expect(result.meta.length).toBeLessThanOrEqual(SEO_RULES.meta.max);
    // …dan tidak boleh menempelkan kalimat yang isinya sudah ada.
    const lowered = result.meta.toLowerCase();
    expect((lowered.match(/ulasan/g) || []).length).toBeLessThanOrEqual(1);
  });

  it("menyuntikkan kata kunci yang PERSIS sama dengan yang dihitung analyzer", () => {
    const longBody = `${"Kalimat pendukung yang menjelaskan topik secara wajar. ".repeat(40)}\n\n## Bagian\n\nIsi.`;
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta: "Pendek.",
      body: longBody,
      bodyField: "content",
    });
    // Kontrak yang diuji: remediator dan analyzer menebak kata kunci dengan
    // algoritma yang sama. Dulu remediator menebaknya dari judul (frasa
    // berbeda), sehingga deskripsi bisa sudah "diberi kata kunci" dan tetap
    // ditolak temuan `meta-keyword`.
    const keyword = analyzeSeo({
      title: result.title,
      slug: result.slug,
      meta: result.meta,
      content: result.body,
    }).primaryKeyword;
    expect(keyword).toBeTruthy();
    expect(result.meta.toLowerCase()).toContain(String(keyword).toLowerCase());
    expect(result.meta.length).toBeLessThanOrEqual(SEO_RULES.meta.max);
    expect(result.meta.length).toBeGreaterThanOrEqual(SEO_RULES.meta.min);
  });

  it("suntikan kata kunci tidak menaikkan density isi (tidak memicu stuffing baru)", () => {
    const body = "Optimasi gambar penting. Format AVIF membantu.";
    const result = remediateDraft({
      title: "Panduan Optimasi Gambar Next.js",
      slug: "panduan-optimasi-gambar-nextjs",
      meta: "Ulasan singkat.",
      body,
      bodyField: "content",
    });
    // Density hanya dihitung dari isi. Menyuntik frasa kunci ke deskripsi
    // tidak boleh menarik frasa itu ke dalam isi draf pendek; itu yang dulu
    // membuat satu suntikan memunculkan temuan `content-stuffing`.
    const before = analyzeSeo({
      title: "Panduan Optimasi Gambar Next.js",
      slug: "panduan-optimasi-gambar-nextjs",
      meta: "Ulasan singkat.",
      content: body,
    });
    const after = analyzeSeo({
      title: result.title,
      slug: result.slug,
      meta: result.meta,
      content: result.body,
    });
    expect(after.primaryKeyword).toBe(before.primaryKeyword);
    expect(after.metrics.keywordDensity).toBe(before.metrics.keywordDensity);
    // Density tinggi dari draf asal tetap dilaporkan, bukan disembunyikan.
    if (after.metrics.keywordDensity > SEO_RULES.density.max) {
      expect(result.remaining.some((r) => r.includes("Density"))).toBe(true);
    }
  });

  it("menyisipkan ringkasan pembuka GEO sebelum sub-judul pertama", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta:
        "Panduan lengkap optimasi gambar di Next.js: cache immutable, format AVIF, dan lazy loading agar situs lebih cepat dan murah biaya host.",
      body: "## Apa itu optimasi gambar?\n\nIsi bagian pertama.",
      bodyField: "content",
    });
    expect(result.body.indexOf("## ")).toBeGreaterThan(0);
    expect(answerFirstWords(result.body)).toBeGreaterThanOrEqual(GEO_RULES.answerFirstMinWords);
  });

  it("menambahkan internal link dari daftar related, tidak mengarang path", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta: "Deskripsi yang cukup panjang untuk diuji dengan benar.",
      body: "Paragraf pembuka yang cukup panjang untuk menjadi target sisipan tautan internal.",
      bodyField: "content",
      related,
    });
    expect(result.body).toContain("](/artikel/optimasi-gambar)");
    expect(result.applied.some((a) => a.includes("Internal link"))).toBe(true);
  });

  it("tidak menambahkan tautan bila tidak ada halaman terkait — tidak mengarang URL", () => {
    const result = remediateDraft({
      title: "Topi Kucing Buatan Tangan",
      slug: "topi-kucing",
      meta: "Deskripsi yang cukup panjang untuk diuji dengan benar.",
      body: "Paragraf pembuka yang cukup panjang untuk menjadi target sisipan tautan internal.",
      bodyField: "content",
      related: [],
    });
    expect(result.body).not.toContain("](");
    expect(result.remaining.some((r) => /internal link/i.test(r))).toBe(true);
  });

  it("menyisipkan tautan tanpa merusak blok kode", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta: "Deskripsi yang cukup panjang untuk diuji dengan benar.",
      body: ["```js", "const a = 1;", "```", "", "Paragraf prosa yang panjang sekali untuk diuji."].join(
        "\n"
      ),
      bodyField: "content",
      related,
    });
    expect(result.body).toContain("```js\nconst a = 1;\n```");
  });

  it("melaporkan sisa masalah yang butuh tulisan manusia, bukan mengarang konten", () => {
    const result = remediateDraft({
      title: "Optimasi Gambar Next.js",
      slug: "optimasi-gambar-nextjs",
      meta: "Pendek.",
      body: "satu dua tiga.",
      bodyField: "content",
    });
    // Sisa masalah adalah temuan analyzer apa adanya, jadi ambangnya ikut
    // diturunkan dari SEO_RULES dan tidak bisa drift.
    expect(result.remaining.some((r) => r.includes(`${SEO_RULES.content.minWords} kata`))).toBe(true);
    expect(result.remaining.some((r) => r.includes("H2"))).toBe(true);
  });
});

describe("draf hasil remisi benar-benar lebih bersih", () => {
  it("menurunkan jumlah temuan kritis/warning pada draf asal", () => {
    const draftTitle =
      "Draft Artikel Optimasi Gambar Next.js Dengan Cache Immutable dan Lazy Loading Untuk Semua Pemula";
    const draftBody = "## Bagian satu\n\nParagraf pendek.\n\n## Bagian dua\n\nParagraf lain.";

    const before = analyzeSeo({
      title: draftTitle,
      slug: "Draft Artikel Optimasi Gambar Next.js",
      meta: "Pendek.",
      content: draftBody,
    });

    const fixed = remediateDraft({
      title: draftTitle,
      slug: "Draft Artikel Optimasi Gambar Next.js",
      meta: "Pendek.",
      body: draftBody,
      bodyField: "content",
      related: [{ title: "Artikel Shenandoah", href: "/artikel/shenandoah" }],
    });

    const after = analyzeSeo({
      title: fixed.title,
      slug: fixed.slug,
      meta: fixed.meta,
      content: fixed.body,
    });

    const weight = (a: ReturnType<typeof analyzeSeo>): number =>
      a.findings.reduce((sum, f) => sum + (f.severity === "critical" ? 25 : f.severity === "warning" ? 12 : 5), 0);
    expect(weight(after)).toBeLessThan(weight(before));
    expect(after.score).toBeGreaterThan(before.score);
  });
});