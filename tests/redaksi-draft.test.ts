import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  generateLocalFallbackDraft,
  parseDraft,
  PROFILE_CONTEXT_MARKER,
  type DraftResult,
} from "@/lib/redaksi-draft";
import { analyzeSeo } from "@/lib/seo-keywords";
import { GEO_RULES, SEO_RULES } from "@/lib/seo-rules";
import { sanitizeProviderError } from "@/lib/ai-provider";
import { describeProviderFailure } from "@/lib/redaksi-draft";

/**
 * Fungsi murni — tidak menyentuh settings/DB, jadi aman jalan paralel.
 * parseDraft sengaja di-export agar lapisan parsing (keamanan: strip aset,
 * tolak JSON rusak, tetap teks polos) teruji tanpa memanggil provider AI.
 */

describe("extractJsonObject", () => {
  it("string kosong/bukan objek → null", () => {
    expect(extractJsonObject("")).toBe(null);
    expect(extractJsonObject("   ")).toBe(null);
    expect(extractJsonObject("tidak ada brace sama sekali")).toBe(null);
  });

  it("objek polos dikembalikan utuh", () => {
    expect(extractJsonObject('{"title":"A","content":"B"}')).toBe(
      '{"title":"A","content":"B"}'
    );
  });

  it("membuang pembungkus ```json dan teks di sekitarnya", () => {
    const raw = [
      "Tentu, ini draft-nya:",
      "```json",
      '{"title":"A","content":"B"}',
      "```",
      "Semoga membantu!",
    ].join("\n");
    expect(extractJsonObject(raw)).toBe('{"title":"A","content":"B"}');
  });

  it("brace bersarang seimbang — objek dalam diambil penuh", () => {
    const raw = '{"a":{"b":{"c":1}},"d":2}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("brace di dalam string TIDAK dihitung", () => {
    // '}' di dalam nilai string tidak boleh menutup objek prematur.
    const raw = '{"content":"ini } karakter"}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("brace tidak seimbang → null (tidak throw)", () => {
    expect(extractJsonObject('{"title":"A"')).toBe(null);
    expect(extractJsonObject('{"a":{"b":1}')).toBe(null);
  });

  it("escape \\\\\" di dalam string tidak merusak pelacakan", () => {
    const raw = '{"content":"kata \\"jalan\\""}';
    expect(extractJsonObject(raw)).toBe(raw);
  });
});

