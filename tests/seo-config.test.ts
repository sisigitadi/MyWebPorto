import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  resolveSeoConfig,
  resolveVerification,
  resolveOgMeta,
  saveSeoConfig,
  maskToken,
} from "@/lib/seo-config";

/**
 * resolveSeoConfig membaca pengaturan admin (tabel settings) saat ada; di
 * lingkungan test tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test —
 * bila tidak, nilai yang tertulis akan menimpa env pada test berikutnya
 * (persis seperti perilaku produksi: admin menimpa env).
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_GOOGLE_VERIFICATION",
  "NEXT_PUBLIC_BING_VERIFICATION",
  "INDEXNOW_KEY",
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

describe("resolveSeoConfig (prioritas: admin > env > default)", () => {
  it("default: token publik fallback, key IndexNow kosong", async () => {
    const cfg = await resolveSeoConfig();
    expect(cfg.googleVerification).toBe("nO80bNSBPyrM7VQYvpPKCmgcQVBuJ_7Ydaxhfsk5Vbw");
    expect(cfg.bingVerification).toBe("e5b871c984924b179571fcfdca565780");
    expect(cfg.indexNowKey).toBe("");
    expect(cfg.source).toBe("default");
  });

  it("env menimpa default publik", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION = "GOOGLE_TOKEN_FROM_ENV_123";
    process.env.NEXT_PUBLIC_BING_VERIFICATION = "BING_TOKEN_FROM_ENV_12345";
    process.env.INDEXNOW_KEY = "INDEXNOW_KEY_FROM_ENV_12345";
    const cfg = await resolveSeoConfig();
    expect(cfg.googleVerification).toBe("GOOGLE_TOKEN_FROM_ENV_123");
    expect(cfg.bingVerification).toBe("BING_TOKEN_FROM_ENV_12345");
    expect(cfg.indexNowKey).toBe("INDEXNOW_KEY_FROM_ENV_12345");
    expect(cfg.source).toBe("env");
  });

  it("settings admin menimpa env", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION = "GOOGLE_TOKEN_FROM_ENV_123";
    await saveSeoConfig({ googleVerification: "ADMIN_GOOGLE_TOKEN_ABCD", ogTitle: "OG Admin" });
    const cfg = await resolveSeoConfig();
    expect(cfg.googleVerification).toBe("ADMIN_GOOGLE_TOKEN_ABCD");
    expect(cfg.ogTitle).toBe("OG Admin");
    expect(cfg.source).toBe("admin");
  });
});

describe("resolveVerification (bentuk Metadata Next.js)", () => {
  it("memasukkan google & msvalidate.01", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION = "GOOGLE_TOKEN_FROM_ENV_123";
    const v = await resolveVerification();
    expect(v.google).toBe("GOOGLE_TOKEN_FROM_ENV_123");
    expect(v.other?.["msvalidate.01"]).toBe("e5b871c984924b179571fcfdca565780");
  });
});

describe("resolveOgMeta (override vs turunan profil)", () => {
  it("turunan profil saat tidak ada override", async () => {
    const og = await resolveOgMeta({
      name: "Sigit Adi Irianto",
      headline: "Senior Web Developer",
      bio: "Bio singkat.",
    });
    expect(og.title).toBe("Sigit Adi Irianto — Senior Web Developer");
    expect(og.description).toBe("Bio singkat.");
    expect(og.imageUrl).toBe("/opengraph-image");
    expect(og.overridden).toBe(false);
  });

  it("override admin menimpa turunan profil", async () => {
    await saveSeoConfig({
      ogTitle: "Judul OG Kustom",
      ogDescription: "Deskripsi OG kustom.",
      ogImageUrl: "/uploads/og.png",
      ogImageAlt: "Alt kustom",
    });
    const og = await resolveOgMeta({ name: "Sigit", headline: "Dev", bio: "Bio" });
    expect(og.title).toBe("Judul OG Kustom");
    expect(og.description).toBe("Deskripsi OG kustom.");
    expect(og.imageUrl).toBe("/uploads/og.png");
    expect(og.imageAlt).toBe("Alt kustom");
    expect(og.overridden).toBe(true);
  });

  it("override OG dikosongkan → kembali ke default profil", async () => {
    await saveSeoConfig({ ogTitle: "Sementara", ogDescription: "Sementara" });
    await saveSeoConfig({ ogTitle: "", ogDescription: "" });
    const og = await resolveOgMeta({ name: "Sigit", headline: "Dev", bio: "Bio" });
    expect(og.title).toBe("Sigit — Dev");
    expect(og.description).toBe("Bio");
    expect(og.overridden).toBe(false);
  });
});


describe("saveSeoConfig (validasi & semantik field)", () => {
  it("token valid disimpan", async () => {
    await saveSeoConfig({ googleVerification: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" });
    expect((await resolveSeoConfig()).googleVerification).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  });

  it("token dengan karakter terlarang ditolak keras", async () => {
    await expect(saveSeoConfig({ googleVerification: "token dengan spasi!!!" })).rejects.toThrow();
  });

  it("token terlalu pendek ditolak", async () => {
    await expect(saveSeoConfig({ bingVerification: "abc123" })).rejects.toThrow();
  });

  it("token kosong = pertahankan yang sudah tersimpan", async () => {
    await saveSeoConfig({ googleVerification: "KEEP_THIS_GOOGLE_TOKEN_12345" });
    // Simpan lagi dengan field google kosong → nilai lama tetap, OG berubah.
    await saveSeoConfig({ googleVerification: "", ogTitle: "Ganti OG saja" });
    const cfg = await resolveSeoConfig();
    expect(cfg.googleVerification).toBe("KEEP_THIS_GOOGLE_TOKEN_12345");
    expect(cfg.ogTitle).toBe("Ganti OG saja");
  });

  it("URL gambar skema tidak dikenal ditolak", async () => {
    await expect(saveSeoConfig({ ogImageUrl: "javascript:alert(1)" })).rejects.toThrow();
  });

  it("URL gambar relatif & absolut diterima", async () => {
    await saveSeoConfig({ ogImageUrl: "/uploads/og.png" });
    expect((await resolveSeoConfig()).ogImageUrl).toBe("/uploads/og.png");
    await saveSeoConfig({ ogImageUrl: "https://cdn.example.com/og.png" });
    expect((await resolveSeoConfig()).ogImageUrl).toBe("https://cdn.example.com/og.png");
  });
});

describe("maskToken", () => {
  it("mengembalikan 4 karakter terakhir, bagian depan di-mask", () => {
    expect(maskToken("TEST_TOKEN_NOT_A_REAL_SECRET_abcd1234")).toBe("••••••••1234");
  });

  it("string kosong tetap kosong", () => {
    expect(maskToken("")).toBe("");
  });
});
