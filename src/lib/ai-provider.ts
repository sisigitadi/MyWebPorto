/**
 * Cloud AI provider (opsional, opt-in) — server-only, jangan import dari client.
 *
 * Default: OFF — Sigit_Bot berjalan lokal via TF-IDF (`ai-engine.ts`, nol
 * egress). Aktif bila AI_PROVIDER=<provider> + <PROVIDER>_API_KEY terisi
 * non-placeholder. Daftar provider, default base URL/model, dan nama env var
 * ada di registry `ai-providers.ts`; pengiriman per gaya API:
 *   - gemini      → submitToGemini (di sini, REST generateContent) untuk
 *     askSigitBot/Redaksi (prompt string, single-turn); submitToGeminiMessages
 *     (ChatMessage[]) untuk RetroBot multi-turn (riwayat + konteks halaman).
 *   - openai-chat → submitToOpenAI (ai-openai.ts, /v1/chat/completions)
 *   - anthropic   → submitToAnthropic (ai-anthropic.ts, /v1/messages)
 * Prompt hanya berisi data KATALOG PUBLIK (profil ringkas, judul layanan/proyek/
 * artikel) — tidak pernah PII, secret, atau isi database mentah. Lihat SECURITY.md.
 */

import { isPlaceholderKey } from "@/lib/env";
import {
  recordGeminiRateLimit,
  recordGeminiRequest,
} from "@/lib/gemini-quota";
import { resolveCloudAIConfig, type ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";
import { getProviderMeta, isCloudProvider } from "@/lib/ai-providers";
import type { ChatMessage } from "@/lib/ai-openai";

// Satu sumber kebenaran untuk daftar provider: registry ai-providers.ts.
// (Import type untuk dipakai lokal + re-export agar modul lain tak perlu
//  mengimpornya dari cloud-ai-config.)
import type { CloudProvider } from "@/lib/cloud-ai-config";
export type { CloudProvider };

export interface LiveContext {
  ownerName: string;
  headline: string;
  skills: string[];
  services: string[];
  // slug boleh hilang: `buildCloudPrompt` memakai judul saja, dan pengirim
  // (EngineContext di ai-engine.ts) mengizinkan slug null untuk data lama.
  projects: { title: string; slug?: string | null }[];
  articles: { title: string; slug?: string | null }[];
}

/**
 * Provider cloud yang aktif: "off" (default, 100% lokal) atau salah satu dari
 * registry ai-providers.ts (gemini, openai, anthropic, deepseek, groq,
 * openrouter, together, mistral, xai).
 */
export function getCloudProvider(): CloudProvider {
  const provider = (process.env.AI_PROVIDER || "off").toLowerCase();
  return isCloudProvider(provider) ? provider : "off";
}

/**
 * Env-only legacy: membaca AI_PROVIDER + <PROVIDER>_API_KEY/_MODEL langsung
 * dari process.env, TIDAK membaca pengaturan admin (tabel settings). App memakai
 * resolveCloudAIConfig()/getCloudAIStatus() yang menggabungkan keduanya; dua
 * fungsi ini tetap diekspor untuk pemanggil langsung & test lama — jangan pakai
 * di jalur yang harus mencerminkan pengaturan admin.
 */
export function isCloudAIEnabled(): boolean {
  const provider = getCloudProvider();
  const meta = getProviderMeta(provider);
  if (!meta?.envKey) return false;
  return !isPlaceholderKey(process.env[meta.envKey]);
}

export function getCloudAIModel(): string {
  // Setiap provider punya daftar model sendiri (lihat registry); env var
  // model per-provider dipakai bila diisi, jika tidak ambil default hemat.
  const meta = getProviderMeta(getCloudProvider());
  const fromEnv = meta?.envModel ? process.env[meta.envModel] : undefined;
  // Fallback string terakhir: model aktif utamanya ditentukan oleh resolved
  // config (DB admin/env), bukan konstanta ini. Audit 2026-10-05:
  // gemini-2.5-flash sudah 404 (pensiun) — diganti ke alias -latest yang
  // selalu mengikuti model flash hemat terbaru.
  return (fromEnv || meta?.defaultModel || "gemini-flash-lite-latest").trim();
}

/**
 * Susun prompt ringkas dari konteks publik + pertanyaan user (dipotong aman).
 *
 * `custom` (opsional): persona/instruksi tambahan dari pengaturan admin
 * (Sigit_Bot → Prompt & Gaya Jawaban). Bila diisi, instruksi default diganti
 * dengan milik admin; bila kosong, jatuh ke persona default.
 */
export function buildCloudPrompt(
  query: string,
  ctx: LiveContext,
  lang: "id" | "en",
  custom?: { systemPrompt?: string; answerStyle?: "concise" | "detailed" | "friendly" }
): string {
  const q = query.trim().slice(0, 500);
  const skills = ctx.skills.slice(0, 12).join(", ");
  const services = ctx.services.slice(0, 8).join("; ");
  const projects = ctx.projects
    .slice(0, 8)
    .map((p) => p.title)
    .join("; ");
  const articles = ctx.articles
    .slice(0, 8)
    .map((a) => a.title)
    .join("; ");
  const langLine = styleLine(lang, custom?.answerStyle);
  const customBlock = custom?.systemPrompt?.trim()
    ? `\n${custom.systemPrompt.trim().slice(0, 2000)}`
    : defaultPersonaLine(ctx, lang);
  return [
    `You are Sigit_Bot, AI assistant for ${ctx.ownerName}'s portfolio website (${ctx.headline}).`,
    customBlock,
    `Public catalog — skills: ${skills}.`,
    `Services: ${services}.`,
    `Projects: ${projects}.`,
    `Articles: ${articles}.`,
    "Only answer questions about the owner, skills, services, projects, articles, hiring contact, or general technology topics. For anything else, politely redirect to those topics.",
    langLine,
    `Visitor question: ${q}`,
  ].join("\n");
}

/** Baris instruksi bahasa + gaya jawaban (dipakai prompt & messages). */
function styleLine(
  lang: "id" | "en",
  style?: "concise" | "detailed" | "friendly"
): string {
  const s = style || "concise";
  if (lang === "en") {
    if (s === "detailed")
      return "Answer in English, structured and informative (3-6 short paragraphs or bullets), in a natural, conversational tone.";
    if (s === "friendly")
      return "Answer in English, warm and friendly, conversational and flowing, concise (usually 2-4 sentences).";
    return "Answer in English, natural and conversational — concise (usually 2-4 sentences), helpful, never stiff or robotic.";
  }
  if (s === "detailed")
    return "Jawab dalam Bahasa Indonesia, terstruktur dan informatif (3-6 paragraf/poin pendek), tetapi natural dan mengalir.";
  if (s === "friendly")
    return "Jawab dalam Bahasa Indonesia dengan nada hangat dan ramah, mengalir seperti obrolan, ringkas (biasanya 2-4 kalimat).";
  return "Jawab dalam Bahasa Indonesia secara natural dan mengalir seperti obrolan — ringkas (biasanya 2-4 kalimat), tidak kaku, panjang mengikuti pertanyaan.";
}

/** Persona default bila admin tidak mengisi Prompt di pengaturan Cloud AI. */
function defaultPersonaLine(ctx: LiveContext, lang: "id" | "en"): string {
  return lang === "en"
    ? `Persona: friendly, knowledgeable assistant for ${ctx.ownerName}'s portfolio. Speak naturally and conversationally, like a helpful colleague — warm, not stiff or robotic, and adapt your answer length to the question. You may also answer general technology questions (web development, AI, tools, best practices).`
    : `Persona: asisten yang membantu dan berpengetahuan untuk portofolio ${ctx.ownerName}. Bicara natural dan mengalir seperti rekan yang membantu — hangat, tidak kaku atau seperti skrip, dan panjang jawaban mengikuti pertanyaan. Anda juga boleh menjawab pertanyaan teknologi umum (pengembangan web, AI, tools, best practice).`;
}

/**
 * Versi messages (system + user) untuk API chat-style (OpenAI-compatible).
 * Isi prompt identik dengan buildCloudPrompt — hanya format yang berbeda —
 * agar jawaban kedua provider konsisten.
 */
export function buildCloudMessages(
  query: string,
  ctx: LiveContext,
  lang: "id" | "en",
  custom?: { systemPrompt?: string; answerStyle?: "concise" | "detailed" | "friendly" }
): { role: "system" | "user"; content: string }[] {
  const q = query.trim().slice(0, 500);
  const skills = ctx.skills.slice(0, 12).join(", ");
  const services = ctx.services.slice(0, 8).join("; ");
  const projects = ctx.projects
    .slice(0, 8)
    .map((p) => p.title)
    .join("; ");
  const articles = ctx.articles
    .slice(0, 8)
    .map((a) => a.title)
    .join("; ");
  const langLine = styleLine(lang, custom?.answerStyle);
  const customBlock = custom?.systemPrompt?.trim()
    ? `\n${custom.systemPrompt.trim().slice(0, 2000)}`
    : defaultPersonaLine(ctx, lang);
  const system = [
    `You are Sigit_Bot, AI assistant for ${ctx.ownerName}'s portfolio website (${ctx.headline}).`,
    customBlock,
    `Public catalog — skills: ${skills}.`,
    `Services: ${services}.`,
    `Projects: ${projects}.`,
    `Articles: ${articles}.`,
    "Only answer questions about the owner, skills, services, projects, articles, hiring contact, or general technology topics. For anything else, politely redirect to those topics.",
    langLine,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: q },
  ];
}

