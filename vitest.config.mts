import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tujuh test file ini (dan hanya ini) menulis/membaca berkas bersama
 * `data/local-settings.json` — backend fallback getSetting/setSetting saat
 * tidak ada DATABASE_URL (persis seperti di produksi admin menimpa env).
 *
 * Saat ketujuhnya dijadwalkan di worker berbeda, baca-tulis mereka berlomba:
 * beforeEach satu menghapus persis saat yang lain menulis, sehingga config
 * "hilang" dan test jatuh ke default secara acak (flaky). Karena itu semua
 * file ini ditempatkan di project terpisah yang berjalan serial —
 * `fileParallelism: false` di level project membuat file di dalamnya tidak
 * pernah tumpang tindih. Semua test file lain tetap berjalan paralel penuh.
 *
 * Bila nanti ada test file ke-8 yang menyentuh local-settings.json, tambahkan
 * ke daftar ini, jangan buat file paralel baru.
 */
const SHARED_FS_TESTS = [
  "tests/cloud-ai-config.test.ts",
  "tests/os-apps-config.test.ts",
  "tests/ui-strings-config.test.ts",
  "tests/features-config.test.ts",
  "tests/settings-history.test.ts",
  "tests/redaksi-automation.test.ts",
  "tests/seo-config.test.ts",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        test: {
          name: "shared-fs",
          include: SHARED_FS_TESTS,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "default",
          include: ["tests/**/*.test.ts"],
          exclude: SHARED_FS_TESTS,
          // Default vitest 5000ms terlalu rapat untuk file yang mengimpor
          // modul halaman penuh: `@/lib/actions` sendirian butuh ~6,6s saat
          // dingin (drizzle + seluruh provider AI), dan subtree page bisa
          // lebih lama lagi ketika semua worker berebut CPU. Batas ini
          // dipertahankan sebagai jaring pengaman — BUKAN obat.
          //
          // Penyebab lambatnya adalah biaya IMPORT, bukan I/O jaringan. Test
          // yang hanya butuh helper murni sebaiknya meng-mock modul server
          // berat (`@/lib/actions`, `@/lib/seo-config`, dst.); jangan
          // menaikkan timeout untuk menutupi import yang lambat.
          testTimeout: 20_000,
        },
      },
    ],
  },
});
