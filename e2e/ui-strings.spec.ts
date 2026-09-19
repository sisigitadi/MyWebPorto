import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Integrasi God Mode Fase 2: settings.ui_strings harus benar-benar mengendalikan
 * teks yang dirender pengunjung, untuk kedua bahasa.
 *
 * Unit test di tests/ui-strings-config.test.ts menguji lapisan datanya; test ini
 * memverifikasi utas penuh: (public)/layout.tsx → resolveUIStrings → prop
 * LanguageProvider → merge → useTranslation → DOM. Tanpa ini, overlay bisa saja
 * valid tapi tidak terbaca komponen (mis. prop lupa dilewatkan).
 *
 * File data/local-settings.json dipakai sebagai backend (tidak ada DB di dev);
 * selalu dibersihkan di afterEach agar tidak menempel di test lain.
 */

const SETTINGS_FILE = path.join(process.cwd(), "data", "local-settings.json");

function writeUIStrings(strings: unknown): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const existing = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    : {};
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...existing, ui_strings: strings }), "utf-8");
}

function clearSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
  } catch {
    // abaikan race dengan worker lain
  }
}

/**
 * Viewport MOBILE wajib: di mode desktop (<768px kebalikannya), os-desktop-manager
 * hanya merender section app AKTIF (line ~906: `{activeApp === "kontak" && …}`),
 * jadi #kontak tidak ada di DOM kecuali jendela kontak sedang terbuka. Di mode
 * mobile (<768px) SELURUH section dirender dalam satu dokumen scroll
 * (scrollSections.map, line ~600-644) — #kontak selalu ada.
 */
test.use({ viewport: { width: 375, height: 740 } });

/**
 * Section kontak (id="kontak") selalu ada di DOM mode mobile — textContent
 * bisa dibaca terlepas dari boot overlay 5 detik. ?lang= menentukan bahasa
 * render; cachebust mem-bypass route cache 60 detik (di produksi cache
 * dimurnikan oleh revalidatePath("/", "layout") di saveUIStringsAction).
 */
let urlSeq = 0;
function freshUrl(lang: "id" | "en"): string {
  return `/?lang=${lang}&cachebust=${Date.now()}-${urlSeq++}`;
}

async function contactText(page: import("@playwright/test").Page): Promise<string> {
  const section = page.locator("#kontak");
  await section.waitFor({ state: "attached" });
  return (await section.textContent()) ?? "";
}

test.describe("God Mode: settings.ui_strings mengendalikan teks publik", () => {
  test.afterEach(() => {
    clearSettings();
  });

  test("override ID tampil di section kontak", async ({ page }) => {
    clearSettings();
    writeUIStrings({ id: { contact_title: "Mari Ngobrol God Mode" }, en: {} });
    await page.goto(freshUrl("id"));
    expect(await contactText(page)).toContain("Mari Ngobrol God Mode");
  });

  test("override EN tampil dengan ?lang=en, default tidak dipakai", async ({ page }) => {
    writeUIStrings({ id: {}, en: { contact_title: "God Mode Contact Title" } });
    await page.goto(freshUrl("en"));
    const text = await contactText(page);
    expect(text).toContain("God Mode Contact Title");
    expect(text).not.toContain("Let's Connect & Collaborate"); // default EN
  });

  test("config rusak (key asing, value null, lang asing) diabaikan — default utuh", async ({ page }) => {
    writeUIStrings({
      id: { evil_key: "HACK", contact_title: null },
      fr: { contact_title: "Bonjour" },
    });
    await page.goto(freshUrl("id"));
    // Teks default ID untuk judul kontak adalah "Mari Berdiskusi & Berkolaborasi".
    expect(await contactText(page)).toContain("Mari Berdiskusi & Berkolaborasi");
    expect(await contactText(page)).not.toContain("HACK");
  });
});
