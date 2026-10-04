import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildCloudPrompt,
  buildCloudMessages,
  getGeminiFallbackModels,
  isCloudAIEnabled,
  submitToGeminiMessages,
  type LiveContext,
} from "@/lib/ai-provider";
import { getGeminiQuotaSnapshot } from "@/lib/gemini-quota";
import type { ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";

const OLD_PROVIDER = process.env.AI_PROVIDER;
const OLD_KEY = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (OLD_PROVIDER === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = OLD_PROVIDER;
  if (OLD_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = OLD_KEY;
});

const CTX: LiveContext = {
  ownerName: "Sigit Adi",
  headline: "AI Engineer",
  skills: ["Next.js", "TypeScript"],
  services: ["Web Development"],
  projects: [{ title: "MyWebPorto", slug: "mywebporto" }],
  articles: [{ title: "Intro AI", slug: "intro-ai" }],
};

describe("isCloudAIEnabled", () => {
  it("OFF secara default (privat, tanpa egress)", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    expect(isCloudAIEnabled()).toBe(false);
  });

  it("ON hanya bila provider + key valid", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "xxxx-placeholder";
    expect(isCloudAIEnabled()).toBe(false);
    process.env.GEMINI_API_KEY = "AIzaRealKey123";
    expect(isCloudAIEnabled()).toBe(true);
  });
});

describe("buildCloudPrompt", () => {
  it("memotong query panjang dan memakai katalog publik", () => {
    const prompt = buildCloudPrompt("a".repeat(9000), CTX, "id");
    expect(prompt).toContain("Sigit Adi");
    expect(prompt).toContain("MyWebPorto");
    expect(prompt).toContain("Bahasa Indonesia");
    expect(prompt.length).toBeLessThan(3000);
  });

  it("mendukung mode English", () => {
    expect(buildCloudPrompt("hi", CTX, "en")).toContain("Answer in English");
  });

  it("memasukkan systemPrompt kustom admin bila diberikan", () => {
    const custom = {
      systemPrompt: "Kamu adalah Sigit_Bot, asisten retro. Jawab ramah.",
      answerStyle: "friendly" as const,
    };
    const prompt = buildCloudPrompt("halo", CTX, "id", custom);
    expect(prompt).toContain("Kamu adalah Sigit_Bot, asisten retro. Jawab ramah.");
    // Gaya friendly mengubah instruksi bahasa.
    expect(prompt).toContain("nada hangat dan ramah");
  });

  it("persona default muncul bila systemPrompt kosong", () => {
    const prompt = buildCloudPrompt("halo", CTX, "id", { systemPrompt: "", answerStyle: "concise" });
    expect(prompt).toContain("Persona:");
    expect(prompt).toContain("teknologi umum");
  });

  it("answerStyle detailed memperpanjang instruksi", () => {
    const p = buildCloudPrompt("halo", CTX, "en", { answerStyle: "detailed" });
    expect(p).toContain("structured and informative");
  });
});

describe("buildCloudMessages", () => {
  it("system + user, konsisten dengan buildCloudPrompt", () => {
    const custom = { systemPrompt: "Persona X.", answerStyle: "detailed" as const };
    const msgs = buildCloudMessages("halo", CTX, "id", custom);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toBe("halo");
    expect(msgs[0].content).toContain("Persona X.");
    expect(msgs[0].content).toContain("terstruktur dan informatif");
  });
});

const GEMINI_CFG: ResolvedCloudAIConfig = {
  provider: "gemini",
  apiKey: "AIzaRealKey123",
  model: "gemini-2.5-flash",
  baseUrl: "",
  systemPrompt: "",
  answerStyle: "concise",
  authMode: "api_key",
  source: "admin",
};

