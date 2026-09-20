import { defineConfig } from "@playwright/test";

// E2E area publik — jalan lokal via `npm run test:e2e`.
// Memakai system Chrome (tanpa download browser) + auto-start dev server.
// Catatan: rute /admin/* butuh session Clerk sehingga TIDAK diuji di sini;
// gunakan login manual di browser untuk verifikasi /admin/system.
//
// os-apps-config / ui-strings / features sengaja DILUARUNG di sini: ketiganya
// menulis data/local-settings.json dan butuh dev server TANPA DATABASE_URL
// (fallback file lokal) agar config yang ditulis test benar-benar dipakai.
// Di dev server biasa, koneksi Neon membuat settings dibaca dari DB sehingga
// tulisan test diabaikan. Ketiga spec ini dijalankan via config godmode
// (npm run test:e2e:godmode: DB dimatikan + 1 worker, mencegah race tulis
// file yang dipakai bersama). Spec di suite ini hanya membaca render publik.
export default defineConfig({
  testDir: "e2e",
  testIgnore: /(os-apps-config|ui-strings|features)\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  // Satu worker: aplikasi ini berat (GSAP + OS shell + boot overlay); dev
  // server satu proses tidak bisa melayani 4 browser paralel dalam batas
  // 60s goto (cold compile per rute + animasi membuat "load" event telat).
  // Serial = deterministik untuk CI gate.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    viewport: { width: 1366, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    // Selalu naikkan server sendiri: Playwright harus menguasai env dev server
    // (lihat bawah) agar run deterministik — memakai dev server yang sedang
    // jalan dengan key Clerk asli membuat test E2E langsung gagal (handshake
    // instance dev Clerk di setiap navigasi).
    reuseExistingServer: false,
    timeout: 180_000,
    // Clerk DIMATIKAN untuk E2E: instance dev Clerk (pk_test_) memaksa
    // handshake browser di setiap navigasi — Chrome modern memblokir cookie
    // pihak-ketiga → ERR_TOO_MANY_REDIRECTS. Key placeholder membuat app masuk
    // "mode tanpa Clerk" (proxy.ts + layout.tsx): halaman publik render tanpa
    // handshake sama sekali. Process env mengesampingkan .env.local, persis
    // seperti override DATABASE_URL di playwright-godmode.config.ts.
    // DATABASE_URL juga dikosongkan: E2E harus hermetic (tidak tergantung
    // Neon) agar hasil lokal == hasil CI — tanpa ini, settings & profile
    // dibaca dari DB developer dan tulisan test diabaikan. Spec yang memang
    // butuh file lokal berjalan di config godmode; suite ini hanya membaca
    // render publik (fallback data dummy).
    env: {
      DATABASE_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_xxxx",
      CLERK_SECRET_KEY: "sk_test_xxxx",
      ADMIN_CLERK_ID: "",
      NEXT_PUBLIC_ADMIN_CLERK_ID: "",
    },
  },
});
