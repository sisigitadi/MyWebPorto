import type { ProductData } from "@/lib/dummy-data";

export function slugifyProduct(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductSlug(product: Pick<ProductData, "id" | "title" | "slug">) {
  return slugifyProduct(product.slug || product.title) || product.id;
}