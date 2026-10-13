/**
 * Konverter format teks dari Markdown web ke sintaks format pesan WhatsApp.
 * Memastikan respons AI menampilkan format kaya yang rapi di WhatsApp:
 * - Bold: *teks* (bukan **teks**)
 * - Italic: _teks_
 * - Strikethrough: ~teks~ (bukan ~~teks~~)
 * - Monospace: ```teks```
 * - Bullet list: • teks (bukan - atau *)
 */

export function formatForWhatsApp(text: string): string {
  if (!text || typeof text !== "string") return "";

  let res = text;

  // 1. Simpan blok kode sementara agar formatting di dalam kode tidak terdistorsi
  const codeBlocks: string[] = [];
  res = res.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const inlineCodes: string[] = [];
  res = res.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // 2. Konversi heading markdown (### Heading / ## Heading / # Heading) -> *Heading*
  res = res.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // 3. Konversi markdown bold ganda: **teks** atau __teks__ -> *teks*
  res = res.replace(/\*\*([^*\n]+)\*\*/g, "*$1*");
  res = res.replace(/__([^_\n]+)__/g, "*$1*");

  // 4. Konversi markdown strikethrough: ~~teks~~ -> ~teks~
  res = res.replace(/~~([^~\n]+)~~/g, "~$1~");

  // 5. Konversi list bullet standard (- item atau * item) -> • item
  res = res.replace(/^[\s]*[-*]\s+/gm, "• ");

  // 6. Kembalikan blok kode dan inline code
  res = res.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => {
    const code = inlineCodes[Number(idx)] || "";
    // WhatsApp mendukung inline monospace dengan ``` atau `
    return code;
  });

  res = res.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
    return codeBlocks[Number(idx)] || "";
  });

  return res.trim();
}