/** Hasil panggilan cloud (gemini/openai). success=false → fallback lokal. */
export interface CloudAIResult {
  success: boolean;
  text: string;
  /**
   * Alasan gagal generik (tidak membocorkan key): "status_429" (quota habis),
   * "status_503" (overload sementara), "status_401" (key salah/expired),
   * "network" (timeout/gangguan), "empty_cloud" (200 tapi kosong). Dipakai
   * route RetroBot sebagai fallbackReason supaya admin tahu kenapa jawaban
   * jatuh ke lokal tanpa membuka devtools.
   */
  reason?: string;
  /**
   * Model yang benar-benar menghasilkan jawaban ini. Biasanya = cfg.model,
   * tapi bila model aktif kena 429/503 dan retry ke model cadangan berhasil,
   * field ini berisi nama cadangan tersebut — route RetroBot memakainya untuk
   * mengoreksi meta SSE agar konsumen tahu model mana yang dipakai.
   */
  model?: string;
}

/**
 * Daftar model Gemini cadangan untuk retry saat model aktif kena 429
 * (quota habis). Mencoba model lain lebih murah daripada langsung jatuh ke
 * jawaban lokal TF-IDF — quota per-model terpisah, jadi model cadangan
 * biasanya masih bisa menjawab.
 *
 * Sumber: env `GEMINI_FALLBACK_MODELS` (comma-separated) bila diisi, jika
 * tidak pakai default hemat flash. Urutan default menempatkan model yang
 * masih sehat lebih dulu (audit 2026-10-05: keluarga 2.x/1.5 pensiun 404,
 * lihat di bawah) — loop retry melompati 404 sehingga model yang dipensiunkan
 * tetap aman bila env memasukkannya, tapi urutan menentukan mana yang dicoba
 * lebih dulu. Model yang sedang aktif selalu dikecualikan karena sudah
 * dicoba lebih dulu.
 */
