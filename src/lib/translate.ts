/**
 * Utilitas penerjemahan bahasa (ID -> EN).
 *
 * PERINGATAN PRIVASI / DATA EGRESS
 * Fungsi ini mengirim teks yang hendak diterjemahkan ke layanan pihak ketiga:
 *   1. https://translate.googleapis.com (Google Translate web client endpoint)
 *   2. https://api.mymemory.translated.net (fallback, non-API-key)
 * Tidak ada API key, tetapi isi teks tetap keluar dari server ini.
 *
 * Karena itu fungsi ini TIDAK dipanggil lagi secara otomatis oleh Server Actions
 * saat menyimpan konten. Penerjemahan bersifat opt-in per field: admin menekan
 * tombol "Terjemahkan (ID → EN)" di form admin, yang memanggil
 * `translateFieldAction` (sudah dilindungi `verifyAdmin()`).
 *
 * Untuk lingkungan yang tidak mengizinkan egress data sama sekali, set
 * `ENABLE_EXTERNAL_TRANSLATE=false` — fungsi ini akan melempar error dan UI
 * meminta admin mengisi kolom English secara manual.
 */
export function isExternalTranslateEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_TRANSLATE !== "false";
}

export async function translateText(
  text: string,
  from: string = "id",
  to: string = "en"
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (!isExternalTranslateEnabled()) {
    throw new Error(
      "Terjemahan eksternal dinonaktifkan (ENABLE_EXTERNAL_TRANSLATE=false). Isi kolom English secara manual."
    );
  }

  // 1. Coba Google Translate Web Client endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      from
    )}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(trimmed)}`;

    const res = await fetch(googleUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedParts = data[0]
          .map((part: [string, ...unknown[]]) => (part && part[0] ? part[0] : ""))
          .join("");
        if (translatedParts.trim()) {
          return translatedParts;
        }
      }
    }
  } catch (googleError) {
    console.warn("Google Translate client failed, trying fallback:", googleError);
  }

  // 2. Fallback: MyMemory API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;

    const res = await fetch(myMemoryUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (myMemoryError) {
    console.warn("MyMemory translate fallback failed:", myMemoryError);
  }

  // Jika kedua provider gagal, fallback aman mengembalikan teks asli
  return text;
}

/**
 * Helper lama yang menerjemahkan langsung tanpa cek lingkungan/otorisasi.
 * Tidak dipakai lagi oleh komponen admin (mereka memakai `translateFieldAction`
 * di `src/lib/actions.ts` yang sudah memverifikasi admin dan menghormati
 * ENABLE_EXTERNAL_TRANSLATE). Simpan hanya untuk kompatibilitas.
 */
export async function autoTranslateText(
  text: string,
  from: string = "id",
  to: string = "en"
): Promise<{ success: boolean; text: string }> {
  try {
    const translated = await translateText(text, from, to);
    return { success: true, text: translated };
  } catch {
    return { success: false, text };
  }
}
