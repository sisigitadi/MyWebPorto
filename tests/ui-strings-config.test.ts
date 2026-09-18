import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  EDITABLE_KEYS,
  EDITABLE_KEY_SET,
  MAX_KEY_LENGTH,
  sanitizeStringValue,
} from "@/lib/ui-strings-meta";

/**
 * resolveUIStrings/saveUIStrings membaca settings.ui_strings; di lingkungan test
 * tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test,
 * jika tidak nilai yang tertulis akan menimpa default pada test berikutnya
 * (persis seperti produksi: admin menimpa kode).
 *
 * File ini menulis/membaca berkas bersama dengan tests/os-apps-config.test.ts
 * dan tests/cloud-ai-config.test.ts — karenanya WAJIB terdaftar di
 * SHARED_FS_TESTS (project serial) di vitest.config.mts. Bila lupa, beforeEach
 * satu file menghapus file persis saat file lain menulis → flaky race.
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

describe("sanitizeStringValue (plain-text)", () => {
  it("membuang tag HTML", () => {
    expect(sanitizeStringValue("<b>Halo</b> <i>dunia</i>")).toBe("Halo dunia");
  });

  it("membuang char kontrol", () => {
    expect(sanitizeStringValue("a\u0000b\u0007c\u001fd")).toBe("abcd");
  });

  it("collapse whitespace + trim", () => {
    expect(sanitizeStringValue("  Halo   \n\n dunia\t ")).toBe("Halo dunia");
  });

  it("input bukan string → string kosong", () => {
    expect(sanitizeStringValue(null)).toBe("");
    expect(sanitizeStringValue(42)).toBe("");
    expect(sanitizeStringValue({ x: 1 })).toBe("");
  });

  it("tidak memotong — value panjang dikembalikan utuh (penolakan adalah tugas saveUIStrings)", () => {
    const long = "a".repeat(300);
    expect(sanitizeStringValue(long).length).toBe(300);
  });
});

describe("EDITABLE_KEYS (keandalan daftar)", () => {
  it("22 key, semua unik", () => {
    const keys = EDITABLE_KEYS.map((k) => k.key);
    expect(keys.length).toBe(22);
    expect(new Set(keys).size).toBe(22);
  });

  it("set allowlist cocok dengan daftar", () => {
    for (const k of EDITABLE_KEYS) expect(EDITABLE_KEY_SET.has(k.key)).toBe(true);
    expect(EDITABLE_KEY_SET.has("evil_key")).toBe(false);
  });

  it("semua key punya maxLength di antara 1 dan MAX_KEY_LENGTH", () => {
    for (const k of EDITABLE_KEYS) {
      expect(k.maxLength).toBeGreaterThan(0);
      expect(k.maxLength).toBeLessThanOrEqual(MAX_KEY_LENGTH);
    }
  });
});
