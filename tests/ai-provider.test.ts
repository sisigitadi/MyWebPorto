import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildCloudPrompt,
  buildCloudMessages,
  isCloudAIEnabled,
  submitToGeminiMessages,
  type LiveContext,
} from "@/lib/ai-provider";
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
  it("sukses: ambil text dari candidates.parts, potong maxChars", async () => {
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
    expect(res.text).toBe("Halo, saya"); // slice(0, 10) setelah trim
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
});
