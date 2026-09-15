/**
 * Builder pesan order WhatsApp — modul .ts murni (tanpa JSX) agar bisa diuji
 * langsung dengan vitest, seperti @/lib/cart-stock. Lihat alasan pemisahan
 * di cart-context.tsx.
 *
 * Pesan dilokalkan: pengunjung EN mendapat teks EN, pengunjung ID teks ID.
 * Sebelumnya pesan selalu Bahasa Indonesia meski UI sedang EN, dan field
 * kosong (nama/no HP/alamat) tetap dikirim sebagai baris kosong.
 */
import type { ProductData } from "@/lib/dummy-data";
import { storeName } from "@/lib/store";

export type OrderLang = "id" | "en";

export interface CustomerOrderInfo {
  name: string;
  phone: string;
  emailOrAddress: string;
  notes?: string;
  paymentMethod: "qris" | "bank" | "wa_direct";
}

/** Format currency IDR. */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Judul produk sesuai bahasa (fallback ke judul ID bila tak ada terjemahan). */
function productTitle(product: ProductData, isEn: boolean): string {
  return isEn && product.titleEn ? product.titleEn : product.title;
}

/**
 * Generate pre-filled WhatsApp Checkout URL.
 * Mengembalikan string kosong bila nomor admin belum diatur — pemanggil
 * wajib menahan submit daripada mengirim order ke nomor placeholder.
 */
export function buildWhatsAppOrderUrl(
  phone: string | undefined,
  customer: CustomerOrderInfo,
  items: Array<{ product: ProductData; quantity: number }>,
  totalAmount: number,
  invoiceNo?: string,
  lang: OrderLang = "id"
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = phone.replace(/\D/g, "");
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
      : isEn
      ? "Confirm via WhatsApp"
      : "Konfirmasi via WhatsApp";

  // Baris kosong difilter di akhir — sekalian membuang field pelanggan yang
  // tidak diisi, jadi pesan tidak berisi "• Nama: " yang kosong.
  const lines = [
    isEn ? `*NEW ORDER — ${store} [${inv}]*` : `*PESANAN BARU — ${store} [${inv}]*`,
    isEn
      ? "Hi, I'd like to order the following products:"
      : "Halo, saya ingin melakukan pemesanan produk:",
    "",
    isEn ? "*Products:*" : "*Daftar Produk:*",
    ...items.map((item, idx) => {
      const priceStr = item.product.priceAmount
        ? formatIdr(item.product.priceAmount * item.quantity)
        : item.product.priceFormatted;
      return `${idx + 1}. *${productTitle(item.product, isEn)}* x${item.quantity} (${priceStr})`;
    }),
    "",
    totalAmount > 0
      ? isEn
        ? `*Total Amount:* ${formatIdr(totalAmount)}`
        : `*Total Pembayaran:* ${formatIdr(totalAmount)}`
      : isEn
      ? "*Total:* As quoted"
      : "*Total:* Sesuai Penawaran",
    isEn ? `*Payment Method:* ${paymentLabel}` : `*Metode Pembayaran:* ${paymentLabel}`,
    "",
    isEn ? "*Customer Info:*" : "*Informasi Pemesan:*",
    customer.name ? `${isEn ? "• Name" : "• Nama"}: ${customer.name}` : "",
    customer.phone
      ? `${isEn ? "• Phone / WA" : "• No. WA / Telp"}: ${customer.phone}`
      : "",
    customer.emailOrAddress
      ? `${isEn ? "• Address / Email" : "• Alamat / Email"}: ${customer.emailOrAddress}`
      : "",
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
 * Mengembalikan string kosong bila nomor admin belum diatur.
 */
export function buildSingleProductWhatsAppUrl(
  phone: string | undefined,
  product: ProductData,
  lang: OrderLang = "id"
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = phone.replace(/\D/g, "");
  const isEn = lang === "en";
  const price = product.priceFormatted || (isEn ? "Free / Consult" : "Gratis / Diskusi");
  const text = [
    isEn
      ? `Hi, I'm interested in a product from ${storeName(isEn)}:`
      : `Halo, saya tertarik untuk memesan produk di ${storeName(isEn)}:`,
    `*${productTitle(product, isEn)}* (${price})`,
    "",
    isEn
      ? "Is this still available? Please send me the payment details. Thank you!"
      : "Apakah produk ini masih tersedia? Mohon info detail pembayarannya. Terima kasih!",
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
