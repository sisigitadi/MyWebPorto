import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

// Next.js 16 / eslint-config-next 16: flat config native — tidak lagi butuh
// FlatCompat (@eslint/eslintrc) yang crash ("Converting circular structure to
// JSON") saat men-extends config yang kini berbentuk flat.

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-stale*/**",
      "out/**",
      "build/**",
      "deploy_package/**",
      "scripts/**",
      "fix*.js",
      "next-env.d.ts",
      // Artefak tooling agen/IDE: git worktree (kilo), scratch, riwayat chat,
      // dan config lokal — duplikat kode yang bukan source yang dikelola.
      // Meng-lint/mencari di sini hanya menambah noise & warning palsu.
      ".kilo/**",
      ".superpowers/**",
      ".aider*",
      ".claude/**",
      ".commandcode/**",
      ".freebuff/**",
    ],
  },
  {
    // Plugin react-hooks didaftarkan ulang di sini karena config object `next`
    // (eslint-config-next) mencakupnya hanya untuk file yang di-scope-nya —
    // rule override di object global ini tidak bisa melihatnya tanpa deklarasi.
    plugins: { "react-hooks": reactHooks },
    // Konvensi _-prefix untuk argumen/variabel/caught-error yang sengaja tidak
    // dipakai (mis. menjaga signature antarmuka yang terdokumentasi, seperti
    // describeUIStrings(strings, _lang)). Hanya menyaring noise, bukan
    // menyembunyikan variabel betulan yang lupa dipakai.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // eslint-plugin-react-hooks v7 (dibundel eslint-config-next 16) mengaktifkan
      // rule ini sebagai error. 18 situs yang tertangkap saat upgrade Next 16
      // sudah ditangani: 6 diperbaiki dengan pola idiomatik (penyesuaian state di
      // render — "store information from previous renders" — di os-command-palette,
      // os-desktop-manager, retro-bot, cloud-ai-config-form; baca URL external store
      // via useSyncExternalStore di article-detail-content). Sisanya di-suppress
      // per-situs dengan justifikasi: fetch-on-mount di client component tanpa
      // data-fetching framework, baca localStorage/sessionStorage pasca-mount
      // (hydration-safe), dan deteksi bahasa/hash — semuanya butuh migrasi
      // external store / Server Component (utang terpisah, lihat
      // plans/next-16-upgrade-plan.md). Rule tetap error: penambahan situs baru
      // harus diperbaiki, bukan ditumpuk.
      "react-hooks/set-state-in-effect": "error",
    },
  },
];

export default eslintConfig;
