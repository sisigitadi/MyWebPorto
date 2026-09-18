import { defineConfig } from "@playwright/test";

// Config untuk menjalankan e2e terhadap build PRODUKSI lokal (next start),
// bukan dev server. Diperlukan karena beberapa bug hanya muncul di mode
// produksi — misalnya React StrictMode tidak melakukan double-invoke di
// production, sehingga bug urutan commit React ↔ GSAP (trigger ScrollTrigger
// terikat ke window, kartu section menetap di opacity 0) tidak terlihat di
// `next dev`.
//
// Tidak ada blok webServer: servernya dinaikkan oleh scripts/prod-e2e.mjs
// (npm run test:e2e:prod) sebelum Playwright dijalankan.
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
  },
});
