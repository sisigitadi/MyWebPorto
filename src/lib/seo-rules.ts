/**
 * ATURAN SEO + GEO — SATU SUMBER KEBENARAN (murni, tanpa I/O).
 *
 * Modul ini sengaja dibuat terpisah dari `seo-keywords.ts` (analyzer) dan
 * `redaksi-draft.ts` (prompt AI) karena keduanya harus memakai angka yang
 * PERSIS SAMA. Sebelumnya aturan hanya hidup di dalam analyzer, sehingga prompt
 * AI menulis bebas dan hampir selalu gagal dianalisis: model tidak pernah tahu
 * batas panjang judul, batas density, atau bahwa internal link justru WAJIB — bahkan
 * prompt lama melarang link markdown sama sekali, padahal analyzer menghitung
 * `](/` sebagai sinyal internal link. Satu-satunya cara menutup celah itu adalah
 * menyimpan angka dan kalimat instruksinya di satu tempat, lalu mengimpor dari
 * kedua sisi.
 *
 * Dua kelompok aturan di sini:
 *
 * 1. SEO — apa yang dibaca Google: panjang judul/slug/meta, struktur heading,
 *    panjang konten, density, dan internal link.
 * 2. GEO — apa yang dibaca mesin ANSWER (ChatGPT, Gemini, Perplexity, AI
 *    Overviews): jawaban harus bisa dikutip utuh. Praktisnya: jawaban langsung
 *    di awal, sub-judul berbentuk pertanyaan, ada fakta berangka yang bisa
 *    dikutip, dan isi dipecah jadi daftar pendek.
 *
 * PENTING: ambang di bawah adalah heuristik redaksi yang bisa disetel, bukan
 * hukum. Tidak ada data volume pencarian di repo ini, jadi tidak ada klaim
 * peringkat — hanya pemeriksaan agar draf tidak CACAT secara teknis sebelum
 * dianalisis.
 */

/** Panjang & batas teks. Semua dihitung dalam karakter, bukan kata. */
export const SEO_RULES = {
  title: { min: 30, max: 65 },
  meta: { min: 120, max: 165 },
  slug: { maxWords: 6 },
  content: {
    minWords: 600,
    /** Minimal 1 H2; 3 atau lebih membuka peluang featured snippet. */
    h2Min: 1,
    h2Preferred: 3,
    /** Internal link minimal 1 agar otoritas halaman redistributed. */
    internalLinkMin: 1,
  },
  density: {
    /** Bawah 0,3% = keyword basically tidak ada; di atas 3% = stuffing. */
    min: 0.3,
    max: 3,
  },
  sentence: { maxWords: 32 },
} as const;

/**
 * Aturan GEO. Semuanya bisa diukur dari teks polos, jadi bisa dipakai analyzer
 * (draf manusia) maupun prompt (draf AI) tanpa risiko kontradiksi.
 */
export const GEO_RULES = {
  /**
   * Jawaban harus bisa dikutip tanpa membaca seluruh halaman: blok pertama
   * (sebelum H2 pertama) harus berupa ringkasan mandiri minimal 40 kata.
   */
  answerFirstMinWords: 40,
  /** Minimal 2 sub-judul berbentuk pertanyaan (potongan AI answer). */
  questionHeadingsMin: 2,
  /** Minimal 1 fakta berangka — angka + satuan paling mudah dikutip utuh. */
  quotableFactsMin: 1,
  /** Minimal 1 daftar (bullet/nomor) agar bisa diekstrak sebagai langkah. */
  listsMin: 1,
  /** Paragraf di atas batas ini dipecah — mesin answer lebih suka blok pendek. */
  maxParagraphWords: 120,
} as const;

/** Kata tanya yang muncul di awal sub-judul = pola heading pertanyaan. */
export const QUESTION_WORDS = [
  "apa",
  "apaan",
  "bagaimana",
  "bagaimana cara",
  "kenapa",
  "mengapa",
  "kapan",
  "siapa",
  "berapa",
  "di mana",
  "dimana",
  "mana",
  "apakah",
  "bisakah",
  "haruskah",
  "adakah",
  "mengapa harus",
  "apa itu",
  "apa saja",
  "apa bedanya",
] as const;

/** Tampilan angka Indonesia: 1.200 atau 1,5. */
const NUMBER = "\\d+(?:[.,]\\d+)?";

/**
 * Berapa banyak fakta berangka yang bisa dikutip? Angka harus berdiri sendiri
 * sebagai nilai, bukan bagian kalimat biasa.
 *
 * Perhatikan batas kata: satuan yang diakhiri tanda baca (`%`) TIDAK bisa
 * memakai `\b` di belakangnya karena `%` bukan karakter word — pola `\b40%\b`
 * tidak akan pernah cocok dan setiap fakta persen hilang diam-diam.
 */
