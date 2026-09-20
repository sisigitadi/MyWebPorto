import { describe, expect, it, vi } from "vitest";
import { listCloudModels } from "@/lib/ai-models";

/**
 * listCloudModels memanggil endpoint /models (OpenAI-compatible) atau
 * /v1beta/models (Gemini). Di-test dengan fetch di-mock: tidak ada egress
 * nyata, dan key tidak pernah bocor ke output.
 */

const OK = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const FAIL = (status: number): Response => new Response("{}", { status });

describe("listCloudModels", () => {
  it("provider off → error jelas", async () => {
    const r = await listCloudModels("off", "key", "");
    expect(r.models).toEqual([]);
    expect(r.error).toBeTruthy();
  });

  it("key kosong → error (fail-closed)", async () => {
    const r = await listCloudModels("gemini", "", "");
    expect(r.models).toEqual([]);
    expect(r.error).toContain("API Key");
  });

  it("gemini: memetakan models/gemini-x → id, filter generateContent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({
        models: [
          { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
          { name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] },
        ],
      })
    );
    const r = await listCloudModels("gemini", "AIzaFake", "");
    expect(r.models).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
    // Endpoint Gemini tetap (baseUrl diabaikan), key di-query string.
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
    expect(fetchMock.mock.calls[0][0]).toContain("key=AIzaFake");
    fetchMock.mockRestore();
  });

  it("openai: GET {baseUrl}/models dengan Authorization Bearer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ data: [{ id: "gpt-4o-mini" }, { id: "deepseek-chat" }] })
    );
    const r = await listCloudModels("openai", "sk-fake", "https://api.deepseek.com/v1/");
    expect(r.models).toEqual(["deepseek-chat", "gpt-4o-mini"]);
    const [url, init] = fetchMock.mock.calls[0];
    // Trailing slash dipotong sebelum /models.
    expect(String(url)).toBe("https://api.deepseek.com/v1/models");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-fake");
    fetchMock.mockRestore();
  });

  it("anthropic: GET {baseUrl}/models dengan header x-api-key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({
        data: [
          { id: "claude-3-5-sonnet-20241022" },
          { id: "claude-3-5-haiku-20241022" },
        ],
      })
    );
    const r = await listCloudModels("anthropic", "TEST_ANTHROPIC_KEY_FIXTURE", "https://api.anthropic.com/v1");
    expect(r.models).toEqual(["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/models");
    const headers = init?.headers as Record<string, string>;
    // Anthropic pakai x-api-key (bukan Bearer) + wajib header versi API.
    expect(headers["x-api-key"]).toBe("TEST_ANTHROPIC_KEY_FIXTURE");
    expect(headers["anthropic-version"]).toBeTruthy();
    fetchMock.mockRestore();
  });

  it("preset (groq) memakai base URL default registry saat argumen kosong", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ data: [{ id: "llama-3.3-70b-versatile" }] })
    );
    const r = await listCloudModels("groq", "TEST_GROQ_KEY_FIXTURE", "");
    expect(r.models).toEqual(["llama-3.3-70b-versatile"]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.groq.com/openai/v1/models");
    // Preset OpenAI-compatible tetap memakai Authorization Bearer.
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TEST_GROQ_KEY_FIXTURE");
    fetchMock.mockRestore();
  });

  it("HTTP error → pesan error, bukan throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(FAIL(401));
    const r = await listCloudModels("openai", "sk-bad", "https://api.openai.com/v1");
    expect(r.models).toEqual([]);
    expect(r.error).toContain("401");
  });

  it("network error → pesan error, bukan throw", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const r = await listCloudModels("gemini", "AIzaFake", "");
    expect(r.models).toEqual([]);
    expect(r.error).toBeTruthy();
  });

  it("daftar kosong → error informatif", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(OK({ data: [] }));
    const r = await listCloudModels("openai", "sk-fake", "https://api.openai.com/v1");
    expect(r.models).toEqual([]);
    expect(r.error).toBeTruthy();
  });
});
