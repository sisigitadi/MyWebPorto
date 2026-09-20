import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  resolveCloudAIConfig,
  saveCloudAIConfig,
  maskKey,
  type StoredCloudAIConfig,
} from "@/lib/cloud-ai-config";

/**
 * resolveCloudAIConfig membaca pengaturan admin (tabel settings) saat ada; di
 * lingkungan test tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test —
 * bila tidak, nilai yang tertulis akan menimpa env pada test berikutnya
 * (persis seperti perilaku produksi: admin menimpa env).
 */

const ENV_KEYS = [
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "AI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "DEEPSEEK_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "XAI_API_KEY",
] as const;
const OLD: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) OLD[k] = process.env[k];

const LOCAL_SETTINGS = path.join(process.cwd(), "data", "local-settings.json");

function clearLocalSettings(): void {
  try {
    if (fs.existsSync(LOCAL_SETTINGS)) fs.unlinkSync(LOCAL_SETTINGS);
  } catch {
    // Ignore: mungkin sedang ditulis worker lain.
  }
}

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(() => {
  clearLocalSettings();
  clearEnv();
});

afterEach(() => {
  clearLocalSettings();
  for (const k of ENV_KEYS) {
    if (OLD[k] === undefined) delete process.env[k];
    else process.env[k] = OLD[k];
  }
});

describe("resolveCloudAIConfig (fallback env)", () => {
  it("default: provider off, tidak ada key, model hemat", async () => {
    const cfg = await resolveCloudAIConfig();
    expect(cfg.provider).toBe("off");
    expect(cfg.apiKey).toBe("");
    expect(cfg.model).toBe("gemini-2.5-flash");
    expect(cfg.baseUrl).toBe("https://api.openai.com/v1");
    expect(cfg.source).toBe("env");
  });

  it("membaca provider + key + model dari env (gemini)", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "AIzaRealKey123";
    process.env.AI_MODEL = "gemini-2.0-flash";
    const cfg = await resolveCloudAIConfig();
    expect(cfg).toMatchObject({ provider: "gemini", apiKey: "AIzaRealKey123", model: "gemini-2.0-flash" });
  });

  it("openai memakai model & base URL ubahan", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-real";
    process.env.OPENAI_MODEL = "deepseek-chat";
    process.env.OPENAI_BASE_URL = "https://api.deepseek.com/v1/";
    const cfg = await resolveCloudAIConfig();
    expect(cfg.model).toBe("deepseek-chat");
    // Trailing slash selalu dipotong agar URL bisa dirangkai aman.
    expect(cfg.baseUrl).toBe("https://api.deepseek.com/v1");
  });

  it("provider tidak dikenal jatuh ke off (fail-closed)", async () => {
    process.env.AI_PROVIDER = "claude";
    expect((await resolveCloudAIConfig()).provider).toBe("off");
  });

  it("anthropic membaca key/model/base URL dari env-nya sendiri", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "TEST_ANTHROPIC_KEY_FIXTURE";
    process.env.ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1/";
    const cfg = await resolveCloudAIConfig();
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.apiKey).toBe("TEST_ANTHROPIC_KEY_FIXTURE");
    expect(cfg.model).toBe("claude-3-5-sonnet-20241022");
    // Trailing slash selalu dipotong.
    expect(cfg.baseUrl).toBe("https://api.anthropic.com/v1");
  });

  it("preset (groq) dapat default base URL & model dari registry", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "TEST_GROQ_KEY_FIXTURE";
    const cfg = await resolveCloudAIConfig();
    expect(cfg).toMatchObject({
      provider: "groq",
      apiKey: "TEST_GROQ_KEY_FIXTURE",
      model: "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
    });
  });

  it("key provider lain tidak bocor ke provider aktif (isolasi)", async () => {
    // AI_PROVIDER=gemini tapi hanya DEEPSEEK_API_KEY yang terisi → key harus
    // kosong, bukan meminjam deepseek (provider gemini tidak kompatibel).
    process.env.AI_PROVIDER = "gemini";
    process.env.DEEPSEEK_API_KEY = "sk-deepseek";
    const cfg = await resolveCloudAIConfig();
    expect(cfg.provider).toBe("gemini");
    expect(cfg.apiKey).toBe("");
  });
});

