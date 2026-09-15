import type { ProductData } from "@/lib/dummy-data";

const UNLIMITED_STOCK = 999;

/**
 * Jumlah maksimum suatu produk yang boleh ada di keranjang.
 *
 * `stock` bersifat triple-state dan bug lama menggabungkan dua kasus pertama:
 * - null/undefined → tak terbatas (produk digital tanpa pelacakan stok)
 * - 0 → HABIS. Ini bukan "maks 0": sebelumnya `product.stock ?? 999` menghasilkan
 *   maxStock=0 lalu `Math.min(qty, 0) = 0`, sehingga produk habis tetap masuk
 *   keranjang sebagai baris zombie qty 0 — ter-total 0, tak bisa dinaikkan
 *   (updateQuantity menghapus qty<=0), tersimpan di localStorage, dan ikut
 *   terkirim ke dialog WhatsApp checkout.
 * - negatif → data abnormal, diperlakukan sebagai habis.
 *
 * Murni (tanpa I/O / JSX) agar bisa diuji langsung di tests/cart-stock.test.ts.
 */
export function maxStockFor(product: Pick<ProductData, "stock">): number {
  const stock = product.stock;
  if (stock === null || stock === undefined) return UNLIMITED_STOCK;
  return Math.max(stock, 0);
}

/** true bila produk habis dan tidak boleh dimasukkan ke keranjang. */
export function isOutOfStock(product: Pick<ProductData, "stock">): boolean {
  return maxStockFor(product) === 0;
}
