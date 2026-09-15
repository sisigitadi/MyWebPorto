/**
 * Smoke test RetroBot widget via Playwright + system Chrome.
 * Jalankan: node scripts/test-retrobot.mjs
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
    // Boot overlay ~5s, tapi timernya baru mulai saat HYDRATION — bukan saat
    // halaman loaded. Di dev server dingin (kompilasi on-demand) atau di
    // perangkat lambat, hydration bisa muncul beberapa detik setelah
    // domcontentloaded, jadi tunggu sampai overlay benar-benar hilang; jangan
    // asumsikan flat 8s cukup.
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
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

    // 1. Avatar hadir setelah boot
    const avatarCount = await page
      .locator('[class*="rb-bob"]')
      .count();
    check("avatar SVG (rb-bob) hadir setelah boot", avatarCount > 0, `count=${avatarCount}`);

    // 2. Klik avatar → panel terbuka
    const avatarLocator = page.locator("button").filter({ has: page.locator(".rb-bob") });
    await avatarLocator.first().click({ force: true });
    await page.waitForTimeout(800);
    const dialog = page.getByRole("dialog");
    check("klik avatar membuka panel (role=dialog)", (await dialog.count()) > 0);

    // 3. Quick-prompt chip → jawaban
    const chip = dialog.locator("button:has(svg.lucide-sparkles)").first();
    const chipVisible = (await chip.count()) > 0 && (await chip.isVisible());
    check("quick-prompt chip terlihat", chipVisible);

    if (chipVisible) {
      await chip.click();
      await page.waitForTimeout(12000); // waktu streaming/jawaban
      const msgs = dialog.locator("div.whitespace-pre-line");
      const msgCount = await msgs.count();
      const lastText = msgCount > 0 ? (await msgs.last().textContent()) || "" : "";
      check("ada balasan assistant", msgCount >= 1, `msgs=${msgCount} last="${lastText.slice(0, 80)}"`);
      check("balasan tidak kosong", lastText.trim().length > 0);
      // badge source (LOKAL/LOCAL/CLOUD)
      const badge = dialog.locator("span.font-bold").filter({ hasText: /LOKAL|LOCAL|CLOUD/i });
      check("badge source tampil", (await badge.count()) > 0, await badge.first().textContent().catch(() => ""));
    }

    // 4. Collapse/expand
    await dialog.locator('button[aria-label*="Close"], button:has(svg.lucide-x)').last().click();
    await page.waitForTimeout(500);
    check("tombol close menutup panel", (await page.getByRole("dialog").count()) === 0);

    // Buka lagi lalu drag avatar tetap di viewport
    await avatarLocator.first().click({ force: true });
    await page.waitForTimeout(500);
    await dialog.locator('button:has(svg.lucide-x)').last().click();
    await page.waitForTimeout(500);
    const box = await avatarLocator.first().boundingBox();
    if (box) {
      check(
        "avatar di dalam viewport",
        box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
        `x=${Math.round(box.x)} y=${Math.round(box.y)} w=${box.width}`
      );
      check("avatar tidak menutupi taskbar bawah", box.y + box.height < viewport.height - 20, `bottom=${Math.round(box.y + box.height)}`);
    }

    // 5. Tidak overlap dengan tombol cart (kanan-bawah area).
    // Tombol cart hanya dirender saat cart tidak kosong — bila tidak ada,
    // tidak ada yang bisa overlap; lewati cek (bukan FAIL).
    const cart = page.locator('button:has(svg.lucide-shopping-cart)').first();
    if (box && (await cart.count()) > 0) {
      const cbox = await cart.boundingBox();
      if (cbox) {
        const overlap = !(
          box.x + box.width < cbox.x ||
          cbox.x + cbox.width < box.x ||
          box.y + box.height < cbox.y ||
          cbox.y + cbox.height < box.y
        );
        check("avatar tidak overlap tombol cart", !overlap, `avatar=(${box.x},${box.y}) cart=(${cbox.x},${cbox.y})`);
      } else check("cart boundingBox", false, "null");
    } else {
      check("avatar tidak overlap tombol cart", true, "cart kosong — tombol tidak dirender");
    }

    check("nol PAGEERROR / CSP violation", errors.length === 0, errors.join(" | "));
  } catch (err) {
    check("test berjalan tanpa exception", false, err.message);
  } finally {
    await browser.close();
  }
  results.push(row);
}

console.log("\n=== HASIL SMOKE TEST RETROBOT ===");
let pass = 0, fail = 0;
for (const row of results) {
  console.log(`\n[${row.name}]`);
  for (const c of row.checks) {
    console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label}${c.extra ? `  (${c.extra})` : ""}`);
    c.ok ? pass++ : fail++;
  }
}
console.log(`\nTotal: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
