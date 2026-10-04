/**
 * Unit test parser markdown minimal (lihat src/lib/mini-markdown.ts).
 * Parser murni: string -> pohon token, tanpa DOM.
 */
import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "@/lib/mini-markdown";

describe("parseInline", () => {
  it("teks biasa tetap satu node text", () => {
    expect(parseInline("halo dunia")).toEqual([{ type: "text", text: "halo dunia" }]);
  });

  it("**bold** menjadi node bold", () => {
    expect(parseInline("**tebal**")).toEqual([
      { type: "bold", children: [{ type: "text", text: "tebal" }] },
    ]);
  });

  it("*italic* menjadi node italic", () => {
    expect(parseInline("*miring*")).toEqual([
      { type: "italic", children: [{ type: "text", text: "miring" }] },
    ]);
  });

  it("_italic_ menjadi node italic", () => {
    expect(parseInline("_miring_")).toEqual([
      { type: "italic", children: [{ type: "text", text: "miring" }] },
    ]);
  });

  it("snake_case tidak dianggap italic", () => {
    expect(parseInline("nama_variabel")).toEqual([{ type: "text", text: "nama_variabel" }]);
  });

  it("`code` menjadi node code", () => {
    expect(parseInline("`npm run dev`")).toEqual([{ type: "code", text: "npm run dev" }]);
  });

  it("[teks](url) menjadi node link", () => {
    expect(parseInline("[klik](https://sigit.web.id)")).toEqual([
      { type: "link", text: "klik", url: "https://sigit.web.id" },
    ]);
  });

  it("campuran teks + bold + italic sebaris", () => {
    const nodes = parseInline("ini **tebal** dan *miring*");
    expect(nodes).toEqual([
      { type: "text", text: "ini " },
      { type: "bold", children: [{ type: "text", text: "tebal" }] },
      { type: "text", text: " dan " },
      { type: "italic", children: [{ type: "text", text: "miring" }] },
    ]);
  });

  it("bold bersarang italic", () => {
    expect(parseInline("**tebal *dan miring* kok**")).toEqual([
      {
        type: "bold",
        children: [
          { type: "text", text: "tebal " },
          { type: "italic", children: [{ type: "text", text: "dan miring" }] },
          { type: "text", text: " kok" },
        ],
      },
    ]);
  });

  it("markup belum ditutup (streaming) tetap literal", () => {
    expect(parseInline("**belum selesai")).toEqual([
      { type: "text", text: "**belum selesai" },
    ]);
    expect(parseInline("*sebagian")).toEqual([{ type: "text", text: "*sebagian" }]);
  });

  it("tanda bintak tunggal di awal kata tidak dianggap italic", () => {
    expect(parseInline("* bullet")).toEqual([{ type: "text", text: "* bullet" }]);
  });
});

describe("parseMarkdown", () => {
  it("paragraf tunggal", () => {
    expect(parseMarkdown("Halo, saya Sigit.")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "Halo, saya Sigit." }] },
    ]);
  });

  it("heading dengan level sesuai jumlah #", () => {
    const blocks = parseMarkdown("## Judul\nisi paragraf");
    expect(blocks[0]).toEqual({
      type: "heading",
      level: 2,
      children: [{ type: "text", text: "Judul" }],
    });
    expect(blocks[1].type).toBe("paragraph");
  });

  it("list tidak berurutan dari tanda -", () => {
    const blocks = parseMarkdown("- satu\n- dua\n- tiga");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("list");
    if (blocks[0].type === "list") {
      expect(blocks[0].ordered).toBe(false);
      expect(blocks[0].items).toEqual([
        [{ type: "text", text: "satu" }],
        [{ type: "text", text: "dua" }],
        [{ type: "text", text: "tiga" }],
      ]);
    }
  });

  it("list tidak berurutan dari tanda *", () => {
    const blocks = parseMarkdown("* satu\n* dua");
    expect(blocks[0].type).toBe("list");
    if (blocks[0].type === "list") expect(blocks[0].ordered).toBe(false);
  });

  it("list berurutan angka", () => {
    const blocks = parseMarkdown("1. pertama\n2. kedua");
    expect(blocks[0].type).toBe("list");
    if (blocks[0].type === "list") {
      expect(blocks[0].ordered).toBe(true);
      expect(blocks[0].items).toHaveLength(2);
    }
  });

  it("baris kosong memisahkan blok", () => {
    const blocks = parseMarkdown("paragraf satu\n\nparagraf dua");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
  });

  it("list diikuti paragraf setelah baris kosong", () => {
    const blocks = parseMarkdown("- item\n\npenutup");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("list");
    expect(blocks[1].type).toBe("paragraph");
  });

  it("jawaban Gemini tipikal terurai dengan benar", () => {
    const answer = [
      "Saya menyediakan layanan berikut:",
      "",
      "- **Pembuatan Web** — situs profil & toko online",
      "- **Desain UI** — antarmuka retro modern",
      "",
      "Hubungi saya via [WhatsApp](https://wa.me/62).",
    ].join("\n");
    const blocks = parseMarkdown(answer);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("list");
    if (blocks[1].type === "list") {
      expect(blocks[1].ordered).toBe(false);
      expect(blocks[1].items[0]).toContainEqual(
        expect.objectContaining({ type: "bold" }),
      );
    }
    if (blocks[2].type === "paragraph") {
      expect(blocks[2].children).toContainEqual(
        expect.objectContaining({ type: "link", text: "WhatsApp", url: "https://wa.me/62" }),
      );
    }
  });

  it("streaming parsial: bold terbuka tetap literal", () => {
    const partial = "Layanan:\n- **Pembuatan Web\n- Desain";
    const blocks = parseMarkdown(partial);
    expect(blocks[1].type).toBe("list");
    if (blocks[1].type === "list") {
      // `**Pembuatan Web` tanpa penutup → literal, bukan bold gagal.
      expect(blocks[1].items[0]).toEqual([{ type: "text", text: "**Pembuatan Web" }]);
    }
  });

  it("list campuran terurut/tidak terpisah sebagai dua blok", () => {
    const blocks = parseMarkdown("- a\n- b\n1. c\n2. d");
    expect(blocks).toHaveLength(2);
    if (blocks[0].type === "list") expect(blocks[0].ordered).toBe(false);
    if (blocks[1].type === "list") expect(blocks[1].ordered).toBe(true);
  });
});
