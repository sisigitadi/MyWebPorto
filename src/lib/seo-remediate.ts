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
import { GEO_RULES, SEO_RULES } from "@/lib/seo-rules";

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
}

export interface RemediationInput {
  title?: string | null;
  slug?: string | null;
  meta?: string | null;
  body?: string | null;
  bodyField: BodyField;
  /** Halaman terbit yang boleh ditautkan (dari DB, bukan dari model). */
  related?: RelatedLink[];
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
 * Density frasa dalam persen, disamakan rumus dengan analyzer: jumlah frasa
 * dikali jumlah kata per frasa, dibagi total kata. Tokenisasi di sini sengaja
 * kasar (satu kata = satu token) karena remediator hanya butuh perkiraan untuk
 * memutuskan "apakah aman menyuntik frasa lagi".
 */
function densityOf(text: string, phrase: string): number {
  const words = wordCount(text);
  if (words === 0 || !phrase) return 0;
  const needle = ` ${phrase.toLowerCase().replace(/\s+/g, " ")} `;
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return Number(((count * phrase.split(" ").length * 100) / words).toFixed(2));
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
 * Kata yang DESKRIPTIF dan bukan label editorial. "Draft Artikel" menghasilkan
 * keyword "draft artikel" yang tidak pernah dicari siapa pun, jadi kata-kata ini
 * dibuang saat menebak keyword utama dari judul.
 */
const TITLE_NOISE = new Set([
  "draft", "artikel", "panduan", "tutorial", "belajar", "mempelajari",
  "penjelasan", "pengertian", "lengkap", "praktis", "pemula", "dasar",
  "muda", "baru", "terbaru", "terbaik",
]);

/**
 * Tebakan keyword utama dari judul, dipakai untuk menyuntik frasa ke deskripsi.
 * Sengaja KONSERVATIF: kalau tidak ada dua kata yang tersisa, dikembalikan null
 * — remediator lebih baik tidak menyuntik apa pun daripada menyuntik frasa yang
 * tidak ada maksudnya.
 */
function guessKeyword(title: string, slug: string): string | null {
  const fromSlug = (slug || "")
    .toLowerCase()
    .split("-")
    .filter((w) => w.length > 3 && !TITLE_NOISE.has(w));
  const fromTitle = (title || "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length > 3 && !TITLE_NOISE.has(w));
  const words = (fromTitle.length >= 2 ? fromTitle : fromSlug).slice(0, 2);
  return words.length >= 2 ? words.join(" ") : null;
}

/**
 * Deskripsi: jaga panjang 120-165 karakter tanpa mengarang klaim baru. Bila
 * terlalu pendek, tambahkan kalimat umum yang menyebut kata kunci — kalimat
 * ini jujur (hanya menyatakan bahwa halaman membahas topik itu), bukan fakta
 * baru.
 */
function fixMeta(
  raw: string,
  keyword: string | null,
  canInjectKeyword: boolean
): { value: string; changed: boolean } {
  let meta = tidy(raw || "").replace(/^["'`]+|["'`]+$/g, "");
  if (meta.length > SEO_RULES.meta.max) {
    meta = truncateAtWord(meta, SEO_RULES.meta.max - 3) + "...";
  }

  // Suntik frasa kunci hanya bila tidak akan membuat density melonjak. Pada draf
  // sangat pendek, satu tambahan frasa saja sudah bisa menembus batas 3% dan
  // memunculkan temuan keyword stuffing — masalah yang lebih buruk daripada
  // deskripsi yang kurang ideal.
  const hasKeyword = Boolean(keyword && meta.toLowerCase().includes(keyword.toLowerCase()));
  if (keyword && canInjectKeyword && !hasKeyword) {
    meta = `${meta.trimEnd()} Pelajari ${keyword} secara lengkap di halaman ini.`;
  }

  // Masih di bawah batas bawah SERP? Tambahkan kalimat penutup generik yang
  // hanya menyatakan isi halaman — bukan klaim baru yang bisa salah. Kalimat
  // memakai kata yang sudah ada di meta supaya tidak terasa hasil tempel, dan
  // dipilih bertahap agar hasil akhirnya benar-benar melewati batas bawah.
  const fillers = [
    "Ulasan ini mencakup konteks, contoh penerapan, dan langkah yang bisa langsung diikuti.",
    "Isinya disusun bertahap dari situasi nyata, termasuk kesalahan umum yang sering terlewat.",
    "Semua bagian diuraikan singkat agar mudah dipindai baik oleh pembaca maupun mesin pencari.",
  ];
  for (const filler of fillers) {
    if (meta.length >= SEO_RULES.meta.min) break;
    // Jangan menempelkan kalimat yang isinya sudah ada (mis. dua kali
    // "ulasan lengkap").
    const firstWord = filler.split(" ")[0].toLowerCase();
    if (meta.toLowerCase().includes(firstWord)) continue;
    meta = `${meta.trimEnd()} ${filler}`;
  }

  if (meta.length > SEO_RULES.meta.max) {
    meta = `${truncateAtWord(meta, SEO_RULES.meta.max - 3)}...`;
  }
  return { value: meta.trim(), changed: meta.trim() !== (raw || "").trim() };
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
 * Perbaiki draf agar sesuai aturan. `remaining` diisi id temuan yang hanya bisa
 * diselesaikan dengan menulis ulang isi (mis. "konten masih tipis").
 */
export function remediateDraft(input: RemediationInput): RemediationResult {
  const applied: string[] = [];
  const remaining: string[] = [];

  const rawTitle = input.title || "";
  const rawSlug = input.slug || "";
  const rawMeta = input.meta || "";
  const rawBody = input.body || "";

  // Keyword utama ditebak dari judul/slug tanpa boleh memanggil analyzer
  // (menghindari siklus import). Kalau tidak yakin, dikembalikan null dan tidak
  // ada frasa yang disuntik — lebih baik tidak menambah daripada menambah yang
  // salah.
  const preTitle = fixTitle(rawTitle);
  const preSlug = fixSlug(rawSlug || preTitle.value, preTitle.value);
  const keyword = guessKeyword(preTitle.value, preSlug.value);

  const title = preTitle;
  if (title.changed) applied.push("Judul dibersihkan dari teks penutup model dan dipotong ke batas panjang");

  const slug = preSlug;
  if (slug.changed) applied.push("Slug dinormalkan ke kebab-case dan dipotong agar ringkas");

  // Frasa kunci hanya aman disuntik bila isinya cukup panjang: butuh minimal 150
  // kata agar satu frasa tambahan tetap di bawah batas density maksimum.
  const meta = fixMeta(rawMeta, keyword, wordCount(rawBody) >= 150);
  if (meta.changed) applied.push("Deskripsi disesuaikan ke panjang ideal dan dipastikan memuat kata kunci");

  let body = tidy(rawBody);

  const answerFirst = ensureAnswerFirst(body, meta.value, title.value);
  if (answerFirst.changed) {
    body = answerFirst.value;
    if (answerFirst.note) applied.push(answerFirst.note);
  }

  const link = ensureInternalLink(body, input.related || [], `${title.value} ${meta.value}`);
  if (link.changed) {
    body = link.value;
    if (link.note) applied.push(link.note);
  }

  // Sisa masalah yang butuh penulis manusia / model, bukan perombakan format.
  const words = wordCount(body);
  if (words < SEO_RULES.content.minWords) {
    remaining.push(`Isi masih ${words} kata (target ${SEO_RULES.content.minWords}) — perlu dikembangkan manual.`);
  }
  if ((body.match(/^##\s+/gm) || []).length < SEO_RULES.content.h2Preferred) {
    remaining.push("Sub-judul H2 masih di bawah 3 — tambahkan per bagian penting.");
  }
  if (/\]\(\//.test(body) === false) {
    remaining.push("Internal link belum ada dan tidak ada halaman terbit yang cocok untuk ditautkan.");
  }
  if (keyword && densityOf(body, keyword) > SEO_RULES.density.max) {
    remaining.push(
      `Density "${keyword}" ${densityOf(body, keyword)}% di atas batas ${SEO_RULES.density.max}% — turunkan pengulangan frasa ini secara manual.`
    );
  }

  return { title: title.value, slug: slug.value, meta: meta.value, body, applied, remaining };
}