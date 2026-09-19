import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Integrasi God Mode Fase 3: settings.features harus benar-benar mengendalikan
 * apa yang dirender pengunjung.
 *
 * Unit test di tests/features-config.test.ts menguji lapisan datanya; test ini
 * memverifikasi utas penuh: (public)/layout.tsx → resolveFeatures → prop
 * FeaturesProvider → useFeature → DOM, serta gate server-side route artikel.
 * Tanpa ini, flag bisa saja valid tapi tidak terbaca komponen (mis. prop lupa
 * dilewatkan atau gate ditaruh di tempat yang salah).
 *
 * File data/local-settings.json dipakai sebagai backend (tidak ada DB di dev);
 * selalu dibersihkan di afterEach agar tidak menempel di test lain.
 */

const SETTINGS_FILE = path.join(process.cwd(), "data", "local-settings.json");

function writeFeatures(features: unknown): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const existing = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    : {};
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...existing, features }), "utf-8");
}

function clearSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
  } catch {
    // abaikan race dengan worker lain
  }
}

/**
 * Viewport MOBILE wajib: di mode desktop, os-desktop-manager hanya merender
 * section app AKTIF (`activeApp === "x" && …`), jadi #artikel/#produk tidak
 * ada di DOM kecuali jendela itu sedang terbuka. Di mode mobile (<768px)
 * SELURUH section dirender dalam satu dokumen scroll (scrollSections.map di
 * os-desktop-manager) — #artikel/#produk selalu ada (selama app-nya tidak
 * di-gate flag).
 */
test.use({ viewport: { width: 375, height: 740 } });

/** cachebust mem-bypass route cache (di produksi cache dimurnikan oleh
 * revalidatePath("/", "layout") di saveFeaturesAction). */
let urlSeq = 0;
function freshUrl(pathname = "/"): string {
  return `${pathname}?cachebust=${Date.now()}-${urlSeq++}`;
}

/** Semua flag ON kecuali satu yang sedang diuji. */
function flags(override: Record<string, boolean>): Record<string, boolean> {
  return {
    enable_terminal: true,
    enable_store_cart: true,
    enable_articles: true,
    maintenance_mode: false,
    ...override,
  };
}

test.describe("God Mode: settings.features mengendalikan situs publik", () => {
  test.afterEach(() => {
    clearSettings();
  });

  test("enable_articles OFF → app Artikel hilang dari OS + /artikel tidak layani konten", async ({ page }) => {
    clearSettings();
    writeFeatures(flags({ enable_articles: false }));
    await page.goto(freshUrl());
    // Mode mobile: seluruh section ada di satu dokumen. Saat flag OFF, app
    // artikel di-exclude dari daftar OS (os-desktop-manager) → section hilang.
    await expect(page.locator("#artikel")).toHaveCount(0);
    // Gate server-side route: "off" harus benar-benar off. Status HTTP tetap
    // 200 karena Suspense boundary (public)/loading.tsx (Ruling 7 di ledger),
    // jadi yang diuji adalah BODY: UI not-found muncul + konten artikel absen.
    const res = await page.goto(freshUrl("/artikel"));
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    await expect(page.locator("#artikel")).toHaveCount(0);
  });

  test("maintenance_mode ON → situs publik diganti halaman pemeliharaan", async ({ page }) => {
    writeFeatures(flags({ maintenance_mode: true }));
    await page.goto(freshUrl());
    await expect(
      page.getByRole("heading", { name: /Sedang Pemeliharaan|Under Maintenance/ })
    ).toBeVisible();
    // OS shell tidak ikut dirender (halaman pengganti ringan).
    await expect(page.locator("#artikel")).toHaveCount(0);
  });

  test("enable_store_cart OFF → tombol keranjang hilang dari katalog", async ({ page }) => {
    writeFeatures(flags({ enable_store_cart: false }));
    await page.goto(freshUrl());
    const produk = page.locator("#produk");
    await produk.waitFor({ state: "attached" });
    // Flag `i`: label tombol uppercase di DOM ("KERANJANG" / "ADD TO CART")
    // maupun quick trigger ("Keranjang" / "Cart.zip") — keduanya harus hilang.
    await expect(produk.getByRole("button", { name: /Keranjang|Cart/i })).toHaveCount(0);
  });

  test("default (flag ON) → app artikel & tombol keranjang ada", async ({ page }) => {
    clearSettings();
    await page.goto(freshUrl());
    await expect(page.locator("#artikel")).toBeAttached();
    const produk = page.locator("#produk");
    await produk.waitFor({ state: "attached" });
    // minimal 1 (quick trigger + tombol per produk); jumlah pastinya tak
    // penting — yang penting gate OFF membuang SEMUA, dan ON menyisakan ≥1.
    await expect(produk.getByRole("button", { name: /Keranjang|Cart/i })).not.toHaveCount(0);
  });
});
