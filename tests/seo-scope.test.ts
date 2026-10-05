/**
 * Kontrak "bantuan AI mengikuti analisis SEO" per tipe konten.
 *
 * Semua modul di sini MURNI: seo-rules, seo-keywords, seo-remediate, dan
 * redaksi-meta. Tidak ada network atau database.
 *
 * Yang diuji adalah hal yang dulu memicu desync:
 *  1. Aturan yang tidak berlaku untuk sebuah tipe tidak boleh muncul, baik di
 *     prompt AI maupun di panel analisis.
 *  2. Laporan sinkronisasi draf AI adalah temuan analyzer yang sama, bukan
 *     daftar karangan modul lain.
 *  3. Field yang dinilai untuk sebuah tipe diambil lewat satu helper.
 */
import { describe, expect, it } from "vitest";
import { analyzeSeo, type SeoSeverity } from "@/lib/seo-keywords";
import { remediateDraft } from "@/lib/seo-remediate";
import { GEO_RULES, SEO_RULES, seoGeoPromptBlock, seoScopeFor } from "@/lib/seo-rules";
import { metaFieldFor, seoFieldsFor, REDAKSI_TYPES } from "@/lib/redaksi-meta";

function severityRank(severity: SeoSeverity): number {
  return severity === "critical" ? 0 : severity === "warning" ? 1 : 2;
}

describe("skop aturan per tipe konten", () => {
  it("tipe tak dikenal atau kosong memakai skop artikel (perilaku lama)", () => {
    expect(seoScopeFor().key).toBe("article");
    expect(seoScopeFor(null).key).toBe("article");
    expect(seoScopeFor("entah").key).toBe("article");
  });

  it("testimoni, profil, dan layanan tidak punya aturan slug maupun meta", () => {
    for (const type of ["testimonial", "profile", "service"]) {
      expect(seoScopeFor(type).slug, `${type} tidak punya slug`).toBe(false);
      expect(seoScopeFor(type).meta, `${type} tidak punya meta terpisah`).toBe(false);
    }
    expect(seoScopeFor("article").slug).toBe(true);
    expect(seoScopeFor("article").meta).toBe(true);
  });

  it("ambang panjang isi tidak melebihi kapasitas field di validations.ts", () => {
    // TestimonialSchema membatasi `content` di 2.000 karakter (~300 kata).
    // Meminta 600 kata membuat model patuh lalu ditolak Zod.
    expect(seoScopeFor("testimonial").minWords).toBeLessThan(300);
    expect(seoScopeFor("article").minWords).toBe(SEO_RULES.content.minWords);
    for (const t of REDAKSI_TYPES) {
      expect(seoScopeFor(t.key).minWords).toBeGreaterThan(0);
    }
  });
});

describe("analyzeSeo tidak menagih field yang tidak ada pada tipenya", () => {
  it("testimoni: tanpa slug dan meta tidak memicu temuan slug/meta", () => {
    const analysis = analyzeSeo({
      type: "testimonial",
      title: "Rina Kusuma",
      slug: null,
      meta: null,
      content: "Tim kami menyelesaikan desain dalam 3 minggu dan hasilnya cepat dipakai.",
    });
    const ids = analysis.findings.map((f) => f.id);
    expect(ids).not.toContain("slug-empty");
    expect(ids).not.toContain("meta-empty");
    expect(analysis.findings.filter((f) => f.severity === "critical")).toHaveLength(0);
  });

  it("testimoni: struktur GEO tidak dinilai karena tidak relevan untuk ulasan", () => {
    const analysis = analyzeSeo({
      type: "testimonial",
      title: "Rina Kusuma",
      content: "Tim kami menyelesaikan desain dalam 3 minggu dan hasilnya cepat dipakai.",
    });
    expect(analysis.findings.filter((f) => f.id.startsWith("geo-"))).toHaveLength(0);
    expect(analysis.geoScore).toBe(100);
  });

  it("tanpa tipe, analyzer tetap memakai aturan artikel sepenuhnya", () => {
    const analysis = analyzeSeo({
      title: "Rina Kusuma",
      slug: null,
      meta: null,
      content: "Isi artikel.",
    });
    const ids = analysis.findings.map((f) => f.id);
    expect(ids).toContain("slug-empty");
    expect(ids).toContain("meta-empty");
  });

  it("produk: description adalah isi, bukan meta description", () => {
    const long = "Dashboard admin siap pakai dengan 40 komponen. ".repeat(20);
    const analysis = analyzeSeo({
      type: "product",
      title: "Dashboard Admin Next.js",
      slug: "dashboard-admin-nextjs",
      meta: null,
      content: long,
    });
    const ids = analysis.findings.map((f) => f.id);
    expect(ids).not.toContain("meta-long");
    expect(ids).not.toContain("meta-empty");
  });
});

