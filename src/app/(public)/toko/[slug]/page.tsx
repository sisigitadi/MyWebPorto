import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailContent } from "@/components/public/product-detail-content";
import { getProducts, getProfile } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { getProductSlug } from "@/lib/product-link";
import { buildProductSchema } from "@/lib/product-schema";
import { generateDynamicMetadata, localeAlternates, shareImage } from "@/lib/seo";
import { SITE_BRAND } from "@/lib/seo-config";
import { STORE_NAME } from "@/lib/store";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  const products = await getProducts();
  const product = products.find((p) => getProductSlug(p) === slug);
  // Sebelumnya halaman produk tidak mendefinisikan alternates, sehingga
  // kanonikal & hreflang-nya diambil dari layout = URL root (salah untuk
  // produk). Kembalikan ke URL produk yang sebenarnya.
  if (!product) return generateDynamicMetadata();
  const url = `${baseUrl}/toko/${slug}`;
  const description = product.description.slice(0, 160);
  // og & twitter WAJIB didefinisikan berdua: keduanya meng-*replace* seluruh
  // objek sejenis di layout. Sebelumnya halaman ini hanya mengisi openGraph —
  // akibatnya twitter:image mewarisi kartu /opengraph-image (beda dari og:image)
  // dan twitter:title mewarisi judul profil, bukan judul produk.
  const image = shareImage(product.thumbnailUrl, baseUrl, product.title);
  return {
    title: product.title + " \u2014 " + STORE_NAME,
    description,
    alternates: localeAlternates(url),
    openGraph: {
      title: product.title,
      description,
      url,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [image.url],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [products, profile] = await Promise.all([getProducts(), getProfile()]);
  const product = products.find((p) => getProductSlug(p) === slug);
  if (!product) notFound();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
  // Structured data produk: tanpa ini halaman ini nol JSON-LD sehingga Google
  // tidak bisa menampilkan kartu produk (nama/harga/stok) di hasil pencarian.
  const productSchema = buildProductSchema({
    product,
    baseUrl,
    pageUrl: `${baseUrl}/toko/${slug}`,
    brandName: SITE_BRAND,
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
      />
      <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar">
        <ProductDetailContent product={product} profile={profile} />
      </div>
    </>
  );
}
