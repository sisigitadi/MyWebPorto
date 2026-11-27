import { defineConfig } from "@playwright/test";

// Config untuk menjalankan e2e terhadap build PRODUKSI lokal (next start),
// bukan dev server. Diperlukan karena beberapa bug hanya muncul di mode produksi.
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  testIgnore: /(os-apps-config|ui-strings|features)\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
  },
});
