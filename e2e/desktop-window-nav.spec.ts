import { expect, test, type Page } from "@playwright/test";

// REGRESI untuk 2 bug mode desktop (hanya muncul di build PRODUKSI — `next dev`
// menutupinya lewat double-invoke StrictMode). Jalankan via `npm run
// test:e2e:prod` (e2e/playwright-prod.config.ts → next start di port 3001).
//
// 1. Wheel antar jendela: desktop memakai window manager; menggulir di dasar
//    window body harusnya pindah ke app berikutnya ("mode tab"), bukan
//    menggulir halaman. Listener wheel dipasang ke scrollContainerRef yang
//    TIDAK ada pada render pertama (manager merender skeleton selama
//    mounted=false). Bila `mounted` tidak masuk deps effect, listener tidak
//    pernah terpasang → wheel menggulir konten saja → tidak pernah ganti app.
//
// 2. Kartu section muncul setelah ganti app: di desktop, ganti app = remount
//    window body (key={activeApp}). Trigger ScrollTrigger section dibuat di
//    useGSAP (layout effect anak) dan membaca scroller dari
//    ScrollTrigger.defaults() saat itu juga. Pendaftaran container baru lewat
//    ref callback induk terlambat (fase layout setelah layout effect anak),
//    sehingga useInsertionEffect manager yang harus mendaftarkan ulang saat
//    activeApp berubah. Tanpa activeApp di deps, trigger terikat ke container
//    lama yang sudah terlepas dari DOM → rect nol → "top 80%" tak pernah
//    capai → gsap.from menahan opacity 0 sampai halaman di-refresh.
test.use({ viewport: { width: 1366, height: 900 } });

const DESKTOP_SCROLLER = "div[data-gsap-scroller='desktop']";

/** BIOS overlay (fixed inset-0 z-[9999]) bisa diskip dengan Escape. */
async function waitForBoot(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector("div[class*='z-[9999]']");
        if (!el) return true;
        const cs = getComputedStyle(el);
        return cs.opacity === "0" || cs.pointerEvents === "none";
      },
      { timeout: 45_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(400);
}

async function titlebar(page: Page): Promise<string> {
  const t = await page.locator("div.vt-titlebar span.font-mono").first().textContent();
  return (t ?? "").replace(/\s+/g, " ").trim();
}

async function minCardOpacity(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
    if (els.length === 0) return -1;
    return Math.min(...els.map((e) => parseFloat(getComputedStyle(e).opacity)));
  }, selector);
}

test("wheel di dasar window body TIDAK memindahkan window/app (hanya scroll internal)", async ({ page }) => {
  await page.goto("/", { timeout: 60_000 });
  await waitForBoot(page);
  await page.locator(DESKTOP_SCROLLER).waitFor({ state: "visible" });

  // Mouse harus berada di atas window body
  const box = await page.locator(DESKTOP_SCROLLER).boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

  const before = await titlebar(page);
  await page.evaluate((sel) => {
    const el = document.querySelector<HTMLDivElement>(sel);
    if (el) el.scrollTop = el.scrollHeight; // posisi di dasar
  }, DESKTOP_SCROLLER);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(700);
  const after = await titlebar(page);

  // App/tab tetap sama, tidak pindah karena wheel scroll
  expect(before).toBe(after);
});

test("kartu section muncul tanpa refresh setelah ganti app via ikon", async ({ page }) => {
  const CARD = ".sigit-project-card";

  await page.goto("/", { timeout: 60_000 });
  await waitForBoot(page);

  // Sampai di app proyek lewat klik ikon (switchApp — yang menulis hash,
  // jadi setelah reload pun tetap di app yang sama).
  const nIcons = await page.locator("button.vt-icon").count();
  let switched = false;
  for (let i = 0; i < nIcons; i++) {
    await page.locator("button.vt-icon").nth(i).click();
    await page.waitForTimeout(500);
    if ((await page.locator(CARD).count()) > 0) {
      switched = true;
      break;
    }
  }
  expect(switched, "app proyek tidak ditemukan lewat rail ikon").toBe(true);

  // Animasi gsap.from bermain setelah trigger aktif; tanpa perbaikan, kartu
  // menetap di opacity 0 sampai halaman di-refresh.
  await page.waitForTimeout(2500);
  expect(await minCardOpacity(page, CARD)).toBeGreaterThan(0.9);

  // Pergi ke app lain lalu kembali — trigger harus tetap sehat.
  await page.locator("button.vt-icon").first().click();
  await page.waitForTimeout(700);
  for (let i = 0; i < nIcons; i++) {
    await page.locator("button.vt-icon").nth(i).click();
    await page.waitForTimeout(500);
    if ((await page.locator(CARD).count()) > 0) break;
  }
  await page.waitForTimeout(2500);
  expect(await minCardOpacity(page, CARD)).toBeGreaterThan(0.9);
});
