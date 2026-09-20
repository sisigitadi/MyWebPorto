import { NextRequest, NextResponse } from "next/server";
import { getProfile, getServices, getProjects, getArticles } from "@/lib/actions";
import { queryAIEngine, type EngineContext } from "@/lib/ai-engine";
import { buildCloudMessages, submitToGeminiMessages } from "@/lib/ai-provider";
import { submitToOpenAIStream } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { resolveCloudAIConfig, isCloudAIConfigEnabled } from "@/lib/cloud-ai-config";
import { getApiStyle } from "@/lib/ai-providers";
import { resolveFeatures } from "@/lib/features-config";
import { rateLimit, cleanupRateLimits } from "@/lib/rate-limit";

// Hardening: endpoint publik (pengunjung anon) — rate-limit ketat, input dibatasi,
// prompt hanya katalog publik. Sama filosofinya dengan askSigitBot di actions.ts.
const POST_LIMIT = 20; // chat percakapan: lebih longgar daripada terminal (10)
const POST_WINDOW_MS = 5 * 60_000;
const MAX_BODY_BYTES = 10_000;
const MAX_INPUT_CHARS = 500;
const MAX_HISTORY = 4; // pasang user+assistant terakhir
const CONFIDENCE_THRESHOLD = 0.55; // sama dengan askSigitBot

// Streaming butuh Node runtime (ReadableStream fetch), bukan Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Konteks halaman untuk model cloud: aplikasi SigitOS yang sedang dibuka
 * pengunjung. Membantu jawaban tetap relevan dengan apa yang dilihatnya.
 * String pendek (satu baris) agar tidak boros token.
 */
function appContextLine(app: string, lang: "id" | "en"): string {
  const known: Record<string, string> = {
    profil: lang === "en" ? "Profile" : "Profil",
    layanan: lang === "en" ? "Services" : "Layanan",
    proyek: lang === "en" ? "Projects" : "Proyek",
    toko: lang === "en" ? "Store" : "Toko",
    testimoni: lang === "en" ? "Reviews" : "Testimoni",
    artikel: lang === "en" ? "Articles" : "Artikel",
    kontak: lang === "en" ? "Contact" : "Kontak",
    terminal: "Terminal",
  };
  const label = known[app.toLowerCase()];
  if (!label) return "";
  return lang === "en"
    ? `[Context: the visitor is currently viewing the "${label}" page of this portfolio.]`
    : `[Konteks: pengunjung sedang membuka halaman "${label}" dari portofolio ini.]`;
}

/**
 * POST /api/retrobot
 * Body: { text: string, lang?: "id"|"en", history?: ChatTurn[] }
 *
 * SSE: event meta (source/model/intent) → event delta {"t"} → event done.
 * Selalu selesai dengan done/error agar client tidak menggantung.
 */
