import type { ProductData } from "@/lib/dummy-data";

export type PurchaseType = "whatsapp" | "external" | "referral" | "affiliate";

const PURCHASE_TYPES: readonly PurchaseType[] = [
  "whatsapp",
  "external",
  "referral",
  "affiliate",
];

/**
 * Drizzle mengetik kolom purchase_type sebagai `string` biasa, tetapi UI dan
 * ProductData memakai union yang terbatas. Parengkan nilai apa pun yang berasal
 * dari database ke union; nilai tak dikenal (data lama/kotor) jatuh ke "whatsapp".
 */
export function normalizePurchaseType(
  value: string | null | undefined,
): PurchaseType {
  return (PURCHASE_TYPES as readonly string[]).includes(value ?? "")
    ? (value as PurchaseType)
    : "whatsapp";
}

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