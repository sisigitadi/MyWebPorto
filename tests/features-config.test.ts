import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  FEATURE_KEYS,
  FEATURE_DEFS,
  FEATURE_GROUPS,
  DEFAULT_FEATURES,
  isFeatureKey,
} from "@/lib/features-meta";
import {
  resolveFeatures,
  saveFeatures,
  describeFeatures,
} from "@/lib/features-config";

/**
 * resolveFeatures/saveFeatures membaca settings.features; di lingkungan test
 * tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test,
 * jika tidak nilai yang tertulis akan menimpa default pada test berikutnya
 * (persis seperti produksi: admin menimpa kode).
 *
 * File ini menulis/membaca berkas bersama dengan cloud-ai-config.test.ts,
 * os-apps-config.test.ts, dan ui-strings-config.test.ts — karenanya WAJIB
 * terdaftar di SHARED_FS_TESTS (project serial) di vitest.config.mts. Bila
 * lupa, beforeEach satu file menghapus file persis saat file lain menulis
 * → flaky race.
 */

const LOCAL_SETTINGS = path.join(process.cwd(), "data", "local-settings.json");

function clearLocalSettings(): void {
  try {
    if (fs.existsSync(LOCAL_SETTINGS)) fs.unlinkSync(LOCAL_SETTINGS);
  } catch {
    // Ignore: mungkin sedang ditulis worker lain.
  }
}

beforeEach(clearLocalSettings);
afterEach(clearLocalSettings);

async function writeSettings(payload: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
  const existing = fs.existsSync(LOCAL_SETTINGS)
    ? JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"))
    : {};
  await fs.promises.writeFile(
    LOCAL_SETTINGS,
    JSON.stringify({ ...existing, features: payload })
  );
}

describe("resolveFeatures (toleran — data DB usang tidak pernah meruntuhkan situs)", () => {
  it("DB kosong → DEFAULT_FEATURES: semua fitur ON, maintenance OFF", async () => {
    const f = await resolveFeatures();
    expect(f).toEqual(DEFAULT_FEATURES);
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_store_cart).toBe(true);
    expect(f.enable_articles).toBe(true);
    expect(f.maintenance_mode).toBe(false);
  });

  it("shape hancur (array, string, null) → DEFAULT_FEATURES, tidak melempar", async () => {
    await writeSettings([1, 2, 3]);
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
    await writeSettings("on");
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
    await writeSettings(null);
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
  });

  it("key asing diabaikan", async () => {
    await writeSettings({ evil_flag: true, enable_articles: false });
    const f = await resolveFeatures();
    expect(f.enable_articles).toBe(false);
    expect((f as Record<string, unknown>).evil_flag).toBeUndefined();
  });

  it("value non-boolean per key diabaikan → default key itu; key lain tetap dibaca", async () => {
    await writeSettings({
      enable_terminal: "yes", // non-boolean → diabaikan
      enable_articles: 1, // non-boolean → diabaikan
      maintenance_mode: null, // non-boolean → diabaikan
      enable_store_cart: false, // boolean valid → dipakai
    });
    const f = await resolveFeatures();
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_articles).toBe(true);
    expect(f.maintenance_mode).toBe(false);
    expect(f.enable_store_cart).toBe(false);
  });

  it("key yang tidak disebut tetap default (DB boleh sparse)", async () => {
    await writeSettings({ maintenance_mode: true });
    const f = await resolveFeatures();
    expect(f.maintenance_mode).toBe(true);
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_store_cart).toBe(true);
    expect(f.enable_articles).toBe(true);
  });
});

