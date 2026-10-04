import { describe, expect, it, vi } from "vitest";
import { submitToOpenAI, submitToOpenAIStream } from "@/lib/ai-openai";
import type { ResolvedCloudAIConfig } from "@/lib/cloud-ai-config";

/**
 * submitToOpenAI / submitToOpenAIStream memanggil POST /v1/chat/completions.
 * Di-test dengan fetch di-mock: tidak ada egress nyata. Konvensi sama dengan
 * tests/ai-anthropic.test.ts (hanya vi.spyOn(globalThis, "fetch")).
 */

const CFG: ResolvedCloudAIConfig = {
  provider: "openai",
  apiKey: "TEST_OPENAI_KEY_FIXTURE",
  model: "gemini-3.8-flash-high",
  baseUrl: "https://router.example.test/v1",
  systemPrompt: "",
  answerStyle: "concise",
  authMode: "api_key",
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

/** Habiskan ReadableStream SSE mentah jadi string (untuk assertion). */
async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("submitToOpenAI (non-streaming)", () => {
  it("sukses: ambil choices[].message.content, potong maxChars", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ choices: [{ message: { content: "Halo, saya Sigit_Bot." } }] })
    );
    const res = await submitToOpenAI("halo", { config: CFG, maxChars: 10 });
    expect(res.success).toBe(true);
    expect(res.text).toBe("Halo, saya"); // slice(0, 10) setelah trim
    fetchMock.mockRestore();
  });

  it("endpoint & header: {baseUrl}/chat/completions + Authorization Bearer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      OK({ choices: [{ message: { content: "ok" } }] })
    );
    await submitToOpenAI("halo", { config: CFG });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://router.example.test/v1/chat/completions");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer TEST_OPENAI_KEY_FIXTURE");
    fetchMock.mockRestore();
  });

  it("relay yang SELALU memakai SSE (stream:false diabaikan) tetap terbaca", async () => {
    // Regresi audit 2026-09-23: gateway tertentu membalas SSE meski tak diminta
    // streaming. Tanpa toleransi, response.json() melempar → dianggap cloud
    // gagal → terminal/Redaksi salah jatuh ke lokal.
    const sse = [
      'data: {"choices":[{"delta":{"content":"Halo"}}]}',
      'data: {"choices":[{"delta":{"content":" dari relay"}}]}',
      "data: [DONE]",
      "",
    ].join("\n");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } })
    );
    const res = await submitToOpenAI("halo", { config: CFG });
    expect(res.success).toBe(true);
    expect(res.text).toBe("Halo dari relay");
  });

  it("placeholder key → fail-closed, tidak ada panggilan keluar", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await submitToOpenAI("halo", { config: { ...CFG, apiKey: "xxxx-placeholder" } });
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("HTTP error / content kosong → success false (bukan throw)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    expect((await submitToOpenAI("halo", { config: CFG })).success).toBe(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(OK({ choices: [] }));
    expect((await submitToOpenAI("halo", { config: CFG })).success).toBe(false);
  });
});


describe("submitToOpenAIStream (streaming)", () => {
  it("sukses: meneruskan chunk SSE mentah dari upstream", async () => {
    const sse = 'data: {"choices":[{"delta":{"content":"Halo"}}]}\n\n';
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } })
    );
    const out = await drain(submitToOpenAIStream([{ role: "user", content: "halo" }], { config: CFG }));
    expect(out).toContain('"delta":{"content":"Halo"}');
  });

  it("error upstream: code provider (model_not_found) naik, bukan status_503", async () => {
    // Regresi audit 2026-09-23: relay membalas 503 dengan body JSON
    // {"error":{"code":"model_not_found",...}}. Sebelumnya hanya status_503 yang
    // terlihat, sehingga penyebab sesungguhnya (model tak tersedia di relay)
    // tidak terbaca di meta fallbackReason RetroBot.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "model_not_found", message: "No available channel for model gpt-4o-mini" },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    );
    const out = await drain(submitToOpenAIStream([{ role: "user", content: "halo" }], { config: CFG }));
    expect(out).toContain("model_not_found");
    expect(out).not.toContain("status_503");
  });

  it("error upstream tanpa body JSON → jatuh ke status_<http>", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>503 Service Unavailable</html>", { status: 503 })
    );
    const out = await drain(submitToOpenAIStream([{ role: "user", content: "halo" }], { config: CFG }));
    expect(out).toContain("status_503");
  });

  it("payload: messages, max_tokens, temperature, stream:true", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    await drain(
      submitToOpenAIStream(
        [
          { role: "system", content: "Persona." },
          { role: "user", content: "halo" },
        ],
        { config: CFG }
      )
    );
    const body = lastBody(fetchMock);
    expect(body.model).toBe("gemini-3.8-flash-high");
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: "system", content: "Persona." },
      { role: "user", content: "halo" },
    ]);
    fetchMock.mockRestore();
  });

  it("placeholder key → stream error \"unconfigured\" tanpa egress", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const out = await drain(
      submitToOpenAIStream([{ role: "user", content: "halo" }], {
        config: { ...CFG, apiKey: "xxxx-placeholder" },
      })
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out).toContain("unconfigured");
    fetchMock.mockRestore();
  });
});