const DEFAULT_GEMINI_FALLBACK_MODELS = [
  // Urut sehat-di-depan. Audit 2026-10-05 (probe ListModels + generateContent):
  // 3.5-flash-lite/3.7-flash/3.6-flash/3.1-flash-lite/3-flash-preview 200 OK;
  // 3.5-flash & flash-latest 200 OK lalu 429 (quota habis karena probing,
  // bukan pensiun); 3.8-flash 429 (hidup, tapi free-tier habis). Keluarga
  // 2.x/1.5 SUDAH PASTI 404 ("no longer available") sehingga dikeluarkan
  // total — loop retry melompati 404 (lihat bawah), tapi membuang request ke
  // model yang tak akan pernah berhasil hanya memperlambat cadangan pertama
  // yang sehat. gemini-flash-latest adalah alias ke model flash terbaru.
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
];

/**
 * Model cadangan (selain model aktif) untuk retry 429, urut dari paling
 * disukai. Dipakai RetroBot sebelum jatuh ke jawaban lokal.
 */
export function getGeminiFallbackModels(activeModel: string): string[] {
  const fromEnv = process.env.GEMINI_FALLBACK_MODELS;
  const list =
    fromEnv && fromEnv.trim()
      ? fromEnv
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean)
      : DEFAULT_GEMINI_FALLBACK_MODELS;
  const active = (activeModel || "").trim().toLowerCase();
  // Hilangkan duplikat & model aktif (sudah dicoba pertama kali).
  return [...new Set(list)].filter((m) => m.toLowerCase() !== active);
}

/**
 * Potong jawaban di batas kalimat (atau kata) terakhir yang masih utuh,
 * bukan di tengah kata. Potongan mentah di maxChars sering memotong kalimat
 * di tengah dan terlihat seperti jawaban "truncated" di panel RetroBot,
 * padahal teksnya hanya habis di angka aman. Ellipsis menandai batas kapasitas.
 */
