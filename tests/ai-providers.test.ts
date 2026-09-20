import { describe, expect, it } from "vitest";
import {
  PROVIDERS,
  CLOUD_PROVIDER_IDS,
  getProviderMeta,
  getApiStyle,
  isCloudProvider,
  type ProviderMeta,
} from "@/lib/ai-providers";
import type { CloudProvider } from "@/lib/cloud-ai-config";

/**
 * Registry adalah sumber kebenaran provider untuk UI & server. Test ini
 * menjaga invariantsnya: tiap id di union CloudProvider HARUS punya entry,
 * dan sebaliknya — agar tidak ada provider yang bisa dipilih tapi tak dikenal
 * resolver (yang akan fail-closed ke "off" secara diam-diam).
 */

const EVERY_PROVIDER: CloudProvider[] = [
  "off",
  "gemini",
  "openai",
  "anthropic",
  "deepseek",
  "groq",
  "openrouter",
  "together",
  "mistral",
  "xai",
];

describe("registry completeness", () => {
  it("setiap id union CloudProvider punya entry (dan sebaliknya)", () => {
    for (const id of EVERY_PROVIDER) {
      const meta = getProviderMeta(id);
      expect(meta, `meta untuk "${id}"`).not.toBeNull();
      expect(meta?.id).toBe(id);
    }
    // Tidak ada meta asing di luar union.
    expect(CLOUD_PROVIDER_IDS).toEqual(expect.arrayContaining(EVERY_PROVIDER));
    expect(CLOUD_PROVIDER_IDS.length).toBe(EVERY_PROVIDER.length);
  });

  it("PROVIDERS (untuk dropdown) berisi semua id, off pertama", () => {
    expect(PROVIDERS.length).toBe(EVERY_PROVIDER.length);
    expect(PROVIDERS[0].id).toBe("off");
    for (const p of PROVIDERS as ProviderMeta[]) {
      expect(EVERY_PROVIDER).toContain(p.id);
      // Label & hint wajib (ditampilkan di UI).
      expect(p.label.trim()).toBeTruthy();
      expect(p.hint.trim()).toBeTruthy();
    }
  });

  it("provider cloud (bukan off) punya default model & keyPlaceholder", () => {
    for (const id of EVERY_PROVIDER) {
      if (id === "off") continue;
      const meta = getProviderMeta(id);
      expect(meta?.defaultModel).toBeTruthy();
      expect(meta?.keyPlaceholder).toBeTruthy();
      // env var key wajib terisi agar isCloudAIEnabled bisa membacanya.
      expect(meta?.envKey).toMatch(/_API_KEY$/);
    }
  });

  it("gaya openai-chat & anthropic punya base URL default (gemini endpoint tetap)", () => {
    for (const id of EVERY_PROVIDER) {
      const meta = getProviderMeta(id);
      if (!meta || meta.apiStyle === "off") continue;
      if (meta.apiStyle === "gemini") {
        // Endpoint Gemini fixed; baseUrl diabaikan pemanggil.
        expect(meta.defaultBaseUrl).toBe("");
      } else {
        // openai-chat & anthropic butuh endpoint (tanpa trailing slash).
        expect(["openai-chat", "anthropic"]).toContain(meta.apiStyle);
        expect(meta.defaultBaseUrl).toMatch(/^https?:\/\//);
        expect(meta.defaultBaseUrl).not.toMatch(/\/$/);
      }
    }
  });
});

describe("getApiStyle", () => {
  it("memetakan id ke gaya protokol", () => {
    expect(getApiStyle("gemini")).toBe("gemini");
    expect(getApiStyle("openai")).toBe("openai-chat");
    expect(getApiStyle("anthropic")).toBe("anthropic");
    expect(getApiStyle("groq")).toBe("openai-chat");
    expect(getApiStyle("off")).toBe("off");
  });

  it("fail-closed: id tak dikenal / kosong → off (bukan asumsi openai)", () => {
    expect(getApiStyle("claude")).toBe("off");
    expect(getApiStyle("azure")).toBe("off");
    expect(getApiStyle(undefined)).toBe("off");
    expect(getApiStyle(null)).toBe("off");
    expect(getApiStyle("")).toBe("off");
  });
});

describe("isCloudProvider", () => {
  it("menerima id yang terdaftar saja", () => {
    expect(isCloudProvider("off")).toBe(true);
    expect(isCloudProvider("anthropic")).toBe(true);
    expect(isCloudProvider("xai")).toBe(true);
    expect(isCloudProvider("claude")).toBe(false);
    expect(isCloudProvider("GEMINI")).toBe(false); // case-sensitive; env di-lowercase dulu
    expect(isCloudProvider(undefined)).toBe(false);
    expect(isCloudProvider(42)).toBe(false);
  });
});
