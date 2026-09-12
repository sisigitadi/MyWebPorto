import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/actions";
import { getProductSlug } from "@/lib/product-link";
import { ProductDetailContent } from "@/components/public/product-detail-content";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.filter((product) => product.published).map((product) => ({ slug: getProductSlug(product) }));
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";
  const products = await getProducts();
  const product = products.find((item) => item.published && getProductSlug(item) === slug);

  if (!product) return { title: "Produk Tidak Ditemukan" };

  const url = `${baseUrl}/toko/${slug}`;
  return {
    title: `${product.title} - Store.zip | Sigit Adi`,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.title} - Store.zip`,
      description: product.description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} - Store.zip`,
      description: product.description,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.published && getProductSlug(item) === slug);

  if (!product) notFound();

  return (
    <div className="h-full w-full overflow-y-auto vt-scrollbar">
      <ProductDetailContent product={product} />
    </div>
  );
}