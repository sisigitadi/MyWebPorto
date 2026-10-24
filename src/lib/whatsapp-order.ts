/**
 * Builder pesan order WhatsApp dan share kit promosi multi-platform.
 * Modul .ts murni (tanpa JSX) agar mudah diuji dengan Vitest.
 * Mematuhi aturan antislop (bebas karakter em dash, ramah pembeli lokal & global).
 */
import type { ProductData } from "@/lib/dummy-data";
import { storeName } from "@/lib/store";

export type OrderLang = "id" | "en";

export interface CustomerOrderInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  emailOrAddress?: string;
  notes?: string;
  paymentMethod: "qris" | "bank" | "wa_direct" | "paypal" | "wise" | "freelanceops";
}

/** Format currency IDR. */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format currency USD. */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Judul produk sesuai bahasa (fallback ke judul ID bila tak ada terjemahan). */
export function productTitle(product: ProductData, isEn: boolean): string {
  return isEn && product.titleEn ? product.titleEn : product.title;
}

/**
 * Normalisasi nomor telepon ke format internasional WhatsApp (wa.me).
 * Mengonversi awalan lokal '0' (mis. 0812...) menjadi '628...'.
 */
export function normalizeWhatsAppPhone(phone: string | undefined): string {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

/**
 * Generate pre-filled WhatsApp Checkout URL.
 * Mengembalikan string kosong bila nomor admin belum diatur.
 */
export function buildWhatsAppOrderUrl(
  phone: string | undefined,
  customer: CustomerOrderInfo,
  items: Array<{ product: ProductData; quantity: number }>,
  totalAmount: number,
  invoiceNo?: string,
  lang: OrderLang = "id",
  currency: "IDR" | "USD" = "IDR",
  referralCode?: string
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const isEn = lang === "en";
  const inv = invoiceNo || `ORD-${Date.now().toString().slice(-6)}`;
  const store = storeName(isEn).toUpperCase();

  const paymentLabel =
    customer.paymentMethod === "qris"
      ? "QRIS (Scan Barcode)"
      : customer.paymentMethod === "bank"
      ? isEn
        ? "Manual Bank Transfer"
        : "Transfer Bank Manual"
      : customer.paymentMethod === "paypal"
      ? "PayPal / International Card"
      : customer.paymentMethod === "wise"
      ? "Wise Transfer"
      : customer.paymentMethod === "freelanceops"
      ? "FreelanceOps Project Brief"
      : isEn
      ? "Direct WhatsApp Confirmation"
      : "Konfirmasi via WhatsApp";

  const formattedTotal =
    currency === "USD" ? formatUsd(totalAmount) : formatIdr(totalAmount);

  const lines = [
    isEn ? `*NEW ORDER: ${store} [${inv}]*` : `*PESANAN BARU: ${store} [${inv}]*`,
    isEn
      ? "Hi, I would like to place an order for the following items:"
      : "Halo, saya ingin melakukan pemesanan produk:",
    "",
    isEn ? "*Products:*" : "*Daftar Produk:*",
    ...items.map((item, idx) => {
      const priceStr =
        currency === "USD"
          ? item.product.priceLabelEn || formatUsd(item.product.priceAmount || 0)
          : item.product.priceAmount
          ? formatIdr(item.product.priceAmount * item.quantity)
          : item.product.priceFormatted;
      return `${idx + 1}. *${productTitle(item.product, isEn)}* x${item.quantity} (${priceStr})`;
    }),
    "",
    totalAmount > 0
      ? isEn
        ? `*Total Amount:* ${formattedTotal}`
        : `*Total Pembayaran:* ${formattedTotal}`
      : isEn
      ? "*Total:* As quoted"
      : "*Total:* Sesuai Penawaran / Diskusi",
    isEn ? `*Payment Method:* ${paymentLabel}` : `*Metode Pembayaran:* ${paymentLabel}`,
    referralCode ? (isEn ? `*Referral Code:* ${referralCode}` : `*Kode Referral:* ${referralCode}`) : "",
    "",
    isEn ? "*Customer Info:*" : "*Informasi Pemesan:*",
    customer.name ? `${isEn ? "• Name" : "• Nama"}: ${customer.name}` : "",
    customer.phone
      ? `${isEn ? "• Phone / WA" : "• No. WA / Telp"}: ${customer.phone}`
      : "",
    customer.email
      ? `• Email: ${customer.email}`
      : customer.emailOrAddress
      ? `${isEn ? "• Address / Email" : "• Alamat / Email"}: ${customer.emailOrAddress}`
      : "",
    customer.address ? `${isEn ? "• Address" : "• Alamat"}: ${customer.address}` : "",
    customer.notes ? `${isEn ? "• Notes" : "• Catatan"}: ${customer.notes}` : "",
    "",
    isEn
      ? "Please let me know the next steps. Thank you!"
      : "Mohon info instruksi selanjutnya. Terima kasih!",
  ].filter(Boolean);

  const text = lines.join("\n");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate instant single-product WhatsApp Order URL.
 */
export function buildSingleProductWhatsAppUrl(
  phone: string | undefined,
  product: ProductData,
  lang: OrderLang = "id"
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const isEn = lang === "en";
  const price = isEn
    ? product.priceLabelEn || product.priceFormatted || "Free / Consult"
    : product.priceFormatted || "Gratis / Diskusi";

  const text = [
    isEn
      ? `Hi, I am interested in ordering this product from ${storeName(isEn)}:`
      : `Halo, saya tertarik untuk memesan produk di ${storeName(isEn)}:`,
    `*${productTitle(product, isEn)}* (${price})`,
    "",
    isEn
      ? "Is this still available? Please share the payment or access details. Thank you!"
      : "Apakah produk ini masih tersedia? Mohon info detail pembayaran dan aksesnya. Terima kasih!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}


/**
 * Generate WhatsApp URL untuk brief jasa proyek / integrasi FreelanceOps.
 */
export function buildFreelanceOpsBriefWhatsAppUrl(
  phone: string | undefined,
  product: ProductData,
  customerName?: string,
  lang: OrderLang = "id"
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const isEn = lang === "en";

  const text = [
    isEn
      ? `Hi Sigit, I would like to discuss a project request regarding *${productTitle(product, isEn)}*:`
      : `Halo Sigit, saya ingin berkonsultasi mengenai kebutuhan proyek *${productTitle(product, isEn)}*:`,
    customerName ? (isEn ? `• Client Name: ${customerName}` : `• Nama Klien: ${customerName}`) : "",
    isEn
      ? "• Platform Workspace: FreelanceOps (https://freelanceops.sigitadi.id/)"
      : "• Platform Ruang Kerja: FreelanceOps (https://freelanceops.sigitadi.id/)",
    "",
    isEn
      ? "Could you please advise on your current availability and estimate? Thank you!"
      : "Bisa tolong informasikan estimasi waktu dan langkah diskusi teknis selanjutnya? Terima kasih!",
  ].filter(Boolean).join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// ==========================================
// ADMIN FOLLOW-UP WHATSAPP BUILDERS
// ==========================================

export function buildFollowUpPaymentUrl(
  customerPhone: string,
  invoiceNumber: string,
  customerName: string,
  totalFormatted: string,
  bankDetails?: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(customerPhone);
  const text = [
    `Halo kak ${customerName || "Pelanggan"}, terima kasih atas pemesanan di toko kami.`,
    `Invoice: *${invoiceNumber}*`,
    `Total Tagihan: *${totalFormatted}*`,
    "",
    bankDetails ? `Silakan melakukan transfer ke:\n${bankDetails}` : "Silakan konfirmasi bukti transfer QRIS / Bank Anda ke chat ini.",
    "",
    "Setelah transfer, mohon kirimkan bukti pembayaran agar pesanan dapat segera kami proses. Terima kasih!",
  ].filter(Boolean).join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildFollowUpVerifiedUrl(
  customerPhone: string,
  invoiceNumber: string,
  customerName: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(customerPhone);
  const text = [
    `Halo kak ${customerName || "Pelanggan"}, pembayaran untuk pesanan *${invoiceNumber}* telah berhasil kami verifikasi!`,
    "",
    "Pesanan Anda saat ini sedang kami siapkan / kirimkan aksesnya.",
    "Kami akan segera mengirimkan tautan akses / detail produk Anda dalam beberapa saat. Terima kasih atas kepercayaannya!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildFollowUpDeliveryUrl(
  customerPhone: string,
  invoiceNumber: string,
  customerName: string,
  accessOrDownloadLink: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(customerPhone);
  const text = [
    `Halo kak ${customerName || "Pelanggan"}, pesanan Anda [${invoiceNumber}] telah selesai diproses!`,
    "",
    `Berikut adalah tautan akses / unduhan produk digital Anda:`,
    `${accessOrDownloadLink || "Silakan cek halaman invoice Anda di website."}`,
    "",
    "Jika ada kendala akses atau pertanyaan teknis, jangan ragu untuk menghubungi kami di chat ini. Selamat berkarya!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildFollowUpFreelanceOpsUrl(
  customerPhone: string,
  invoiceNumber: string,
  customerName: string,
  projectUrl: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(customerPhone);
  const text = [
    `Halo kak ${customerName || "Klien"}, terima kasih telah mempercayakan proyek Anda [${invoiceNumber}].`,
    "",
    `Ruang kerja proyek Anda di FreelanceOps telah disiapkan:`,
    `${projectUrl || "https://freelanceops.sigitadi.id/"}`,
    "",
    "Silakan klik tautan di atas untuk meninjau brief kebutuhan, milestone pengerjaan, dan berdiskusi secara langsung. Terima kasih!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildFollowUpCompletionUrl(
  customerPhone: string,
  invoiceNumber: string,
  customerName: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(customerPhone);
  const text = [
    `Halo kak ${customerName || "Pelanggan"}, pesanan Anda [${invoiceNumber}] telah resmi diselesaikan.`,
    "",
    "Terima kasih banyak telah berbelanja di toko kami! Jika Anda puas dengan produk atau layanan ini, kami akan sangat berterima kasih bila Anda bersedia memberikan ulasan singkat.",
    "Sampai jumpa di pemesanan berikutnya!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// ==========================================
// PROMOTION & SHARE KIT BUILDERS
// ==========================================

export function buildProductPromoShareText(
  product: ProductData,
  productUrl: string,
  isEn: boolean = false
): string {
  const title = productTitle(product, isEn);
  const price = isEn
    ? product.priceLabelEn || product.priceFormatted || "Special Offer"
    : product.priceFormatted || "Penawaran Spesial";
  const rawDesc = isEn && product.descriptionEn ? product.descriptionEn : product.description;
  const desc = rawDesc ? rawDesc.trim() : "";

  if (isEn) {
    return [
      `**${title}**`,
      desc,
      `Price: ${price}`,
      productUrl,
    ].filter(Boolean).join("\n\n");
  }

  return [
    `**${title}**`,
    desc,
    `Harga: ${price}`,
    productUrl,
  ].filter(Boolean).join("\n\n");
}

export function buildWhatsAppPromoShareUrl(
  product: ProductData,
  productUrl: string,
  isEn: boolean = false
): string {
  const text = buildProductPromoShareText(product, productUrl, isEn);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildTelegramShareUrl(productUrl: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
}

export function buildTwitterShareUrl(productUrl: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(productUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`;
}

export function buildFacebookShareUrl(productUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
}

export function buildMultiPlatformShareUrls(
  product: ProductData,
  productUrl: string,
  isEn: boolean = false
) {
  const text = buildProductPromoShareText(product, productUrl, isEn);
  return {
    whatsapp: buildWhatsAppPromoShareUrl(product, productUrl, isEn),
    telegram: buildTelegramShareUrl(productUrl, text),
    twitter: buildTwitterShareUrl(productUrl, text),
    linkedin: buildLinkedInShareUrl(productUrl),
    facebook: buildFacebookShareUrl(productUrl),
  };
}

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Normalisasi item rekening bank agar nama bank kapital,
 * dan nomor rekening bersih dari prefix teks atau format bising.
 * Secara default isActive bernilai true jika belum ditentukan.
 */
export function normalizeBankAccounts(items: BankAccountItem[]): BankAccountItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((acc, idx) => {
    let bankName = (acc.bankName || "BANK").trim();
    let accountNumber = (acc.accountNumber || "").trim();
    const accountHolder = (acc.accountHolder || "").trim();
    const notes = (acc.notes || "").trim();

    // Jika accountNumber mengandung prefix bank dan titik dua (misal: "Mandiri: 1550013789089")
    if (accountNumber.includes(":")) {
      const parts = accountNumber.split(":");
      if (parts[0] && (bankName === "BANK TRANSFER" || bankName === "BANK" || !bankName)) {
        bankName = parts[0].trim().toUpperCase();
      }
      accountNumber = parts.slice(1).join(":").trim();
    }

    const cleanNumber = accountNumber.replace(/[^\d\-]/g, "").trim();

    return {
      id: acc.id || `bank-${idx + 1}`,
      bankName: bankName.toUpperCase(),
      accountNumber: cleanNumber || accountNumber,
      accountHolder,
      notes: notes || undefined,
      isActive: acc.isActive !== false,
    };
  });
}

/**
 * Parsing string informasi rekening dari profil/admin:
 * Mendukung format:
 * 1. "Mandiri: 1550013789089\nBNI: 5560605660\n\nSigit Adi Irianto" (titik dua & nama global)
 * 2. "BCA 1234567890 a.n. Sigit Adi"
 * 3. "BSI 2466556060 atas nama Sigit Adi"
 */
export function parseLegacyBankInfo(text: string | null | undefined): BankAccountItem[] {
  if (!text || !text.trim()) return [];
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Deteksi nama pemilik rekening global di baris terakhir jika tidak memuat angka
  let globalHolder = "";
  const lastLine = rawLines[rawLines.length - 1];
  if (rawLines.length > 1 && !/\d/.test(lastLine)) {
    globalHolder = lastLine.replace(/^(?:a\.?n\.?|atas\s+nama)\s+/i, "").trim();
  }

  const accountLines = globalHolder ? rawLines.slice(0, -1) : rawLines;

  const items = accountLines.map((line, idx) => {
    // Coba format dengan titik dua / tanda hubung: [BANK] [: -] [NO REK] [a.n. NAMA]?
    const colonMatch = line.match(/^([A-Za-z0-9\s]+?)\s*[:\-]\s*([0-9\-\.\s]+)(?:\s+(?:a\.?n\.?|atas\s+nama)\s+(.+))?$/i);
    if (colonMatch) {
      return {
        id: `legacy-${idx + 1}`,
        bankName: colonMatch[1]?.trim().toUpperCase() || "BANK",
        accountNumber: colonMatch[2]?.replace(/[^\d\-]/g, "").trim() || "",
        accountHolder: (colonMatch[3] || globalHolder).trim(),
        isActive: true,
      };
    }

    // Format spasi: [BANK] [NO REK] a.n. [NAMA]
    const spaceMatch = line.match(/^([A-Za-z0-9]+)\s+([0-9\-\.\s]+?)(?:\s+(?:a\.?n\.?|atas\s+nama)\s+(.+))?$/i);
    if (spaceMatch) {
      return {
        id: `legacy-${idx + 1}`,
        bankName: spaceMatch[1]?.trim().toUpperCase() || "BANK",
        accountNumber: spaceMatch[2]?.replace(/[^\d\-]/g, "").trim() || "",
        accountHolder: (spaceMatch[3] || globalHolder).trim(),
        isActive: true,
      };
    }

    // Ekstrak angka jika ada format bebas
    const numberMatch = line.match(/([0-9\-\.]{5,})/);
    const bankWordMatch = line.match(/^([A-Za-z]+)/);
    return {
      id: `legacy-${idx + 1}`,
      bankName: bankWordMatch ? bankWordMatch[1].toUpperCase() : "BANK TRANSFER",
      accountNumber: numberMatch ? numberMatch[1].replace(/[^\d\-]/g, "") : line,
      accountHolder: globalHolder || "",
      isActive: true,
    };
  });

  return items.filter((acc) => acc.accountNumber && acc.accountNumber.length >= 3);
}


