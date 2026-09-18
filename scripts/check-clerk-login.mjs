/**
 * Verifikasi konfigurasi login Clerk (Google OAuth + portal + form).
 *
 * Kenapa perlu: tombol "Sign in with Google" tidak muncul di UI kalau OAuth
 * tidak diaktifkan di DASHBOARD Clerk (bukan di kode). Begitu juga redirect
 * URI Google Cloud dan status domain Account Portal — semuanya di luar repo.
 * Script ini memeriksa semuanya dari luar, tanpa deploy, dengan membaca
 * environment Clerk yang publik via publishable key.
 *
 * Khusus mendeteksi satu kesalahan paling umum: instance DEV sudah punya
 * oauth_google tapi instance PRODUKSI belum — gejala persisnya "dulu bisa
 * login Gmail, sekarang tidak bisa". Karena itu script mengecek KEDUA
 * instance: key di .env.local DAN key live yang terpasang di situs.
 *
 * Cara pakai:
 *   node scripts/check-clerk-login.mjs
 *   node scripts/check-clerk-login.mjs --no-headless   # lihat browser
 *
 * Semua check hanya membaca (GET). Tidak ada akun dibuat, tidak ada login
 * dikirim — script hanya melihat apa yang dirender di halaman.
 */
import { readFileSync, existsSync } from "node:fs";
import { argv, exit } from "node:process";
import { chromium } from "@playwright/test";

const HEADLESS = !argv.includes("--no-headless");
const LIVE_SITE = "https://sigitadi.id";

const results = [];
function check(name, ok, detail, hint) {
  results.push({ name, ok, detail, hint });
  return ok;
}

/** Domain Frontend API Clerk diturunkan dari publishable key (pk_<env>_<base64>). */
function clerkFapiDomain(key) {
  if (!key || key.includes("xxxx")) return null;
  const decoded = Buffer.from(key.replace(/^pk_(live|test)_/, ""), "base64").toString("utf-8");
  const host = decoded.replace(/[^a-zA-Z0-9.\-]/g, "").replace(/^[.]+|[.]+$/g, "");
  return host || null;
}

/** Ambil publishable key dari .env.local (fallback .env). */
function loadLocalKey() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(.+)/m);
    if (m) return { key: m[1].trim(), source: f };
  }
  return { key: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "", source: "env var" };
}

/** Ambil publishable key live dari HTML situs (yang benar-benar terpasang). */
async function loadLiveKey() {
  try {
    const html = await fetch(LIVE_SITE + "/", { cache: "no-store" }).then((r) => r.text());
    const m = html.match(/pk_live_[A-Za-z0-9$]+/);
    return m ? { key: m[0], source: `HTML ${LIVE_SITE}` } : null;
  } catch {
    return null;
  }
}