describe("prompt bantuan AI mengikuti skop yang sama", () => {
  it("testimoni: tidak meminta 600 kata, meta, slug, atau internal link", () => {
    const scope = seoScopeFor("testimonial");
    const block = seoGeoPromptBlock("id", scope);
    expect(block).not.toContain(`${SEO_RULES.content.minWords} kata`);
    expect(block).toContain(`${scope.minWords} kata`);
    expect(block).not.toContain("Deskripsi/meta");
    expect(block).not.toContain("- slug:");
    expect(block).not.toContain("Internal link");
    expect(block).not.toContain("GEO (mesin answer");
  });

  it("artikel: blok lengkap dengan semua angka aturan", () => {
    const block = seoGeoPromptBlock("id", seoScopeFor("article"));
    expect(block).toContain(`${SEO_RULES.content.minWords} kata`);
    expect(block).toContain("Internal link");
    expect(block).toContain(`${GEO_RULES.questionHeadingsMin} sub-judul`);
  });

  it("produk: GEO dasar tanpa sub-judul tanya dan tanpa daftar", () => {
    const block = seoGeoPromptBlock("id", seoScopeFor("product"));
    expect(block).toContain(`${GEO_RULES.answerFirstMinWords} kata`);
    expect(block).not.toContain("sub-judul sebagai pertanyaan sungguhan");
    expect(block).not.toContain("daftar bullet");
  });
});

describe("pemetaan field analyzer hanya di satu tempat", () => {
  it("testimoni: judul dari clientName, slug dan meta dikosongkan", () => {
    const fields = seoFieldsFor("testimonial", {
      clientName: "Rina Kusuma",
      content: "Ulasan klien.",
      // Field form yang tidak dipakai tipe ini harus diabaikan.
      title: "",
      slug: "",
    });
    expect(fields.title).toBe("Rina Kusuma");
    expect(fields.slug).toBeNull();
    expect(fields.meta).toBeNull();
    expect(fields.body).toBe("Ulasan klien.");
  });

  it("profil: judul dari name, isi dari bio", () => {
    const fields = seoFieldsFor("profile", { name: "Sigit Adi", bio: "Bio singkat." });
    expect(fields.title).toBe("Sigit Adi");
    expect(fields.body).toBe("Bio singkat.");
    expect(fields.meta).toBeNull();
  });

  it("produk: description adalah isi, bukan meta description", () => {
    expect(metaFieldFor("product")).toBeNull();
    expect(metaFieldFor("article")).toBe("summary");
    expect(metaFieldFor("project")).toBe("summary");
    const fields = seoFieldsFor("product", { title: "Dashboard", description: "Isi kartu." });
    expect(fields.body).toBe("Isi kartu.");
    expect(fields.meta).toBeNull();
  });
});

describe("laporan sinkronisasi adalah temuan analyzer, bukan daftar karangan", () => {
  const draft = {
    title: "Optimasi Gambar Next.js Dengan Cache Immutable",
    slug: "Optimasi Gambar Next.js",
    meta: "Pendek.",
    body: "## Bagian satu\n\nParagraf pendek.\n\n## Bagian dua\n\nParagraf lain.",
    bodyField: "content" as const,
  };

  it("remaining berisi label dan message yang sama persis dengan analyzer", () => {
    const fixed = remediateDraft(draft);
    const analysis = analyzeSeo({
      title: fixed.title,
      slug: fixed.slug,
      meta: fixed.meta,
      content: fixed.body,
    });
    const expected = [...analysis.findings]
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
      .map((f) => `${f.label}: ${f.message}`);
    expect(fixed.remaining).toEqual(expected);
  });

  it("tidak ada temuan kritis yang tersisa setelah sinkronisasi", () => {
    const fixed = remediateDraft(draft);
    const kritis = /Judul kosong|Slug kosong|Meta description kosong|Konten kosong|Tidak ada sub-judul/;
    expect(fixed.remaining.some((r) => kritis.test(r))).toBe(false);
  });

  it("laporan ikut skop: testimoni tidak melaporkan temuan slug atau meta", () => {
    const fixed = remediateDraft({
      title: "Rina Kusuma",
      slug: "",
      meta: "",
      body: "Tim kami menyelesaikan desain dalam 3 minggu dan hasilnya cepat dipakai.",
      bodyField: "content",
      type: "testimonial",
    });
    expect(fixed.remaining.join(" | ")).not.toMatch(/slug|meta description/i);
  });
});
