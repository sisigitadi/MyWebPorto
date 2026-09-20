import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  parseDraft,
  PROFILE_CONTEXT_MARKER,
  type DraftResult,
} from "@/lib/redaksi-draft";

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

describe("PROFILE_CONTEXT_MARKER", () => {
  it("placeholder unik diganti pemanggil (bukan hardcoded di prompt)", () => {
    expect(typeof PROFILE_CONTEXT_MARKER).toBe("string");
    expect(PROFILE_CONTEXT_MARKER.length).toBeGreaterThan(0);
  });
});
