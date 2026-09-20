import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
    },
  },
];

export default eslintConfig;