export async function POST(req: NextRequest) {
  // Gate feature flag (settings.features): "asisten AI retro" adalah satu
  // kesatuan — permintaan langsung ke endpoint tetap harus ditolak walau
  // widget client sudah di-return null (spec §5: client gate saja tidak
  // cukup). Diletakkan paling atas (sebelum parsing body & rate-limit) agar
  // penolakan murah dan cepat.
  const features = await resolveFeatures();
  if (!features.enable_terminal) {
    return NextResponse.json(
      { error: "Fitur terminal sedang dinonaktifkan." },
      { status: 404 }
    );
  }

  const ip = clientIp(req);
  const rl = rateLimit(`retrobot:${ip}`, POST_LIMIT, POST_WINDOW_MS);
  cleanupRateLimits();

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) },
      }
    );
  }

  // Parse + validasi body (fail-closed, tidak pernah 500).
  let text = "";
  let lang: "id" | "en" = "id";
  let history: ChatTurn[] = [];
  let app = "";
  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (rawBody) {
      const body = JSON.parse(rawBody) as {
        text?: unknown;
        lang?: unknown;
        history?: unknown;
        app?: unknown;
      };
      text = String(body.text ?? "").trim().slice(0, MAX_INPUT_CHARS);
      if (body.lang === "en") lang = "en";
      app = String(body.app ?? "").trim().slice(0, 32);
      const hist = Array.isArray(body.history) ? body.history : [];
      history = hist
        .filter(
          (h): h is ChatTurn =>
            typeof h === "object" &&
            h !== null &&
            ((h as ChatTurn).role === "user" || (h as ChatTurn).role === "assistant")
        )
        .map((h) => ({
          role: h.role,
          content: String(h.content ?? "").slice(0, MAX_INPUT_CHARS),
        }))
        .slice(-MAX_HISTORY);
    }
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "empty_input" }, { status: 400 });
  }

  // Konteks live (sama persis dengan askSigitBot): hanya data publik.
  let ctx: EngineContext;
  try {
    const [profile, services, projects, articles] = await Promise.all([
      getProfile(),
      getServices(),
      getProjects(),
      getArticles(),
    ]);
    ctx = {
      ownerName: profile.name,
      headline: profile.headline,
      headlineEn: profile.headlineEn,
      bio: profile.bio,
      bioEn: profile.bioEn,
      location: profile.location,
      email: profile.email,
      phone: profile.phone,
      availableForHire: profile.availableForHire,
      skills: profile.skills || [],
      socialLinks: profile.socialLinks,
      services: services.filter((s) => s.published !== false).map((s) => s.title),
      projects: projects
        .filter((p) => p.published)
        .slice(0, 8)
        .map((p) => ({ title: p.title, slug: p.slug })),
      articles: articles
        .filter((a) => a.published)
        .slice(0, 8)
        .map((a) => ({ title: a.title, slug: a.slug })),
    };
  } catch {
    return NextResponse.json({ error: "context_error" }, { status: 500 });
  }

  const local = queryAIEngine(text, ctx, lang);
  // Config efektif (pengaturan admin menimpa env) — di-resolve sekali di luar
  // stream agar key/model konsisten untuk seluruh permintaan ini.
  const cloudCfg = await resolveCloudAIConfig();
  const cloudEnabled = await isCloudAIConfigEnabled();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Rute lokal dipakai bila percaya jawabannya ATAU cloud mati.
      // Kata dipecah ke chunk kecil agar jawaban lokal dapat efek ketik juga.
      if (local.confidence >= CONFIDENCE_THRESHOLD || !cloudEnabled) {
        emit("meta", {
          source: "local",
          model: "tfidf-local",
          intent: local.intent,
          confidence: local.confidence,
        });
        const words = local.text.split(/(\s+)/);
        for (const w of words) {
          emit("delta", { t: w });
        }
        emit("done", {});
        controller.close();
        return;
      }

      // Eskalasi cloud (streaming).
      emit("meta", {
        source: "cloud",
        model: cloudCfg.model,
        provider: cloudCfg.provider,
        intent: local.intent,
        confidence: local.confidence,
      });

      // Urutan chat: system → riwayat (user/assistant bergantian) → user saat ini.
      const [sys, user] = buildCloudMessages(text, ctx, lang, {
        systemPrompt: cloudCfg.systemPrompt,
        answerStyle: cloudCfg.answerStyle,
      });
      // Konteks halaman: aplikasi SigitOS yang sedang dibuka pengunjung, agar
      // jawaban relevan (mis. "proyek" → sebut proyek unggulan).
      const appLine = appContextLine(app, lang);
      const messages = [
        sys,
        ...history.map((h) => ({ role: h.role, content: h.content })),
        appLine ? { role: "user" as const, content: appLine } : null,
        user,
      ].filter((m): m is { role: "user" | "system" | "assistant"; content: string } => m !== null);

      let sentAny = false;
      try {
        const style = getApiStyle(cloudCfg.provider);
        if (style === "openai-chat") {
          // Satu-satunya gaya yang menyediakan SSE OpenAI-compatible.
          const upstream = submitToOpenAIStream(messages, { config: cloudCfg });
          const reader = upstream.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Parse SSE baris penuh saja; sisa tetap di buffer.
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                if (json.error) {
                  // Key tidak terkonfigurasi / upstream gagal → fallback lokal.
                  throw new Error(String(json.error));
                }
                const delta: string = json.choices?.[0]?.delta?.content ?? "";
                if (delta) {
                  sentAny = true;
                  emit("delta", { t: delta });
                }
              } catch {
                // JSON parsial / error → hentikan upstream, fallback lokal.
                reader.cancel().catch(() => {});
                throw new Error("upstream_stream_error");
              }
            }
          }

          if (!sentAny) throw new Error("empty_stream");
        } else {
          // Gemini & Anthropic tidak menyediakan SSE OpenAI-compatible:
          // panggilan non-streaming, hasil dipecah per kata untuk efek ketik
          // (kontrak SSE ke client tetap persis sama, termasuk fallback).
          //
          // Ketiga gaya kini menerima `messages` yang SAMA: persona katalog +
          // riwayat chat + konteks halaman (appLine) diteruskan ke Gemini juga.
          // (Sebelumnya cabang Gemini memakai buildCloudPrompt string tunggal
          //  → eskalasi Gemini single-turn. submitToGeminiMessages memetakan
          //  assistant → "model" dan melekatkan "system" ke user pertama.)
          const answer =
            style === "anthropic"
              ? await submitToAnthropic(messages, { config: cloudCfg })
              : await submitToGeminiMessages(messages, { config: cloudCfg });
          if (!answer.success || !answer.text.trim()) throw new Error("empty_cloud");
          sentAny = true;
          for (const w of answer.text.split(/(\s+)/)) emit("delta", { t: w });
        }
        emit("done", {});
      } catch {
        // Fallback: kirim jawaban lokal (sudah pasti ada, bisa kosong → generic).
        const fallback = local.text || (lang === "en"
          ? "I couldn't reach the cloud model, but I'm still here. Try asking about skills, projects, services, or contact."
          : "Saya tidak dapat menjangkau model cloud, tapi saya tetap di sini. Coba tanyakan tentang keahlian, proyek, layanan, atau kontak.");
        if (!sentAny) {
          // Belum ada output cloud sama sekali → ganti meta ke local.
          emit("meta", {
            source: "local",
            model: "tfidf-local",
            intent: local.intent,
            confidence: local.confidence,
            fallback: true,
          });
          for (const w of fallback.split(/(\s+)/)) emit("delta", { t: w });
        } else {
          // Sudah ada sebagian → cukup tutup, jangan campur jawaban.
        }
        emit("done", {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      // Vercel/nginx: jangan buffer, agar token mengalir seketika.
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

// GET sengaja dimatikan: endpoint AI publik tidak boleh dipanggil tanpa body.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
