/**
 * Utilitas penerjemahan bahasa (ID -> EN).
 *
 * Mendukung teks pendek hingga teks panjang (artikel / deskripsi produk / studi kasus hingga 50.000 karakter).
 *
 * Pipeline penerjemahan bertingkat:
 *   1. Cloud AI (Gemini / OpenAI / Anthropic / dsb.) jika provider aktif & ber-API key.
 *      Mampu menerjemahkan teks panjang dengan pemeliharaan format Markdown dan struktur utuh.
 *   2. Google Translate High-Reliability Clients:
 *      - clients5.google.com (dict-chrome-ex client: bebas rate-limit gtx, respons kilat)
 *      - translate.googleapis.com (dict-chrome-ex / gtx fallback)
 *   3. MyMemory API Fallback (Chunked <= 300 karakter dengan guard ketat agar tidak ada string error API yang bocor).
 *
 * PERINGATAN PRIVASI / DATA EGRESS:
 * Fungsi ini opt-in per field (hanya dipanggil saat admin mengklik tombol "Terjemahkan").
 * Untuk mematikan egress sepenuhnya, set `ENABLE_EXTERNAL_TRANSLATE=false`.
 */

import { resolveCloudAIConfig } from "@/lib/cloud-ai-config";
import { getApiStyle } from "@/lib/ai-providers";
import { submitToGemini } from "@/lib/ai-provider";
import { submitToOpenAI } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { isPlaceholderKey } from "@/lib/env";

/** Batas maksimal karakter translasi (disamakan dengan batas redaksi konten / artikel). */
export const MAX_TRANSLATION_LENGTH = 50000;

/** Batas maksimal per chunk agar aman di bawah limit URL GET dan batas query MyMemory. */
export const MAX_CHUNK_LENGTH = 400;

export function isExternalTranslateEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_TRANSLATE !== "false";
}

/**
 * Memeriksa apakah teks yang dikembalikan adalah pesan error teknis dari API pihak ketiga (mis. MyMemory).
 */
export function isTranslationErrorPayload(text: string | null | undefined): boolean {
  if (!text) return false;
  const upper = text.toUpperCase();
  return (
    upper.includes("QUERY LENGTH LIMIT EXCEEDED") ||
    upper.includes("MAX ALLOWED QUERY") ||
    upper.includes("MYMEMORY WARNING") ||
    upper.includes("INVALID TARGET LANGUAGE") ||
    upper.includes("YOU HAVE USED ALL AVAILABLE") ||
    upper.includes("DAILY LIMIT EXCEEDED") ||
    upper.includes("IS NOT A VALID LANGPAIR")
  );
}

/**
 * Memecah teks menjadi potongan (tokens/chunks) dengan panjang masing-masing <= maxChunkLength,
 * dengan tetap mempertahankan delimiter, baris baru (\n), dan paragraf (\n\n) secara presisi.
 */