describe("saveCloudAIConfig (validasi + prioritas admin)", () => {
  it("menormalkan provider, memotong field panjang, membersih base URL", async () => {
    const input: StoredCloudAIConfig = {
      // Provider invalid tidak boleh lolos sebagai provider aktif.
      provider: "claude" as unknown as StoredCloudAIConfig["provider"],
      apiKey: "AIzaRealKey1234567890",
      model: "x".repeat(100),
      baseUrl: "https://api.openai.com/v1///",
    };
    await saveCloudAIConfig(input);
    const cfg = await resolveCloudAIConfig();
    expect(cfg.provider).toBe("off");
    expect(cfg.model.length).toBeLessThanOrEqual(64);
    expect(cfg.baseUrl).toBe("https://api.openai.com/v1");
    expect(cfg.source).toBe("admin");
  });

  it("apiKey kosong = pertahankan key yang sudah tersimpan", async () => {
    await saveCloudAIConfig({ provider: "gemini", apiKey: "AIzaKeepMe123456", model: "gemini-2.5-flash" });
    // Ganti model tanpa mengetik ulang key rahasia.
    await saveCloudAIConfig({ provider: "gemini", apiKey: "", model: "gemini-2.0-flash" });
    const cfg = await resolveCloudAIConfig();
    expect(cfg.model).toBe("gemini-2.0-flash");
    expect(cfg.apiKey).toBe("AIzaKeepMe123456");
  });

  it("provider baru (anthropic/groq) disimpan & di-resolve dengan benar", async () => {
    await saveCloudAIConfig({
      provider: "anthropic",
      apiKey: "TEST_ANTHROPIC_KEY_FIXTURE",
      model: "claude-3-5-haiku-latest",
    });
    expect((await resolveCloudAIConfig()).provider).toBe("anthropic");

    await saveCloudAIConfig({
      provider: "groq",
      apiKey: "TEST_GROQ_KEY_FIXTURE",
    });
    const cfg = await resolveCloudAIConfig();
    expect(cfg.provider).toBe("groq");
    expect(cfg.apiKey).toBe("TEST_GROQ_KEY_FIXTURE");
  });

  it("menyimpan systemPrompt & answerStyle kustom admin", async () => {
    await saveCloudAIConfig({
      provider: "gemini",
      apiKey: "AIzaRealKey1234567890",
      model: "gemini-2.5-flash",
      systemPrompt: "Kamu adalah Sigit_Bot. Jawab ramah dalam Bahasa Indonesia.",
      answerStyle: "detailed",
    });
    const cfg = await resolveCloudAIConfig();
    expect(cfg.systemPrompt).toBe("Kamu adalah Sigit_Bot. Jawab ramah dalam Bahasa Indonesia.");
    expect(cfg.answerStyle).toBe("detailed");
  });

  it("answerStyle invalid jatuh ke concise (fail-closed)", async () => {
    await saveCloudAIConfig({
      provider: "gemini",
      apiKey: "AIzaRealKey1234567890",
      answerStyle: "verbose" as unknown as StoredCloudAIConfig["answerStyle"],
    });
    expect((await resolveCloudAIConfig()).answerStyle).toBe("concise");
  });

  it("systemPrompt kosong = persona default (tidak ada string kosong)", async () => {
    await saveCloudAIConfig({ provider: "gemini", apiKey: "AIzaRealKey1234567890" });
    const cfg = await resolveCloudAIConfig();
    expect(cfg.systemPrompt).toBe("");
    expect(cfg.answerStyle).toBe("concise");
  });
});

describe("maskKey", () => {
  it("tidak pernah membocorkan key ke client", () => {
    expect(maskKey("AIzaSyABCDEFGH123456")).toBe("••••••••3456");
  });

  it("key pendek hanya menampilkan titik", () => {
    expect(maskKey("sk-12")).toBe("••••");
    expect(maskKey("")).toBe("");
  });

  it("placeholder ditandai jelas, bukan di-mask", () => {
    expect(maskKey("xxxx-placeholder")).toBe("(placeholder)");
  });
});
