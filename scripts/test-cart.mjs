/**
 * Smoke test alur keranjang belanja via Playwright + system Chrome.
 * Jalankan: node scripts/test-cart.mjs   (butuh dev server di localhost:3000)
 *
 * Toko adalah "aplikasi OS" (app id "toko") di dalam desktop manager, jadi
 * test ini membuka Start Menu dulu — cara yang sama di desktop & mobile,
 * karena sidebar ikon aplikasi hanya tampil di layar lg+.
 */
import { chromium } from "playwright";

const LOOPS = [
  { name: "desktop 1440x900", viewport: { width: 1440, height: 900 } },
  { name: "mobile 375x812", viewport: { width: 375, height: 812 } },
];

const results = [];

for (const { name, viewport } of LOOPS) {
  const row = { name, checks: [] };
  const check = (label, ok, extra = "") =>
    row.checks.push({ label, ok: !!ok, extra: String(extra || "").slice(0, 200) });

  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && /content security|Refused/i.test(m.text())) {
      errors.push(`CSP: ${m.text()}`);
    }
  });

  try {
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    // Boot overlay ~5s, timernya mulai saat HYDRATION bukan saat load — tunggu
    // sampai overlay benar-buah hilang, jangan asumsikan flat 8s cukup.
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("div")].some(
          (d) =>
            getComputedStyle(d).zIndex === "9999" &&
            d.getBoundingClientRect().width > 100 &&
            getComputedStyle(d).visibility !== "hidden"
        ),
      { timeout: 45_000 }
    );
    await page.waitForTimeout(500);

    // 1. Buka Start Menu (tombol grid 2x2 + label; ada di taskbar semua viewport).
    const startBtn = page.locator("button.vt-btn").filter({ has: page.locator(".grid.grid-cols-2") });
    await startBtn.first().click();
    await page.waitForTimeout(400);
    const menuOpen = await page.locator("div.fixed.z-50").count();
    check("start menu terbuka", menuOpen > 0, `popups=${menuOpen}`);

    // 2. Luncurkan aplikasi Toko dari DALAM start menu. Nama mengikuti bahasa
    // aktif: "Toko.zip" (id) / "Store.zip" (en). Wajib scope ke popup start
    // menu — nama yang sama juga dipakai ikon sidebar & tab taskbar, dan ikon
    // sidebar diblokir backdrop z-40 selama menu terbuka.
    const menu = page
      .locator("div.fixed")
      .filter({ has: page.locator(".bg-gradient-to-t") })
      .last();
    const tokoItem = menu.getByRole("button", { name: /^Toko\.zip$|^Store\.zip$/ });
    const tokoVisible = (await tokoItem.count()) > 0 && (await tokoItem.first().isVisible());
    check("item Toko.zip / Store.zip terlihat di start menu", tokoVisible, `count=${await tokoItem.count()}`);
    if (!tokoVisible) throw new Error("item toko tidak ditemukan di start menu");
    await tokoItem.first().click();
    await page.waitForTimeout(600);

    // 3. Section toko & produk ter-render.
    const store = page.locator("#produk");
    check("section toko (#produk) hadir", (await store.count()) > 0);
    const addBtns = store.locator('button[title="Tambah ke Keranjang Belanja"]:not([disabled])');
    const addCount = await addBtns.count();
    check("ada produk dengan tombol tambah (stok)", addCount > 0, `tombol=${addCount}`);

    if (addCount === 0) {
      // Tidak bisa lanjutkan alur; tutup browser & catat.
      check("ALUR BERHENTI: semua produk habis/diluar stok", false);
      results.push(row);
      await browser.close();
      continue;
    }

    // 4. Klik "Tambah ke Keranjang" pertama → dialog cart otomatis terbuka
    //    (addItem() memanggil setIsOpen(true)).
    await addBtns.first().click();
    await page.waitForTimeout(700);
    const dialog = page.getByRole("dialog");
    check("klik tambah membuka dialog cart", (await dialog.count()) > 0);

    // 5. Item muncul di daftar cart.
    const itemRows = dialog.locator('button[title="Hapus dari keranjang"]');
    const rowCount = await itemRows.count();
    check("minimal 1 item di cart", rowCount >= 1, `items=${rowCount}`);

    // 6. Badge jumlah di header toko (tombol "Keranjang"/"Cart.zip").
    const cartTrigger = page.locator("button").filter({ hasText: /Keranjang|Cart\.zip/ }).first();
    const badge = cartTrigger.locator("span").last();
    const badgeText = (await badge.textContent()) || "?";
    check("badge jumlah cart terbaca", badgeText.trim() !== "", `badge="${badgeText.trim()}"`);

    // 7. Naikkan qty via tombol + (title="Tambah") — harus bertambah.
    const qtyLabel = dialog.locator('button[title="Kurangi"]').first().locator("xpath=following-sibling::span[1]");
    const qtyBefore = (await qtyLabel.textContent()) || "0";
    await dialog.locator('button[title="Tambah"]').first().click();
    await page.waitForTimeout(300);
    const qtyAfter = (await qtyLabel.textContent()) || "0";
    check("tombol + menaikkan kuantitas", Number(qtyAfter) > Number(qtyBefore), `${qtyBefore} → ${qtyAfter}`);

    // 8. Tutup dialog, lalu buka lagi via trigger "Keranjang" (bukan add-to-cart).
    await dialog.locator('button:has(svg.lucide-x)').last().click();
    await page.waitForTimeout(400);
    check("tutup dialog cart", (await page.getByRole("dialog").count()) === 0);
    await cartTrigger.click();
    await page.waitForTimeout(500);
    check("buka ulang cart via trigger Keranjang", (await page.getByRole("dialog").count()) > 0);

    // 9. Hapus item → cart kembali kosong (empty state).
    await page.getByRole("dialog").locator('button[title="Hapus dari keranjang"]').first().click();
    await page.waitForTimeout(400);
    const emptyState = page.getByText(/keranjang belanja anda masih kosong|your cart is currently empty/i);
    check("hapus item → empty state", (await emptyState.count()) > 0);

    check("nol PAGEERROR / CSP violation", errors.length === 0, errors.join(" | "));
  } catch (err) {
    check("test tidak melempar exception", false, err.message);
  } finally {
    await browser.close();
  }
  results.push(row);
}

console.log("\n=== HASIL SMOKE TEST CART ===\n");
let pass = 0;
let fail = 0;
for (const row of results) {
  console.log(`\n[${row.name}]`);
  for (const c of row.checks) {
    console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label}${c.extra ? `  (${c.extra})` : ""}`);
    c.ok ? pass++ : fail++;
  }
}
console.log(`\nTotal: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
