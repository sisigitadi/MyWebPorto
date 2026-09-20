import { describe, expect, it, vi } from "vitest";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import type { ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";

/**
 * submitToAnthropic memanggil POST /v1/messages (Anthropic). Di-test dengan
 * fetch di-mock: tidak ada egress nyata, dan key tidak pernah bocor ke output
 * (hanya header x-api-key yang memakainya, sama seperti produksi).
 */

const CFG: ResolvedCloudAIConfig = {
  provider: "anthropic",
  apiKey: "TEST_ANTHROPIC_KEY_FIXTURE",
  model: "claude-3-5-haiku-latest",
  baseUrl: "https://api.anthropic.com/v1",
  systemPrompt: "",
  answerStyle: "concise",
  source: "admin",
};

const OK = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Body permintaan terakhir yang dikirim ke fetch (sudah di-parse). */
function lastBody(fetchMock: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("submitToAnthropic", () => {
  it("sukses: ambil text dari content blocks, potong maxChars", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({
        content: [
          { type: "text", text: "Halo, saya Sigit_Bot." },
          { type: "text", text: " Yang kedua." },
        ],
      })
    );
    const res = await submitToAnthropic("halo", { config: CFG, maxChars: 10 });
    expect(res.success).toBe(true);
    expect(res.text).toBe("Halo, saya"); // slice(0, 10) setelah trim
    fetchMock.mockRestore();
  });

  it("endpoint & header Anthropic: /messages, x-api-key, anthropic-version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ content: [{ type: "text", text: "ok" }] })
    );
    await submitToAnthropic("halo", { config: CFG });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("TEST_ANTHROPIC_KEY_FIXTURE");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    fetchMock.mockRestore();
  });

  it("payload: system prompt dipindah ke field top-level, bukan role system", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ content: [{ type: "text", text: "ok" }] })
    );
    await submitToAnthropic(
      [
        { role: "system", content: "Persona X." },
        { role: "user", content: "halo" },
      ],
      { config: CFG }
    );
    const body = lastBody(fetchMock);
    expect(body.model).toBe("claude-3-5-haiku-latest");
    expect(body.max_tokens).toBe(300); // default hemat jawaban bot
    expect(body.system).toBe("Persona X.");
    expect(body.messages).toEqual([{ role: "user", content: "halo" }]);
    fetchMock.mockRestore();
  });

  it("role user berturut-turut digabung (API menolak yang tak bergantian)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ content: [{ type: "text", text: "ok" }] })
    );
    await submitToAnthropic(
      [
        { role: "system", content: "Persona." },
        { role: "user", content: "konteks halaman" },
        { role: "user", content: "pertanyaan" },
      ],
      { config: CFG }
    );
    const body = lastBody(fetchMock);
    expect(body.messages).toEqual([
      { role: "user", content: "konteks halaman\n\npertanyaan" },
    ]);
    fetchMock.mockRestore();
  });

  it("assistant di awal di-drop (pesan pertama wajib user)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ content: [{ type: "text", text: "ok" }] })
    );
    await submitToAnthropic(
      [
        { role: "assistant", content: "loncat" },
        { role: "user", content: "halo" },
      ],
      { config: CFG }
    );
    const body = lastBody(fetchMock);
    expect(body.messages).toEqual([{ role: "user", content: "halo" }]);
    fetchMock.mockRestore();
  });

  it("placeholder key → fail-closed, tidak ada panggilan keluar", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await submitToAnthropic("halo", {
      config: { ...CFG, apiKey: "xxxx-placeholder" },
    });
    expect(res.success).toBe(false);
    expect(res.text).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("HTTP error → success false (bukan throw)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const res = await submitToAnthropic("halo", { config: CFG });
    expect(res.success).toBe(false);
    expect(res.text).toBe("");
  });

  it("network error → success false (bukan throw)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const res = await submitToAnthropic("halo", { config: CFG });
    expect(res.success).toBe(false);
  });

  it("content kosong / tanpa blok teks → success false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(OK({ content: [] }));
    expect((await submitToAnthropic("halo", { config: CFG })).success).toBe(false);
  });
});