const GEMINI_OK = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Body permintaan terakhir yang dikirim ke fetch (sudah di-parse). */
function geminiLastBody(fetchMock: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("submitToGeminiMessages", () => {
  it("sukses: ambil text dari candidates.parts, potong maxChars di batas kata", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({
        candidates: [
          {
            content: {
              parts: [{ text: "Halo, saya " }, { text: "Sigit_Bot." }],
            },
          },
        ],
      })
    );
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      maxChars: 10,
    });
    expect(res.success).toBe(true);
    // Tidak memotong tengah kata: potong di spasi terakhir + ellipsis.
    expect(res.text).toBe("Halo,…");
    fetchMock.mockRestore();
  });

  it("potong maxChars di batas kalimat bila ada dekat ujung potongan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({
        candidates: [{ content: { parts: [{ text: "Saya bisa web. Dan juga AI." }] } }]
      })
    );
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      maxChars: 20,
    });
    expect(res.success).toBe(true);
    // Tanda titik di index 14 (>= 60% dari 20) → utamakan batas kalimat utuh.
    expect(res.text).toBe("Saya bisa web.…");
    fetchMock.mockRestore();
  });

  it("endpoint & header Gemini: :generateContent + x-goog-api-key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    await submitToGeminiMessages([{ role: "user", content: "halo" }], { config: GEMINI_CFG });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("AIzaRealKey123");
    fetchMock.mockRestore();
  });

  it("assistant → model; persona system dilekatkan ke user pertama", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    await submitToGeminiMessages(
      [
        { role: "system", content: "Persona X." },
        { role: "user", content: "halo" },
        { role: "assistant", content: "hai" },
        { role: "user", content: "lagi" },
      ],
      { config: GEMINI_CFG }
    );
    const body = geminiLastBody(fetchMock);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Persona X.\n\nhalo" }] },
      { role: "model", parts: [{ text: "hai" }] },
      { role: "user", parts: [{ text: "lagi" }] },
    ]);
    expect(body.generationConfig).toEqual({ maxOutputTokens: 300, temperature: 0.4 });
    fetchMock.mockRestore();
  });

  it("role user berturut-turut digabung (konteks halaman + pertanyaan)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    await submitToGeminiMessages(
      [
        { role: "user", content: "konteks halaman" },
        { role: "user", content: "pertanyaan" },
      ],
      { config: GEMINI_CFG }
    );
    const body = geminiLastBody(fetchMock);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "konteks halaman\n\npertanyaan" }] },
    ]);
    fetchMock.mockRestore();
  });

  it("model di awal di-drop (pesan pertama wajib user)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    await submitToGeminiMessages(
      [
        { role: "assistant", content: "loncat" },
        { role: "user", content: "halo" },
      ],
      { config: GEMINI_CFG }
    );
    const body = geminiLastBody(fetchMock);
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "halo" }] }]);
    fetchMock.mockRestore();
  });

  it("placeholder key → fail-closed, tidak ada panggilan keluar", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: { ...GEMINI_CFG, apiKey: "xxxx-placeholder" },
    });
    expect(res.success).toBe(false);
    expect(res.text).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("HTTP error / network error / kandidat kosong → success false (bukan throw)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    expect(
      (await submitToGeminiMessages([{ role: "user", content: "halo" }], { config: GEMINI_CFG }))
        .success
    ).toBe(false);

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(
      (await submitToGeminiMessages([{ role: "user", content: "halo" }], { config: GEMINI_CFG }))
        .success
    ).toBe(false);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(GEMINI_OK({ candidates: [] }));
    expect(
      (await submitToGeminiMessages([{ role: "user", content: "halo" }], { config: GEMINI_CFG }))
        .success
    ).toBe(false);
  });

  it("429 di model aktif → retry ke cadangan pertama yang sehat (bukan jatuh ke lokal)", async () => {
    // Panggilan pertama (model aktif) kena 429 quota habis; cadangan pertama
    // masih sehat → jawaban tetap dari cloud, model aktual dicatat di result.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const model = String(input).split("/models/")[1]?.split(":")[0];
      if (model === "gemini-2.5-flash") {
        return new Response(JSON.stringify({ error: { code: 429, message: "quota" } }), {
          status: 429,
        });
      }
      return GEMINI_OK({ candidates: [{ content: { parts: [{ text: "dari cadangan" }] } }] });
    });

    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(true);
    expect(res.text).toBe("dari cadangan");
    expect(res.model).toBe("gemini-2.0-flash");
    // Model aktif sekali + cadangan pertama sekali = berhenti begitu dapat.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/models/gemini-2.0-flash:generateContent"
    );
    fetchMock.mockRestore();
  });

  it("semua model 429 → success false + reason status_429 (coba semua cadangan)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 429, message: "quota" } }), { status: 429 })
    );
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(false);
    expect(res.reason).toBe("status_429");
    // Model aktif + tiap cadangan dicoba semua sebelum menyerah ke lokal.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calledModels = fetchMock.mock.calls.map(
      (c) => String(c[0]).split("/models/")[1]?.split(":")[0]
    );
    expect(calledModels).toEqual(["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]);
    fetchMock.mockRestore();
  });

  it("503 overload juga memicu retry cadangan, sukses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const model = String(input).split("/models/")[1]?.split(":")[0];
      if (model === "gemini-2.5-flash") {
        return new Response(JSON.stringify({ error: { code: 503 } }), { status: 503 });
      }
      return GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    });
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash"],
    });
    expect(res.success).toBe(true);
    expect(res.model).toBe("gemini-2.0-flash");
    fetchMock.mockRestore();
  });

  it("404 model dipensiunkan di cadangan pertama → lanjut ke cadangan sehat berikutnya", async () => {
    // Audit 2026-10-04: keluarga 2.x/1.5 sudah dipensiunkan Google (404), tapi
    // 3.5-flash masih sehat. Sebelumnya 404 memutus seluruh rantai cadangan;
    // sekarang dilompati seperti 429/503.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const model = String(input).split("/models/")[1]?.split(":")[0];
      if (model === "gemini-2.5-flash") {
        return new Response(JSON.stringify({ error: { code: 429, message: "quota" } }), {
          status: 429,
        });
      }
      if (model === "gemini-2.0-flash") {
        return new Response(
          JSON.stringify({ error: { code: 404, message: "no longer available" } }),
          { status: 404 }
        );
      }
      return GEMINI_OK({ candidates: [{ content: { parts: [{ text: "dari cadangan" }] } }] });
    });

    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(true);
    expect(res.text).toBe("dari cadangan");
    // Cadangan pertama kena 404 (dipensiunkan) → dilompati, cadangan kedua sehat.
    expect(res.model).toBe("gemini-1.5-flash");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockRestore();
  });

  it("404 di model aktif → tetap mencoba cadangan (tidak break)", async () => {
    // Model aktif sendiri bisa jadi yang dipensiunkan; 404 di percobaan
    // pertama tidak boleh membunuh kesempatan di cadangan.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const model = String(input).split("/models/")[1]?.split(":")[0];
      if (model === "gemini-2.5-flash") {
        return new Response(
          JSON.stringify({ error: { code: 404, message: "no longer available" } }),
          { status: 404 }
        );
      }
      return GEMINI_OK({ candidates: [{ content: { parts: [{ text: "dari cadangan" }] } }] });
    });

    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(true);
    expect(res.model).toBe("gemini-2.0-flash");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockRestore();
  });

  it("semua model 404 → success false + reason status_404 (coba semua cadangan)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 404, message: "no longer available" } }), {
        status: 404,
      })
    );
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(false);
    expect(res.reason).toBe("status_404");
    // Semua dicoba: aktif + 2 cadangan — tidak ada yang break di tengah.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockRestore();
  });

  it("status non-retryable (401 key salah) → tidak mencoba cadangan", async () => {
    // Key salah/expired memberi hasil sama di model manapun → jangan buang
    // permintaan tambahan; langsung gagal dengan reason yang akurat.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 401 } }), { status: 401 })
    );
    const res = await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: GEMINI_CFG,
      fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash"],
    });
    expect(res.success).toBe(false);
    expect(res.reason).toBe("status_401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});

describe("getGeminiFallbackModels", () => {
  const OLD_FALLBACK = process.env.GEMINI_FALLBACK_MODELS;
  afterEach(() => {
    if (OLD_FALLBACK === undefined) delete process.env.GEMINI_FALLBACK_MODELS;
    else process.env.GEMINI_FALLBACK_MODELS = OLD_FALLBACK;
  });

  it("default: daftar flash hemat; model aktif selalu dikecualikan", () => {
    delete process.env.GEMINI_FALLBACK_MODELS;
    const list = getGeminiFallbackModels("gemini-3.5-flash");
    // Model aktif sudah dicoba lebih dulu oleh pemanggil, jangan ulangi.
    expect(list).not.toContain("gemini-3.5-flash");
    expect(list).toContain("gemini-2.5-flash");
    expect(list.length).toBeGreaterThan(0);
  });

  it("default: model sehat (3.5-flash-lite) didahulukan sebelum yang dipensiunkan", () => {
    // Audit 2026-10-04: 2.x/1.5 sudah 404, 3.5-flash-lite masih 200 OK.
    // Urutan menentukan cadangan mana yang dicoba lebih dulu saat retry.
    delete process.env.GEMINI_FALLBACK_MODELS;
    const list = getGeminiFallbackModels("gemini-flash-latest");
    const healthy = list.indexOf("gemini-3.5-flash-lite");
    const retired = list.indexOf("gemini-2.5-flash");
    expect(healthy).toBeGreaterThanOrEqual(0);
    expect(retired).toBeGreaterThanOrEqual(0);
    expect(healthy).toBeLessThan(retired);
  });

  it("env GEMINI_FALLBACK_MODELS menimpa default; duplikat & kosong dibersihkan", () => {
    process.env.GEMINI_FALLBACK_MODELS =
      "gemini-2.5-flash, custom-model ,, gemini-1.5-flash, custom-model";
    const list = getGeminiFallbackModels("GEMINI-2.5-FLASH");
    // Eksklusi case-insensitive, urutan dipertahankan, duplikat & entry kosong
    // (double comma) dibuang.
    expect(list).toEqual(["custom-model", "gemini-1.5-flash"]);
  });
});

describe("pelacakan quota (wiring gemini-quota)", () => {
  // Model unik per test: store tracker bersifat module-level, jadi nama model
  // berbeda mencegah kontaminasi antar test.
  it("permintaan sukses tercatat di rolling window RPM/RPD", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      GEMINI_OK({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })
    );
    await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: { ...GEMINI_CFG, model: "gemini-2.5-flash-tracked" },
    });
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-tracked"]);
    expect(snap.models[0].rpmUsed).toBe(1);
    expect(snap.models[0].rpdUsed).toBe(1);
    vi.restoreAllMocks();
  });

  it("setiap model yang dicoba retry tercatat masing-masing sekali", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 })
    );
    await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: { ...GEMINI_CFG, model: "gemini-2.5-flash-tracked2" },
      fallbackModels: ["gemini-2.0-flash-tracked2"],
    });
    const snap = getGeminiQuotaSnapshot([
      "gemini-2.5-flash-tracked2",
      "gemini-2.0-flash-tracked2",
    ]);
    expect(snap.models[0].rpmUsed).toBe(1);
    expect(snap.models[1].rpmUsed).toBe(1);
    vi.restoreAllMocks();
  });

  it("429 nyata: batas dipelajari dari tubuh error + Retry-After tercatat", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "Requests per minute: 10. Requests per day: 250.",
          },
        }),
        { status: 429, headers: { "Retry-After": "30" } }
      )
    );
    await submitToGeminiMessages([{ role: "user", content: "halo" }], {
      config: { ...GEMINI_CFG, model: "gemini-2.5-flash-tracked3" },
    });
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-tracked3"]);
    expect(snap.models[0].rpmLimit).toBe(10);
    expect(snap.models[0].rpdLimit).toBe(250);
    expect(snap.models[0].limitSource).toBe("learned");
    expect(snap.models[0].status).toBe("limited");
    vi.restoreAllMocks();
  });
});
