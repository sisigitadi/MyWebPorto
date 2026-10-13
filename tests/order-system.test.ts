import { describe, it, expect } from "vitest";
import {
  formatIdr,
  formatUsd,
  buildWhatsAppOrderUrl,
  buildFreelanceOpsBriefWhatsAppUrl,
  buildFollowUpPaymentUrl,
  buildFollowUpVerifiedUrl,
  buildFollowUpDeliveryUrl,
  buildFollowUpFreelanceOpsUrl,
  buildFollowUpCompletionUrl,
  buildProductPromoShareText,
  buildMultiPlatformShareUrls,
  parseLegacyBankInfo,
  normalizeBankAccounts,
} from "@/lib/whatsapp-order";

import type { ProductData } from "@/lib/dummy-data";

const sampleProduct: ProductData = {
  id: "prod-1",
  slug: "portfolio-pro",
  title: "Source Code Portfolio Pro",
  titleEn: "Portfolio Pro Source Code",
  description: "Template portfolio modern siap pakai",
  descriptionEn: "Modern portfolio template ready to deploy",
  thumbnailUrl: "/images/prod-1.jpg",
  priceFormatted: "Rp 250.000",
  priceLabelEn: "$19.00",
  priceAmount: 250000,
  ctaUrl: "",
  published: true,
  purchaseType: "whatsapp",
};

const sampleFreelanceProduct: ProductData = {
  id: "prod-2",
  slug: "custom-web-dev",
  title: "Jasa Pembuatan Web & Aplikasi",
  titleEn: "Custom Web & App Development",
  description: "Layanan jasa pembuatan website profesional",
  descriptionEn: "Professional full-stack web development services",
  thumbnailUrl: "/images/prod-2.jpg",
  priceFormatted: "Mulai Rp 3.500.000",
  priceLabelEn: "From $250",
  priceAmount: 3500000,
  published: true,
  purchaseType: "freelanceops",
  ctaUrl: "https://freelanceops.sigitadi.id/",
};