export function countQuotableFacts(text: string): number {
  if (!text) return 0;
  // Satuan: versi panjang lebih dulu, lalu yang pendek.
  const units = "(?:per detik|per menit|per hari|detik|menit|jam|hari|minggu|bulan|tahun|req|ms|kb|mb|gb|tb|px|%)";
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${NUMBER}\\s*${units}(?![\\p{L}\\p{N}])`, "giu");
  const raw = text.match(re) || [];
  // Hitung nilai unik: "40% dua kali" tetap satu fakta.
  return new Set(raw.map((m) => m.toLowerCase().replace(/\s+/g, " "))).size;
}

/** Sub-judul (H2/H3) — baris markdown yang diawali 2 atau 3 hash. */
export function headingLines(text: string): string[] {
  return (text || "").split(/\r?\n/).filter((line) => /^#{2,3}\s+\S/.test(line));
}

/**
 * Sub-judul yang SOALNYA berbentuk pertanyaan. Dua pola yang dikenal mesin
 * answer: diakhiri tanda tanya, atau diawali kata tanya.
 */
export function countQuestionHeadings(text: string): number {
  const headings = headingLines(text);
  if (headings.length === 0) return 0;
  const words = QUESTION_WORDS as readonly string[];
  return headings.filter((line) => {
    const clean = line.replace(/^#{2,3}\s+/, "").trim().toLowerCase();
    if (clean.endsWith("?")) return true;
    return words.some((w) => clean.startsWith(`${w} `) || clean.startsWith(`${w}?`));
  }).length;
}

/** Jumlah item daftar (bullet `-`/`*` atau bernomor `1.`). */
export function countListItems(text: string): number {
  return ((text || "").match(/^\s*(?:[-*+]|\d+\.)\s+\S/gm) || []).length;
}

/** Paragraf (blok yang bukan heading/kode/list/kutipan). */
function paragraphBlocks(text: string): string[] {
  return (text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/^#{1,6}\s/.test(b) && !/^\s*(?:[-*+]|\d+\.)\s/.test(b) && !b.startsWith(">"));
}

/** Kata pada blok pertama sebelum H2 pertama — inti aturan "answer first". */
export function answerFirstWords(text: string): number {
  const beforeFirstHeading = (text || "").split(/^#{1,6}\s+\S/m)[0] || "";
  const blocks = paragraphBlocks(beforeFirstHeading);
  if (blocks.length === 0) return 0;
  return blocks[0].split(/\s+/).filter(Boolean).length;
}

/** Kata pada paragraf terpanjang — mendeteksi blok yang sulit dipindai. */
export function longestParagraphWords(text: string): number {
  return paragraphBlocks(text).reduce(
    (max, block) => Math.max(max, block.split(/\s+/).filter(Boolean).length),
    0
  );
}

/**
 * Skor 0-100 per dimensi. Skor SEO/GEO memangkas poin sesuai severity temuan
 * (kritis paling berat) lalu dibulatkan. Ini bukan prediksi peringkat — hanya
 * ringkasan "berapa banyak masalah teknis yang masih ada", supaya admin punya
 * satu angka yang bisa dibandingkan antar draf.
 */
const PENALTY = { critical: 25, warning: 12, opportunity: 5 } as const;

export type SeoRuleSeverity = keyof typeof PENALTY;

export function scoreFromFindings(findings: readonly { severity: SeoRuleSeverity }[]): number {
  const penalty = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
  return Math.max(0, 100 - penalty);
}

/**
 * Blok instruksi SEO+GEO untuk prompt AI — DITURUNKAN dari konstanta di atas.
 *
 * Ini yang membuat "bantuan AI" dan "analisa SEO" tidak lagi bertengkar: model
 * menerima angka yang persis sama dengan yang nanti dipakai analyzer untuk
 * menilai keluarannya. Mengubah `SEO_RULES.title.max` otomatis mengubah
 * prompt ini, tidak ada duplikasi angka.
 */
export function seoGeoPromptBlock(lang: "id" | "en" = "id"): string {
  const en = lang === "en";
  const lines = en
    ? [
        "SEO + GEO REQUIREMENTS (these are the exact thresholds the analyzer will check):",
        `- title: ${SEO_RULES.title.min}-${SEO_RULES.title.max} characters.`,
        `- meta/description: ${SEO_RULES.meta.min}-${SEO_RULES.meta.max} characters.`,
        `- slug: kebab-case, lowercase, at most ${SEO_RULES.slug.maxWords} words.`,
        `- body: at least ${SEO_RULES.content.minWords} words.`,
        `- sub-headings: at least ${SEO_RULES.content.h2Preferred} "## " sections (use "### " for nested points).`,
        `- internal links: at least ${SEO_RULES.content.internalLinkMin} markdown link to another page of this site, written as [anchor](/path).`,
        `- keep the main keyword at ${SEO_RULES.density.min}-${SEO_RULES.density.max}% density: it must appear in the title, the slug, the meta and at least one sub-heading. Never above ${SEO_RULES.density.max}% (keyword stuffing).`,
        `- average sentence under ${SEO_RULES.sentence.maxWords} words.`,
        "",
        "GEO (answer engines: ChatGPT, Gemini, Perplexity, AI Overviews):",
        `- Open with a standalone summary of at least ${GEO_RULES.answerFirstMinWords} words that answers the topic directly, before any "## " heading.`,
        `- Write at least ${GEO_RULES.questionHeadingsMin} sub-headings as real questions ("## Apa itu ...?").`,
        `- Include at least ${GEO_RULES.quotableFactsMin} concrete fact with a number and a unit (%, ms, seconds, requests, size).`,
        `- Include at least ${GEO_RULES.listsMin} bullet or numbered list.`,
        `- Keep every paragraph under ${GEO_RULES.maxParagraphWords} words.`,
        `- State the subject explicitly in the first sentence so the page can be quoted out of context.`,
      ]
    : [
        "PERSYARATAN SEO + GEO (angka ini persis sama dengan yang nanti dianalisis):",
        `- Judul: ${SEO_RULES.title.min}-${SEO_RULES.title.max} karakter.`,
        `- Deskripsi/meta: ${SEO_RULES.meta.min}-${SEO_RULES.meta.max} karakter.`,
        `- Slug: kebab-case, huruf kecil, maksimal ${SEO_RULES.slug.maxWords} kata.`,
        `- Isi: minimal ${SEO_RULES.content.minWords} kata.`,
        `- Sub-judul: minimal ${SEO_RULES.content.h2Preferred} bagian "## " (gunakan "### " untuk detail).`,
        `- Internal link: minimal ${SEO_RULES.content.internalLinkMin} tautan markdown ke halaman lain di situs ini, ditulis [teks](/path).`,
        `- Density kata kunci utama ${SEO_RULES.density.min}-${SEO_RULES.density.max} persen: frasa itu wajib muncul di judul, slug, deskripsi, dan minimal satu sub-judul. Jangan pernah di atas ${SEO_RULES.density.max} persen (keyword stuffing).`,
        `- Rata-rata kalimat maksimal ${SEO_RULES.sentence.maxWords} kata.`,
        "",
        "GEO (mesin answer: ChatGPT, Gemini, Perplexity, AI Overviews):",
        `- Buka dengan ringkasan mandiri minimal ${GEO_RULES.answerFirstMinWords} kata yang langsung menjawab topik, SEBELUM sub-judul "## " pertama.`,
        `- Tulis minimal ${GEO_RULES.questionHeadingsMin} sub-judul sebagai pertanyaan sungguhan ("## Apa itu ...?").`,
        `- Sertakan minimal ${GEO_RULES.quotableFactsMin} fakta konkret dengan angka dan satuan (%, ms, detik, request, ukuran).`,
        `- Sertakan minimal ${GEO_RULES.listsMin} daftar bullet atau bernomor.`,
        `- Setiap paragraf maksimal ${GEO_RULES.maxParagraphWords} kata.`,
        `- Sebut subjeknya secara eksplisit di kalimat pertama agar halaman ini bisa dikutip tanpa konteks.`,
      ];

  return lines.join("\n");
}

/**
 * Penanda yang dipanggil pemanggil untuk menyisipkan daftar tautan internal
 * yang boleh dipakai. Tanpa ini model cenderung mengarang path.
 */
export const INTERNAL_LINKS_MARKER = "INTERNAL_LINKS_MARKER";

/**
 * Daftar tautan internal yang boleh dipakai model. Sengaja diberi paginasi
 * ketat (maks 12) supaya prompt tetap murah; model tetap boleh memakai paling
 * banyak 3.
 */
export function internalLinksPromptBlock(
  links: readonly { title: string; href: string }[]
): string {
  const items = links
    .filter((l) => l.href && l.href.startsWith("/") && !l.href.startsWith("//"))
    .slice(0, 12)
    .map((l) => `- ${l.title} → ${l.href}`);
  if (items.length === 0) {
    return "Halaman lain di situs ini: (belum ada). JANGAN mengarang tautan internal.";
  }
  return [
    "Halaman lain di situs ini yang boleh kamu tautkan (pakai persis path ini, maksimal 3 buah):",
    ...items,
  ].join("\n");
}