/** Ambil environment Clerk (publik) untuk sebuah key. */
async function fetchClerkEnv(key) {
  const fapi = clerkFapiDomain(key);
  if (!fapi) return null;
  try {
    const res = await fetch(`https://${fapi}/v1/environment`, { headers: { Authorization: key } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

/** Ringkas faktor masuk sebuah environment. */
function summarize(env) {
  if (!env || env.error) return { error: env?.error ?? "tidak bisa diambil" };
  const factors = env.auth_config?.first_factors ?? [];
  return {
    oauth: factors.filter((f) => f.startsWith("oauth_")),
    password: factors.includes("password"),
    portal: env.display_config?.sign_in_url ?? null,
    oneTap: Boolean(env.display_config?.google_one_tap_client_id),
  };
}

async function main() {
  const local = loadLocalKey();
  const live = await loadLiveKey();

  console.log("═".repeat(62));
  console.log("VERIFIKASI LOGIN CLERK");
  console.log("═".repeat(62) + "\n");

  // ── 1. Bandingkan instance DEV vs PRODUKSI ─────────────────────────────
  const envLocal = summarize(await fetchClerkEnv(local.key));
  const envLive = live ? summarize(await fetchClerkEnv(live.key)) : { error: "key tidak ditemukan di HTML" };

  console.log(`[A] Instance di .env.local  (${local.key.slice(0, 12)}…, dari ${local.source})`);
  console.log(`    FAPI domain : ${clerkFapiDomain(local.key)}`);
  console.log(`    OAuth       : ${envLocal.oauth?.length ? envLocal.oauth.join(", ") : "(tidak ada)"}`);
  console.log(`    Password    : ${envLocal.password ? "aktif" : "nonaktif"}\n`);

  console.log(`[B] Instance di situs live (${live ? live.key.slice(0, 16) + "…" : "tidak ketemu"})`);
  console.log(`    FAPI domain : ${clerkFapiDomain(live?.key) ?? "-"}`);
  console.log(`    OAuth       : ${envLive.oauth?.length ? envLive.oauth.join(", ") : "(tidak ada)"}`);
  console.log(`    Password    : ${envLive.password ? "aktif" : "nonaktif"}\n`);

  const googleLocal = envLocal.oauth?.includes("oauth_google") ?? false;
  const googleLive = envLive.oauth?.includes("oauth_google") ?? false;

  check("Google OAuth aktif di instance PRODUKSI", googleLive, envLive.oauth?.length ? envLive.oauth.join(", ") : "tidak ada faktor oauth_*", "Dashboard Clerk (login pk_live) → User & Authentication → Social " + "connections → nyalakan Google, tambahkan ke Sign in + Sign up.");

  check("Email + Password aktif di PRODUKSI", envLive.password, envLive.password ? "ok" : "nonaktif");

  // Deteksi khusus: dev ada google, prod tidak.
  if (googleLocal && !googleLive) {
    check(
      "Konfigurasi dev == prod",
      false,
      "DEV punya oauth_google, PRODUKSI tidak",
      "Ini penyebab 'dulu bisa login Gmail, sekarang tidak'. OAuth perlu " + "diaktifkan ulang di instance PRODUKSI (dashboard Clerk dengan akun " + "yang sama, atau instance live terpisah). Setelah itu update redirect " + `URI di Google Cloud Console → https://${clerkFapiDomain(live?.key)}/v1/oauth/callback.`,
    );
  } else {
    check("Konfigurasi dev == prod", googleLocal === googleLive, googleLocal === googleLive ? "sejajar" : "berbeda");
  }

  // ── 2. Account Portal (redirect pasca-OAuth) ───────────────────────────
  if (envLive.portal) {
    let status = 0;
    try {
      status = (await fetch(envLive.portal, { redirect: "manual" })).status;
    } catch (e) {
      check("Account Portal bisa diakses", false, `${envLive.portal} → ${e.message}`);
    }
    check(
      "Account Portal bisa diakses",
      status >= 200 && status < 400,
      `${envLive.portal} → HTTP ${status}`,
      status === 403 || status >= 400
        ? "Dashboard Clerk → Domains: pastikan domain portal statusnya " + "Deployed/Active dan DNS terverifikasi."
        : null,
    );
  }

  // ── 3. Browser asli: form & tombol Google benar-benar render? ──────────
  const browser = await chromium.launch({ channel: "chrome", headless: HEADLESS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const cspBlocked = [];
  page.on("requestfailed", (r) => {
    if (/clerk/i.test(r.url())) cspBlocked.push(r.url());
  });

  for (const [label, path] of [
    ["live /sign-in", `${LIVE_SITE}/sign-in`],
    ["live /sign-up", `${LIVE_SITE}/sign-up`],
  ]) {
    try {
      await page.goto(path, { timeout: 60000 });
      await page.waitForTimeout(5000);
      const state = await page.evaluate(() => {
        const btns = [...document.querySelectorAll("button, a")];
        const google = btns.find((b) => /google/i.test(b.innerText));
        return {
          render: !!document.querySelector("input"),
          googleBtn: google ? google.innerText.trim() : null,
        };
      });
      check(
        `${label}: form login render`,
        state.render,
        state.googleBtn ? `form + tombol "${state.googleBtn}"` : "form render, TANPA tombol Google",
      );
    } catch (e) {
      check(`${label}: form login render`, false, e.message.slice(0, 120));
    }
  }

  check(
    "Tidak ada request Clerk diblokir CSP",
    cspBlocked.length === 0,
    cspBlocked.length ? `${cspBlocked.length} request diblokir` : "semua request Clerk lolos",
    cspBlocked.length ? "CSP masih memblokir domain Clerk — cek next.config.ts " + "(script-src/connect-src/frame-src)." : null,
  );

  await browser.close();

  // ── Ringkasan ──────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
    console.log(`      ${r.detail}`);
    if (!r.ok && r.hint) console.log(`      → ${r.hint}\n`);
  }
  console.log("═".repeat(62));
  console.log(
    failed.length
      ? `${failed.length} check GAGAL — login belum sepenuhnya berfungsi.\n` +
          "Ikuti petunjuk di atas, lalu jalankan lagi (perubahan dashboard langsung efektif, tidak perlu deploy)."
      : "Semua check PASS — login (termasuk Google) siap dipakai.",
  );
  exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Error tak terduga:", e.message);
  exit(1);
});
