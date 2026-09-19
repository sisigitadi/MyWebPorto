import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dua test file ini (dan hanya ini) menulis/membaca berkas bersama
 * `data/local-settings.json` — backend fallback getSetting/setSetting saat
 * tidak ada DATABASE_URL (persis seperti di produksi admin menimpa env).
 *
 * Saat keduanya dijadwalkan di worker berbeda, baca-tulis mereka berlomba:
 * beforeEach satu menghapus persis saat yang lain menulis, sehingga config
 * "hilang" dan test jatuh ke default secara acak (flaky). Karena itu kedua
 * file ditempatkan di project terpisah yang berjalan serial — `fileParallelism:
 * false` di level project membuat file di dalamnya tidak pernah tumpang
 * tindih. Semua test file lain tetap berjalan paralel penuh.
 *
 * Bila nanti ada test file ke-3 yang menyentuh local-settings.json, tambahkan
 * ke daftar ini, jangan buat file paralel baru.
 */
const SHARED_FS_TESTS = ["tests/cloud-ai-config.test.ts", "tests/os-apps-config.test.ts"];

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
        },
      },
    ],
  },
});