describe("Order System & WhatsApp Builder", () => {
  it("formats IDR and USD correctly", () => {
    expect(formatIdr(250000)).toContain("250.000");
    expect(formatUsd(19)).toContain("$19.00");
  });

  it("builds WhatsApp order URL in Indonesian with referral code", () => {
    const url = buildWhatsAppOrderUrl(
      "081234567890",
      {
        name: "Budi Santoso",
        phone: "081234567890",
        emailOrAddress: "budi@example.com",
        paymentMethod: "qris",
      },
      [{ product: sampleProduct, quantity: 1 }],
      250000,
      "INV-20261013-001",
      "id",
      "IDR",
      "AFFILIATE10"
    );

    expect(url).toContain("https://wa.me/081234567890?text=");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("INV-20261013-001");
    expect(decoded).toContain("Budi Santoso");
    expect(decoded).toContain("AFFILIATE10");
    expect(decoded).toContain("Source Code Portfolio Pro");
    expect(decoded).toContain("PESANAN BARU —");
  });

  it("builds WhatsApp order URL in English with USD currency", () => {
    const url = buildWhatsAppOrderUrl(
      "+6281234567890",
      {
        name: "John Doe",
        phone: "+123456789",
        emailOrAddress: "john@example.com",
        paymentMethod: "paypal",
      },
      [{ product: sampleProduct, quantity: 2 }],
      38,
      "INV-20261013-002",
      "en",
      "USD"
    );

    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("NEW ORDER —");
    expect(decoded).toContain("Portfolio Pro Source Code");
    expect(decoded).toContain("$38.00");
    expect(decoded).toContain("PayPal");
  });


  it("builds FreelanceOps brief WhatsApp URL", () => {
    const url = buildFreelanceOpsBriefWhatsAppUrl(
      "081234567890",
      sampleFreelanceProduct,
      "Klien Tech Indo",
      "id"
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("freelanceops.sigitadi.id");
    expect(decoded).toContain("Jasa Pembuatan Web & Aplikasi");
    expect(decoded).toContain("Klien Tech Indo");
    expect(decoded).not.toContain("—");
  });

  it("builds admin follow-up messages correctly", () => {
    const reminderUrl = buildFollowUpPaymentUrl(
      "081234567890",
      "INV-001",
      "Budi",
      "Rp 250.000",
      "BCA 1234567890"
    );
    const verifiedUrl = buildFollowUpVerifiedUrl("081234567890", "INV-001", "Budi");
    const deliveryUrl = buildFollowUpDeliveryUrl(
      "081234567890",
      "INV-001",
      "Budi",
      "https://sigitadi.id/order/INV-001"
    );
    const freelanceOpsUrl = buildFollowUpFreelanceOpsUrl(
      "081234567890",
      "INV-001",
      "Budi",
      "https://freelanceops.sigitadi.id/projects/123"
    );
    const completionUrl = buildFollowUpCompletionUrl("081234567890", "INV-001", "Budi");

    [reminderUrl, verifiedUrl, deliveryUrl, freelanceOpsUrl, completionUrl].forEach((u) => {
      expect(u).toContain("https://wa.me/081234567890");
      const decoded = decodeURIComponent(u);
      expect(decoded).not.toContain("—"); // R-02
    });
  });

  it("builds promo copy and multi-platform share URLs", () => {
    const promoText = buildProductPromoShareText(
      sampleProduct,
      "https://sigitadi.id/products/portfolio-pro",
      false
    );
    expect(promoText).toContain("Source Code Portfolio Pro");
    expect(promoText).toContain("https://sigitadi.id/products/portfolio-pro");
    expect(promoText).not.toContain("—");

    const shareUrls = buildMultiPlatformShareUrls(
      sampleProduct,
      "https://sigitadi.id/products/portfolio-pro",
      false
    );
    expect(shareUrls.whatsapp).toContain("https://wa.me/?text=");
    expect(shareUrls.telegram).toContain("https://t.me/share/url?url=");
    expect(shareUrls.twitter).toContain("https://twitter.com/intent/tweet?");
    expect(shareUrls.linkedin).toContain("https://www.linkedin.com/sharing/share-offsite/?url=");
    expect(shareUrls.facebook).toContain("https://www.facebook.com/sharer/sharer.php?u=");
  });

  it("parses legacy bank information into structured accounts", () => {
    const legacy = "BCA 1234567890 a.n. Sigit Adi\nMANDIRI 987654321 atas nama Sigit Adi";
    const parsed = parseLegacyBankInfo(legacy);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].bankName).toBe("BCA");
    expect(parsed[0].accountNumber).toBe("1234567890");
    expect(parsed[0].accountHolder).toBe("Sigit Adi");

    expect(parsed[1].bankName).toBe("MANDIRI");
    expect(parsed[1].accountNumber).toBe("987654321");
    expect(parsed[1].accountHolder).toBe("Sigit Adi");
  });

  it("parses colon-delimited bank accounts with trailing global account holder", () => {
    const rawBankInfo =
      "Mandiri: 1550013789089\nBNI    : 5560605660\nBSI    : 2466556060\n\nSigit Adi Irianto";
    const parsed = parseLegacyBankInfo(rawBankInfo);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].bankName).toBe("MANDIRI");
    expect(parsed[0].accountNumber).toBe("1550013789089");
    expect(parsed[0].accountHolder).toBe("Sigit Adi Irianto");

    expect(parsed[1].bankName).toBe("BNI");
    expect(parsed[1].accountNumber).toBe("5560605660");
    expect(parsed[1].accountHolder).toBe("Sigit Adi Irianto");

    expect(parsed[2].bankName).toBe("BSI");
    expect(parsed[2].accountNumber).toBe("2466556060");
    expect(parsed[2].accountHolder).toBe("Sigit Adi Irianto");
  });

  it("normalizes dirty bank accounts from legacy storage", () => {
    const dirty = [
      {
        id: "1",
        bankName: "BANK TRANSFER",
        accountNumber: "Mandiri: 1550013789089",
        accountHolder: "Sigit Adi Irianto",
      },
      {
        id: "2",
        bankName: "bni",
        accountNumber: "5560-605-660",
        accountHolder: "Sigit",
      },
    ];

    const normalized = normalizeBankAccounts(dirty);
    expect(normalized[0].bankName).toBe("MANDIRI");
    expect(normalized[0].accountNumber).toBe("1550013789089");
    expect(normalized[1].bankName).toBe("BNI");
    expect(normalized[1].accountNumber).toBe("5560-605-660");
  });
});
