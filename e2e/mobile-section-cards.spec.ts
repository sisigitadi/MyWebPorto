import { expect, test } from "@playwright/test";

// REGRESI untuk bug "cards section hilang / blank putih setelah judul dan
// deskripsi section" (mode mobile, hanya muncul di build PRODUKSI).
//
// Setiap section memunculkan kartunya dengan gsap.from({ opacity: 0, ... })
// yang baru diputar saat ScrollTrigger section aktif. ScrollTrigger membaca
// scroller-nya dari ScrollTrigger.defaults() saat trigger DIBUAT. Bila
// default itu belum terpasang sebelum useGSAP section berjalan (urutan
// commit React: layout effect anak lebih dulu daripada ref callback induk),
// trigger terikat ke window — padahal di mode mobile window tidak pernah
// scroll (documentElement.scrollHeight === innerHeight). Akibatnya
// toggleActions "play" tidak pernah memicu dan kartu menetap di opacity 0.
//
// Di `next dev` StrictMode menutupi bug ini dengan double-invoke, maka spec
// ini harus dijalankan terhadap `next start` (lihat `npm run test:e2e:prod`
// dan e2e/playwright-prod.config.ts), BUKAN terhadap dev server.
test.use({ viewport: { width: 390, height: 844 } });

/** Container scroll single-page mode mobile (bukan rail kategori produk). */
const MOBILE_SCROLLER = `[...document.querySelectorAll("div[data-gsap-scroller='mobile']")][0]`;

/**
 * BIOS overlay menutupi layar sampai proses boot selesai; tunggu sampai tidak
 * ada lagi elemen overlay lebar di atas segalanya.
 */
async function waitForBoot(page: import("@playwright/test").Page): Promise<void> {
  await page
    .waitForFunction(
      `() => ![...document.querySelectorAll("div")].some(
        (d) => getComputedStyle(d).zIndex === "9999" &&
          d.getBoundingClientRect().width > 100 &&
          getComputedStyle(d).visibility !== "hidden")`,
      { timeout: 45_000 },
    )
    .catch(() => {});
}

test("kartu tiap section muncul setelah container digulir ke sectionnya", async ({ page }) => {
  await page.goto("/", { timeout: 60_000 });
  await waitForBoot(page);
  await page.waitForSelector("section[data-app-id='proyek']", { timeout: 45_000 });
  await page.waitForFunction(`() => ${MOBILE_SCROLLER} !== undefined`, { timeout: 45_000 });

  const sections = [
    { id: "layanan", card: ".sigit-service-card" },
    { id: "proyek", card: ".sigit-project-card" },
    { id: "toko", card: ".sigit-product-card" },
    { id: "artikel", card: ".sigit-article-card" },
    { id: "testimoni", card: ".sigit-testi-card" },
  ] as const;

  for (const sec of sections) {
    await page.evaluate(
      `(function () {
        const root = ${MOBILE_SCROLLER};
        const el = document.querySelector("section[data-app-id='${sec.id}']");
        if (root && el) root.scrollTop = el.offsetTop - 4;
      })()`,
    );
    // Tween 0.85s + stagger 0.12s per kartu; tunggu hingga selesai.
    await page.waitForTimeout(2500);

    const opacity = await page.evaluate(
      `(function () {
        const c = document.querySelector("${sec.card}");
        return c ? parseFloat(getComputedStyle(c).opacity) : null;
      })()`,
    );
    expect(
      opacity,
      `kartu ${sec.card} pada section "${sec.id}" harus terlihat setelah digulir`,
    ).not.toBeNull();
    expect(opacity as number).toBeGreaterThan(0.9);
  }
});
