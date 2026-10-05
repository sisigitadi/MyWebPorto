/**
 * Analisis SEO + saran keyword untuk konten Redaksi — MURNI (tanpa I/O),
 * deterministik, dan bisa diuji penuh tanpa database.
 *
 * Batasan yang disengaja dan harus dibaca sebelum dipakai: **tidak ada data
 * volume pencarian** di sini. Tidak ada akses Keyword Planner, Ahrefs, atau
 * Semrush, jadi skor hanya "seberapa sering frasa ini muncul di kontenmu
 * sendiri", bukan data volume pencarian. Yang bisa dijawab tool ini secara jujur:
 * apakah judul/slug/meta description memuat frasa utama, apakah struktur
 * heading-nya baik, apakah konten cukup dalam, dan ke halaman mana konten ini
 * sebaiknya ditautkan (internal link = sinyal crawl + pemindahan otoritas).
 *
 * Ambang panjang TIDAK ditulis di sini — semuanya diturunkan dari
 * `seo-rules.ts` (`SEO_RULES` / `GEO_RULES`), modul yang sama dengan prompt
 * bantuan AI. Kalau angkanya dipisah, prompt dan analyzer pasti memakai ambang
 * berbeda dan draf AI akan selalu gagal dianalisis.
 */

/** Kata yang tidak pernah layak jadi keyword (Indonesia + Inggris). */
const STOPWORDS = new Set([
  "ada", "adalah", "agar", "akan", "aku", "anda", "antara", "apa", "apabila",
  "atau", "bagai", "bagi", "bahkan", "bahwa", "belum", "bisa", "bukan",
  "dalam", "dan", "dapat", "dari", "dengan", "di", "dia", "dua", "harus",
  "hanya", "hingga", "ia", "ingin", "ini", "itu", "jika", "juga", "kalau",
  "kami", "kamu", "karena", "ke", "kembali", "kepada", "kita", "lagi",
  "lain", "lalu", "lebih", "masih", "mau", "melalui", "mereka", "namun",
  "oleh", "pada", "para", "pun", "saat", "saja", "sampai", "sangat",
  "satu", "sebagai", "sebuah", "sehingga", "sejak", "selain", "semua",
  "sendiri", "serta", "setelah", "setiap", "sudah", "supaya", "tapi",
  "telah", "tentang", "terhadap", "tersebut", "tetapi", "tidak", "untuk",
  "yaitu", "yakni", "yang",
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "in", "is", "it", "of", "on", "or", "that", "the", "to", "with",
]);

import {
  GEO_RULES,
  SEO_RULES,
  answerFirstWords,
  countListItems,
  countQuotableFacts,
  countQuestionHeadings,
  longestParagraphWords,
  scoreFromFindings,
} from "@/lib/seo-rules";

export type SeoSeverity = "critical" | "warning" | "opportunity";
export type SeoField = "title" | "slug" | "meta" | "content";

export interface SeoFinding {
  id: string;
  severity: SeoSeverity;
  field: SeoField;
  /** Label singkat untuk UI. */
  label: string;
  /** Penjelasan plus tindakan yang perlu dilakukan. */
  message: string;
}

export interface KeywordCandidate {
  term: string;
  count: number;
  /** Skor relevansi internal (frekuensi + panjang frasa), bukan volume. */
  score: number;
}

export interface SeoMetrics {
  wordCount: number;
  titleLength: number;
  metaLength: number;
  slugLength: number;
  slugWords: number;
  keywordDensity: number;
  h2Count: number;
  h3Count: number;
  internalLinkCount: number;
  avgSentenceWords: number;
  /** Kata pada ringkasan pembuka sebelum H2 pertama (aturan GEO). */
  answerFirstWords: number;
  /** Sub-judul yang berbentuk pertanyaan (aturan GEO). */
  questionHeadings: number;
  /** Fakta berangka yang bisa dikutip mesin answer (aturan GEO). */
  quotableFacts: number;
  /** Item daftar bullet/bernomor (aturan GEO). */
  listItems: number;
  /** Kata pada paragraf terpanjang (aturan GEO). */
  longestParagraphWords: number;
}

