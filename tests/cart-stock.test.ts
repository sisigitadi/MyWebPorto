import { describe, expect, it } from "vitest";
import { maxStockFor, isOutOfStock } from "@/lib/cart-stock";
import type { ProductData } from "@/lib/dummy-data";

function productWithStock(stock: ProductData["stock"]): Pick<ProductData, "stock"> {
  return { stock };
}

describe("maxStockFor", () => {
  it("memperlakukan null/undefined sebagai stok tak terbatas", () => {
    expect(maxStockFor(productWithStock(null))).toBe(999);
    expect(maxStockFor(productWithStock(undefined))).toBe(999);
  });

  it("mengembalikan jumlah stok nyata", () => {
    expect(maxStockFor(productWithStock(5))).toBe(5);
    expect(maxStockFor(productWithStock(1))).toBe(1);
  });

  // Regresi inti audit #11: stock 0 berarti HABIS, bukan "maks 0".
  // Sebelumnya `product.stock ?? 999` -> maxStock 0 -> Math.min(qty, 0) = 0
  // -> baris keranjang zombie dengan qty 0.
  it("mengembalikan 0 untuk produk habis (stock === 0)", () => {
    expect(maxStockFor(productWithStock(0))).toBe(0);
  });

  it("meng-clamp stok negatif (data abnormal) menjadi 0", () => {
    expect(maxStockFor(productWithStock(-3))).toBe(0);
  });
});

describe("isOutOfStock", () => {
  it("true hanya bila stok habis", () => {
    expect(isOutOfStock(productWithStock(0))).toBe(true);
    expect(isOutOfStock(productWithStock(-1))).toBe(true);
  });

  it("false bila stok tersisa atau tidak dilacak", () => {
    expect(isOutOfStock(productWithStock(1))).toBe(false);
    expect(isOutOfStock(productWithStock(42))).toBe(false);
    expect(isOutOfStock(productWithStock(null))).toBe(false);
    expect(isOutOfStock(productWithStock(undefined))).toBe(false);
  });
});
