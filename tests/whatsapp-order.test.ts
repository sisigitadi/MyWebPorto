import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderUrl,
  buildSingleProductWhatsAppUrl,
  formatIdr,
  type CustomerOrderInfo,
} from "@/lib/whatsapp-order";
import type { ProductData } from "@/lib/dummy-data";

function makeProduct(over: Partial<ProductData> = {}): ProductData {
  // Partial<ProductData> memperbolehkan field wajib (ctaUrl dll.) undefined,
  // jadi base diisi lengkap dan hasilnya dilempar ke ProductData.
  return {
    id: "prod-1",
    title: "Template Portofolio",
    titleEn: "Portfolio Template",
    description: "Deskripsi",
    priceFormatted: "Rp 150.000",
    priceAmount: 150000,
    thumbnailUrl: "/thumb.png",
    ctaUrl: "",
    published: true,
    ...over,
  } as ProductData;
}

const fullCustomer: CustomerOrderInfo = {
  name: "Sigit",
  phone: "08123456789",
  emailOrAddress: "Jl. Contoh No. 1",
  notes: "Pakai warna gelap",
  paymentMethod: "qris",
};

describe("formatIdr", () => {
  it("memformat angka menjadi currency IDR tanpa desimal", () => {
    // ICU memisahkan "Rp" dan angka dengan no-break space (U+00A0) — jadi
    // pembanding dibangun dari formatIdr sendiri, bukan di-hardcode "Rp 150.000".
    expect(formatIdr(150000)).toBe(`Rp 150.000`);
    expect(formatIdr(0)).toBe(`Rp 0`);
  });
});

describe("buildWhatsAppOrderUrl — baris kosong & nomor", () => {
  it("mengembalikan string kosong bila nomor admin belum diatur", () => {
    // Pemanggil wajib menahan submit; tidak boleh ada order ke nomor placeholder.
    expect(buildWhatsAppOrderUrl(undefined, fullCustomer, [], 0)).toBe("");
    expect(buildWhatsAppOrderUrl("   ", fullCustomer, [], 0)).toBe("");
    expect(buildSingleProductWhatsAppUrl(undefined, makeProduct())).toBe("");
  });

  it("menyertakan hanya nomor dan URL wa.me yang di-encode", () => {
    const url = buildWhatsAppOrderUrl("+62 812-3456-7890", fullCustomer, [], 0);
    expect(url.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
  });

  it("membuang field pelanggan yang tidak diisi (tidak ada baris '• Nama: ' kosong)", () => {
    // Sebelumnya field kosong tetap dikirim sebagai baris berlabel kosong,
    // terlihat seperti data hilang di sisi penerima.
    const url = buildWhatsAppOrderUrl("6281234567890", { ...fullCustomer, name: "", emailOrAddress: "" }, [], 0);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).not.toMatch(/• Nama:/);
    expect(text).not.toMatch(/• Alamat \/ Email:/);
    expect(text).toMatch(/• No\. WA \/ Telp: 08123456789/);
  });
});

describe("buildWhatsAppOrderUrl — lokalisasi ID/EN", () => {
  const items = [{ product: makeProduct(), quantity: 2 }];

  it("default Bahasa Indonesia", () => {
    const url = buildWhatsAppOrderUrl("6281234567890", fullCustomer, items, 300000, "INV-123");
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("PESANAN BARU — TOKO [INV-123]");
    expect(text).toContain("Daftar Produk:");
    expect(text).toContain("Template Portofolio"); // judul ID
    expect(text).toContain(`Total Pembayaran:* ${formatIdr(300000)}`);
    expect(text).toContain("Mohon info instruksi selanjutnya. Terima kasih!");
  });

  it("Bahasa Inggris saat lang en", () => {
    const url = buildWhatsAppOrderUrl("6281234567890", fullCustomer, items, 300000, "INV-123", "en");
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("NEW ORDER — STORE [INV-123]");
    expect(text).toContain("Products:");
    expect(text).toContain("Portfolio Template"); // judul EN
    expect(text).not.toContain("Template Portofolio");
    expect(text).toContain(`Total Amount:* ${formatIdr(300000)}`);
    expect(text).toContain("Customer Info:");
    expect(text).toContain("Please let me know the next steps. Thank you!");
  });

  it("label metode pembayaran ikut bahasa", () => {
    const id = buildWhatsAppOrderUrl(
      "6281234567890",
      { ...fullCustomer, paymentMethod: "bank" },
      [],
      0,
      "INV-1",
      "id"
    );
    expect(decodeURIComponent(id.split("text=")[1])).toContain("Transfer Bank Manual");

    const en = buildWhatsAppOrderUrl(
      "6281234567890",
      { ...fullCustomer, paymentMethod: "bank" },
      [],
      0,
      "INV-1",
      "en"
    );
    expect(decodeURIComponent(en.split("text=")[1])).toContain("Manual Bank Transfer");
  });

  it("total 0 ditandai 'sesuai penawaran' bukan Rp 0", () => {
    const id = buildWhatsAppOrderUrl("6281234567890", fullCustomer, [], 0, "INV-1");
    expect(decodeURIComponent(id.split("text=")[1])).toContain("Sesuai Penawaran");

    const en = buildWhatsAppOrderUrl("6281234567890", fullCustomer, [], 0, "INV-1", "en");
    expect(decodeURIComponent(en.split("text=")[1])).toContain("As quoted");
  });

  it("membuat nomor invoice sendiri bila tidak diberikan", () => {
    const url = buildWhatsAppOrderUrl("6281234567890", fullCustomer, [], 0);
    expect(decodeURIComponent(url.split("text=")[1])).toMatch(/\[ORD-\d+\]/);
  });
});

describe("buildSingleProductWhatsAppUrl", () => {
  it("ID: pesan singkat satu produk", () => {
    const url = buildSingleProductWhatsAppUrl("6281234567890", makeProduct());
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("Toko");
    expect(text).toContain("*Template Portofolio* (Rp 150.000)");
    expect(text).toContain("Apakah produk ini masih tersedia?");
  });

  it("EN: memakai titleEn dan teks Inggris", () => {
    const url = buildSingleProductWhatsAppUrl("6281234567890", makeProduct(), "en");
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("Store");
    expect(text).toContain("*Portfolio Template*");
    expect(text).toContain("Is this still available?");
  });

  it("fallback ke judul ID bila titleEn tidak ada", () => {
    const url = buildSingleProductWhatsAppUrl("6281234567890", makeProduct({ titleEn: undefined }), "en");
    expect(decodeURIComponent(url.split("text=")[1])).toContain("*Template Portofolio*");
  });

  it("harga 'gratis/diskusi' bila tidak ada harga", () => {
    const id = buildSingleProductWhatsAppUrl("6281234567890", makeProduct({ priceFormatted: "" }));
    expect(decodeURIComponent(id.split("text=")[1])).toContain("Gratis / Diskusi");

    const en = buildSingleProductWhatsAppUrl("6281234567890", makeProduct({ priceFormatted: "" }), "en");
    expect(decodeURIComponent(en.split("text=")[1])).toContain("Free / Consult");
  });
});
