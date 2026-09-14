/**
 * Helper manipulasi teks editor konten (murni, tanpa DOM) — toolbar menyisipkan
 * sintaks konvensi MyWebPorto (##, ###, >, ```) yang dirender FormattedText.
 * Semua fungsi mengembalikan teks baru + posisi seleksi baru (0-based, end eksklusif).
 */

export interface EditResult {
  text: string;
  selStart: number;
  selEnd: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Tambahkan prefix di awal setiap baris yang tersentuh seleksi. */
export function prefixLines(text: string, selStart: number, selEnd: number, prefix: string): EditResult {
  const start = clamp(selStart, 0, text.length);
  const end = clamp(selEnd, start, text.length);
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = text.length;

  const slice = text.slice(lineStart, lineEnd);
  const prefixed = slice
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");
  const next = text.slice(0, lineStart) + prefixed + text.slice(lineEnd);
  const added = prefixed.length - slice.length;
  return { text: next, selStart: lineStart, selEnd: lineStart + slice.length + added };
}

/** Bungkus seleksi dengan fence kode ``` (atau sisipkan blok kosong bila tanpa seleksi). */
export function wrapCodeFence(text: string, selStart: number, selEnd: number): EditResult {
  const start = clamp(selStart, 0, text.length);
  const end = clamp(selEnd, start, text.length);
  const selected = text.slice(start, end);
  if (!selected) {
    const insert = "\n```\nkodedi sini\n```\n";
    const next = text.slice(0, start) + insert + text.slice(start);
    const cursor = start + "\n```\n".length;
    return { text: next, selStart: cursor, selEnd: cursor + "kodedi sini".length };
  }
  const wrapped = `\n\`\`\`\n${selected}\n\`\`\`\n`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  return { text: next, selStart: start, selEnd: start + wrapped.length };
}
