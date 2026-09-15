import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailContent } from "@/components/public/product-detail-content";
import { getProducts, getProfile } from "@/lib/actions";
import { getProductSlug } from "@/lib/product-link";
import { generateDynamicMetadata, localeAlternates } from "@/lib/seo";
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
  return {
    title: product.title + " \u2014 " + STORE_NAME,
    description: product.description.slice(0, 160),
    alternates: localeAlternates(url),
    openGraph: { title: product.title, description: product.description.slice(0, 160), url, images: [product.thumbnailUrl] },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [products, profile] = await Promise.all([getProducts(), getProfile()]);
  const product = products.find((p) => getProductSlug(p) === slug);
  if (!product) notFound();
  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar">
      <ProductDetailContent product={product} profile={profile} />
    </div>
  );
}