describe("parseDraft — penolakan & keamanan", () => {
  it("bukan JSON valid → ok:false, pesan Bahasa Indonesia", () => {
    const r = parseDraft("article", "judul artikel\n\nisi artikel yang panjang sekali");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/JSON/);
  });

  it("JSON syntax error → ok:false", () => {
    // braces seimbang tapi isi invalid (nilai tak dikutip) → gagal di JSON.parse
    const r = parseDraft("article", '{title:A,"content":"isi artikel"}');
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/tidak valid/);
  });

  it("JSON valid tapi bukan objek (array) → ok:false", () => {
    const r = parseDraft("article", '["a","b"]');
    expect(r.ok).toBe(false);
  });

  it("konten terlalu pendek → ok:false (schema min)", () => {
    const r = parseDraft("article", '{"content":"pendek"}');
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/format/);
  });

  it("field aset/URL dari AI DILUCUTI (imageUrl, gallery, cvUrl, dll)", () => {
    const raw = JSON.stringify({
      title: "Proyek A",
      description: "Deskripsi proyek yang cukup panjang dan informatif",
      imageUrl: "https://evil.example.com/x.png",
      avatarUrl: "https://evil.example.com/a.png",
      gallery: ["https://evil.example.com/1.jpg", "https://evil.example.com/2.jpg"],
      cvUrl: "https://evil.example.com/cv.pdf",
      paymentQrUrl: "https://evil.example.com/qr.png",
      socialLinks: { instagram: "@fake" },
    });
    const r = parseDraft("project", raw);
    expect(r.ok).toBe(true);
    const data = (r as { draft: { data: Record<string, unknown> } }).draft.data;
    expect(data.imageUrl).toBeUndefined();
    expect(data.avatarUrl).toBeUndefined();
    expect(data.gallery).toBeUndefined();
    expect(data.cvUrl).toBeUndefined();
    expect(data.paymentQrUrl).toBeUndefined();
    expect(data.socialLinks).toBeUndefined();
    // Field teks yang sah tetap dipertahankan.
    expect(data.title).toBe("Proyek A");
    expect(data.description).toBe("Deskripsi proyek yang cukup panjang dan informatif");
  });

  it("injeksi HTML tetap sebagai teks polos (bukan DOM) — dirender aman oleh FormattedText", () => {
    const raw = JSON.stringify({
      title: "Artikel A",
      content: '<script>alert(1)</script> ## Bagian <img src="x" onerror="y">',
    });
    const r = parseDraft("article", raw);
    expect(r.ok).toBe(true);
    const data = (r as { draft: { data: { content: string } } }).draft.data;
    // String dipertahankan apa adanya; React/FormattedText yang meng-escape,
    // bukan parser ini. Tidak ada sanitasi yang mengubah makna teks.
    expect(data.content).toContain("<script>alert(1)</script>");
    expect(data.content).toContain("## Bagian");
  });

  it("format markdown-ish (## ### > ```) dipertahankan", () => {
    const raw = JSON.stringify({
      title: "Artikel A",
      content: "## Pendahuluan\n\nIsi.\n\n> Kutipan\n\n```js\nconst a = 1;\n```",
    });
    const r = parseDraft("article", raw);
    expect(r.ok).toBe(true);
    const content = (r as { draft: { data: { content: string } } }).draft.data.content;
    expect(content).toContain("## Pendahuluan");
    expect(content).toContain("> Kutipan");
    expect(content).toContain("```js");
  });

  it("array dari model yang dikirim sebagai string dipisah koma → dinormalisasi", () => {
    const raw = JSON.stringify({
      title: "Artikel A",
      content: "Isi artikel yang panjang dan bermakna.",
      tags: "Next.js, TypeScript, React",
    });
    const r = parseDraft("article", raw);
    expect(r.ok).toBe(true);
    const data = (r as { draft: { data: { tags: string[] } } }).draft.data;
    expect(data.tags).toEqual(["Next.js", "TypeScript", "React"]);
  });

  it("array kosong & tag lebih dari batas tetap divalidasi (default [])", () => {
    const raw = JSON.stringify({ content: "Isi artikel yang panjang dan bermakna." });
    const r = parseDraft("article", raw);
    expect(r.ok).toBe(true);
    expect((r as { draft: { data: { tags: unknown } } }).draft.data.tags).toEqual([]);
  });

  it("tipe yang tidak dikenal → ok:false", () => {
    const r = parseDraft("unknown" as never, "apa saja");
    expect(r.ok).toBe(false);
  });

  it("setiap tipe konten punya schema sendiri (service tanpa content)", () => {
    const r = parseDraft(
      "service",
      JSON.stringify({ title: "Web Dev", description: "Pembuatan aplikasi web" })
    );
    expect(r.ok).toBe(true);
    const draft = (r as Extract<DraftResult, { ok: true }>).draft;
    expect(draft.type).toBe("service");
    expect(draft.data).toMatchObject({ title: "Web Dev", description: "Pembuatan aplikasi web" });
  });
});

// Bug yang dilaporkan: "Provider AI gagal merespons" tetap muncul setelah
// provider dan API key diganti beberapa kali. Penyebabnya information loss
// dua lapis: ai-openai.ts membuang status + body, lalu redaksi-draft.ts
// membuang bahkan `reason` yang sudah disediakan. Akibatnya HTTP 403
// "no active subscription" (tagihan akun belum aktif) terlihat identik
// dengan HTTP 401 "kunci salah" — dua masalah yang solusinya sepenuhnya
// BERbeda, tapi keduanya membuat admin mengganti kunci tanpa henti.
describe("diagnosis kegagalan provider", () => {
  it("403 dari relay menyingkap soal tagihan, bukan masalah kunci", () => {
    // Balasan nyata dari relay yang dipakai admin:
    const body =
      '{"error":{"message":"insufficient quota: no active subscription","code":"insufficient_user_quota"}}';
    const msg = describeProviderFailure("openai", "status_403", sanitizeProviderError(body));
    expect(msg).toMatch(/403/);
    expect(msg).toMatch(/langganan\/quota akun provider belum aktif/);
    // Petunjuk paling berguna harus ikut: kode dari provider.
    expect(msg).toContain("insufficient_user_quota");
  });

  it("setiap kodeHTTP punya tindakan yang spesifik", () => {
    expect(describeProviderFailure("openai", "status_401")).toMatch(/kunci salah|kedaluwarsa/);
    expect(describeProviderFailure("openai", "status_404")).toMatch(/tidak ditemukan/);
    expect(describeProviderFailure("openai", "status_429")).toMatch(/[Kk]uota/);
    expect(describeProviderFailure("openai", "status_400")).toMatch(/[Bb]iasanya nama model/);
    expect(describeProviderFailure("openai", "network")).toMatch(/[Tt]idak ada respons/);
    expect(describeProviderFailure("openai", "empty_cloud")).toMatch(/kosong/);
    expect(describeProviderFailure("openai", "unconfigured")).toMatch(/belum dikonfigurasi/);
  });

  it("kode 5xx disebut sebagai gangguan layanan, bukan masalah akun", () => {
    expect(describeProviderFailure("openai", "status_503")).toMatch(/bermasalah/);
  });

  it("tanpa kode tetap memberi tahu provider mana yang dipakai", () => {
    expect(describeProviderFailure("gemini", undefined)).toContain("gemini");
  });

  it("pesan error tidak membocorkan kunci API", () => {
    const key = "sk-hgkTrpB9yjYg2RKKMF3Z4SHw8oP6tgoV9bE6oyn9xa0zAo4V";
    const dirty = sanitizeProviderError(`invalid key ${key} supplied`, key);
    expect(dirty).not.toContain(key);
    expect(dirty).toContain("[disembunyikan]");
  });

  it("pesan error dipangkas 200 karakter agar tidak membanjiri UI", () => {
    const long = sanitizeProviderError("x".repeat(1000));
    expect(long.length).toBeLessThanOrEqual(200);
  });

  it("whitespace diratakan menjadi satu baris", () => {
    expect(sanitizeProviderError("a\n\n  b\t c")).toBe("a b c");
  });

  it("body kosong tidak menghasilkan pesan kosong yang membingungkan", () => {
    expect(describeProviderFailure("openai", "status_500", sanitizeProviderError(""))).toMatch(
      /bermasalah/
    );
  });
});

