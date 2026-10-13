/**
 * Utilitas pembersihan teks untuk Text-to-Speech (TTS) Browser.
 * Menghapus seluruh emoji, simbol, bullet, markdown, dan penanda teknis
 * sehingga mesin suara (speechSynthesis) hanya membacakan kata-kata dan
 * tanda baca alami tanpa mengeja nama ikon atau simbol asing.
 */

// Regex mendeteksi seluruh emoji & pictograph Unicode modern
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

// Simbol bullet dan ikon dekoratif umum
const BULLET_SYMBOLS_REGEX = /[•●■▲◆▼▶►▸★☆✓✔✕✖❌※▰▱◎○▫▪]/g;

// Penanda badge teknis dalam tanda kurung siku (mis. [LOKAL], [CLOUD], [PRO], dll)
const TECHNICAL_BADGES_REGEX = /\[(lokal|cloud|pro|ready|offline|online|verified|status|error|ok|done|info)[^\]]*\]/gi;

/**
 * Membersihkan string teks mentah agar ramah pembacaan suara sintetis (TTS).
 */
export function cleanTextForTTS(text: string): string {
  if (!text || typeof text !== "string") return "";

  let cleaned = text
    // 1. Buang blok kode fenced
    .replace(/```[\s\S]*?```/g, " ")
    // 2. Buang URL web
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    // 3. Buang badge teknis [LOKAL], [CLOUD], dll.
    .replace(TECHNICAL_BADGES_REGEX, " ")
    // 4. Buang seluruh emoji Unicode
    .replace(EMOJI_REGEX, " ")
    // 5. Buang simbol bullet & dekoratif
    .replace(BULLET_SYMBOLS_REGEX, " ")
    // 6. Buang penanda markdown
    .replace(/[*_`~#>|]/g, " ")
    // 7. Ganti tanda panah dengan koma agar ada jeda intonasi
    .replace(/\s*(?:->|=>|→|←)\s*/g, ", ")
    // 8. Normalisasi kurung yang tersisa kosong atau ornamen ASCII
    .replace(/[\[\]{}]/g, " ")
    .replace(/\/{2,}/g, " ")
    // 9. Rapikan tanda koma ganda atau spasi berulang
    .replace(/,\s*,+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}
