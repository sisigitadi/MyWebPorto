/**
 * Cek paritas 3-arah i18n: interface Translations ↔ blok id ↔ blok en.
 * Jalankan: node scripts/i18n-parity.mjs
 *
 * Menggunakan brace-counting seimbang (bukan regex) agar tahan terhadap
 * objek bersarang dan nilai multibaris.
 */
import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");

/** Ambil isi badan objek yang dimulai pada posisi `{` pertama setelah `name`. */
function extractBlock(name) {
  const start = src.indexOf(name);
  if (start === -1) return null;
  let i = src.indexOf("{", start);
  if (i === -1) return null;
  const begin = i + 1;
  let depth = 1;
  let inStr = null;
  i++;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (inStr) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    }
    i++;
  }
  if (depth !== 0) return null;
  return src.slice(begin, i - 1);
}

const keys = (block) =>
  block === null
    ? []
    : [...block.matchAll(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)]
        .filter((m) => m[1].length === 4) // hanya key level-atas (indent 4 spasi)
        .map((m) => m[2]);

const ifaceMatch = src.match(/interface Translations \{([\s\S]*?)\n\}/);
if (!ifaceMatch) {
  console.error("✗ interface Translations tidak ditemukan");
  process.exit(1);
}
const ifaceKeys = [...ifaceMatch[1].matchAll(/^  ([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)].map((m) => m[1]);

const idKeys = keys(extractBlock("id: {"));
const enKeys = keys(extractBlock("en: {"));

const count = (arr) => {
  const c = new Map();
  for (const k of arr) c.set(k, (c.get(k) || 0) + 1);
  return c;
};
const ci = count(ifaceKeys), cid = count(idKeys), ce = count(enKeys);

console.log(`interface: ${ifaceKeys.length} key`);
console.log(`id       : ${idKeys.length} key`);
console.log(`en       : ${enKeys.length} key`);

let bad = 0;
const all = new Set([...ifaceKeys, ...idKeys, ...enKeys]);
for (const k of all) {
  const a = ci.get(k) || 0, b = cid.get(k) || 0, c = ce.get(k) || 0;
  if (a !== b || b !== c) {
    console.log(`✗ ${k}: interface=${a} id=${b} en=${c}`);
    bad++;
  }
}
for (const [label, c] of [
  ["interface", ci],
  ["id", cid],
  ["en", ce],
]) {
  for (const [k, v] of c) {
    if (v > 1) {
      console.log(`✗ duplikat ${label}: ${k} (${v}x)`);
      bad++;
    }
  }
}

if (bad > 0) {
  console.log(`\n✗ ${bad} ketidaksesuaian ditemukan`);
  process.exit(1);
}
console.log("\n✓ PARITAS 3-ARAH OK");
