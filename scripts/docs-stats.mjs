/**
 * Sumber kebenaran tunggal untuk angka & daftar env yang dikutip dokumentasi.
 *
 * Dipakai dua arah:
 * - `scripts/sync-readme-stats.mjs` (fixer) — mengisi ulang angka di README.
 * - `tests/docs-drift.test.ts` (guard) — memastikan README hasil sinkronisasi,
 *   dan daftar env di README/DEPLOYMENT/SECURITY cocok dengan `.env.example`.
 *
 * Berpindah tempat (`import.meta.url`) agar tetap benar bila dijalankan dari
 * working directory berbeda (mis. saat dipanggil dari vitest).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Satu deklarasi tes = satu baris yang diawali `it(` / `test(` (opsional dengan
// modifier seperti `.skip`). Sengaja TIDAK memakai `\bit\(` agar kata seperti
// "latest(" di dalam kode tidak ikut terhitung.
const TEST_DECL_RE = /^[ \t]*(?:it|test)(\.[A-Za-z]+)?\(/gm;
// `it.each`/`it.for` mekar jadi banyak tes — tidak bisa dihitung dari jumlah
// deklarasi, jadi pemakaiannya dianggap tidak sah (lihat `expanding`).
const EXPANDING_TEST_RE = /^[ \t]*(?:it|test)\.(?:each|for)\(/gm;

/** Nomor baris 1-based dari indeks karakter. */
export function lineOfIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** 1-based nomor baris dari kecocokan pertama `re` di `text`, atau 0. */
export function lineOfMatch(text, re) {
  const m = re.exec(text);
  return m ? lineOfIndex(text, m.index) : 0;
}

export function computeStats(root = REPO_ROOT) {
  const schema = readFileSync(path.join(root, "src", "db", "schema.ts"), "utf8");
  const tables = [...schema.matchAll(/pgTable\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);

  const testsDir = path.join(root, "tests");
  const testFiles = readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.ts"))
    .sort();

  const expanding = [];
  let testCount = 0;
  for (const file of testFiles) {
    const source = readFileSync(path.join(testsDir, file), "utf8");
    if (source.match(EXPANDING_TEST_RE)) expanding.push(`tests/${file}`);
    testCount += (source.match(TEST_DECL_RE) ?? []).length;
  }

  const migrations = readdirSync(path.join(root, "drizzle"))
    .map((f) => /^(\d{4})_.*\.sql$/.exec(f)?.[1])
    .filter((n) => typeof n === "string")
    .sort();

  return {
    tables,
    tableCount: tables.length,
    testFiles,
    testFileCount: testFiles.length,
    testCount,
    expanding,
    migrationMin: migrations[0],
    migrationMax: migrations[migrations.length - 1],
  };
}

/**
 * Situs di README yang memuat angka. Tiap entri harus punya pasangan klaim
 * generik yang juga diverifikasi guard (lihat `genericClaims`) — pola fixer
 * yang putus tanpa ada yang protes itu justru bahaya.
 */
export function syncTargets(stats) {
  const { tableCount, testFileCount, testCount, migrationMin, migrationMax } = stats;
  return [
    {
      label: "jumlah tabel di pohon folder",
      re: /# Skema \d+ tabel/,
      replacement: `# Skema ${tableCount} tabel`,
    },
    {
      label: "jumlah berkas & tes di pohon folder",
      re: /# Unit test Vitest \(\d+ file, \d+ test\)/,
      replacement: `# Unit test Vitest (${testFileCount} file, ${testCount} test)`,
    },
    {
      label: "jumlah tabel + rentang migrasi di Model Data",
      re: /\(\d+ tabel\)\. Migrasi: `drizzle\/\d{4}`[–—-]`\d{4}`\./,
      replacement: `(${tableCount} tabel). Migrasi: \`drizzle/${migrationMin}\`–\`${migrationMax}\`.`,
    },
    {
      label: "jumlah berkas & tes di bagian Pengujian",
      re: /\*\*\d+ file \/ \d+ test\*\*/,
      replacement: `**${testFileCount} file / ${testCount} test**`,
    },
    {
      label: "rentang migrasi di pohon folder",
      re: /# Migrasi SQL \d{4}[–—-]\d{4}/,
      replacement: `# Migrasi SQL ${migrationMin}–${migrationMax}`,
    },
  ];
}

/** Terapkan semua situs sinkronisasi. Idempoten: `sync(sync(x)) === sync(x)`. */
export function syncReadme(text, stats) {
  return syncTargets(stats).reduce((out, t) => out.replace(t.re, t.replacement), text);
}

/**
 * Klaim angka generik di README — dicek guard terhadap kenyataan kode. Berbeda
 * dari `syncTargets`: pola ini menangkap klaim BARPUN (mis. "3 tabel") yang
 * tidak disasar fixer, supaya angka tak terduga tetap ketahuan.
 */
export function genericClaims(text) {
  // Angka berada di LOOKAHEAD (bukan capture group) — m[1] undefined di sana.
  const grab = (re, kind) =>
    [...text.matchAll(re)].map((m) => ({
      kind,
      value: Number(m[0]),
      line: lineOfIndex(text, m.index),
      raw: m[0],
    }));
  const ranges = [...text.matchAll(/(\d{4})`?[ \t]*[–—-][ \t]*`?(\d{4})/g)].map((m) => ({
    kind: "migrasi",
    min: m[1],
    max: m[2],
    line: lineOfIndex(text, m.index),
    raw: m[0],
  }));
  return [
    ...grab(/\d+(?= tabel)/g, "tabel"),
    ...grab(/\d+(?= file\b)/g, "file"),
    ...grab(/\d+(?= test\b)/g, "test"),
    ...ranges,
  ];
}

// ---------------------------------------------------------------------------
// Daftar env var
// ---------------------------------------------------------------------------

/**
 * Nama env dari `.env.example` — termasuk yang masih berkomentar (pola
 * `# GEMINI_API_KEY=...`), karena dokumentasi boleh mengutip var opsional.
 */
export function parseEnvExample(text) {
  const active = new Set();
  const all = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = /^(?:#[ \t]*)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line);
    if (!m) continue;
    all.add(m[1]);
    if (!line.startsWith("#")) active.add(m[1]);
  }
  return { active, all };
}

/** Nama env di dalam semua fence ```env pada sebuah dokumen markdown. */
export function envBlockVars(text) {
  const out = [];
  const fenceRe = /```env\r?\n/g;
  let fence;
  while ((fence = fenceRe.exec(text)) !== null) {
    const start = fence.index + fence[0].length;
    const end = text.indexOf("```", start);
    const body = text.slice(start, end === -1 ? text.length : end);
    let line = lineOfIndex(text, start);
    for (const raw of body.split(/\r?\n/)) {
      const m = /^[ \t]*#?[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(raw);
      if (m) out.push({ name: m[1], line });
      line += 1;
    }
    fenceRe.lastIndex = end === -1 ? text.length : end + 3;
  }
  return out;
}