function trimAnswer(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  // Batas kalimat kuat (. ! ? atau baris baru) hanya dipakai bila cukup dekat
  // dengan ujung potongan, jika tidak jawaban akan terlalu pendek.
  const stop = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("?"),
    cut.lastIndexOf("\n")
  );
  if (stop >= maxChars * 0.6) return `${cut.slice(0, stop + 1).trimEnd()}…`;
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Panggil Gemini via REST (tanpa SDK). Tidak pernah throw. */
export async function submitToGemini(
  prompt: string,
  options: { config?: ResolvedCloudAIConfig; maxOutputTokens?: number; maxChars?: number } = {}
): Promise<CloudAIResult> {
  // Key & model bisa datang dari pengaturan admin (tabel settings) atau env.
  const cfg = options.config ?? (await resolveCloudAIConfig());
  const apiKey = cfg.apiKey;
  if (isPlaceholderKey(apiKey)) {
    // Key belum diisi (placeholder) — bukan error cloud, tapi "belum dikonfigurasi".
    // reason "unconfigured" sejalan dengan jalur OpenAI (ai-openai.ts) supaya
    // badge fallback RetroBot menjelaskan, bukan generik empty_cloud.
    return { success: false, text: "", reason: "unconfigured" };
  }
  const model = cfg.model;
  // Batas default 300 token & 2000 char cocok untuk jawaban bot pendek. Redaksi
  // memakai nilai lebih besar lewat opsi (draft artikel panjang); tidak mengubah
  // pemanggilan yang sudah ada.
  const maxOutputTokens = options.maxOutputTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;
  // Catat permintaan keluar untuk rolling window RPM/RPD estimasi quota
  // (dipanggil sebelum fetch: permintaan yang ditolak tetap dihitung).
  recordGeminiRequest(model);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.authMode === "oauth"
            ? { Authorization: `Bearer ${apiKey}` }
            : { "x-goog-api-key": apiKey}),
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      // Pelajari batas quota asli dari error 429 (sebelum return) agar estimasi
      // sisa quota di /admin/cloud-ai akurat setelah kejadian nyata.
      const errorBody = await response.text().catch(() => "");
      recordGeminiRateLimit(model, {
        status: response.status,
        body: errorBody,
        retryAfter: response.headers.get("retry-after"),
      });
      // Sebar status HTTP ke pemanggil (mis. status_429 = quota habis) lewat
      // reason, supaya badge fallback RetroBot diagnostik, bukan generik.
      return { success: false, text: "", reason: `status_${response.status}` };
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text.trim()) return { success: false, text: "", reason: "empty_cloud" };
    return { success: true, text: trimAnswer(text, maxChars) };
  } catch {
    // Timeout (AbortSignal 30s) / gangguan jaringan → reason "network".
    return { success: false, text: "", reason: "network" };
  }
}

/**
 * Panggil Gemini multi-turn via REST (generateContent). Menerima array
 * ChatMessage — SAMA PERSIS bentuknya dengan submitToAnthropic /
 * submitToOpenAIStream — sehingga RetroBot bisa meneruskan riwayat chat +
 * konteks halaman ke Gemini, bukan hanya prompt string tunggal.
 *
 * Pemetaan dari format OpenAI-style:
 *  - role "assistant" → role Gemini "model".
 *  - role "system" TIDAK ada di generateContent (legacy): persona dilekatkan
 *    ke awal pesan "user" pertama — setara dengan apa yang buildCloudPrompt
 *    lakukan untuk versi string (isi identik, hanya format yang beda).
 *  - role sama berturut-turut digabung (Gemini generateContent juga menolak
 *    pesan tak bergantian); pesan pertama wajib "user" (leading "model"
 *    di-drop). Maksimal 9 pesan terakhir, sama seperti anthropic.
 *
 * Tidak pernah throw — gagal → {success:false} → fallback lokal.
 */
