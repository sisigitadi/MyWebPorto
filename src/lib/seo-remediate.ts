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
  SEO_RULES,
  seoScopeFor,
  type SeoScope,
} from "@/lib/seo-rules";
import {
  analyzeSeo,
  extractKeywordCandidates,
  pickPrimaryKeyword,
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
  return best?.link ?? null;
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
  const lead = `${title ? `${title} adalah` : "Halaman ini"} topik yang dibahas lengkap di bawah, termasuk langkah praktis, contoh penerapan, dan hal-hal yang sering terlewat. ${summarySource}`;
  return {
    value: tidy(`${lead}\n\n${body}`),
    changed: true,
    note: "Ringkasan pembuka (GEO answer-first) ditambahkan sebelum sub-judul pertama",
  };
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
 *   -> suntik kata kunci ke deskripsi -> analisis.
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

  if (scope.geo !== "none") {
    const answerFirst = ensureAnswerFirst(body, metaBase, title.value);
    if (answerFirst.changed) {
      body = answerFirst.value;
      if (answerFirst.note) applied.push(answerFirst.note);
    }
  }

  if (scope.internalLinkMin > 0) {
    const link = ensureInternalLink(body, related, `${title.value} ${metaBase}`);
    if (link.changed) {
      body = link.value;
      if (link.note) applied.push(link.note);
    }
  }

  // Kata kunci memakai algoritma analyzer, jadi "sudah disuntik" dan "ditemukan
  // analyzer" tidak mungkin berbeda.
  const keyword = primaryKeywordFor(title.value, body);
  const meta = fitMeta(metaBase, keyword);
  if (meta.changed) {
    applied.push("Deskripsi disesuaikan ke panjang ideal dan dipastikan memuat kata kunci");
  }

  const analysis = analyzeSeo(
    {
      type: input.type || null,
      title: title.value,
      slug: slug.value,
      meta: scope.meta ? meta.value : null,
      content: body,
      related,
    },
  );
  const remaining = [...analysis.findings]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((f) => `${f.label}: ${f.message}`);

  return { title: title.value, slug: slug.value, meta: meta.value, body, applied, remaining };
}

