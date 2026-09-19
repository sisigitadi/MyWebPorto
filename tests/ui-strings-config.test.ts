import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  EDITABLE_KEYS,
  EDITABLE_KEY_SET,
  MAX_KEY_LENGTH,
  sanitizeStringValue,
} from "@/lib/ui-strings-meta";
import {
  resolveUIStrings,
  saveUIStrings,
  describeUIStrings,
} from "@/lib/ui-strings-config";
import type { UIStrings } from "@/lib/ui-strings-config";

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

async function writeSettings(payload: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
  const existing = fs.existsSync(LOCAL_SETTINGS)
    ? JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"))
    : {};
  await fs.promises.writeFile(
    LOCAL_SETTINGS,
    JSON.stringify({ ...existing, ui_strings: payload })
  );
}

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

describe("resolveUIStrings (fallback & toleransi data usang)", () => {
  it("belum diatur → overlay kosong, source default", async () => {
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
    expect(r.id).toEqual({});
    expect(r.en).toEqual({});
  });

  it("key valid masuk overlay persis, source admin", async () => {
    await writeSettings({ id: { contact_title: "Mari Ngobrol" }, en: { contact_title: "Let's Talk" } });
    const r = await resolveUIStrings();
    expect(r.source).toBe("admin");
    expect(r.id.contact_title).toBe("Mari Ngobrol");
    expect(r.en.contact_title).toBe("Let's Talk");
  });

  it("value bukan object → diabaikan, tetap default", async () => {
    await writeSettings("corrupt");
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
    expect(r.id).toEqual({});
  });

  it("lang asing diabaikan", async () => {
    await writeSettings({ fr: { contact_title: "Bonjour" } });
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
  });

  it("key asing diabaikan, key valid di sebelahnya tetap masuk", async () => {
    await writeSettings({ id: { evil_key: "HACK", contact_title: "Valid" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("Valid");
    expect(r.id).not.toHaveProperty("evil_key");
  });

  it("value bukan string diabaikan", async () => {
    await writeSettings({ id: { contact_title: null, contact_subtitle: 42 } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("value whitespace-only diabaikan (artinya pakai default)", async () => {
    await writeSettings({ id: { contact_title: "   \t " } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("value lebih panjang dari MAX_KEY_LENGTH diabaikan", async () => {
    await writeSettings({ id: { contact_title: "a".repeat(MAX_KEY_LENGTH + 1) } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });
});

describe("saveUIStrings (penolakan keras input admin)", () => {
  it("key asing ditolak", async () => {
    await expect(
      saveUIStrings({ id: { evil_key: "x" }, en: {} })
    ).rejects.toThrow(/tidak dikenal/);
  });

  it("value HTML ditolak sebelum disimpan", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: "<b>Halo</b>" }, en: {} })
    ).rejects.toThrow(/tidak valid|HTML|tag/i);
  });

  it("value melebihi maxLength ditolak", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: "a".repeat(81) }, en: {} })
    ).rejects.toThrow(/terlalu panjang/i);
  });

  it("value bukan string ditolak", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: 42 }, en: {} })
    ).rejects.toThrow(/tidak valid|teks/i);
  });

  it("input bukan object ditolak", async () => {
    await expect(saveUIStrings(null)).rejects.toThrow();
    await expect(saveUIStrings("nope")).rejects.toThrow();
  });

  it("value valid disimpan + dibaca kembali, whitespace dirapikan", async () => {
    await saveUIStrings({ id: { contact_title: "  Mari   Ngobrol  " }, en: { contact_title: "Let's Talk" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("Mari Ngobrol");
    expect(r.en.contact_title).toBe("Let's Talk");
  });

  it("value whitespace-only menyimpan overlay kosong (kembali ke default)", async () => {
    await saveUIStrings({ id: { contact_title: "   " }, en: {} });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("tag HTML dibuang saat simpan bila lolos validasi (pertahanan dalam)", async () => {
    // saveUIStrings menolak value HTML; tapi bila ditulis langsung ke DB,
    // resolveUIStrings harus tetap membuangnya di read-path. Yang dibuang tag
    // HTML-nya saja — teks di antaranya ("x") tetap, sama seperti
    // sanitizeStringValue("<b>Halo</b> <i>dunia</i>") → "Halo dunia".
    await writeSettings({ id: { contact_title: "<script>x</script>Bersih" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("xBersih");
  });
});

describe("describeUIStrings", () => {
  it("ringkasan jumlah key disunting", () => {
    const s: UIStrings = { id: { contact_title: "A" }, en: {}, source: "admin" };
    expect(describeUIStrings(s, "id")).toContain("1");
    expect(describeUIStrings(s, "id")).toContain(String(EDITABLE_KEYS.length));
  });
});

describe("EDITABLE_KEYS vs translations (jaga-jaga typo)", () => {
  // Setiap key di EDITABLE_KEYS HARUS key asli di translations — kalau tidak,
  // overlay untuk key itu tidak akan pernah dipakai (merge di provider
  // membaca translations[lang][key]) dan God Mode diam-diam tidak bekerja.
  //
  // DITUNDA — brief mengasumsikan `translations` di @/lib/i18n bisa diimpor di
  // vitest node-env; faktanya TIDAK (dua halangan, keduanya di luar file yang
  // boleh disentuh task ini):
  //  1. tsconfig.json men-set "jsx": "preserve" → plugin vite:import-analysis
  //     menolak sintaks JSX i18n.tsx ("invalid JS syntax"), sehingga impor
  //     apapun dari .tsx membuat seluruh suite gagal (0 test run).
  //  2. `translations` dideklarasikan `const` tanpa `export` (i18n.tsx:347),
  //     jadi bahkan dengan #1 teratasi, named import-nya gagal.
  // Jalannya: ekstrak konstanta translations ke modul .ts murni (lalu
  // i18n.tsx mengimpornya) atau tambah plugin vitest untuk transform JSX.
  it.todo("semua key ada di translations.id dan translations.en");
});
