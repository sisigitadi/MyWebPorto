import { defineConfig } from "@playwright/test";

/**
 * Config khusus e2e God Mode (settings.os_apps) — DIKUNCI ke file lokal.
 *
 * Perbedaan dari playwright.config.ts: dev server dijalankan dengan
 * DATABASE_URL di-override jadi string kosong, sehingga getSetting/setSetting
 * (src/lib/settings.ts) memakai fallback file data/local-settings.json.
 *
 * Kenapa perlu: di lingkungan normal, dev server tersambung ke Neon Postgres
 * dan mengabaikan file lokal — test yang menulis config tidak akan berpengaruh
 * pada render. Dengan DB dimatikan, test benar-benar menguji utas
 * settings → resolveOSApps → props → DOM. Sekaligus menjaga test tidak
 * menyentuh data DB bersama (konfigurasi admin yang sebenarnya).
 *
 * Port terpisah (3457) supaya bisa jalan paralel dengan dev server biasa.
 * Test ini hanya memvalidasi render publik — tidak ada route /admin yang
 * butuh session Clerk.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: /(os-apps-config|ui-strings)\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  // Satu worker: os-apps-config dan ui-strings berbagi backend file yang sama
  // (data/local-settings.json) dan saling menimpa/ menghapus isinya. Bila kedua
  // spec jalan paralel di worker berbeda, clearSettings satu worker menghapus
  // config yang baru ditulis worker lain → test dapat render default.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3457",
    channel: "chrome",
    viewport: { width: 1366, height: 900 },
  },
  webServer: {
    command: "npx next dev --turbopack -p 3457",
    url: "http://127.0.0.1:3457",
    reuseExistingServer: false,
    timeout: 180_000,
    // Override env induk: tanpa DATABASE_URL → fallback file JSON lokal.
    env: { DATABASE_URL: "" },
  },
});
