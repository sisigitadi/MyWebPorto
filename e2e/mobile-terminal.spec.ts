import { expect, test } from "@playwright/test";

// Regression test untuk bug "setelah buka tab baru, terminal tidak muncul saat
// discroll tapi bisa dibuka dari start menu tapi jadi muncul semua icon di
// taskbar dan tidak bisa scroll lagi" + keluhan lanjutan "terminal masih tidak
// muncul saat scroll, harus dibuka melalui start menu; di akhir dokumen tidak
// ada tombol kembali ke awal, hanya ada perintah ketuk ikon taskbar tapi tidak
// tau yg mana ikon nya".
//
// Akar masalah (versi 1): onOpenTerminal memaksa setViewMode("desktop") di
// viewport <768px → matchMedia listener hanya memantau event "change" (resize),
// jadi viewMode nyangkut "desktop" → taskbar desktop (8 ikon vt-taskbar-tab)
// dirender di layar 390px dan single-page scroll hilang.
//
// Solusi final: Terminal adalah SECTION ke-6 dalam alur scroll mobile
// (SCROLL_SECTIONS), dibungkus kartu ber-height tetap. Tidak ada overlay, tidak
// ada setViewMode paksa. Tombol "KEMBALI KE ATAS" menutup dokumen.
//
// Lihat memory: os-boot-overlay-hydration-timing (overlay z-9999 ~5s) &
// os-app-switching-test-selectors (scope ke popup Start menu).

test.use({ viewport: { width: 390, height: 844 } });

// Boot loader (z-[9999]) mencegat semua pointer input sampai ~5d setelah
// hydration — hydration bisa terlambat pada dev server dingin.
async function waitForBoot(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("div")].some(
        (d) =>
          getComputedStyle(d).zIndex === "9999" &&
          d.getBoundingClientRect().width > 100 &&
          getComputedStyle(d).visibility !== "hidden",
      ),
    { timeout: 45_000 },
  );
}

// Container single-page-scroll mode mobile dicari lewat ANCESTOR dari section
// terminal — bukan lewat class selector. Ada elemen lain ber-class
// "overflow-y-auto vt-scrollbar" yang muncul lebih dulu di DOM (panel chat
// RetroBot yang tertutup, display:none): querySelector mengambil itu, scrollTop
// di-set ke container yang tak terlihat tidak ada efek apa-apa. (page.evaluate
// hanya membawa body arrow function-nya, jadi logikanya harus inline.)
function scrollToTerminal(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const sec = document.querySelector("section[data-app-id='terminal']");
    let el = sec?.parentElement as HTMLElement | null;
    while (el && !el.className.includes("vt-scrollbar")) el = el.parentElement;
    if (!el || !sec) throw new Error("container/section tidak ditemukan");
    // Gulir ke posisi section (bounding-box, andal terhadap offsetParent).
    el.scrollTop += sec.getBoundingClientRect().top - el.getBoundingClientRect().top;
  });
}

function mobileScrollTop(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const sec = document.querySelector("section[data-app-id='terminal']");
    let el = sec?.parentElement as HTMLElement | null;
    while (el && !el.className.includes("vt-scrollbar")) el = el.parentElement;
    return el ? el.scrollTop : -1;
  });
}

test("Terminal muncul saat di-scroll di mobile tanpa merusak taskbar; ada tombol kembali ke awal", async ({ page }) => {
  await page.goto("/");
  await waitForBoot(page);

  // Taskbar mobile hanya boleh menampilkan SATU tab section aktif. Mode
  // desktop yang salah akan merender 8 (seluruh APPS).
  await expect(page.locator(".vt-taskbar-tab")).toHaveCount(1);

  // --- Terminal MUNCUL SAAT DI-SCROLL (bukan hanya lewat Start Menu) ---
  const terminalSection = page.locator("section[data-app-id='terminal']");
  await expect(terminalSection).toHaveCount(1);

  // Gulir container utama ke section terminal, lalu pastikan section itu
  // benar-benar terlihat di viewport (bukan tertinggal di bawah lipatan).
  await scrollToTerminal(page);
  await expect(terminalSection).toBeVisible();
  const termBox = await terminalSection.boundingBox();
  expect(termBox).not.toBeNull();
  expect(termBox!.y).toBeGreaterThanOrEqual(0);
  expect(termBox!.y).toBeLessThan(400);

  // Header kartu memperlihatkan nama file app (Terminal.bat di id & en).
  await expect(terminalSection).toContainText(/Terminal\.bat/i);

  // --- Log terminal bisa di-scroll sendiri; halaman TIDAK ikut terseret ---
  // "help" menghasilkan banyak baris output → area log pasti overflow di
  // viewport mobile. Sebelumnya efek auto-scroll memakai scrollIntoView yang
  // menggulir SEMUA leluhur scrollable, jadi setiap output menarik seluruh
  // halaman ke section terminal.
  const pageScrollBefore = await mobileScrollTop(page);
  const input = terminalSection.locator("input[type='text']");
  await input.fill("help");
  await input.press("Enter");
  await expect(terminalSection.locator('[role="log"]')).toContainText(/help/i);

  const logState = await page.evaluate(() => {
    const el = document.querySelector(
      "section[data-app-id='terminal'] [role='log']",
    ) as HTMLElement | null;
    if (!el) return null;
    return { overflows: el.scrollHeight > el.clientHeight, scrolled: el.scrollTop > 0 };
  });
  expect(logState).not.toBeNull();
  expect(logState!.overflows).toBe(true);
  expect(logState!.scrolled).toBe(true);

  // Inti regresi: posisi halaman tidak berubah setelah output terminal.
  const pageScrollAfter = await mobileScrollTop(page);
  expect(pageScrollAfter).toBe(pageScrollBefore);

  // --- Tombol KEMBALI KE ATAS di akhir dokumen ---
  // Sebelumnya hanya ada teks "ketuk ikon taskbar" — taskbar mobile cuma
  // menampilkan SATU ikon (section aktif), petunjuk itu membingungkan.
  // Accessible name memakai aria-label ("Kembali ke atas" / "Back to top").
  const backToTop = page.getByRole("button", { name: /kembali ke atas|back to top/i });
  await expect(backToTop).toHaveCount(1);

  await backToTop.click();

  // Halaman kembali ke atas (smooth scroll — tunggu sampai diam).
  await expect.poll(async () => mobileScrollTop(page)).toBeLessThan(5);
  await expect(page.locator("section[data-app-id='profil']")).toBeVisible();

  // Taskbar tetap utuh sepanjang interaksi (1 tab, tidak pernah 8).
  await expect(page.locator(".vt-taskbar-tab")).toHaveCount(1);

  // --- Bisa dibuka lewat Start Menu juga (jalan alternatif, state tak terkunci) ---
  await page.locator("button:has(div.grid.grid-cols-2)").first().click();
  const startMenu = page
    .locator("div.fixed")
    .filter({ has: page.locator(".bg-gradient-to-t") })
    .last();
  await startMenu.getByRole("button", { name: "Terminal.bat" }).click();
  await expect(terminalSection).toBeVisible();
  await expect(page.locator(".vt-taskbar-tab")).toHaveCount(1);
});
