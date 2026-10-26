import { describe, expect, it } from "vitest";
import { APP_IDS, getAppShareMeta, type AppId } from "@/lib/os-apps-meta";
import { buildProductPromoShareText } from "@/lib/whatsapp-order";
import type { ProductData } from "@/lib/dummy-data";

describe("getAppShareMeta", () => {
  const targetSections: AppId[] = [
    "layanan",
    "proyek",
    "toko",
    "artikel",
    "terminal",
    "testimoni",
    "kontak",
  ];

  it("menyediakan metadata share untuk seluruh 7 section yang diminta", () => {
    for (const section of targetSections) {
      const metaId = getAppShareMeta(section, "id", "Sigit Adi Irianto");
      expect(metaId.title).toBeTruthy();
      expect(metaId.url).toBeTruthy();
      expect(metaId.summary).toBeTruthy();
      expect(metaId.badge).toBeTruthy();

      // Deskripsi komplit tidak terpotong (tidak berakhiran '...' dan tidak dipotong paksa)
      expect(metaId.summary).not.toContain("...");
      expect(metaId.summary.length).toBeGreaterThan(40);

      // Bahasa Inggris juga lengkap
      const metaEn = getAppShareMeta(section, "en", "Sigit Adi Irianto");
      expect(metaEn.title).toBeTruthy();
      expect(metaEn.url).toBeTruthy();
      expect(metaEn.summary).toBeTruthy();
      expect(metaEn.summary).not.toContain("...");
      expect(metaEn.summary.length).toBeGreaterThan(40);
    }
  });

  it("menyediakan metadata share untuk seluruh 8 app SigitOS termasuk profil", () => {
    for (const appId of APP_IDS) {
      const meta = getAppShareMeta(appId, "id");
      expect(meta.title).toContain("Sigit Adi Irianto");
      expect(meta.summary.length).toBeGreaterThan(30);
    }
  });

  it("deskripsi bahasa Indonesia tidak mengandung em dash", () => {
    for (const appId of APP_IDS) {
      const meta = getAppShareMeta(appId, "id");
      expect(meta.summary).not.toContain("—");
    }
  });

  it("seluruh share URL bersih tanpa tanda pagar (#) untuk copas siap kirim", () => {
    for (const appId of APP_IDS) {
      const meta = getAppShareMeta(appId, "id");
      expect(meta.url).not.toContain("#");
      expect(meta.url.startsWith("/") || meta.url.startsWith("http")).toBe(true);
    }
  });

  it("profil menyertakan headline terbaru Artificial Intelligence | Cybersecurity", () => {
    const meta = getAppShareMeta("profil", "id");
    expect(meta.title).toContain("Artificial Intelligence | Cybersecurity");
  });
});

describe("buildProductPromoShareText — deskripsi komplit tanpa slice", () => {
  const sampleProduct: ProductData = {
    id: "prod-long",
    title: "SaaS Starter Kit Next.js Modern",
    titleEn: "Modern Next.js SaaS Starter Kit",
    description:
      "Boilerplate lengkap dengan autentikasi Clerk, pembayaran Midtrans, database Drizzle ORM PostgreSQL, panel admin terintegrasi, dan antarmuka responsif ramah pengguna untuk peluncuran produk digital super cepat.",
    priceFormatted: "Rp 299.000",
    priceAmount: 299000,
    thumbnailUrl: "/thumb.png",
    ctaUrl: "",
    published: true,
  } as ProductData;

  it("tidak memotong deskripsi panjang dengan slice(0, 140) atau tanda titik tiga", () => {
    const text = buildProductPromoShareText(sampleProduct, "https://sigitadi.id/toko/saas-starter");
    expect(text).toContain(sampleProduct.description);
    expect(text).not.toContain("...");
    expect(text).toContain("**SaaS Starter Kit Next.js Modern**");
    expect(text).toContain("Harga: Rp 299.000");
    expect(text).toContain("https://sigitadi.id/toko/saas-starter");
  });
});