describe("PROFILE_CONTEXT_MARKER", () => {
  it("placeholder unik diganti pemanggil (bukan hardcoded di prompt)", () => {
    expect(typeof PROFILE_CONTEXT_MARKER).toBe("string");
    expect(PROFILE_CONTEXT_MARKER.length).toBeGreaterThan(0);
  });
});

// Bug yang dilaporkan admin: tombol "Bantuan AI" mengembalikan draf yang
// sama persis dengan kerangka lokal ini (judul = brief, 1 H2, tanpa fakta,
// tanpa daftar, tanpa sub-judul tanya), lalu dilaporkan sebagai "Draf AI".
// Tes ini mengunci dua sisi: kerangkanya patuh struktur GEO, dan penanda
// fallback ada supaya UI tidak lagi menganggap model yang gagal sebagai sukses.
describe("kerangka fallback lokal", () => {
  const draft = generateLocalFallbackDraft("article", "kali linux");
  const data = draft.data as { title: string; slug: string; summary: string; content: string };
  const analysis = analyzeSeo({
    title: data.title,
    slug: data.slug,
    meta: data.summary,
    content: data.content,
  });

  it("memakai brief sebagai judul, bukan teks penutup model", () => {
    expect(data.title).toBe("kali linux");
    expect(data.slug).toBe("kali-linux");
  });

  it("sudah memenuhi aturan struktur GEO yang diminta analyzer", () => {
    // Ringkasan pembuka sebelum sub-judul pertama.
    expect(analysis.metrics.answerFirstWords).toBeGreaterThanOrEqual(
      GEO_RULES.answerFirstMinWords
    );
    // Minimal 3 H2.
    expect(analysis.metrics.h2Count).toBeGreaterThanOrEqual(SEO_RULES.content.h2Preferred);
    // Sub-judul berbentuk pertanyaan.
    expect(analysis.metrics.questionHeadings).toBeGreaterThanOrEqual(
      GEO_RULES.questionHeadingsMin
    );
    // Ada daftar.
    expect(analysis.metrics.listItems).toBeGreaterThanOrEqual(GEO_RULES.listsMin);
  });

  it("meminta fakta berangka secara eksplisit tanpa mengarang angkanya sendiri", () => {
    // Angka contoh (250 ms / 40%) ada sebagai placeholder yang harus diganti
    // admin, dan analyzer membacanya sebagai fakta berangka.
    expect(analysis.metrics.quotableFacts).toBeGreaterThanOrEqual(
      GEO_RULES.quotableFactsMin
    );
    expect(data.content).toMatch(/fakta berangka/i);
  });

  it("tidak memicu temuan GEO struktural apa pun", () => {
    const geoIds = analysis.findings
      .filter((f) => f.id.startsWith("geo-"))
      .map((f) => f.id);
    expect(geoIds).toEqual([]);
  });

  it("tetap dilaporkan jujur sebagai draf tipis — isi wajib ditulis manusia", () => {
    // Kerangka bukan artikel: analyzer tetap harus menyuruh admin mengembangkan.
    expect(analysis.findings.map((f) => f.id)).toContain("content-thin");
  });
});
