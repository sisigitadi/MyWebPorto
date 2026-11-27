import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailContent } from "@/components/public/product-detail-content";
import { getProducts, getProfile } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { getProductSlug } from "@/lib/product-link";
import { buildProductSchema } from "@/lib/product-schema";
import { localeAlternates, shareImage } from "@/lib/seo";
import { SITE_BRAND } from "@/lib/seo-config";
import { STORE_NAME } from "@/lib/store";
import { canonicalBaseUrl } from "@/lib/canonical-host";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Optimasi Vercel Free: cache 24 jam di CDN Edge; pembaruan ditangani on-demand oleh revalidatePath.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.filter((p) => p.published).map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = canonicalBaseUrl();
  const products = await getProducts();
  const product = products.find((p) => getProductSlug(p) === slug && p.published);
  if (!product) {
    return {
      title: `Produk Tidak Ditemukan : ${STORE_NAME}`,
      robots: { index: false, follow: false },
    };
  }
  const url = `${baseUrl}/toko/${slug}`;
  const description = product.description.slice(0, 160);
  const image = shareImage(product.thumbnailUrl, baseUrl, product.title);
  return {
    title: `${product.title} : ${STORE_NAME}`,
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
  const product = products.find((p) => getProductSlug(p) === slug && p.published);
  if (!product) notFound();
  const baseUrl = canonicalBaseUrl();
  const pageUrl = `${baseUrl}/toko/${slug}`;

  const otherProducts = products
    .filter((p) => p.id !== product.id && p.published)
    .slice(0, 3);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Katalog Toko",
        item: `${baseUrl}/toko`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: pageUrl,
      },
    ],
  };

  const productSchema = buildProductSchema({
    product,
    baseUrl,
    pageUrl,
    brandName: SITE_BRAND,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
      />
      <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar">
        <ProductDetailContent
          product={product}
          profile={profile}
          relatedProducts={otherProducts}
        />
      </div>
    </>
  );
}