/**
 * Token prosa yang BERBENTUK var env tetapi bukan env — satu-satunya tempat
 * pengecualian disebut, supaya tetap terlihat saat nama berubah.
 *
 * Tanpa allowlist eksplisit, filter prefix lama menyamarkan dua masalah:
 * var hantu dengan prefix baru (mis. `GHOST_API_KEY`) lolos tak terdeteksi,
 * dan nama var yang dipangkas (`SIGN_IN_URL` padahal aslinya
 * `NEXT_PUBLIC_CLERK_SIGN_IN_URL`) dianggap sah.
 */
export const NON_ENV_TOKENS = new Set([
  // Konstanta kode di src/lib/storage.ts — penurunan ekstensi dari MIME.
  "EXTENSION_BY_MIME",
  // Kode error browser — gejala redirect loop, bukan konfigurasi.
  "ERR_TOO_MANY_REDIRECTS",
]);

/**
 * Kandidat nama env di dokumen prosa (SECURITY.md): setiap token backtick
 * berbentuk SCREAMING_SNAKE multi-segmen yang tidak ada di allowlist harus
 * ada di `.env.example` (dicek pemanggil). Kata satu segmen (`POST`, `PORT`)
 * sengaja tidak ikut — terlalu banyak kata umum yang berbentuk sama.
 */
export function envVarMentions(text) {
  const out = [];
  for (const m of text.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)`/g)) {
    const name = m[1];
    if (!/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(name)) continue;
    if (NON_ENV_TOKENS.has(name)) continue;
    out.push({ name, line: lineOfIndex(text, m.index) });
  }
  return out;
}

/**
 * Env yang WAJIB dibahas SECURITY.md — daftar kritis produksi. Ia sendiri
 * dicek terhadap `.env.example`, jadi menambah nama ngawur di sini juga gagal.
 */
export const SECURITY_REQUIRED_ENV = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "ADMIN_CLERK_ID",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "INDEXNOW_KEY",
  "ENABLE_EXTERNAL_TRANSLATE",
  "AI_PROVIDER",
];

/** Isi `## Model Data` saja — nama tabel bisa muncul di bagian lain README. */
export function modelDataSection(readme) {
  const start = readme.indexOf("## Model Data");
  if (start === -1) return "";
  const rest = readme.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}
