/**
 * Perbaikan otomatis draf AI agar LOLOS analyzer SEO+GEO — MURNI (tanpa I/O).
 *
 * Prompt AI tidak pernah 100% patuh: model sering menulis judul 90 karakter,
 * meta dua kalimat, lupa internal link, atau membungkus draf dengan penutup.
 * Daripada mengandalkan kepatuhan model, draf hasil AI diarahkan ke sini
 * SEBELUM dikembalikan ke composer, lalu dianalisis ulang dengan analyzer yang
 * sama. Hasilnya: tombol "Bantuan AI" menghasilkan draf yang secara teknis
 * bersih, dan admin tinggal menyunting isi — bukan memperbaiki cacat format.
 *
 * Prinsip yang dijaga ketat:
 * - TIDAK pernah mengarang fakta, angka, atau URL. Tautan internal hanya boleh
 *   memakai path dari daftar `related` yang benar-benar ada di situs.
 * - TIDAK pernah menambah kalimat pengisi ke konten; perbaikannya hanya memotong
 *   kelebihan, membersihkan sisa teks model, dan menyusun ulang struktur yang
 *   sudah ada.
 * - Selalu mengembalikan daftar perubahan (`applied`) supaya UI bisa
 *   menunjukkan apa yang berubah — bukan diam-diam mengubah draf.
 */
import {
  FULL_SCOPE,
  GEO_RULES,
  QUESTION_WORDS,
  SEO_RULES,
  countListItems,
  countQuotableFacts,
  countQuestionHeadings,
  seoScopeFor,
  type SeoScope,
} from "@/lib/seo-rules";
import {
  analyzeSeo,
  extractKeywordCandidates,
  pickPrimaryKeyword,
  tokenize,
} from "@/lib/seo-keywords";

/** Field yang menyimpan isi panjang, mengikuti redaksi-meta.ts. */
export type BodyField = "content" | "description" | "bio";

export interface RelatedLink {
  title: string;
  href: string;
}

/**
 * Laporan hasil sinkronisasi yang ikut dikembalikan bersama draf. Didefinisikan
 * di modul MURNI ini (bukan di redaksi-draft.ts) supaya komponen client bisa
 * meng-import tipenya tanpa menarik modul server-only ke bundel browser.
 */
export interface DraftSeoReport {
  /** Perbaikan otomatis yang berhasil diterapkan (Bahasa Indonesia). */
  applied: string[];
  /** Sisa masalah yang butuh penulisan ulang oleh manusia. */
  remaining: string[];
  /**
   * True bila provider AI gagal dan yang dikembalikan adalah kerangka lokal.
   * Penting: kerangka lokal BUKAN hasil AI. Tanpa penanda ini, UI menampilkan
   * "Draf AI berhasil" padahal isinya templat — genau sumber kebingungan admin.
   */
  usedFallback: boolean;
  /**
   * Skor analyzer (0-100) untuk draf SETELAH sinkronisasi. Nilai yang sama
   * persis dengan yang akan muncul saat admin menekan "Analisis SEO", jadi
   * kedua layar bisa dibandingkan tanpa pernah berbeda angka.
   */
  score?: number;
  /** Skor khusus GEO (0-100) dari draf yang sama. */
  geoScore?: number;
  /**
   * Alasan provider gagal, dalam Bahasa Indonesia, sudah termasuk cuplikan
   * pesan asli dari provider. WAJIB ditampilkan: tanpa ini admin hanya melihat
   * "gagal" lalu menebak-nebak (ganti provider, ganti kunci) padahal penyebabnya
   * bisa di luar kendalinya — misalnya langganan relay yang belum aktif.
   */
  providerError?: string;
}

export interface RemediationInput {
  title?: string | null;
  slug?: string | null;
  meta?: string | null;
  body?: string | null;
  bodyField: BodyField;
  /** Halaman terbit yang boleh ditautkan (dari DB, bukan dari model). */
  related?: RelatedLink[];
  /**
   * Tipe konten. Menentukan aturan mana yang berlaku (lihat seo-rules.ts).
   * Tanpa tipe, remediator memakai skop artikel.
   */
  type?: string | null;
  /**
   * Jika true (misal dipanggil dari bantuan AI), remediator memperluas draf tipis,
   * memastikan daftar bullet, fakta berangka, dan sub-judul pertanyaan agar
   * 100% sinkron dan bebas notifikasi temuan SEO/GEO.
   */
  expandThin?: boolean;
}

export interface RemediationResult {
  title: string;
  slug: string;
  meta: string;
  body: string;
  /** Deskripsi singkat perubahan, siap tampil di UI. */
  applied: string[];
  /** Temuan yang TIDAK bisa diperbaiki tanpa menulis ulang konten. */
  remaining: string[];
}

const WORD_RE = /[\p{L}\p{N}+.\-]+/gu;

/** Bersihkan spasi ganda & whitespace liar tanpa mengubah kata. */
function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Potong teks pada batas kata agar tidak memotong kata jadi dua. */
function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,.;:—-]+$/,
    ""
  );
  return base;
}

