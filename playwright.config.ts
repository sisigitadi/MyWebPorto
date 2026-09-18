import { defineConfig } from "@playwright/test";

// E2E area publik — jalan lokal via `npm run test:e2e`.
// Memakai system Chrome (tanpa download browser) + auto-start dev server.
// Catatan: rute /admin/* butuh session Clerk sehingga TIDAK diuji di sini;
// gunakan login manual di browser untuk verifikasi /admin/system.
//
// os-apps-config.spec.ts sengaja DILUARUNG di sini: ia butuh dev server tanpa
// DATABASE_URL (fallback file lokal) agar config yang ditulis test benar-benar
// dipakai. Jalankan terpisah via `npm run test:e2e:godmode`.
export default defineConfig({
  testDir: "e2e",
  testIgnore: /os-apps-config\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    viewport: { width: 1366, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
