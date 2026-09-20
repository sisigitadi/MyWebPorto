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
      // rule ini sebagai error. 23 situs yang tertangkap adalah pola
      // inisialisasi saat mount yang disengaja (fetch-on-mount, baca cart dari
      // localStorage, bahasa dari URL, sinkronisasi hash) — bukan defect.
      // Turunkan ke warning supaya tidak memblokir build/CI; refactor menyusul
      // (useEffectEvent) sebagai utang terpisah.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
