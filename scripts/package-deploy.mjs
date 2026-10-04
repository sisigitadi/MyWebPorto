import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const targetDir = path.resolve("deploy_package");

// WAJIB dihapus SEBELUM build, bukan sebelum copy: Next.js standalone tracer
// menyertakan folder apa pun di root project yang ter-reach (deploy_package
// berisi node_modules + server.js + package.json). Jika deploy_package lama
// masih ada saat build, ia ikut ke .next/standalone, lalu di-copy kembali ke
// deploy_package → nested deploy_package/deploy_package/... yang bertambah 1
// level per siklus build+package (ditemukan 15 level, path >260 char di
// Windows menyebabkan error "Filename too long").
if (fs.existsSync(targetDir)) {
  console.log("Membersihkan deploy_package lama sebelum build...");
  fs.rmSync(targetDir, { recursive: true, force: true });
}

console.log("===================================================");
console.log("[1/3] Menjalankan Next.js Build...");
console.log("===================================================");
execSync("npm run build", { stdio: "inherit" });

console.log("\n===================================================");
console.log("[2/3] Mengemas berkas ke folder deploy_package...");
console.log("===================================================");

fs.mkdirSync(targetDir, { recursive: true });

// Helper to copy recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy .next/standalone content to deploy_package
const standaloneDir = path.resolve(".next/standalone");
if (fs.existsSync(standaloneDir)) {
  copyDir(standaloneDir, targetDir);
}

// 2. Copy .next/static into deploy_package/.next/static
const staticSrc = path.resolve(".next/static");
const staticDest = path.join(targetDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
  copyDir(staticSrc, staticDest);
}

// 3. Copy public folder into deploy_package/public
const publicSrc = path.resolve("public");
const publicDest = path.join(targetDir, "public");
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, publicDest);
}

// 4. Pastikan dan copy data folder (local store yang persisten)
const dataSrc = path.resolve("data");
const dataDest = path.join(targetDir, "data");
if (!fs.existsSync(dataSrc)) {
  fs.mkdirSync(dataSrc, { recursive: true });
}
copyDir(dataSrc, dataDest);

// 5. Copy ecosystem.config.cjs
if (fs.existsSync("ecosystem.config.cjs")) {
  fs.copyFileSync("ecosystem.config.cjs", path.join(targetDir, "ecosystem.config.cjs"));
}

// 6. Copy .env utama jika ada, atau fallback ke .env.example
if (fs.existsSync(".env")) {
  fs.copyFileSync(".env", path.join(targetDir, ".env"));
} else if (fs.existsSync(".env.example")) {
  fs.copyFileSync(".env.example", path.join(targetDir, ".env"));
}

console.log("\n===================================================");
console.log("[3/3] Pengemasan Selesai!");
console.log("===================================================");
console.log("Direktori 'deploy_package' siap digunakan untuk deploy ke server.");
