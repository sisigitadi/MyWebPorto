import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  resolveOSApps,
  saveOSApps,
  describeOSApps,
} from "@/lib/os-apps-config";
import {
  APP_IDS,
  DEFAULT_OS_APPS,
  type OSAppConfig,
} from "@/lib/os-apps-meta";

/**
 * resolveOSApps membaca settings.os_apps; di lingkungan test tidak ada DB
 * terhubung sehingga getSetting memakai file data/local-settings.json. File itu
 * harus bersih di awal dan di akhir test, jika tidak nilai yang tertulis akan
 * menimpa default pada test berikutnya (persis seperti produksi: admin menimpa
 * kode).
 *
 * Skenario yang diuji di sini adalah jaminan keamanan fitur: config buruk
 * apa pun tidak boleh membuat situs tanpa app, dan config dari admin harus
 * ditolak keras bila tidak valid (berbeda dari data DB yang dimaafkan).
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

describe("resolveOSApps (fallback default)", () => {
  it("belum diatur → semua app aktif dalam urutan default", async () => {
    const { apps, enabled, source } = await resolveOSApps();
    expect(source).toBe("default");
    expect(apps.map((a) => a.id)).toEqual([...APP_IDS]);
    expect(apps.map((a) => a.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(apps.every((a) => a.enabled)).toBe(true);
    expect(enabled.length).toBe(8);
  });

  it("key ada tapi rusak (bukan array) → jatuh ke default", async () => {
    await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
    await fs.promises.writeFile(LOCAL_SETTINGS, JSON.stringify({ os_apps: "corrupt" }));
    const { apps, source } = await resolveOSApps();
    expect(apps.map((a) => a.id)).toEqual([...APP_IDS]);
    expect(source).toBe("admin");
  });

  it("id asing diabaikan, app yang tidak disebut tetap muncul aktif", async () => {
    await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
    await fs.promises.writeFile(
      LOCAL_SETTINGS,
      JSON.stringify({
        os_apps: [
          { id: "terminal", enabled: true, order: 0 },
          { id: "hacker", enabled: true, order: 1 },
          { id: { nested: true }, enabled: true, order: 2 },
        ],
      })
    );
    const { apps } = await resolveOSApps();
    expect(apps.length).toBe(8);
    expect(apps[0].id).toBe("terminal");
    // app yang tidak disebut dapat default aktif di urutan setelahnya.
    expect(apps.slice(1).every((a) => a.enabled)).toBe(true);
    expect(apps.map((a) => a.id)).not.toContain("hacker");
  });

  it("order di-rapikan menjadi 0..N-1 tanpa gap", async () => {
    // Urutan dibalik total; setelah disimpan harus persis terbalik dan index
    // bersih 0..7 (bukan 0,5,99,… yang mungkin ditulis admin).
    const reversed = [...APP_IDS].reverse().map((id, i) => ({ id, enabled: true, order: i }));
    await saveOSApps(reversed);
    const { apps } = await resolveOSApps();
    expect(apps.map((a) => a.id)).toEqual([...APP_IDS].reverse());
    expect(apps.map((a) => a.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("order dengan gap besar tetap di-rapikan, app baru menyisip di tengah", async () => {
    await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
    await fs.promises.writeFile(
      LOCAL_SETTINGS,
      JSON.stringify({
        os_apps: [
          { id: "proyek", enabled: true, order: 0 },
          { id: "kontak", enabled: true, order: 99 },
        ],
      })
    );
    const { apps } = await resolveOSApps();
    expect(apps.map((a) => a.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Dua app yang disebut tetap di depan, sisanya mengikuti urutan default.
    expect(apps[0].id).toBe("proyek");
    expect(apps[apps.length - 1].id).toBe("kontak");
  });
});

describe("resolveOSApps (skenario God Mode admin)", () => {
  it("mematikan app + mengubah urutan diterapkan persis", async () => {
    const cfg: OSAppConfig[] = [
      { id: "proyek", enabled: true, order: 0 },
      { id: "profil", enabled: true, order: 1 },
      { id: "layanan", enabled: false, order: 2 },
      { id: "toko", enabled: false, order: 3 },
      { id: "artikel", enabled: true, order: 4 },
      { id: "terminal", enabled: true, order: 5 },
      { id: "testimoni", enabled: false, order: 6 },
      { id: "kontak", enabled: true, order: 7 },
    ];
    await saveOSApps(cfg);
    const { apps, enabled, source } = await resolveOSApps();
    expect(source).toBe("admin");
    expect(enabled.map((a) => a.id)).toEqual(["proyek", "profil", "artikel", "terminal", "kontak"]);
    expect(apps.map((a) => a.id)).toEqual([
      "proyek", "profil", "layanan", "toko", "artikel", "terminal", "testimoni", "kontak",
    ]);
    expect(apps.find((a) => a.id === "layanan")?.enabled).toBe(false);
    // Order disimpan ulang sebagai index urutan (0..7).
    expect(apps.map((a) => a.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("form sebagian (hanya app terlihat) dilengkapi otomatis", async () => {
    // Form hanya mengirim baris yang terlihat; app lain tidak boleh hilang.
    await saveOSApps([{ id: "terminal", enabled: false, order: 0 }]);
    const { apps } = await resolveOSApps();
    expect(apps.length).toBe(8);
    expect(apps.find((a) => a.id === "terminal")?.enabled).toBe(false);
    expect(apps.filter((a) => a.enabled).length).toBe(7);
  });
});

describe("saveOSApps (validasi ketat dari form admin)", () => {
  it("id asing ditolak keras — bukan diam-diam diabaikan", async () => {
    await expect(
      saveOSApps([
        ...DEFAULT_OS_APPS,
        { id: "evil" as OSAppConfig["id"], enabled: true, order: 99 },
      ])
    ).rejects.toThrow(/tidak dikenal/);
  });

  it("id duplikat ditolak (dua jendela untuk app yang sama membingungkan)", async () => {
    await expect(
      saveOSApps([
        { id: "profil", enabled: true, order: 0 },
        { id: "profil", enabled: false, order: 1 },
        ...DEFAULT_OS_APPS.filter((a) => a.id !== "profil"),
      ])
    ).rejects.toThrow(/lebih dari sekali/);
  });

  it("semua app dimatikan ditolak — pengunjung butuh minimal satu jendela", async () => {
    await expect(
      saveOSApps(APP_IDS.map((id) => ({ id, enabled: false, order: 0 })))
    ).rejects.toThrow(/Minimal satu app/);
  });

  it("entry dengan order/enabled tidak sesuai tipe ditolak", async () => {
    await expect(
      saveOSApps([
        { id: "profil", enabled: "true" as unknown as boolean, order: 0 },
        ...DEFAULT_OS_APPS.filter((a) => a.id !== "profil"),
      ])
    ).rejects.toThrow(/tidak valid/);
  });
});

describe("resolveOSApps (pengaman terakhir)", () => {
  it("satu-satunya app aktif dimatikan di DB → kembali ke default, bukan situs kosong", async () => {
    await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
    await fs.promises.writeFile(
      LOCAL_SETTINGS,
      JSON.stringify({
        os_apps: APP_IDS.map((id, i) => ({ id, enabled: id === "toko", order: i })),
      })
    );
    // Admin mematikan toko lewat penulisan langsung — satu-satunya app aktif hilang.
    await fs.promises.writeFile(
      LOCAL_SETTINGS,
      JSON.stringify({
        os_apps: APP_IDS.map((id, i) => ({ id, enabled: false, order: i })),
      })
    );
    const { apps, enabled, source } = await resolveOSApps();
    expect(source).toBe("default");
    expect(apps.length).toBe(8);
    expect(apps.every((a) => a.enabled)).toBe(true);
    expect(enabled.length).toBe(8);
  });
});

describe("describeOSApps", () => {
  it("ringkasan jumlah aktif + label untuk UI admin", () => {
    const summary = describeOSApps(DEFAULT_OS_APPS, "id");
    expect(summary.startsWith("8/8 aktif")).toBe(true);
    expect(summary).toContain("Profil");
    expect(summary).toContain("Terminal");
  });
});