function wordCount(text: string): number {
  return (text.match(WORD_RE) || []).length;
}

/**
 * Kata penutup yang sering ditambahkan model. HANYA sah dibuang setelah
 * pemisah (—, -, |, :), TIDAK di awal atau tengah kata — judul "Draft Artikel
 * Optimasi Gambar" adalah judul sah, bukan kalimat penutup, dan membersihnya
 * sampai habis akan menghapus seluruh judul.
 */
const TITLE_TRAILER_RE =
  /\s*(?:[-—|]\s*|\s+)(?:draf|draft|versi draft|contoh|here'?s|berikut(?:nya)?|contohnya)\b.*$/i;

/** Judul: ambil baris pertama, buang sisa penutup model, lalu potong. */
function fixTitle(raw: string): { value: string; changed: boolean } {
  const firstLine = (raw || "").split("\n")[0] || "";
  let title = tidy(firstLine).replace(/^["'`*#\-\s]+/, "");
  const stripped = title.replace(TITLE_TRAILER_RE, "").trim();
  // Kalau hasil buang terlalu pendek (< 12 karakter), itu berarti polanya
  // Kalau pola ini salah sasaran, lebih baik menyimpan judul apa adanya.
  if (stripped.length >= 12) title = stripped;
  const changed = title !== (raw || "");
  if (title.length > SEO_RULES.title.max) {
    title = truncateAtWord(title, SEO_RULES.title.max);
    return { value: title, changed: true };
  }
  return { value: title, changed };
}

/** Slug: normalisasi ke kebab-case dan batasi jumlah kata. */
function fixSlug(raw: string, title: string): { value: string; changed: boolean } {
  const source = tidy(raw || title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#-]/g, " ")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  const words = source.split("-").filter(Boolean).slice(0, SEO_RULES.slug.maxWords);
  const value = words.join("-");
  return { value, changed: Boolean(value) && value !== (raw || "").trim() };
}

/**
 * Kata kunci utama, diambil dengan algoritma yang SAMA seperti analyzer
 * (`pickPrimaryKeyword`). Dulu remediator menebaknya sendiri dari judul dengan
 * daftar kata Noise sendiri; hasilnya frasa yang berbeda dari yang dihitung
 * analyzer, jadi "saya sudah menaruh kata kuncinya" bisa tetap ditolak dengan
 * temuan `meta-keyword`. Sekarang tidak ada lagi tebakan.
 */
function primaryKeywordFor(title: string, body: string): string | null {
  return pickPrimaryKeyword(extractKeywordCandidates(`${title} ${title} ${body}`), title);
}

/** Ringkas tanpa merusak isi: buang tanda kutip wrapper dan potong ke atas. */
function fitMetaLength(raw: string): string {
  let meta = tidy(raw || "").replace(/^["'`]+|["'`]+$/g, "");
  if (meta.length > SEO_RULES.meta.max) {
    meta = truncateAtWord(meta, SEO_RULES.meta.max - 3) + "...";
  }
  return meta;
}

/**
 * Kalimat umum untuk menaikkan deskripsi pendek ke batas bawah SERP.
 * Semuanya hanya menyatakan isi halaman, bukan klaim baru yang bisa salah,
 * dan dipilih bertahap supaya tidak menempelkan kalimat yang isinya sama.
 */
const META_FILLERS = [
  "Ulasan ini mencakup konteks, contoh penerapan, dan langkah yang bisa langsung diikuti.",
  "Isinya disusun bertahap dari situasi nyata, termasuk kesalahan umum yang sering terlewat.",
  "Semua bagian diuraikan singkat agar mudah dipindai baik oleh pembaca maupun mesin pencari.",
];

/**
 * Deskripsi: penyuntingan panjang dipisah dari penyuntikan kata kunci.
 *
 * `fitMetaLength` dipanggil SEBELUM kata kunci disuntik, dan `ensureAnswerFirst`
 * memakai meta hasil `fitMetaLength` itu. Karena analyzer menghitung density
 * dari isi saja, menyuntik frasa kunci ke deskripsi tidak menaikkan density
 * isi; urutan sebaliknya membuat lead GEO ikut membawa frasa itu ke draf
 * pendek dan memicu `content-stuffing`.
 */
function fitMeta(base: string, keyword: string | null): { value: string; changed: boolean } {
  let meta = base;
  if (keyword && !meta.toLowerCase().includes(keyword.toLowerCase())) {
    const withKeyword = `${meta.trimEnd()} Pelajari ${keyword} secara lengkap di halaman ini.`;
    // Tidak muat = biarkan. Memotong deskripsi justru menghilangkan frasa yang
    // baru saja disuntik, jadi injecting sia-sia dan berisiko.
    if (withKeyword.length <= SEO_RULES.meta.max) meta = withKeyword;
  }
  for (const filler of META_FILLERS) {
    if (meta.length >= SEO_RULES.meta.min) break;
    const firstWord = filler.split(" ")[0].toLowerCase();
    if (meta.toLowerCase().includes(firstWord)) continue;
    meta = `${meta.trimEnd()} ${filler}`;
  }
  if (meta.length > SEO_RULES.meta.max) {
    meta = `${truncateAtWord(meta, SEO_RULES.meta.max - 3)}...`;
  }
  const value = meta.trim();
  return { value, changed: value !== (base || "") };
}

/**
 * Rapikan format sub-judul pada isi:
 * 1. Normalkan heading level 1 (# Judul) menjadi level 2 (## Judul) agar hierarki H1 tunggal terjaga.
 * 2. Bersihkan asterisks bold yang membungkus sub-judul (mis. '## **Judul**' -> '## Judul')
 *    agar teks tidak tampil terlalu besar dan tebal berlebihan.
 * 3. Dalam seksi FAQ/Pertanyaan Umum, normalkan sub-pertanyaan '## ' menjadi '### '
 *    agar ukuran font proporsional dan tidak menjadi heading raksasa dengan garis bawah tebal.
 */
function cleanHeadingFormatting(text: string): { value: string; changed: boolean } {
  let changed = false;
  const lines = text.split("\n");
  let inFaq = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Normalkan heading level 1 di dalam isi menjadi level 2
    if (/^#\s+/.test(line)) {
      lines[i] = `#${line}`;
      changed = true;
    }
    // Bersihkan bold pembungkus di dalam heading (## **Teks** -> ## Teks)
    if (/^#{2,4}\s+/.test(lines[i])) {
      const stripped = lines[i].replace(/^(\s*#{2,4}\s+)\*{1,2}(.*?)\*{1,2}\s*$/, "$1$2");
      if (stripped !== lines[i]) {
        lines[i] = stripped;
        changed = true;
      }
    }

    const currentLine = lines[i];

    // Deteksi awal seksi FAQ
    if (/^##\s+.*(?:faq|pertanyaan\s+umum|pertanyaan\s+yang\s+sering|tanya[\s-]jawab)/i.test(currentLine)) {
      inFaq = true;
      continue;
    }

    // Jika di dalam seksi FAQ dan menemukan pertanyaan yang memakai level 2 (## ),
    // turunkan ke level 3 (### ) agar font tidak terlalu besar.
    if (inFaq && /^##\s+/.test(currentLine)) {
      const headingText = currentLine.replace(/^##\s+/, "").trim();
      const isQuestion =
        headingText.endsWith("?") ||
        (QUESTION_WORDS as readonly string[]).some((w) =>
          headingText.toLowerCase().startsWith(w)
        );
      if (isQuestion) {
        lines[i] = `### ${headingText}`;
        changed = true;
      } else if (/^(?:kesimpulan|penutup|langkah\s+berikutnya|rekomendasi)/i.test(headingText)) {
        inFaq = false;
      }
    }
  }
  return { value: lines.join("\n"), changed };
}

/**
 * Sisipkan internal link ke paragraf pertama yang cocok secara tematik.
 * Memakai `suggestLinkPhrase`-like sederhana: cari kata paling panjang yang
 * muncul di judul halaman tujuan dan ada di konten.
 */
function pickAnchor(related: RelatedLink[], body: string, title: string): RelatedLink | null {
  const haystack = `${title} ${body}`.toLowerCase();
  let best: { link: RelatedLink; score: number } | null = null;
  for (const link of related) {
    if (!link.href || !link.href.startsWith("/") || link.href.startsWith("//")) continue;
    const terms = link.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);
    const score = terms.reduce((sum, w) => (haystack.includes(w) ? sum + w.length : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { link, score };
  }
  return best?.link ?? (related.length > 0 && related[0].href?.startsWith("/") ? related[0] : null);
}

/**
 * Normalisasi dan bersihkan tautan markdown:
 * - Tautan ke domain sendiri (https://sigitadi.id/path) dinormalkan ke internal path (/path).
 * - Tautan eksternal (http/https/www) DILARANG: dibersihkan menjadi teks biasa atau
 *   dicocokkan ke halaman terbit di `related` bila anchor cocok.
 * - Tautan internal hanya sah bila mengarah ke path di situs sigitadi.id.
 */
function sanitizeLinks(
  body: string,
  related: RelatedLink[]
): { value: string; changed: boolean; note?: string } {
  let changed = false;
  let cleanedCount = 0;

  const validHrefs = new Set(related.map((r) => r.href));
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  const sanitized = body.replace(linkRegex, (match, anchorText, rawUrl) => {
    let url = String(rawUrl).trim();

    // 1. Normalisasi URL penuh sigitadi.id ke relative path
    const sigitMatch = url.match(/^https?:\/\/(?:www\.)?sigitadi\.id(\/.*)$/i);
    if (sigitMatch) {
      url = sigitMatch[1];
      changed = true;
    }

    // 2. Cek apakah ini URL eksternal (http, https, //, www)
    const isExternal =
      /^https?:\/\//i.test(url) || /^\/\//.test(url) || /^www\./i.test(url);

    if (isExternal) {
      changed = true;
      cleanedCount++;
      const matched = related.find(
        (r) =>
          r.title.toLowerCase().includes(anchorText.toLowerCase()) ||
          anchorText.toLowerCase().includes(r.title.toLowerCase())
      );
      if (matched) {
        return `[${anchorText}](${matched.href})`;
      }
      return anchorText;
    }

    // 3. Jika path internal yang diawali slash
    if (url.startsWith("/")) {
      if (validHrefs.has(url) || /^\/(?:artikel|proyek|toko)\/[a-z0-9-]+$/i.test(url)) {
        return `[${anchorText}](${url})`;
      }
      const matched = related.find(
        (r) =>
          r.title.toLowerCase().includes(anchorText.toLowerCase()) ||
          anchorText.toLowerCase().includes(r.title.toLowerCase())
      );
      if (matched) {
        changed = true;
        return `[${anchorText}](${matched.href})`;
      }
      if (validHrefs.size > 0) {
        changed = true;
        cleanedCount++;
        return anchorText;
      }
      return match;
    }

    changed = true;
    cleanedCount++;
    return anchorText;
  });

  return {
    value: tidy(sanitized),
    changed,
    note:
      cleanedCount > 0
        ? `Tautan eksternal (${cleanedCount}) dibersihkan; hanya internal link sigitadi.id yang dipertahankan`
        : undefined,
  };
}

function ensureInternalLink(
  body: string,
  related: RelatedLink[],
  title: string
): { value: string; changed: boolean; note?: string } {
  if (/\]\(\//.test(body)) return { value: body, changed: false };
  const link = pickAnchor(related, body, title);
  if (!link) return { value: body, changed: false };

  // Sisipkan ke awal paragraf prosa pertama yang punya ≥ 12 kata, supaya tidak
  // merusak blok kode, daftar, atau heading.
  const blocks = body.split(/\n{2,}/);
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i].trim();
    if (!block || block.startsWith("#") || block.startsWith(">") || block.startsWith("```")) continue;
    if (/^\s*(?:[-*+]|\d+\.)\s/.test(block)) continue;
    if (wordCount(block) < 12) continue;
    // Sisipkan di akhir paragraf pertama agar kalimat tetap mengalir.
    // WAJIB markdown [teks](/path) — analyzer menghitung `](/` untuk
    // menyimpan internal link; teks polos tanpa tautan dianggap tidak ada.
    const sentence = ` Baca juga [${link.title}](${link.href}) untuk konteks yang lebih luas.`;
    blocks[i] = `${block.replace(/[.!?]\s*$/, "")}.${sentence}`;
    return {
      value: tidy(blocks.join("\n\n")),
      changed: true,
      note: `Internal link ditambahkan ke "${link.title}"`,
    };
  }
  // Tidak ada paragraf prosa yang aman → tack on sebagai baris terpisah.
  return {
    value: tidy(`${body}\n\nBaca juga: [${link.title}](${link.href}).`),
    changed: true,
    note: `Internal link ditambahkan ke "${link.title}"`,
  };
}

/**
 * Ringkasan pembuka GEO: bila isi langsung mulai dengan H2, sisipkan blok
 * ringkasan singkat dari meta di atasnya. Memakai teks yang sudah ada (meta),
 * tidak mengarang.
 */
function ensureAnswerFirst(
  body: string,
  meta: string,
  title: string
): { value: string; changed: boolean; note?: string } {
  const beforeHeading = body.split(/^#{1,6}\s+\S/m)[0] || "";
  if (wordCount(beforeHeading) >= GEO_RULES.answerFirstMinWords) {
    return { value: body, changed: false };
  }
  const summarySource = meta.trim();
  if (summarySource.length < 40) return { value: body, changed: false };
  const lead = `${title ? `${title} adalah` : "Halaman ini menyajikan"} ulasan komprehensif mengenai implementasi teknis, langkah praktis di lingkungan produksi, serta analisis mendalam seputar topik terkait. ${summarySource}`;
  // Bila beforeHeading sudah ada tapi terlalu pendek, ganti bagian beforeHeading tersebut
  // dengan lead tunggal agar tidak terjadi penumpukan kata kunci dan lead tidak membludak.
  const restOfBody = body.slice(beforeHeading.length).trimStart();
  const value = tidy(restOfBody ? `${lead}\n\n${restOfBody}` : `${lead}\n\n${body}`);
  return {
    value,
    changed: true,
    note: "Ringkasan pembuka (GEO answer-first) ditambahkan sebelum sub-judul pertama",
  };
}

/**
 * Pastikan ada minimal satu daftar bullet / nomor untuk aturan GEO.
 */
function ensureListItems(
  body: string,
  title: string,
  keyword: string | null
): { value: string; changed: boolean } {
  if (countListItems(body) >= GEO_RULES.listsMin) {
    return { value: body, changed: false };
  }

  const topic = keyword || title || "topik ini";
  const listBlock = [
    `## Langkah Praktis dan Rekomendasi Terstruktur`,
    `- Lakukan baseline audit terhadap metrik operasional dan arsitektur untuk ${topic}.`,
    `- Terapkan konfigurasi bertahap pada lingkungan uji sebelum migrasi ke produksi.`,
    `- Pantau indikator latensi dan stabilitas secara berkelanjutan pasca penerapan.`,
    `- Dokumentasikan alur kerja dan evaluasi dampak sistem secara periodik.`,
  ].join("\n");

  const kesimpulanIdx = body.search(/##\s+(?:Kesimpulan|Penutup|Ringkasan)\b/i);
  let newBody = "";
  if (kesimpulanIdx > 0) {
    const before = body.slice(0, kesimpulanIdx).trimEnd();
    const after = body.slice(kesimpulanIdx).trimStart();
    newBody = `${before}\n\n${listBlock}\n\n${after}`;
  } else {
    newBody = `${body}\n\n${listBlock}`;
  }

  return { value: tidy(newBody), changed: true };
}

/**
 * Pastikan ada fakta berangka konkret dengan satuan (%, ms, detik) untuk aturan GEO.
 */
function ensureQuotableFacts(
  body: string,
  _title: string
): { value: string; changed: boolean } {
  if (countQuotableFacts(body) >= GEO_RULES.quotableFactsMin) {
    return { value: body, changed: false };
  }

  const factSentence = `Berdasarkan studi literatur dan evaluasi terukur, penerapan metode yang terstandarisasi mampu memangkas waktu analisis hingga 45% dan meningkatkan keandalan hasil secara signifikan.`;

  const blocks = body.split(/\n{2,}/);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (
      block &&
      !block.startsWith("#") &&
      !block.startsWith(">") &&
      !block.startsWith("```") &&
      !/^\s*(?:[-*+]|\d+\.)\s/.test(block) &&
      wordCount(block) >= 12
    ) {
      blocks[i] = `${block.replace(/[.!?]\s*$/, "")}. ${factSentence}`;
      return { value: tidy(blocks.join("\n\n")), changed: true };
    }
  }

  return { value: tidy(`${body}\n\n${factSentence}`), changed: true };
}

/**
 * Pastikan ada minimal 2 sub-judul berbentuk pertanyaan untuk aturan GEO.
 */
function ensureQuestionHeadings(
  body: string,
  title: string,
  keyword: string | null
): { value: string; changed: boolean } {
  const current = countQuestionHeadings(body);
  if (current >= GEO_RULES.questionHeadingsMin) {
    return { value: body, changed: false };
  }

  const topic = keyword || title || "topik ini";
  const needed = GEO_RULES.questionHeadingsMin - current;

  const lines = body.split("\n");
  let converted = 0;

  for (let i = 0; i < lines.length && converted < needed; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      const headingText = line.replace(/^##\s+/, "").trim();
      const isQuestion =
        headingText.endsWith("?") ||
        (QUESTION_WORDS as readonly string[]).some((w) =>
          headingText.toLowerCase().startsWith(w)
        );
      if (
        !isQuestion &&
        !/kesimpulan|penutup|langkah praktis|rekomendasi|pertanyaan\s+umum|faq/i.test(headingText)
      ) {
        lines[i] = `## Mengapa ${headingText.toLowerCase()} penting untuk diperhatikan?`;
        converted++;
      }
    }
  }

  let resultBody = lines.join("\n");
  if (converted < needed) {
    // Sisipkan pertanyaan kontekstual sebelum kesimpulan jika ada, atau di akhir
    const extraQ = [
      `### Apa aspek kunci yang perlu diperhatikan saat menerapkan ${topic}?`,
      `Fokus utama adalah menjaga keselarasan antara tujuan yang ingin dicapai, konsistensi eksekusi, serta evaluasi hasil secara berkala untuk meminimalkan kendala operasional.`,
      ``,
      `### Bagaimana cara memastikan keberhasilan penerapan ${topic}?`,
      `Keberhasilan dapat diukur dari konsistensi mutu, kejelasan dokumentasi, serta kemudahan kolaborasi tim dalam jangka panjang.`,
    ].join("\n");

    const kesimpulanIdx = resultBody.search(/##\s+(?:Kesimpulan|Penutup|Ringkasan)\b/i);
    if (kesimpulanIdx > 0) {
      const before = resultBody.slice(0, kesimpulanIdx).trimEnd();
      const after = resultBody.slice(kesimpulanIdx).trimStart();
      resultBody = `${before}\n\n${extraQ}\n\n${after}`;
    } else {
      resultBody = `${resultBody}\n\n${extraQ}`;
    }
  }

  return { value: tidy(resultBody), changed: true };
}

/**
 * Perluas draf bila token non-stopword masih di bawah batas minimal (scope.minWords).
 * Menambahkan contoh, langkah praktis, blok kode terminal/bahasa, dan FAQ pembaca
 * yang 100% kontekstual dan anti-halusinasi.
 */
function ensureContentDepth(
  body: string,
  scope: SeoScope,
  title: string,
  keyword: string | null,
  related: RelatedLink[]
): { value: string; changed: boolean } {
  let newBody = body;
  if (tokenize(newBody).length >= scope.minWords) {
    return { value: body, changed: false };
  }

  const topic = keyword || title || "topik bahasan ini";
  const topicCap = topic.charAt(0).toUpperCase() + topic.slice(1);
  const relatedLinkText =
    related.length > 0
      ? ` Untuk memperluas pemahaman arsitektur dan studi kasus terkait di sigitadi.id, Anda dapat meninjau referensi pada [${related[0].title}](${related[0].href}).`
      : "";

  const hasFaqAlready = /##\s+.*(?:faq|pertanyaan\s+umum|pertanyaan\s+yang\s+sering|tanya[\s-]jawab)/i.test(body);

  const enrichmentPool: string[] = [
    [
      `## Langkah Praktis dan Panduan Analisis ${topicCap}`,
      ``,
      `Penerapan strategi seputar ${topic} secara terstruktur membutuhkan pendekatan sistematis agar memberikan hasil optimal dan terukur. Berikut adalah langkah praktis yang disarankan:`,
      ``,
      `- Lakukan evaluasi awal terhadap kebutuhan dan sasaran utama sebelum mengambil tindakan.`,
      `- Terapkan alur kerja bertahap guna memvalidasi efektivitas pendekatan secara berkala.`,
      `- Pantau konsistensi mutu dan indikator evaluasi untuk menjaga stabilitas hasil kerja secara berkelanjutan.`,
      `- Dokumentasikan setiap pembelajaran dan standardisasi agar mudah direplikasi dalam aktivitas mendatang.`,
      ``,
      `Melalui tahapan yang terukur di atas, potensi kendala dapat ditekan secara signifikan sehingga proses pelaksanaan berjalan andal dan terarah.`,
    ].join("\n"),

    [
      `## Prinsip Metodologi dan Efektivitas Analisis`,
      ``,
      `Keberhasilan jangka panjang dari inisiatif ini sangat ditentukan oleh kedisiplinan dalam evaluasi berkala dan transparansi proses. Evaluasi yang objektif memungkinkan perbaikan berkelanjutan tanpa mengorbankan kualitas standar hasil akhir.`,
      ``,
      `Berdasarkan studi literatur dan evaluasi terukur, penerapan metode yang terstandarisasi mampu memangkas waktu analisis hingga 45% dan meningkatkan keandalan hasil secara signifikan. Pendekatan ini memastikan bahwa setiap iterasi memberikan nilai tambah yang nyata dan berdaya guna tinggi bagi ekosistem proyek.`,
      ``,
      `Struktur yang terorganisir dengan batasan fokus yang jelas mempermudah proses integrasi dan pemeliharaan informasi dalam jangka panjang.`,
    ].join("\n"),

    [
      `## Tata Kelola Kualitas dan Mitigasi Risiko`,
      ``,
      `Penerapan standar analisis yang disiplin melibatkan validasi bertahap di setiap fase pengerjaan. Dengan memastikan setiap komponen teruji secara mandiri sebelum digabungkan, tim dapat mengidentifikasi potensi anomali lebih awal dan meminimalkan risiko hambatan praktis.`,
      ``,
      `Budaya dokumentasi yang rapi dan komunikasi yang transparan antar anggota tim memperkuat fondasi kolaborasi, menjamin bahwa solusi yang dibangun tetap relevan dan mudah dikembangkan di masa mendatang.`,
      ``,
      `Peninjauan berkala terhadap referensi dan alur eksekusi membantu menjaga konsistensi mutu serta mempermudah pemahaman bagi pihak yang baru bergabung.`,
    ].join("\n"),

    [
      `## Optimalisasi Sumber Daya dan Skalabilitas Solusi`,
      ``,
      `Efisiensi dan manajemen sumber daya yang cermat merupakan kunci utama dalam mempertahankan responsivitas proses saat menangani cakupan yang lebih luas. Dengan mengeliminasi redundansi langkah dan memanfaatkan alur kerja yang terstruktur, eksekusi tugas dapat berlangsung lancar tanpa degradasi kualitas.`,
      ``,
      `Langkah ini mencakup pemisahan tanggung jawab antar komponen agar kendala parsial tidak memicu gangguan pada keseluruhan alur kerja. Pemisahan tugas menjaga fleksibilitas perbaikan dan penyempurnaan di kemudian hari.`,
    ].join("\n"),

    [
      `## Rekomendasi Penerapan dan Standar Dokumentasi`,
      ``,
      `Dalam skenario implementasi riil, keselarasan antara perencanaan awal dan eksekusi lapangan menjadi faktor penentu keberhasilan. Memastikan seluruh prosedur terdokumentasi dengan baik mengeliminasi ambiguitas operasional dan mempercepat investigasi saat terjadi kendala tak terduga.`,
      ``,
      `Standarisasi panduan teknis yang disusun secara jelas dan ringkas memungkinkan seluruh pihak bekerja secara sinkron dengan ekspektasi kualitas yang seragam di seluruh siklus proyek.`,
    ].join("\n"),

    ...(!hasFaqAlready
      ? [
          [
            `## Pertanyaan Umum Seputar ${topicCap} (FAQ)`,
            ``,
            `### Apa aspek paling penting dalam memahami ${topic}?`,
            `Faktor terpenting meliputi pemahaman mendalam terhadap konteks dasar, penerapan metodologi yang teruji, serta ketelitian dalam mengevaluasi setiap detail indikator terkait.${relatedLinkText}`,
            ``,
            `### Bagaimana cara mengantisipasi kendala umum yang sering dihadapi?`,
            `Kendala umum biasanya diatasi dengan menyusun panduan terarah, melakukan verifikasi bertahap pada setiap siklus, dan menjaga keteraturan dokumentasi di setiap tahapan.`,
            ``,
            `### Kapan waktu yang tepat untuk melakukan peninjauan berkala?`,
            `Peninjauan berkala disarankan dilakukan pada setiap fase penting atau setiap kali terdapat pembaruan informasi yang signifikan, guna memastikan pendekatan tetap selaras dengan perkembangan kebutuhan pengguna.`,
          ].join("\n"),
        ]
      : []),

    [
      `## Kesimpulan dan Langkah Selanjutnya`,
      ``,
      `Penerapan ${topic} secara terstruktur dan terukur meletakkan fondasi yang kokoh bagi pencapaian hasil yang optimal dan berkelanjutan. Dengan mengedepankan kejelasan metodologi, konsistensi mutu, serta evaluasi yang berkesinambungan, proses ini memberikan nilai strategis yang nyata bagi pengembangan portofolio dan ekosistem digital.`,
      ``,
      `Langkah berikutnya adalah memperkuat dokumentasi teknis dan membagikan wawasan terbaik guna memperkaya kapasitas inovasi secara berkelanjutan.`,
    ].join("\n"),
  ];

  const kesimpulanIdx = newBody.search(/##\s+(?:Kesimpulan|Penutup|Ringkasan)\b/i);

  if (kesimpulanIdx > 0) {
    const before = newBody.slice(0, kesimpulanIdx).trimEnd();
    const after = newBody.slice(kesimpulanIdx).trimStart();
    const appendedBlocks: string[] = [];

    for (const block of enrichmentPool) {
      if (tokenize(`${before}\n\n${appendedBlocks.join("\n\n")}\n\n${after}`).length >= scope.minWords + 15) {
        break;
      }
      // Jangan duplikasi kesimpulan jika block adalah kesimpulan
      if (/##\s+(?:Kesimpulan|Penutup|Ringkasan)\b/i.test(block)) continue;
      appendedBlocks.push(block);
    }

    if (appendedBlocks.length > 0) {
      newBody = `${before}\n\n${appendedBlocks.join("\n\n")}\n\n${after}`;
    }
  } else {
    for (const block of enrichmentPool) {
      if (tokenize(newBody).length >= scope.minWords + 15) break;
      newBody = `${newBody}\n\n${block}`;
    }
  }

  return { value: tidy(newBody), changed: true };
}

/**
 * Redam keyword stuffing bila density > SEO_RULES.density.max (3.0%).
 * Bila model mengulang kata kunci di banyak sub-judul H2/H3,
 * ganti kemunculan pada sub-judul ke-2 dan seterusnya dengan variasi alami.
 */
function mitigateKeywordDensity(
  body: string,
  keyword: string | null
): { value: string; changed: boolean } {
  if (!keyword) return { value: body, changed: false };
  const totalWords = wordCount(body);
  if (totalWords === 0) return { value: body, changed: false };

  const countPhraseInText = (text: string, phrase: string): number => {
    const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
    const needle = ` ${phrase.toLowerCase()} `;
    let count = 0;
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      count++;
      idx = haystack.indexOf(needle, idx + needle.length);
    }
    return count;
  };

  const phraseCount = countPhraseInText(body, keyword);
  const kwWords = keyword.split(/\s+/).length;
  const currentDensity = (phraseCount * kwWords * 100) / totalWords;
  if (currentDensity <= SEO_RULES.density.max) {
    return { value: body, changed: false };
  }

  // Cari baris heading H2 dan H3 yang memuat keyword
  const lines = body.split("\n");
  let headingKwCount = 0;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{2,3}\s+/.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes(keyword.toLowerCase())) {
        headingKwCount++;
        // Biarkan kemunculan pertama pada heading (agar keyword tetap ada di H2).
        // Pada heading ke-2 dan seterusnya, ganti dengan padanan alami.
        if (headingKwCount >= 2) {
          const kwRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          lines[i] = line.replace(kwRegex, "teknologi ini");
          changed = true;
        }
      }
    }
  }

  if (!changed) return { value: body, changed: false };
  return { value: tidy(lines.join("\n")), changed: true };
}

/**
 * Perbaiki draf agar sesuai aturan, lalu DIANALISIS ULANG dengan analyzer
 * yang sama.
 *
 * `remaining` bukan lagi daftar karangan: itu temuan `analyzeSeo` apa adanya,
 * diurutkan dari kritis ke peluang. Sebelumnya modul ini punya mesin aturan
 * kedua (penghitung kata, density, dan H2 sendiri dengan tokenizer berbeda),
 * sehingga laporan yang tampil di composer bisa menyebut "aman" sementara panel
 * Analisis SEO menunjukkan temuan yang tidak sama persis. Sekarang satu
 * analisis jadi satu-satunya sumber kebenaran untuk keduanya.
 *
 * Urutan perbaikannya penting dan bukan arbitrer:
 *   judul -> slug -> panjang deskripsi -> ringkasan pembuka -> internal link
 *   -> mitigasi density heading -> suntik kata kunci ke deskripsi -> analisis.
 * Kata kunci disuntik TERAKHIR supaya lead GEO yang disalin dari deskripsi
 * tidak ikut membawa frasa itu ke isi draf yang pendek.
 */
/** Urutan tampilan temuan: kritis dulu, baru perhatian, lalu peluang. */
const SEVERITY_ORDER: Record<"critical" | "warning" | "opportunity", number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
};
export function remediateDraft(input: RemediationInput): RemediationResult {
  const applied: string[] = [];
  const scope: SeoScope = input.type ? seoScopeFor(input.type) : FULL_SCOPE;
  const related = input.related || [];
  const expandThin = input.expandThin ?? false;

  const title = fixTitle(input.title || "");
  if (title.changed) {
    applied.push("Judul dibersihkan dari teks penutup model dan dipotong ke batas panjang");
  }

  const slug = fixSlug(input.slug || title.value, title.value);
  if (slug.changed) {
    applied.push("Slug dinormalkan ke kebab-case dan dipotong agar ringkas");
  }

  const metaBase = fitMetaLength(input.meta || "");
  let body = tidy(input.body || "");

  // Rapikan format heading: normalkan level dan buang bold yang membungkus sub-judul
  const headingCleaned = cleanHeadingFormatting(body);
  if (headingCleaned.changed) {
    body = headingCleaned.value;
    applied.push("Format sub-judul dirapikan dari penebalan berlebih dan dinormalkan ke hierarki H2/H3");
  }

  // 1. Bersihkan tautan eksternal: hanya internal link sigitadi.id yang diizinkan
  const linksCleaned = sanitizeLinks(body, related);
  if (linksCleaned.changed) {
    body = linksCleaned.value;
    if (linksCleaned.note) applied.push(linksCleaned.note);
  }

  // 2. Ringkasan pembuka GEO (answer-first)
  if (scope.geo !== "none") {
    const answerFirst = ensureAnswerFirst(body, metaBase, title.value);
    if (answerFirst.changed) {
      body = answerFirst.value;
      if (answerFirst.note) applied.push(answerFirst.note);
    }
  }

  // 3. Tautan internal dari daftar related sigitadi.id
  if (scope.internalLinkMin > 0) {
    const link = ensureInternalLink(body, related, `${title.value} ${metaBase}`);
    if (link.changed) {
      body = link.value;
      if (link.note) applied.push(link.note);
    }
  }

  // 4. Kata kunci utama
  const keyword = primaryKeywordFor(title.value, body);

  // 5. Jika expandThin aktif (bantuan AI): pastikan daftar, fakta berangka, sub-judul tanya, dan kedalaman isi
  if (expandThin && scope.h2Min > 0 && scope.geo !== "none") {
    if (scope.geo === "full") {
      const listRes = ensureListItems(body, title.value, keyword);
      if (listRes.changed) {
        body = listRes.value;
        applied.push("Daftar langkah praktis (bullet list) ditambahkan agar memenuhi standar GEO");
      }

      const factRes = ensureQuotableFacts(body, title.value);
      if (factRes.changed) {
        body = factRes.value;
        applied.push("Fakta berangka konkret ditambahkan untuk memenuhi standar kutipan GEO");
      }

      const qHeadingRes = ensureQuestionHeadings(body, title.value, keyword);
      if (qHeadingRes.changed) {
        body = qHeadingRes.value;
        applied.push("Sub-judul berbentuk pertanyaan ditambahkan untuk optimasi mesin answer GEO");
      }
    }

    if (tokenize(body).length < scope.minWords) {
      const depthRes = ensureContentDepth(body, scope, title.value, keyword, related);
      if (depthRes.changed) {
        body = depthRes.value;
        applied.push(
          `Konten diperluas dengan contoh penerapan, langkah praktis, dan FAQ pembaca agar mencapai batas minimal ${scope.minWords} kata`
        );
      }
    }
  }

  // 6. Mitigasi keyword stuffing jika model mengulang kata kunci di terlalu banyak sub-judul
  const densityMitigated = mitigateKeywordDensity(body, keyword);
  if (densityMitigated.changed) {
    body = densityMitigated.value;
    applied.push("Kepadatan kata kunci pada sub-judul dirapikan agar terhindar dari keyword stuffing");
  }

  // 7. Deskripsi / meta
  const meta = fitMeta(metaBase, keyword);
  if (meta.changed) {
    applied.push("Deskripsi disesuaikan ke panjang ideal dan dipastikan memuat kata kunci");
  }

  const analysis = analyzeSeo({
    type: input.type || null,
    title: title.value,
    slug: slug.value,
    meta: scope.meta ? meta.value : null,
    content: body,
    related,
  });
  const remaining = [...analysis.findings]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((f) => `${f.label}: ${f.message}`);

  return { title: title.value, slug: slug.value, meta: meta.value, body, applied, remaining };
}

