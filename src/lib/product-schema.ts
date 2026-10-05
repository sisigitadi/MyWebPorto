/**
 * Schema.org untuk halaman detail produk — SERVER-ONLY, murni (tanpa I/O)
 * agar bisa diuji penuh tanpa database.
 *
 * Kenapa perlu: halaman `/toko/<slug>` TIDAK pernah memancarkan JSON-LD
 * apa pun (diverifikasi dari HTML produksi — nol `application/ld+json`),
 * padahal artikel dan proyek sudah punya BlogPosting/BreadcrumbList. Akibatnya
 * Google tidak bisa menampilkan kartu produk (nama, harga, ketersediaan) di
 * hasil pencarian maupun di AI Overviews, meski katalog produknya ada.
 *
 * Dua hal yang SENGAJA tidak dilakukan di sini:
 * 1. **aggregateRating/review tidak pernah dikarang.** Data produk tidak punya
 *    rating; memalsukan structured data review melanggar pedoman Google dan
 *    berisiko penalti manual. Kartu produk tetap sah tanpa rating.
 * 2. **BreadcrumbList tidak dibuat** untuk produk karena section "Toko" tidak
 *    punya halaman katalog (`/toko` me-redirect ke anchor `/#produk`), sehingga
 *    URL breadcrumb di tengah tidak bisa di-crawl sebagai URL distinct.
 *    Memasang breadcrumb ke URL non-kanonik lebih buruk daripada tidak punya.
 *
 * Harga: `priceAmount` adalah nominal rupiah mentah (lihat input admin
 * "Nominal Rp (angka, untuk keranjang)"), jadi priceCurrency selalu IDR.
 * Bila nominal kosong ("hubungi saya"), `offers` sengaja DILEWATI — Offer
 * tanpa price tidak memenuhi syarat merchant listing dan lebih baik tidak
 * diklaim sama sekali.
 */

import { absoluteImageUrl } from "@/lib/seo";
import type { ProductData } from "@/lib/dummy-data";

export interface ProductSchemaInput {
  product: ProductData;
  baseUrl: string;
  pageUrl: string;
  /**
   * Brand/penjual yang diklaim. JANGAN memakai `STORE_NAME` ("Toko"):
   * itu label UI yang dilokalkan (EN: "Store"), bukan brand — Google akan
   * membaca brand generik yang juga bertabrakan dengan entitas WebSite
   * "Sigit Web Porto". Nilai ini harus sama dengan nama di schema WebSite.
   */
  brandName: string;
}

/** Nominal rupiah menjadi angka bulat positif, atau null bila tidak bisa diklaim. */
export function normalizePriceAmount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function buildProductSchema({
  product,
  baseUrl,
  pageUrl,
  brandName,
}: ProductSchemaInput): Record<string, unknown> {
  const images = [
    absoluteImageUrl(product.thumbnailUrl, baseUrl),
    ...(product.gallery || []).map((src) => absoluteImageUrl(src, baseUrl)),
  ];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    url: pageUrl,
    // Gallery boleh kosong: schema tetap sah dengan satu gambar (thumbnail).
    image: images.length ? images : undefined,
    sku: product.slug || product.id,
    category: product.category || undefined,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
  };

  const price = normalizePriceAmount(product.priceAmount);
  if (price) {
    schema.offers = {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "IDR",
      price: String(price),
      // stock null atau 0 berarti "hubungi saya" atau habis: jangan klaim
      // produk bisa dibeli.
      availability:
        (product.stock ?? 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: brandName,
      },
    };
  }

  return schema;
}