export interface RelatedContentSuggestion {
  title: string;
  href: string;
  /** Frasa yang menghubungkan konten ini dengan halaman tujuan. */
  sharedTerms: string[];
}

export interface SeoAnalysis {
  primaryKeyword: string | null;
  keywords: KeywordCandidate[];
  findings: SeoFinding[];
  metrics: SeoMetrics;
  /**
   * Skor 0-100 hasil pemotongan temuan. BUKAN prediksi peringkat: ini hanya
   * "berapa masalah teknis yang tersisa", supaya dua draf bisa dibandingkan.
   */
  score: number;
  /** Skor hanya dari temuan GEO (mesin answer), 0-100. */
  geoScore: number;
  suggestions: {
    titles: string[];
    slug: string;
    meta: string;
  };
  relatedContent: RelatedContentSuggestion[];
}

/** Bersihkan markdown/HTML/punktuasi lalu pecah jadi kata lowercase. */
export function tokenize(text: string): string[] {
  return (text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~[\](){}|\]]/g, " ")
    .toLowerCase()
    .split(/[^a-z0-9+.\-]+/)
    .map((w) => w.replace(/^[.]+|[.]+$/g, ""))
    .filter((w) => w.length > 1 && w.length < 40 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Kandidat keyword dari isi konten: unigram + bigram + trigram, dibobot
 * frekuensi dan panjang frasa. Frasa multi kata dihargai lebih tinggi karena
 * itulah yang biasanya orang ketik ("optimasi gambar nextjs"), bukan satu
 * kata umum seperti "sistem" atau "aplikasi".
 */
export function extractKeywordCandidates(text: string, limit = 8): KeywordCandidate[] {
  const words = tokenize(text);
  if (words.length === 0) return [];

  const counts = new Map<string, number>();
  const bump = (phrase: string): void => {
    // Buang frasa yang mengandung stopword di tengah, mis. "dan" di "next.js dan".
    if (phrase.split(" ").some((w) => STOPWORDS.has(w))) return;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  };

  for (let i = 0; i < words.length; i += 1) {
    bump(words[i]);
    if (i + 1 < words.length) bump(`${words[i]} ${words[i + 1]}`);
    if (i + 2 < words.length) bump(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return [...counts.entries()]
    .map(([term, count]) => {
      const phraseWords = term.split(" ").length;
      // Frekuensi dikalikan "bobot panjang" yang DIBATAS di 2. Tanpa batas,
      // trigram hasil persilangan ("keyword nextjs diulang") selalu mengalahkan
      // bigram yang sebenarnya bermakna — frasa 3 kata terlalu spesifik dan
      // jarang sekali jadi intent pencarian.
      const score = count * Math.min(phraseWords, 2);
      return { term, count, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        // Skor sama → pilih frasa lebih pendek (lebih mudah jadi target sebagai target).
        a.term.length - b.term.length ||
        a.term.localeCompare(b.term)
    )
    .slice(0, limit);
}

/**
 * Keyword utama: kandidat dengan skor tertinggi, diutamakan yang juga
 * muncul di judul karena frasa di judul adalah sinyal terkecil luar biasa
 * bahwa itulah topik halaman.
 */
export function pickPrimaryKeyword(
  candidates: KeywordCandidate[],
  title: string
): string | null {
  if (candidates.length === 0) return null;
  // Frasa maximal dua kata untuk keyword utama: trigram terlalu spesifik dan
  // hampir tidak pernah jadi intent pencarian yang benar diketik orang.
  const pool = candidates.filter((c) => c.term.split(" ").length <= 2);
  const usable = pool.length > 0 ? pool : candidates;
  const titleWords = new Set(tokenize(title));
  if (titleWords.size === 0) return usable[0].term;

  // Prioritas: (1) muncul di judul, (2) skor, (3) frasa lebih spesifik.
  const inTitle = usable
    .filter((c) => c.term.split(" ").every((w) => titleWords.has(w)))
    .sort((a, b) => b.score - a.score || b.term.length - a.term.length);
  const best = inTitle[0] ?? [...usable].sort((a, b) => b.score - a.score || b.term.length - a.term.length)[0];
  return best.term;
}

/** Slug aman: huruf kecil, angka, tanda hubung tunggal, maksimal maxWords. */
export function slugify(text: string, maxWords = 6): string {
  return tokenize(text)
    .slice(0, maxWords)
    .join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Jumlah kemunculan frasa utuh (bukan per kata) — dasar density check.
 *
 * Whitespace dinormalkan dulu: tanpa itu frasa yang berdiri di awal baris baru
 * tidak pernah terhitung (haystack diisi newline, bukan spasi), sehingga
 * stuffing parah seperti "keyword nextjs" pada tiap baristerhitung density 1%
 * padahal isinya 50%.
 */
export function countPhrase(text: string, phrase: string): number {
  if (!phrase) return 0;
  const normalize = (value: string): string => ` ${value.toLowerCase().replace(/\s+/g, " ")} `;
  const haystack = normalize(text || "");
  const needle = normalize(phrase);
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** Rata-rata jumlah kata per kalimat — proxy keterbacaan. */
export function averageSentenceWords(content: string): number {
  const plain = (content || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~[\](){}|\]]/g, " ");
  const sentences = plain
    .split(/[.!?\n]+/)
    .filter((s) => s.trim().split(/\s+/).length > 2);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
  return Math.round(totalWords / sentences.length);
}

export interface AnalyzeInput {
  title?: string | null;
  slug?: string | null;
  /** Meta description: `summary` (artikel) atau `description` (proyek/produk). */
  meta?: string | null;
  /** Isi utama konten (markdown). */
  content?: string | null;
  /** Halaman lain di situs untuk saran internal link. */
  related?: { title: string; href: string }[];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function suggestTitles(keyword: string | null, current: string): string[] {
  if (!keyword) return [];
  const currentLower = current.trim().toLowerCase();
  return [
    `${capitalize(keyword)}: Panduan Praktis untuk Pemula`,
    `${capitalize(keyword)} yang Perlu Anda Tahu (Contoh Praktis)`,
    `Cara mengelola ${keyword} Tanpa Menebak`,
  ].filter((t) => t.toLowerCase() !== currentLower);
}

function suggestMeta(keyword: string | null, current: string, content: string): string {
  const trimmed = current.trim();
  const hasKeyword = Boolean(keyword && trimmed.toLowerCase().includes(keyword));
  // Sudah memenuhi panjang DAN memuat kata kunci → biarkan saja.
  if (trimmed.length >= SEO_RULES.meta.min && hasKeyword) return trimmed;
  const firstSentences = (content || "")
    .replace(/[#*_>`[\]]/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const base = firstSentences || trimmed;
  if (!keyword) return base.slice(0, SEO_RULES.meta.max);
  const withKeyword = base.toLowerCase().includes(keyword)
    ? base
    : `${base} Pelajari ${keyword} secara lengkap.`;
  return withKeyword.length > SEO_RULES.meta.max
    ? `${withKeyword.slice(0, SEO_RULES.meta.max - 3).trimEnd()}...`
    : withKeyword;
}

/**
 * Saran internal link: halaman lain yang paling banyak berbagi frasa dengan
 * konten ini. murni overlap frasa, bukan pemahaman konteks —
 * admin tetap memilih mana yang relevan secara makna.
 */
export function suggestInternalLinks(
  related: { title: string; href: string }[],
  content: string,
  title: string
): RelatedContentSuggestion[] {
  const sourceTerms = new Set(tokenize(`${title} ${content}`));
  if (sourceTerms.size === 0) return [];

  return related
    .map((item) => {
      const sharedTerms = tokenize(item.title).filter((t) => sourceTerms.has(t));
      return { title: item.title, href: item.href, sharedTerms, overlap: sharedTerms.length };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map(({ title: t, href, sharedTerms }) => ({
      title: t,
      href,
      sharedTerms: sharedTerms.slice(0, 4),
    }));
}

/** Analisis lengkap. Murni, tidak pernah throw. */
export function analyzeSeo(input: AnalyzeInput): SeoAnalysis {
  const title = (input.title || "").trim();
  const slug = (input.slug || "").trim();
  const meta = (input.meta || "").trim();
  const content = input.content || "";

  // Judul diberi bobot dua kali supaya frasa yang sudah di-heading mudah
  // menjadi keyword utama.
  const candidates = extractKeywordCandidates(`${title} ${title} ${content}`);
  const primaryKeyword = pickPrimaryKeyword(candidates, title);

  const wordCount = tokenize(content).length;
  const slugWords = slug ? slug.split("-").filter(Boolean).length : 0;
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;
  const internalLinkCount = (content.match(/\]\(\//g) || []).length;
  // Metrik GEO — semuanya deterministik, tanpa LLM.
  const answerFirst = answerFirstWords(content);
  const questionHeadings = countQuestionHeadings(content);
  const quotableFacts = countQuotableFacts(content);
  const listItems = countListItems(content);
  const longestParagraph = longestParagraphWords(content);
  const keywordDensity =
    primaryKeyword && wordCount > 0
      ? Number(
          (
            (countPhrase(content, primaryKeyword) * primaryKeyword.split(" ").length * 100) /
            wordCount
          ).toFixed(2)
        )
      : 0;

  const findings: SeoFinding[] = [];
  const add = (f: SeoFinding): void => {
    findings.push(f);
  };

  if (!title) {
    add({
      id: "title-empty",
      severity: "critical",
      field: "title",
      label: "Judul kosong",
      message: "Isi judul sebelum menyimpan; ini elemen peringkat pertama di SERP.",
    });
  } else {
    if (title.length < SEO_RULES.title.min) {
      add({
        id: "title-short",
        severity: "warning",
        field: "title",
        label: "Judul terlalu pendek",
        message: `Panjang ${title.length} karakter, ideal ${SEO_RULES.title.min}-${SEO_RULES.title.max}. Tambahkan kata kunci utama beserta konteksnya.`,
      });
    } else if (title.length > SEO_RULES.title.max) {
      add({
        id: "title-long",
        severity: "warning",
        field: "title",
        label: "Judul terlalu panjang",
        message: `Panjang ${title.length} karakter, ideal ${SEO_RULES.title.min}-${SEO_RULES.title.max}. Google memotong sekitar 60 karakter di SERP.`,
      });
    }
    if (primaryKeyword && !title.toLowerCase().includes(primaryKeyword)) {
      add({
        id: "title-keyword",
        severity: "warning",
        field: "title",
        label: "Kata kunci utama tidak ada di judul",
        message: `Sisipkan "${primaryKeyword}" pada judul; frasa di judul punya bobot tertinggi.`,
      });
    }
  }

  if (!slug) {
    add({
      id: "slug-empty",
      severity: "critical",
      field: "slug",
      label: "Slug kosong",
      message: "Tanpa slug, URL memakai nama acak sehingga sulit dibaca mesin maupun manusia.",
    });
  } else {
    if (/\s|_|[A-Z]/.test(slug)) {
      add({
        id: "slug-format",
        severity: "critical",
        field: "slug",
        label: "Format slug tidak valid",
        message: "Slug hanya boleh huruf kecil, angka, dan tanda hubung: tanpa spasi, underscore, atau huruf besar.",
      });
    }
    if (slugWords > SEO_RULES.slug.maxWords) {
      add({
        id: "slug-long",
        severity: "warning",
        field: "slug",
        label: "Slug terlalu panjang",
        message: `${slugWords} kata; ideal maksimal ${SEO_RULES.slug.maxWords} agar URL tetap ringkas.`,
      });
    }
    if (primaryKeyword && !slug.toLowerCase().includes(primaryKeyword.replace(/\s+/g, "-"))) {
      add({
        id: "slug-keyword",
        severity: "opportunity",
        field: "slug",
        label: "Slug tidak memuat kata kunci",
        message: `Ganti dengan slug yang memuat "${primaryKeyword}" agar URL ikut membawa kata kunci itu.`,
      });
    }
  }

  if (!meta) {
    add({
      id: "meta-empty",
      severity: "critical",
      field: "meta",
      label: "Meta description kosong",
      message: "Tanpa deskripsi, Google memotong kalimat acak dari body dan click-through rate turun.",
    });
  } else {
    if (meta.length < SEO_RULES.meta.min) {
      add({
        id: "meta-short",
        severity: "warning",
        field: "meta",
        label: "Deskripsi terlalu pendek",
        message: `Panjang ${meta.length} karakter, ideal ${SEO_RULES.meta.min}-${SEO_RULES.meta.max} untuk mengisi slot SERP.`,
      });
    } else if (meta.length > SEO_RULES.meta.max) {
      add({
        id: "meta-long",
        severity: "warning",
        field: "meta",
        label: "Deskripsi terlalu panjang",
        message: `Panjang ${meta.length} karakter; bagian setelah sekitar ${SEO_RULES.meta.max} karakter terpotong di SERP.`,
      });
    }
    if (primaryKeyword && !meta.toLowerCase().includes(primaryKeyword)) {
      add({
        id: "meta-keyword",
        severity: "opportunity",
        field: "meta",
        label: "Kata kunci utama tidak ada di deskripsi",
        message: `Sisipkan "${primaryKeyword}"; deskripsi yang memuat frasa yang dicari cenderung diklik lebih sering.`,
      });
    }
  }

  if (wordCount === 0) {
    add({
      id: "content-empty",
      severity: "critical",
      field: "content",
      label: "Konten kosong",
      message: "Belum ada isi artikel.",
    });
  } else {
    if (wordCount < SEO_RULES.content.minWords) {
      add({
        id: "content-thin",
        severity: "warning",
        field: "content",
        label: "Konten masih tipis",
        message: `${wordCount} kata; halaman yang bersaing di halaman satu biasanya ${SEO_RULES.content.minWords} kata atau lebih. Perluas dengan contoh, langkah praktis, dan jawaban atas pertanyaan pembaca.`,
      });
    }
    if (h2Count === 0) {
      add({
        id: "content-no-h2",
        severity: "critical",
        field: "content",
        label: "Tidak ada sub-judul (H2)",
        message: "Tambahkan H2 (##) agar mesin bisa memotong halaman menjadi bagian yang bisa dilompat di hasil pencarian.",
      });
    } else if (h2Count < SEO_RULES.content.h2Preferred) {
      add({
        id: "content-few-h2",
        severity: "opportunity",
        field: "content",
        label: "Sub-judul masih sedikit",
        message: `Hanya ${h2Count} sub-judul H2. Sub-judul H2/H3 memecah topik panjang dan membuka peluang featured snippet.`,
      });
    }
    if (internalLinkCount < SEO_RULES.content.internalLinkMin) {
      add({
        id: "content-no-internal-link",
        severity: "warning",
        field: "content",
        label: "Belum ada internal link",
        message: "Tautkan artikel atau proyek terkait; ini cara tercepat memindahkan otoritas antarhalaman.",
      });
    }
    if (keywordDensity > SEO_RULES.density.max) {
      add({
        id: "content-stuffing",
        severity: "warning",
        field: "content",
        label: "Kata kunci terlalu sering",
        message: `Density ${keywordDensity}% untuk "${primaryKeyword}". Di atas sekitar ${SEO_RULES.density.max}% dibaca sebagai keyword stuffing.`,
      });
    } else if (primaryKeyword && keywordDensity === 0) {
      add({
        id: "content-no-keyword",
        severity: "warning",
        field: "content",
        label: "Kata kunci utama tidak muncul di isi",
        message: `Pakai "${primaryKeyword}" minimal di satu sub-judul dan dua paragraf.`,
      });
    }
    const avgSentence = averageSentenceWords(content);
    if (avgSentence > SEO_RULES.sentence.maxWords) {
      add({
        id: "content-long-sentence",
        severity: "opportunity",
        field: "content",
        label: "Kalimat terlalu panjang",
        message: `Rata-rata ${avgSentence} kata per kalimat. Pecah menjadi kalimat lebih pendek agar lebih mudah dipindai pembaca dan mesin.`,
      });
    }

    // ---- GEO: apa yang dibutuhkan mesin answer (ChatGPT, Gemini, Perplexity) ----
    // Aturan yang sama persis dengan yang dikirim ke model lewat seoGeoPromptBlock(),
    // jadi draf "Bantuan AI" dan draf manual dinilai dengan standar yang sama.
    if (answerFirst < GEO_RULES.answerFirstMinWords) {
      add({
        id: "geo-no-answer-first",
        severity: "warning",
        field: "content",
        label: "GEO: tidak ada jawaban di awal",
        message: `Blok pembuka hanya ${answerFirst} kata. Mesin answer mengutip bagian yang langsung menjawab; tulis ringkasan mandiri minimal ${GEO_RULES.answerFirstMinWords} kata sebelum sub-judul pertama.`,
      });
    }
    if (questionHeadings < GEO_RULES.questionHeadingsMin) {
      add({
        id: "geo-no-question-heading",
        severity: "opportunity",
        field: "content",
        label: "GEO: sub-judul bukan pertanyaan",
        message: `Hanya ${questionHeadings} sub-judul berbentuk pertanyaan. Ubah sebagian jadi pertanyaan sungguhan ("## Apa itu ...?") agar mudah jadi potongan jawaban.`,
      });
    }
    if (quotableFacts < GEO_RULES.quotableFactsMin) {
      add({
        id: "geo-no-fact",
        severity: "opportunity",
        field: "content",
        label: "GEO: belum ada fakta berangka",
        message: "Sisipkan minimal satu angka dengan satuan (mis. 40%, 250 ms, 2 detik). Fakta berangka adalah yang paling sering dikutip mesin answer.",
      });
    }
    if (listItems < GEO_RULES.listsMin) {
      add({
        id: "geo-no-list",
        severity: "opportunity",
        field: "content",
        label: "GEO: belum ada daftar",
        message: "Tambahkan minimal satu daftar bullet atau bernomor; daftar bisa disalin utuh oleh AI overview.",
      });
    }
    if (longestParagraph > GEO_RULES.maxParagraphWords) {
      add({
        id: "geo-long-paragraph",
        severity: "opportunity",
        field: "content",
        label: "GEO: paragraf terlalu panjang",
        message: `Paragraf terpanjang ${longestParagraph} kata. Pecah menjadi blok maksimal ${GEO_RULES.maxParagraphWords} kata agar mudah dipindai.`,
      });
    }
  }

  return {
    primaryKeyword,
    keywords: candidates,
    findings,
    metrics: {
      wordCount,
      titleLength: title.length,
      metaLength: meta.length,
      slugLength: slug.length,
      slugWords,
      keywordDensity,
      h2Count,
      h3Count,
      internalLinkCount,
      avgSentenceWords: averageSentenceWords(content),
      answerFirstWords: answerFirst,
      questionHeadings,
      quotableFacts,
      listItems,
      longestParagraphWords: longestParagraph,
    },
    score: scoreFromFindings(findings),
    geoScore: scoreFromFindings(findings.filter((f) => f.id.startsWith("geo-"))),
    suggestions: {
      titles: suggestTitles(primaryKeyword, title),
      slug: slugify(primaryKeyword || title, 6),
      meta: suggestMeta(primaryKeyword, meta, content),
    },
    relatedContent: suggestInternalLinks(input.related || [], content, title),
  };
}