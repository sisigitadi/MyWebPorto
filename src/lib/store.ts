/**
 * Identitas toko digital — dipisah dari nama pemilik agar branding toko
 * berdiri sendiri. Satu sumber kebenaran: ganti di sini, semua titik
 * (UI katalog, cart, checkout, pesan WhatsApp, metadata) mengikuti.
 *
 * Nama toko dilokalkan: "Toko" untuk pengunjung Bahasa Indonesia dan
 * "Store" untuk pengunjung English. Pesan WhatsApp (@/lib/whatsapp-order)
 * sudah dilokalkan juga — ia memanggil storeName(isEn), bukan STORE_NAME
 * mentah.
 */
export const STORE_NAME = "Toko";
export const STORE_NAME_EN = "Store";

/** Nama toko sesuai bahasa aktif. */
export function storeName(isEn?: boolean | null): string {
  return isEn ? STORE_NAME_EN : STORE_NAME;
}

/**
 * Label platform yang ramah dari URL toko eksternal produk.
 * Admin cukup mengisi link (ctaUrl); label mengikuti domain link tersebut:
 *   https://gumroad.com/l/xyz  -> "Gumroad"
 *   https://lynk.id/sigit      -> "Lynk"
 * Tanpa nama platform yang di-hardcode di UI.
 */
export function platformLabelFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const base = host.split(".")[0];
    if (!base) return null;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return null;
  }
}

/** True bila URL adalah link toko eksternal yang sah (bukan anchor internal). */
export function isExternalStoreUrl(url: string | null | undefined): url is string {
  return Boolean(url && url !== "#kontak" && /^https?:\/\//i.test(url));
}
