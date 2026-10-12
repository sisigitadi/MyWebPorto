#!/usr/bin/env node
/**
 * Isi ulang angka di README dari kode, atau cek semua dokumentasi terhadap kode.
 *
 *   npm run docs:sync    # tulis ulang angka tabel/berkas/tes/migrasi di README
 *   npm run docs:check   # tanpa menulis; keluar 1 bila ada yang drift (untuk CI)
 *
 * Pemeriksaan env var (README/DEPLOYMENT/SECURITY vs `.env.example`) tidak bisa
 * "disinkronkan" otomatis karena isinya prosa — keduanya ikut diperiksa dan
 * dilaporkan sebagai masalah yang harus dibaca manusia.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  computeStats,
  syncReadme,
  genericClaims,
  parseEnvExample,
  envBlockVars,
  envVarMentions,
  SECURITY_REQUIRED_ENV,
} from "./docs-stats.mjs";

const CHECK_ONLY = process.argv.includes("--check");
const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8");

/** Kumpulkan masalah terhadap README yang SUDAH disinkronkan. */
function findProblems(readme) {
  const stats = computeStats();
  const example = parseEnvExample(read(".env.example"));
  const deployment = read("DEPLOYMENT.md");
  const security = read("SECURITY.md");
  const problems = [];

  // 1. Angka yang diklaim README vs kenyataan kode (klaim boleh di mana pun).
  const expected = { tabel: stats.tableCount, file: stats.testFileCount, test: stats.testCount };
  for (const claim of genericClaims(readme)) {
    if (claim.kind === "migrasi") {
      if (claim.min !== stats.migrationMin || claim.max !== stats.migrationMax) {
        problems.push(
          `README.md:${claim.line}: migrasi "${claim.raw}" tidak cocok — kenyataan ` +
            `${stats.migrationMin}–${stats.migrationMax} (perbaiki dengan \`npm run docs:sync\`).`
        );
      }
      continue;
    }
    if (claim.value !== expected[claim.kind]) {
      problems.push(
        `README.md:${claim.line}: "${claim.raw}" tidak cocok — kenyataan ` +
          `${expected[claim.kind]} (perbaiki dengan \`npm run docs:sync\`).`
      );
    }
  }

  // 2. Blok env di dokumen vs .env.example — dua arah.
  for (const [name, text] of [
    ["README.md", readme],
    ["DEPLOYMENT.md", deployment],
  ]) {
    const declared = new Set();
    for (const v of envBlockVars(text)) {
      declared.add(v.name);
      if (!example.all.has(v.name)) {
        problems.push(`${name}:${v.line}: \`${v.name}\` tidak ada di .env.example (var hantu).`);
      }
    }
    for (const v of example.active) {
      if (!declared.has(v)) {
        problems.push(`${name}: env \`${v}\` ada di .env.example tapi tidak disebut di blok env-nya.`);
      }
    }
  }

  // 3. SECURITY.md: nama yang dikutip harus nyata, dan daftar wajib harus dibahas.
  for (const v of envVarMentions(security)) {
    if (!example.all.has(v.name)) {
      problems.push(`SECURITY.md:${v.line}: \`${v.name}\` tidak ada di .env.example (var hantu).`);
    }
  }
  for (const name of SECURITY_REQUIRED_ENV) {
    if (!example.all.has(name)) {
      problems.push(`SECURITY_REQUIRED_ENV: \`${name}\` tidak ada di .env.example.`);
    } else if (!security.includes(name)) {
      problems.push(`SECURITY.md: daftar env kritis \`${name}\` tidak pernah dibahas.`);
    }
  }

  return { problems, stats };
}

function main() {
  const stats = computeStats();
  let note = "check-only";
  const file = path.join(REPO_ROOT, "README.md");

  if (!CHECK_ONLY) {
    const before = readFileSync(file, "utf8");
    const after = syncReadme(before, stats);
    if (after !== before) {
      writeFileSync(file, after);
      note = "angka README ditulis ulang";
    } else {
      note = "README sudah sinkron";
    }
  }

  // Cek berlaku atas keadaan README saat ini — setelah disinkronkan bila menulis.
  const { problems, stats: fresh } = findProblems(readFileSync(file, "utf8"));

  if (problems.length === 0) {
    console.log(
      `docs:check OK — ${fresh.tableCount} tabel, ${fresh.testFileCount} berkas / ` +
        `${fresh.testCount} tes, migrasi ${fresh.migrationMin}–${fresh.migrationMax}. (${note})`
    );
    return 0;
  }

  console.error(`docs:check GAGAL (${problems.length} masalah):`);
  for (const p of problems) console.error(`  - ${p}`);
  if (!CHECK_ONLY) console.error("\nPerbaiki di file sumber lalu jalankan ulang `npm run docs:sync`.");
  return 1;
}

process.exitCode = main();