export function tokenizeTextForChunking(
  text: string,
  maxChunkLength: number = MAX_CHUNK_LENGTH
): string[] {
  if (text.length <= maxChunkLength) return [text];

  // 1. Pecah per paragraf (\n\s*\n)
  const paragraphParts = text.split(/(\n\s*\n)/);
  const result: string[] = [];

  for (const part of paragraphParts) {
    if (!part) continue;
    if (part.length <= maxChunkLength) {
      result.push(part);
    } else {
      // 2. Paragraf terlalu panjang: pecah per baris (\n)
      const lineParts = part.split(/(\n)/);
      for (const linePart of lineParts) {
        if (!linePart) continue;
        if (linePart.length <= maxChunkLength) {
          result.push(linePart);
        } else {
          // 3. Baris masih terlalu panjang: pecah per kalimat ([.!?]\s+)
          const sentenceParts = linePart.split(/([.!?]+\s+)/);
          let currentBuffer = "";

          for (const sPart of sentenceParts) {
            if (!sPart) continue;
            if ((currentBuffer + sPart).length <= maxChunkLength) {
              currentBuffer += sPart;
            } else {
              if (currentBuffer) {
                result.push(currentBuffer);
                currentBuffer = "";
              }
              if (sPart.length <= maxChunkLength) {
                currentBuffer = sPart;
              } else {
                // 4. Kalimat masih > maxChunkLength: pecah per kata (\s+)
                const words = sPart.split(/(\s+)/);
                for (const w of words) {
                  if ((currentBuffer + w).length <= maxChunkLength) {
                    currentBuffer += w;
                  } else {
                    if (currentBuffer) result.push(currentBuffer);
                    currentBuffer = w;
                  }
                }
              }
            }
          }
          if (currentBuffer) {
            result.push(currentBuffer);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Menerjemahkan via Google Translate High-Reliability Clients.
 * Mencoba endpoint clients5.google.com (dict-chrome-ex) terlebih dahulu,
 * lalu translate.googleapis.com jika diperlukan.
 */
async function translateViaGoogle(
  chunk: string,
  from: string = "id",
  to: string = "en"
): Promise<string | null> {
  const trimmed = chunk.trim();
  if (!trimmed) return chunk;

  // Endpoint 1: clients5.google.com dengan client=dict-chrome-ex (bebas 429 rate limit gtx)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url1 = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(
      from
    )}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(trimmed)}`;

    const res1 = await fetch(url1, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    if (res1.ok) {
      const data1 = await res1.json();
      if (Array.isArray(data1)) {
        const joined = data1
          .map((item) =>
            typeof item === "string"
              ? item
              : Array.isArray(item) && typeof item[0] === "string"
              ? item[0]
              : ""
          )
          .join("");
        if (joined.trim() && !isTranslationErrorPayload(joined)) {
          return joined;
        }
      } else if (typeof data1 === "string" && data1.trim()) {
        return data1;
      }
    }
  } catch {
    // Lanjut ke endpoint 2
  }

  // Endpoint 2: translate.googleapis.com dengan client=dict-chrome-ex
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url2 = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(
      from
    )}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(trimmed)}`;

    const res2 = await fetch(url2, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    if (res2.ok) {
      const data2 = await res2.json();
      if (Array.isArray(data2) && Array.isArray(data2[0])) {
        const joined = data2[0]
          .map((part: [string, ...unknown[]]) => (part && part[0] ? part[0] : ""))
          .join("");
        if (joined.trim() && !isTranslationErrorPayload(joined)) {
          return joined;
        }
      }
    }
  } catch {
    // Lanjut ke MyMemory fallback
  }

  return null;
}

/**
 * Fallback via MyMemory API dengan sanitasi error ketat.
 */
async function translateViaMyMemory(
  chunk: string,
  from: string = "id",
  to: string = "en"
): Promise<string | null> {
  const trimmed = chunk.trim();
  if (!trimmed) return chunk;

  // Pastikan panjang query tidak melebihi 350 karakter untuk MyMemory
  if (trimmed.length > 350) return null;

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
      const statusField = String(data?.responseStatus ?? "");
      const candidate = data?.responseData?.translatedText;

      // Tolak tegas jika responseStatus bukan 200 atau teks adalah pesan error
      if (
        statusField === "200" &&
        candidate &&
        typeof candidate === "string" &&
        candidate.trim() &&
        !isTranslationErrorPayload(candidate)
      ) {
        return candidate;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Menerjemahkan 1 chunk teks (panjang <= 400 karakter).
 */
async function translateChunkSingle(
  chunk: string,
  from: string = "id",
  to: string = "en"
): Promise<string> {
  const trimmed = chunk.trim();
  if (!trimmed) return chunk;

  // 1. Google Translate
  const googleRes = await translateViaGoogle(trimmed, from, to);
  if (googleRes && googleRes.trim() && !isTranslationErrorPayload(googleRes)) {
    return googleRes;
  }

  // 2. MyMemory Fallback
  const myMemoryRes = await translateViaMyMemory(trimmed, from, to);
  if (myMemoryRes && myMemoryRes.trim() && !isTranslationErrorPayload(myMemoryRes)) {
    return myMemoryRes;
  }

  // Jika semua gagal untuk chunk ini, kembalikan chunk asli
  return chunk;
}

/**
 * Menerjemahkan teks panjang menggunakan Cloud AI bila aktif dan terkonfigurasi.
 */
async function translateWithCloudAI(
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  try {
    const cfg = await resolveCloudAIConfig();
    if (cfg.provider === "off" || isPlaceholderKey(cfg.apiKey)) {
      return null;
    }

    const fromLang = from === "id" ? "Indonesian" : from === "en" ? "English" : from;
    const toLang = to === "en" ? "English" : to === "id" ? "Indonesian" : to;

    const systemPrompt =
      `You are an expert bilingual translator for a personal developer portfolio and software catalog.\n` +
      `Translate the provided text faithfully from ${fromLang} to ${toLang}.\n` +
      `CRITICAL RULES:\n` +
      `1. Preserve all Markdown formatting intact: headings (##, ###), bullet lists, bold (**text**), links ([text](url)), code snippets, and blockquotes (>).\n` +
      `2. Keep technical terms, software brands, framework names, and code identifiers unchanged unless a natural translation exists.\n` +
      `3. Return ONLY the translated content. Do NOT include any introductory or concluding remarks, conversational commentary, or meta explanations.`;

    const userPrompt = text;

    const style = getApiStyle(cfg.provider);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const maxTokens = Math.min(4096, Math.max(1024, Math.ceil(text.length / 2)));
    const maxChars = Math.max(6000, text.length * 2);

    let result: { success: boolean; text: string } | null = null;

    if (style === "anthropic") {
      result = await submitToAnthropic(messages, {
        config: cfg,
        maxTokens,
        maxChars,
      });
    } else if (style === "openai-chat") {
      result = await submitToOpenAI(messages, {
        config: cfg,
        maxTokens,
        maxChars,
      });
    } else {
      const combinedPrompt = `${systemPrompt}\n\nText to translate:\n${userPrompt}`;
      result = await submitToGemini(combinedPrompt, {
        config: cfg,
        maxOutputTokens: maxTokens,
        maxChars,
      });
    }

    if (result && result.success && result.text && result.text.trim()) {
      return result.text.trim();
    }
  } catch (err) {
    console.warn("[translateWithCloudAI] AI translation failed, falling back to web translation:", err);
  }
  return null;
}

/**
 * Menerjemahkan teks (ID -> EN atau sebaliknya) dengan dukungan teks hingga 50.000 karakter.
 */
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

  if (trimmed.length > MAX_TRANSLATION_LENGTH) {
    throw new Error(
      `Teks terlalu panjang (${trimmed.length.toLocaleString("id-ID")} karakter). Maksimal yang diizinkan adalah ${MAX_TRANSLATION_LENGTH.toLocaleString("id-ID")} karakter.`
    );
  }

  // 1. Coba Cloud AI jika provider aktif & ber-API key
  const aiResult = await translateWithCloudAI(trimmed, from, to);
  if (aiResult && aiResult.trim() && !isTranslationErrorPayload(aiResult)) {
    return aiResult.trim();
  }

  // 2. Jika teks <= 1000 karakter, coba Google Translate langsung untuk mempertahankan seluruh kalimat
  if (trimmed.length <= 1000) {
    const directRes = await translateViaGoogle(trimmed, from, to);
    if (directRes && directRes.trim() && !isTranslationErrorPayload(directRes)) {
      return directRes.trim();
    }
  }

  // 3. Chunking pintar + Web translation (Google / MyMemory)
  const tokens = tokenizeTextForChunking(text, MAX_CHUNK_LENGTH);
  const translatedTokens: string[] = [];

  for (const token of tokens) {
    if (!token.trim()) {
      // Pertahankan whitespace / format paragraf asli
      translatedTokens.push(token);
    } else {
      const translated = await translateChunkSingle(token, from, to);
      translatedTokens.push(translated);
    }
  }

  const result = translatedTokens.join("");
  if (isTranslationErrorPayload(result)) {
    throw new Error("Layanan penerjemah mengembalikan respons error tidak valid.");
  }

  return result;
}

/**
 * Helper pembungkus hasil translasi yang aman bagi pemanggil.
 */
export async function autoTranslateText(
  text: string,
  from: string = "id",
  to: string = "en"
): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    const translated = await translateText(text, from, to);
    return { success: true, text: translated };
  } catch (err: unknown) {
    return {
      success: false,
      text,
      error: err instanceof Error ? err.message : "Gagal menerjemahkan teks",
    };
  }
}
