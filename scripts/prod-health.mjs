// Health check produksi: memastikan endpoint publik yang dipakai mesin
// crawl dan share tetap sehat setelah deploy.
//
// Kenapa perlu: beberapa regresi HANYA terlihat di URL nyata. Contoh nyata
// pada 2026-10-05 — data avatar sudah pindah ke tabel `media` dan ter-commit,
// tapi route `GET /api/media/[id]` belum ikut ter-deploy, sehingga
// sigitadi.id menjawab 404 untuk avatar dan dua cover artikel. Semua gerbang
// lokal (tsc, eslint, vitest, build) hijau karena tidak ada yang menyentuh
// URL produksi. Pemeriksaan ini menutup celah itu.
//
// Jalankan: `npm run check:prod` (butuh jaringan ke situs produksi).
// Di CI: .github/workflows/prod-health.yml.

// Host produksi bisa dioverride agar skrip yang sama bisa dipakai untuk
// preview/staging tanpa mengubah kode.
const BASE = (process.env.PROD_HEALTH_BASE_URL || "https://sigitadi.id").replace(/\/+$/, "");

/** Ambil respons + body sebagai teks. Tidak melempar error HTTP apa pun. */
async function grab(path, { redirect = "manual" } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect,
    headers: { "user-agent": "MyWebPorto-ProdHealth/1.0 (+https://sigitadi.id)" },
  });
  const body = await res.text();
  return { status: res.status, type: res.headers.get("content-type") || "", body };
}

/**
 * Host alias harus 308 ke apex, bukan 200. Kalau productionSettings.url masih
 * menunjuk alias, ini regresi canonical yang GSC marahi.
 */
const ALIAS_HOSTS = ["www.sigitadi.id"];

const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? "[32mPASS[0m" : "[31mFAIL[0m";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// --- 1. Endpoint inti yang harus hidup -------------------------------------
for (const [path, mustType] of [
  ["/", "text/html"],
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "application/xml"],
  ["/feed.xml", "application/rss+xml"],
  ["/llms.txt", "text/plain"],
  ["/opengraph-image", "image/png"],
  ["/icon", ""],
]) {
  try {
    const r = await grab(path);
    const typeOk = mustType === "" || r.type.startsWith(mustType);
    check(`200 ${path}`, r.status === 200 && typeOk, `${r.status} ${r.type || "(tanpa content-type)"}`);
  } catch (err) {
    check(`200 ${path}`, false, String(err.message).slice(0, 80));
  }
}

// --- 2. Setiap gambar yang benar-benar dirender harus bisa diambil ---------
// Ini inti pemeriksaan: htmlDimuat homepage, cari setiap referensi
// /api/media/<id>, lalu minta ulang ke publik. Inilah yang menangkap kasus
// avatar 404 tanpa perlu menebak.
try {
  const home = await grab("/");
  const ids = [...new Set([...home.body.matchAll(/\/api\/media\/[0-9a-f-]+/g)].map((m) => m[0]))];
  check("homepage punya minimal satu gambar DB", ids.length > 0, `${ids.length} referensi /api/media`);

  const broken = [];
  for (const path of ids) {
    try {
      const r = await grab(path);
      if (r.status !== 200 || !r.type.startsWith("image/")) {
        broken.push(`${path} → ${r.status} ${r.type}`);
      }
    } catch (err) {
      broken.push(`${path} → ${String(err.message).slice(0, 50)}`);
    }
  }
  check("semua gambar DB yang dirender homepage merespons 200 image/*", broken.length === 0, broken.join("; ") || `${ids.length} gambar ok`);
} catch (err) {
  check("homepage punya minimal satu gambar DB", false, String(err.message).slice(0, 80));
}

// --- 3. Tidak boleh ada referensi /uploads/ lagi ---------------------------
// Berkas di public/uploads tidak ikut ter-deploy ke Vercel, jadi satu saja
// yang masih dirender = broken image produksi.
try {
  const pages = ["/", "/artikel", "/proyek", "/toko"];
  const offenders = [];
  for (const p of pages) {
    const r = await grab(p);
    const n = (r.body.match(/\/uploads\//g) || []).length;
    if (n > 0) offenders.push(`${p} (${n}x)`);
  }
  check("tidak ada referensi /uploads/ di halaman publik", offenders.length === 0, offenders.join(", ") || "bersih");
} catch (err) {
  check("tidak ada referensi /uploads/ di halaman publik", false, String(err.message).slice(0, 80));
}

// --- 4. Slug tak dikenal harus 404, bukan 200 -----------------------------
for (const p of ["/toko/tidak-ada-xyz", "/artikel/tidak-ada-xyz", "/proyek/tidak-ada-xyz"]) {
  try {
    const r = await grab(p);
    check(`404 ${p}`, r.status === 404, String(r.status));
  } catch (err) {
    check(`404 ${p}`, false, String(err.message).slice(0, 80));
  }
}

// --- 5. og:image artikel harus URL absolut yang bisa diambil --------------
try {
  const sitemap = await grab("/sitemap.xml");
  const firstArticle = [...sitemap.body.matchAll(/<loc>([^<]*\/artikel\/[^<]*)<\/loc>/g)].map((m) => m[1])[0];
  if (!firstArticle) {
    check("sitemap memuat URL artikel", false, "tidak ditemukan /artikel/ di sitemap.xml");
  } else {
    const path = new URL(firstArticle).pathname;
    const page = await grab(path);
    const og = page.body.match(/property="og:image" content="([^"]+)"/)?.[1] || "";
    const absolute = og.startsWith("http");
    let imgOk = false;
    if (absolute) {
      const r = await fetch(og, { headers: { "user-agent": "MyWebPorto-ProdHealth/1.0" } });
      imgOk = r.ok && (r.headers.get("content-type") || "").startsWith("image/");
      await r.arrayBuffer();
    }
    check("og:image artikel absolut dan bisa diambil", absolute && imgOk, absolute ? `${og.slice(0, 70)} → ${imgOk ? "ok" : "gagal diambil"}` : "og:image tidak absolut");
  }
} catch (err) {
  check("og:image artikel absolut dan bisa diambil", false, String(err.message).slice(0, 80));
}

// --- 6. Host alias harus dialihkan ke apex ---------------------------------
for (const host of ALIAS_HOSTS) {
  try {
    const res = await fetch(`https://${host}/`, { redirect: "manual", headers: { "user-agent": "MyWebPorto-ProdHealth/1.0" } });
    const loc = res.headers.get("location") || "";
    const ok = (res.status === 308 || res.status === 301) && loc.includes("sigitadi.id");
    check(`alias ${host} → apex`, ok, `${res.status} → ${loc || "(tanpa location)"}`);
  } catch (err) {
    check(`alias ${host} → apex`, false, String(err.message).slice(0, 60));
  }
}

// --- Ringkasan -------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lolos untuk ${BASE}`);

if (failed.length > 0) {
  console.error(`\n${failed.length} pemeriksaan GAGAL:`);
  for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}

process.exit(0);