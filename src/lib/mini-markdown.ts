/**
 * Parser markdown minimal untuk jawaban AI (Gemini dsb.).
 *
 * Dibuat sebagai transformasi data murni (string -> pohon token) agar bisa
 * diuji tanpa DOM. Pengubahan token -> React node ada di komponen terpisah
 * (`src/components/public/mini-markdown.tsx`).
 *
 * Didukung: heading, list (urut/tidak), **bold**, *italic*, _italic_,
 * `code` sebaris, dan [teks](url). Markup yang belum ditutup (konten
 * streaming) ditampilkan apa adanya sebagai teks literal, bukan diformat.
 */

export type MdInline =
  | { type: "text"; text: string }
  | { type: "bold"; children: MdInline[] }
  | { type: "italic"; children: MdInline[] }
  | { type: "code"; text: string }
  | { type: "link"; text: string; url: string };

export type MdBlock =
  | { type: "heading"; level: number; children: MdInline[] }
  | { type: "paragraph"; children: MdInline[] }
  | { type: "list"; ordered: boolean; items: MdInline[][] };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const CODE_RE = /^`([^`\n]+)`/;
const LINK_RE = /^\[([^\]\n]+)\]\(([^)\s]+)\)/;

/** Cari penanda tutup italic yang valid (bukan bagian dari `**`). */
function findItalicClose(input: string, start: number, ch: string): number {
  for (let j = start + 1; j < input.length; j++) {
    if (input[j] !== ch) continue;
    // `**` milik bold, bukan penutup italic.
    if (input[j + 1] === ch) return -1;
    // `_` baru dianggap italic bila kedua sisinya batas kata.
    // `nama_variabel` (dua sisi alfanumerik) tetap literal.
    if (
      ch === "_" &&
      /[A-Za-z0-9]/.test(input[j - 1] ?? "") &&
      /[A-Za-z0-9]/.test(input[j + 1] ?? "")
    )
      continue;
    return j;
  }
  return -1;
}

/** Tokenisasi sebaris: bold, italic, code, link dalam satu paragraf/list. */
export function parseInline(input: string): MdInline[] {
  const nodes: MdInline[] = [];
  let buf = "";
  let i = 0;

  const flush = () => {
    if (buf !== "") {
      nodes.push({ type: "text", text: buf });
      buf = "";
    }
  };

  while (i < input.length) {
    const rest = input.slice(i);

    // `code` sebaris
    const code = CODE_RE.exec(rest);
    if (code) {
      flush();
      nodes.push({ type: "code", text: code[1] });
      i += code[0].length;
      continue;
    }

    // [teks](url)
    const link = LINK_RE.exec(rest);
    if (link) {
      flush();
      nodes.push({ type: "link", text: link[1], url: link[2] });
      i += link[0].length;
      continue;
    }

    // **bold**
    if (rest.startsWith("**")) {
      const close = input.indexOf("**", i + 2);
      if (close !== -1) {
        flush();
        nodes.push({ type: "bold", children: parseInline(input.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    // *italic* atau _italic_
    const ch = input[i];
    if (ch === "*" || ch === "_") {
      const next = input[i + 1];
      const prev = input[i - 1];
      const awalValid =
        next !== undefined &&
        !/\s/.test(next) &&
        next !== ch &&
        // `_` hanya valid di batas kata, agar snake_case tidak dianggap italic.
        (ch === "*" || !(prev !== undefined && /[A-Za-z0-9]/.test(prev)));

      if (awalValid) {
        const close = findItalicClose(input, i, ch);
        if (close !== -1) {
          flush();
          nodes.push({ type: "italic", children: parseInline(input.slice(i + 1, close)) });
          i = close + 1;
          continue;
        }
      }
    }

    buf += ch;
    i += 1;
  }

  flush();
  return nodes;
}

/** Tokenisasi blok: heading, list, paragraf. */
export function parseMarkdown(input: string): MdBlock[] {
  const lines = input.split("\n");
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", children: parseInline(para.join("\n")) });
      para = [];
    }
  };

  const flushList = () => {
    if (list) {
      blocks.push({
        type: "list",
        ordered: list.ordered,
        items: list.items.map((it) => parseInline(it)),
      });
      list = null;
    }
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2].trim()),
      });
      continue;
    }

    const ul = UL_RE.exec(line);
    if (ul) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }

    const ol = OL_RE.exec(line);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }

    flushList();
    para.push(line);
  }

  flushPara();
  flushList();
  return blocks;
}
