/**
 * Utilitas penerjemah otomatis bahasa (ID -> EN)
 * Menggunakan endpoint Google Translate client API dengan fallback ke MyMemory API.
 * Beroperasi di server tanpa memerlukan API key eksternal.
 */

export async function translateText(
  text: string,
  from: string = "id",
  to: string = "en"
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

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
 * Server action helper untuk translate di komponen form admin
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