describe("saveFeatures (ketat — input admin harus eksplisit)", () => {
  it("input valid dipakai penuh dan bisa dibaca ulang resolveFeatures", async () => {
    const saved = await saveFeatures({ enable_terminal: false, maintenance_mode: true });
    expect(saved).toEqual({
      enable_terminal: false,
      enable_store_cart: true,
      enable_articles: true,
      maintenance_mode: true,
    });
    expect(await resolveFeatures()).toEqual(saved);
  });

  it("key tidak dikirim tetap diisi default (overlay, bukan partial-stale)", async () => {
    const saved = await saveFeatures({ enable_articles: false });
    expect(saved.enable_articles).toBe(false);
    expect(saved.enable_terminal).toBe(true);
  });

  it("key asing ditolak keras", async () => {
    await expect(
      saveFeatures({ enable_terminal: false, evil_flag: true })
    ).rejects.toThrow(/tidak dikenal/);
  });

  it("value bukan boolean ditolak keras", async () => {
    await expect(saveFeatures({ maintenance_mode: "yes" })).rejects.toThrow(/bukan true\/false/);
    await expect(saveFeatures({ enable_terminal: 1 })).rejects.toThrow(/bukan true\/false/);
  });

  it("input bukan object ditolak keras", async () => {
    await expect(saveFeatures(null)).rejects.toThrow(/bukan object/);
    await expect(saveFeatures("on")).rejects.toThrow(/bukan object/);
  });

  it("penyimpanan tidak meninggalkan key asing di file", async () => {
    await saveFeatures({ enable_terminal: false });
    const raw = JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"));
    expect(Object.keys(raw.features).sort()).toEqual([...FEATURE_KEYS].sort());
  });
});

describe("describeFeatures (ringkasan audit log + badge admin)", () => {
  it("format 'N/total fitur aktif' dalam Bahasa Indonesia", () => {
    expect(describeFeatures(DEFAULT_FEATURES, "id")).toBe("3/3 fitur aktif");
  });

  it("fitur yang dimatikan dihitung", () => {
    expect(
      describeFeatures(
        { ...DEFAULT_FEATURES, enable_terminal: false, enable_articles: false },
        "id"
      )
    ).toBe("1/3 fitur aktif");
  });

  it("mode pemeliharaan disebut eksplisit saat aktif", () => {
    expect(describeFeatures({ ...DEFAULT_FEATURES, maintenance_mode: true }, "id")).toContain(
      "mode pemeliharaan AKTIF"
    );
    expect(describeFeatures(DEFAULT_FEATURES, "id")).not.toContain("pemeliharaan");
  });

  it("varian EN", () => {
    expect(describeFeatures(DEFAULT_FEATURES, "en")).toBe("3/3 features enabled");
    expect(
      describeFeatures({ ...DEFAULT_FEATURES, maintenance_mode: true }, "en")
    ).toContain("maintenance mode ON");
  });
});

describe("FEATURE_DEFS / FEATURE_KEYS (keandalan daftar — guard)", () => {
  it("tepat 4 flag, semua unik", () => {
    expect(FEATURE_KEYS.length).toBe(4);
    expect(new Set(FEATURE_KEYS).size).toBe(4);
  });

  it("setiap FEATURE_KEYS punya def lengkap (label + deskripsi ID/EN + group)", () => {
    for (const key of FEATURE_KEYS) {
      const def = FEATURE_DEFS.find((d) => d.key === key);
      expect(def, `def untuk "${key}" hilang`).toBeDefined();
      expect(def!.label.trim().length).toBeGreaterThan(0);
      expect(def!.description.id.trim().length).toBeGreaterThan(0);
      expect(def!.description.en.trim().length).toBeGreaterThan(0);
      expect(def!.group.trim().length).toBeGreaterThan(0);
    }
  });

  it("tidak ada def untuk key asing", () => {
    expect(FEATURE_DEFS.find((d) => (d.key as string) === "evil_flag")).toBeUndefined();
  });

  it("FEATURE_GROUPS = kelompok unik sesuai urutan def", () => {
    expect(FEATURE_GROUPS).toEqual(["Aplikasi OS", "Toko", "Operasional"]);
  });

  it("maintenance_mode ditandai dangerous (butuh konfirmasi)", () => {
    const def = FEATURE_DEFS.find((d) => d.key === "maintenance_mode");
    expect(def?.dangerous).toBe(true);
  });

  it("isFeatureKey membenarkan hanya flag terdaftar", () => {
    for (const key of FEATURE_KEYS) expect(isFeatureKey(key)).toBe(true);
    expect(isFeatureKey("evil_flag")).toBe(false);
  });
});
