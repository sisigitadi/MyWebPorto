import { expect, test } from "@playwright/test";

test("beranda SigitOS tampil + tanggal dd/mm/yyyy", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sigit Adi/);
  await expect(page.getByText("SIGIT-OS").first()).toBeVisible();
  // Menubar merender dua span tanggal: mobile dd/mm/yy (sm:hidden) dan
  // desktop dd/mm/yyyy (hidden sm:inline). Yang diuji harus yang TERLIHAT
  // pada viewport config — mengejar span desktop lewat .last() membuat test
  // ini selalu gagal di config prod (viewport 390×844 → hidden sm:inline).
  await expect(
    page.getByText(/\d{2}\/\d{2}\/\d{2,4}/).filter({ visible: true }).first(),
  ).toBeVisible();
});

test("katalog proyek dan artikel dapat dibuka", async ({ page }) => {
  for (const path of ["/proyek", "/artikel"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
  }
});

test("sitemap dan robots tersedia", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<url");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
});

test("feed RSS dan llms.txt tersedia", async ({ request }) => {
  const feed = await request.get("/feed.xml");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("<rss");

  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  const llmsText = await llms.text();
  expect(llmsText).toContain("# ");
  // Penanda route DINAMIS (bukan file statis basi): tautan kontak kanonis
  expect(llmsText).toContain("/#kontak");
});

test("fallback offline & ikon tersedia (pwa install dimatikan)", async ({ request }) => {
  // manifest.webmanifest sengaja dihapus — browser tidak lagi menawarkan
  // "Install app". Halaman /offline tetap ada (di-cache service worker).
  const icon = await request.get("/icons/icon-192.png");
  expect(icon.status()).toBe(200);

  const offline = await request.get("/offline");
  expect(offline.status()).toBe(200);
});
