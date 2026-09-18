// Menjalankan e2e terhadap build PRODUKSI lokal: build → next start →
// playwright (e2e/playwright-prod.config.ts) → matikan server.
//
// Kenapa diperlukan: `next dev` mengaktifkan React StrictMode (double-invoke),
// yang menyembunyikan bug urutan commit React ↔ GSAP. Beberapa regresi hanya
// bisa ditangkap di mode produksi.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = "3001";
const BASE = `http://127.0.0.1:${PORT}`;

/** Jalankan perintah sampai selesai, teruskan keluaran ke konsol. */
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    p.on("close", (code) =>
      code === 0 ? resolve(undefined) : reject(new Error(`${cmd} ${args.join(" ")} → ${code}`)),
    );
    p.on("error", reject);
  });
}

async function waitReady() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(BASE + "/");
      if (res.ok) return;
    } catch {
      // server belum siap
    }
    await sleep(500);
  }
  throw new Error(`Server produksi tidak merespons di ${BASE}`);
}

try {
  console.log("▶ next build …");
  await run("npx", ["next", "build"]);

  console.log("▶ next start (produksi) …");
  const server = spawn("npx", ["next", "start", "-p", PORT], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  server.on("error", (e) => {
    console.error(e);
    process.exit(1);
  });

  await waitReady();
  console.log("▶ playwright (mode produksi) …");
  try {
    await run("npx", ["playwright", "test", "--config=e2e/playwright-prod.config.ts"]);
  } finally {
    server.kill();
    // Anak next start (start-server.js) perlu dibunuh terpisah di Windows.
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    }
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