export async function submitToGeminiMessages(
  messages: ChatMessage[],
  options: {
    config?: ResolvedCloudAIConfig;
    maxOutputTokens?: number;
    maxChars?: number;
    /**
     * Model cadangan untuk retry saat model aktif kena 429 (quota habis) atau
     * 503 (overload). Diisi route RetroBot lewat getGeminiFallbackModels();
     * panggilan tanpa opsi ini (mis. submitToGemini string) tetap tanpa retry.
     */
    fallbackModels?: string[];
  } = {}
): Promise<CloudAIResult> {
  const cfg = options.config ?? (await resolveCloudAIConfig());
  const apiKey = cfg.apiKey;
  if (isPlaceholderKey(apiKey)) {
    // Key belum diisi (placeholder) — lihat catatan di submitToGemini di atas.
    return { success: false, text: "", reason: "unconfigured" };
  }
  const model = cfg.model;
  const maxOutputTokens = options.maxOutputTokens ?? 300;
  const maxChars = options.maxChars ?? 2000;

  let systemText = "";
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of messages.slice(-9)) {
    if (m.role === "system") {
      systemText = [systemText, m.content].filter(Boolean).join("\n\n");
      continue;
    }
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${m.content}`;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  // Pesan pertama WAJIB "user"; leading "model" (assistant) di-drop.
  while (contents.length && contents[0].role === "model") {
    contents.shift();
  }
  // Persona "system" dilekatkan ke user pertama (generateContent tak punya
  // role system) — setara buildCloudPrompt untuk versi string.
  if (systemText.trim() && contents.length) {
    contents[0].parts[0].text = `${systemText.trim().slice(0, 8000)}\n\n${contents[0].parts[0].text}`;
  }
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "." }] });

  // Model aktif dicoba pertama; bila kena 429 (quota habis) / 503 (overload),
  // coba setiap model cadangan sebelum menyerah ke fallback lokal. Quota &
  // kapasitas Gemini dihitung per-model, jadi model cadangan biasanya masih
  // bisa menjawab meski model utama sudah habis kuotanya.
  const tryModels = [model, ...(options.fallbackModels ?? [])];
  // Alasan kegagalan percobaan terakhir — dipakai bila SEMUA model gagal, supaya
  // badge fallback RetroBot tetap diagnostik (mis. "status_429").
  let lastReason = "network";
  for (const tryModel of tryModels) {
    try {
      // Catat permintaan keluar untuk rolling window RPM/RPD estimasi quota
      // (dipanggil sebelum fetch: permintaan yang ditolak tetap dihitung).
      recordGeminiRequest(tryModel);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(tryModel)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cfg.authMode === "oauth"
              ? { Authorization: `Bearer ${apiKey}` }
              : { "x-goog-api-key": apiKey }),
          },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens, temperature: 0.4 },
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );
      if (!response.ok) {
        lastReason = `status_${response.status}`;
        // Pelajari batas quota asli + masa pembatasan dari error 429 Google
        // (sebelum lanjut ke cadangan) agar estimasi quota admin akurat.
        const errorBody = await response.text().catch(() => "");
        recordGeminiRateLimit(tryModel, {
          status: response.status,
          body: errorBody,
          retryAfter: response.headers.get("retry-after"),
        });
        // 429 (quota habis) & 503 (overload sementara) BISA sembuh dengan model
        // lain → lanjut ke cadangan berikutnya. 404 (model tak dikenal /
        // dipensiunkan Google) juga PER-MODEL — audit 2026-10-04: keluarga
        // 2.x/1.5 sudah 404 padahal 3.5-flash masih sehat, jadi cadangan
        // berikutnya tetap layak dicoba. Hanya status yang hasilnya pasti sama
        // di model manapun (401/403 key salah) yang berhenti — jangan buang
        // permintaan yang tak akan berbeda hasilnya.
        if (response.status !== 429 && response.status !== 503 && response.status !== 404)
          break;
        continue;
      }
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text.trim()) {
        lastReason = "empty_cloud";
        // 200 tapi kandidat kosong (mis. filter keamanan menolak): cakupan
        // retry adalah 429/503 (kuota/kapasitas), bukan kebijakan per-model,
        // jadi berhenti seperti perilaku semula.
        break;
      }
      // Sukses — bila tryModel adalah cadangan, field model menyimpan nama
      // cadangan tersebut untuk dikoreksi di meta SSE RetroBot.
      return { success: true, text: trimAnswer(text, maxChars), model: tryModel };
    } catch {
      // Timeout (AbortSignal 30s) / gangguan jaringan untuk model ini. Retry ke
      // model lain tak akan membantu bila jaringannya bermasalah (endpoint
      // sama), dan setiap timeout berpotensi memblokir 30 detik → berhenti.
      lastReason = "network";
      break;
    }
  }
  return { success: false, text: "", reason: lastReason };
}
