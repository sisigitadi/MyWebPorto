import { Metadata } from "next";
import { getProducts, getProfile } from "@/lib/actions";
import { safeJsonLd } from "@/lib/json-ld";
import { localeAlternates } from "@/lib/seo";
import { STORE_NAME } from "@/lib/store";
import { getProductSlug } from "@/lib/product-link";
import { ProductsCatalogContent } from "@/components/public/products-catalog-content";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");

export const metadata: Metadata = {
  title: `Katalog Produk & Source Code: ${STORE_NAME}`,
  description: "Koleksi produk digital, source code aplikasi production-ready, template retro OS, dan lisensi software berkualitas karya Sigit Adi Irianto.",
  alternates: localeAlternates(`${baseUrl}/toko`),
  openGraph: {
    title: `Katalog Produk Digital & Source Code: ${STORE_NAME}`,
    description: "Koleksi produk digital, source code aplikasi production-ready, template retro OS, dan lisensi software.",
    url: `${baseUrl}/toko`,
    type: "website",
    images: [`${baseUrl}/toko/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: `Katalog Produk Digital & Source Code: ${STORE_NAME}`,
    description: "Koleksi produk digital, source code aplikasi production-ready, dan lisensi software.",
    images: [`${baseUrl}/toko/opengraph-image`],
  },
};

// Cache 24 jam di CDN Edge; pembaruan ditangani on-demand oleh revalidatePath.
export const revalidate = 86400;

export default async function ProductsPage() {
  const [products, profile] = await Promise.all([getProducts(), getProfile()]);

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
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Katalog Produk Digital & Source Code",
    description: "Daftar produk digital, lisensi source code, dan template software siap pakai.",
    url: `${baseUrl}/toko`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: p.title,
        url: `${baseUrl}/toko/${getProductSlug(p)}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      <ProductsCatalogContent products={products} profile={profile} />
    </>
  );
}
