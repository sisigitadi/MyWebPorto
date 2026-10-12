import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  REPO_ROOT,
  computeStats,
  syncTargets,
  syncReadme,
  genericClaims,
  parseEnvExample,
  envBlockVars,
  envVarMentions,
  SECURITY_REQUIRED_ENV,
  modelDataSection,
} from "../scripts/docs-stats.mjs";

/**
 * Penjaga drift dokumentasi.
 *
 * Angka dan daftar yang dikutip dokumentasi gampang basi saat kode berubah —
 * skema pernah tertulis "8 tabel" padahal 10, unit test "113 test" padahal
 * ratusan, migrasi "0000–0009" padahal 0010, dan `PORT` disebut di
 * DEPLOYMENT.md tetapi absen dari `.env.example`. Semua itu dulu baru ketahuan
 * saat audit manual.
 *
 * Primitif perhitungan & parsing ada di `scripts/docs-stats.mjs` sehingga
 * dipakai bersama oleh CLI `npm run docs:sync` (yang MENGGANTI angka) dan test
 * ini (yang MEMASTIKAN angkanya sudah benar). Yang diuji di sini hanya
 * perbandingannya — kalau keduanya memakai logika berbeda, guard tidak akan
 * pernah menjumpai drift apa pun.
 */

const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), "utf8");
const stats = computeStats();
const readme = read("README.md");

describe("dokumentasi tidak boleh drift dari kode", () => {
  it("angka tabel, berkas, tes, dan migrasi di README sama dengan kenyataan", () => {
    const expected = {
      tabel: stats.tableCount,
      file: stats.testFileCount,
      test: stats.testCount,
    };
    const claims = genericClaims(readme);
    expect(claims.length, "README tidak menyebut angka apa pun").toBeGreaterThan(0);

    for (const claim of claims) {
      if ("min" in claim) {
        expect(
          { min: claim.min, max: claim.max },
          `README.md:${claim.line} mengklaim migrasi ${claim.raw}, kenyataannya ` +
            `${stats.migrationMin}–${stats.migrationMax}. Jalankan \`npm run docs:sync\`.`
        ).toEqual({ min: stats.migrationMin, max: stats.migrationMax });
      } else {
        const wanted = expected[claim.kind as keyof typeof expected];
        expect(
          claim.value,
          `README.md:${claim.line} mengklaim "${claim.raw}" (${claim.kind}), kenyataannya ` +
            `${wanted}. Jalankan \`npm run docs:sync\`.`
        ).toBe(wanted);
      }
    }
  });

  it("semua situs sinkronisasi masih terbaca di README (pola fixer tidak putus)", () => {
    // Bila pola di docs-stats.mjs tidak lagi cocok dengan kata-kata README,
    // docs:sync diam-diam tidak menulis apa pun — angka lama terus hidup.
    const unreachable = syncTargets(stats).filter((t) => !t.re.test(readme));
    expect(
      unreachable.map((t) => t.label),
      "Pola sinkronisasi tidak menemukan situsnya di README — perbarui pola di " +
        "scripts/docs-stats.mjs agar docs:sync tidak diam-diam gagal."
    ).toEqual([]);
  });

  it("README adalah titik tetap docs:sync (sudah disinkronkan)", () => {
    expect(syncReadme(readme, stats)).toBe(readme);
  });

  it("setiap tabel di schema punya barisnya di bagian Model Data", () => {
    const section = modelDataSection(readme);
    expect(section.length, 'README tidak punya bagian "## Model Data"').toBeGreaterThan(0);
    const missing = stats.tables.filter(
      (name: string) => !new RegExp(`^- \`${name}\``, "m").test(section)
    );
    expect(
      missing,
      `Tabel baru belum didokumentasikan di bagian "Model Data" README: ${missing.join(", ")}. ` +
        `Tambahkan satu butir untuk masing-masing.`
    ).toEqual([]);
  });

  it("blok env README & DEPLOYMENT selaras dua arah dengan .env.example", () => {
    const example = parseEnvExample(read(".env.example"));
    expect(example.all.size, ".env.example tidak memuat satu pun nama env").toBeGreaterThan(0);

    for (const [name, text] of [
      ["README.md", readme],
      ["DEPLOYMENT.md", read("DEPLOYMENT.md")],
    ] as const) {
      const declared = new Set<string>();
      for (const v of envBlockVars(text)) {
        declared.add(v.name);
        expect(
          example.all.has(v.name),
          `${name}:${v.line} menyebut \`${v.name}\` — tidak ada di .env.example (var hantu).`
        ).toBe(true);
      }
      for (const active of example.active) {
        expect(
          declared.has(active),
          `\`${active}\` ada di .env.example tapi tidak disebut di blok env ${name}.`
        ).toBe(true);
      }
    }
  });

  it("SECURITY.md hanya menyebut env yang nyata dan membahas daftar kritis", () => {
    const example = parseEnvExample(read(".env.example"));
    const security = read("SECURITY.md");

    // Filter prefix: token prosa seperti EXTENSION_BY_MIME atau POST memang
    // bukan env, jadi tidak ikut diperiksa sebagai var.
    for (const v of envVarMentions(security)) {
      expect(
        example.all.has(v.name),
        `SECURITY.md:${v.line} menyebut \`${v.name}\` — tidak ada di .env.example (var hantu).`
      ).toBe(true);
    }

    for (const name of SECURITY_REQUIRED_ENV) {
      expect(
        example.all.has(name),
        `SECURITY_REQUIRED_ENV memuat \`${name}\` yang tidak ada di .env.example.`
      ).toBe(true);
      expect(
        security.includes(name),
        `SECURITY.md tidak pernah membahas daftar env kritis \`${name}\`.`
      ).toBe(true);
    }
  });

  it("it.each/it.for tidak dipakai (hitung jumlah tes statis tidak bisa mengikutinya)", () => {
    const expanding = stats.expanding;
    expect(
      expanding,
      `Hitung jumlah tes statis tidak bisa mengikuti it.each/it.for di: ${expanding.join(", ")}. ` +
        `Ganti pola itu (mis. loop eksplisit dengan it() biasa) atau ubah cara hitung di ` +
        `scripts/docs-stats.mjs.`
    ).toEqual([]);
  });
});
