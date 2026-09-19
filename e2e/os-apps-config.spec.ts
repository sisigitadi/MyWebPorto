import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Integrasi God Mode Fase 1: settings.os_apps (tabel settings / fallback file
 * lokal) harus benar-benar mengendalikan apa yang dirender pengunjung —
 * jumlah app di taskbar desktop, urutannya, dan urutan section mobile.
 *
 * Unit test di tests/os-apps-config.test.ts menguji lapisan datanya; test ini
 * memverifikasi utas penuh: (public)/page.tsx → props → OSDesktopManager → DOM.
 * Tanpa ini, config bisa saja valid tapi tidak terbaca komponen (mis. prop
 * lupa dilewatkan).
 *
 * File data/local-settings.json dipakai sebagai backend (tidak ada DB di dev);
 * selalu dibersihkan di afterEach agar tidak menempel di test lain.
 */

const SETTINGS_FILE = path.join(process.cwd(), "data", "local-settings.json");

function writeOSApps(apps: unknown[]): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ os_apps: apps }), "utf-8");
}

function clearSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
  } catch {
    // abaikan race dengan worker lain
  }
}

/**
 * Label taskbar desktop (aria-label = nama file retro).
 *
 * ?lang=en dipakai agar label deterministik (locale browser bisa id atau en),
 * sekaligus mem-bypass route cache 60 detik halaman ini — setiap test butuh
 * render segar sesuai config yang baru ditulis. Di produksi cache justru
 * dimurnikan oleh revalidatePath("/") di saveOSAppsAction.
 */
async function taskbarLabels(page: import("@playwright/test").Page): Promise<string[]> {
  // Boot overlay 5 detik menghitung dari hydration; taskbar hanya muncul
  // setelahnya, jadi tunggu elemen pertama hadir dulu.
  const tabs = page.locator(".vt-taskbar-tab");
  await tabs.first().waitFor({ state: "visible", timeout: 30_000 });
  return tabs.evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") || "")
  );
}

let urlSeq = 0;

/**
 * Query unik per test mem-bypass route cache 60 detik (revalidate) — tanpa ini
 * test kedua mendapat render default dari test pertama meski config sudah
 * ditulis ulang. Di produksi cache dimurnikan oleh revalidatePath("/") saat
 * admin menyimpan, jadi ini hanya kebutuhan test, bukan workaround produksi.
 */
function freshUrl(): string {
  return `/?lang=en&cachebust=${Date.now()}-${urlSeq++}`;
}

test.describe("God Mode: settings.os_apps mengendalikan tampilan publik", () => {
  test.afterEach(() => {
    clearSettings();
  });

  test("tanpa pengaturan → 8 app default dalam urutan kode", async ({ page }) => {
    clearSettings();
    await page.goto(freshUrl());
    expect(await taskbarLabels(page)).toEqual([
      "Profile.exe",
      "Services.exe",
      "Projects.exe",
      "Store.zip",
      "Articles.doc",
      "Terminal.bat",
      "Reviews.txt",
      "Contact.exe",
    ]);
  });

  test("mematikan app + mengubah urutan diterapkan ke taskbar", async ({ page }) => {
    // Hanya 3 app aktif, urutan diacak: Kontak → Terminal → Profil.
    writeOSApps([
      { id: "kontak", enabled: true, order: 0 },
      { id: "terminal", enabled: true, order: 1 },
      { id: "profil", enabled: true, order: 2 },
      { id: "layanan", enabled: false, order: 3 },
      { id: "proyek", enabled: false, order: 4 },
      { id: "toko", enabled: false, order: 5 },
      { id: "artikel", enabled: false, order: 6 },
      { id: "testimoni", enabled: false, order: 7 },
    ]);
    await page.goto(freshUrl());
    expect(await taskbarLabels(page)).toEqual([
      "Contact.exe",
      "Terminal.bat",
      "Profile.exe",
    ]);
  });

  test("semua app dimatikan di config → kembali ke default (tidak pernah kosong)", async ({ page }) => {
    writeOSApps([
      { id: "profil", enabled: false, order: 0 },
      { id: "layanan", enabled: false, order: 1 },
      { id: "proyek", enabled: false, order: 2 },
      { id: "toko", enabled: false, order: 3 },
      { id: "artikel", enabled: false, order: 4 },
      { id: "terminal", enabled: false, order: 5 },
      { id: "testimoni", enabled: false, order: 6 },
      { id: "kontak", enabled: false, order: 7 },
    ]);
    await page.goto(freshUrl());
    // Pengaman resolveOSApps: minimal satu app aktif, jatuh ke default 8 app.
    expect((await taskbarLabels(page)).length).toBe(8);
  });

  test("config rusak (entry asing) diabaikan — default tetap utuh", async ({ page }) => {
    writeOSApps([
      { id: "terminal", enabled: true, order: 0 },
      { id: "evil", enabled: true, order: 1 },
      { id: { nested: true }, enabled: true, order: 2 },
    ]);
    await page.goto(freshUrl());
    const labels = await taskbarLabels(page);
    expect(labels.length).toBe(8);
    expect(labels[0]).toBe("Terminal.bat");
  });
});
