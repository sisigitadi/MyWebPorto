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
