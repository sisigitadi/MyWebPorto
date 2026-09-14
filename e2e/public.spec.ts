import { expect, test } from "@playwright/test";

test("beranda SigitOS tampil + tanggal dd/mm/yyyy", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sigit Adi/);
  await expect(page.getByText("SIGIT-OS").first()).toBeVisible();
  // Format tanggal menubar hasil revisi dev (span desktop = elemen terakhir)
  await expect(page.getByText(/\d{2}\/\d{2}\/\d{4}/).last()).toBeVisible();
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

test("PWA: manifest, ikon, dan halaman offline", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(await manifest.text()).toContain("icon-512.png");

  const icon = await request.get("/icons/icon-192.png");
  expect(icon.status()).toBe(200);

  const offline = await request.get("/offline");
  expect(offline.status()).toBe(200);
});
