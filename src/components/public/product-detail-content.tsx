"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Package,
  ShoppingCart,
  Monitor,
  MessageCircle,
  Sparkles,
  Tag,
  Check,
  Plus,
  Minus,
  ShieldCheck,
} from "lucide-react";
import type { ProductData, ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { OSWindow } from "@/components/public/os/os-window";
import { useCart, buildSingleProductWhatsAppUrl } from "@/lib/cart-context";
import { storeName, platformLabelFromUrl } from "@/lib/store";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface ProductDetailContentProps {
  product: ProductData;
  profile?: ProfileData;
}

export function ProductDetailContent({ product, profile }: ProductDetailContentProps) {
  const { language } = useTranslation();
  const { addItem, totalCount, setIsOpen } = useCart();
  const containerRef = useRef<HTMLDivElement>(null);

  const isEn = language === "en";
  const title = isEn && product.titleEn ? product.titleEn : product.title;
  const description = isEn && product.descriptionEn ? product.descriptionEn : product.description;

  // Multi-image gallery state
  const allImages = [product.thumbnailUrl, ...(product.gallery || [])].filter(Boolean);
  const [activeImage, setActiveImage] = useState(allImages[0] || product.thumbnailUrl);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const isOutOfStock = product.stock === 0;
  const maxStock = product.stock ?? 99;

  useGSAP(
    () => {
      gsap.from(".product-detail-panel", {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: containerRef }
  );

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div ref={containerRef} className="min-h-full py-6 sm:py-10 vt-crt-on">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-5">
        {/* Navigation Bar with Cart Access */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/">
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{isEn ? "Back to Desktop OS" : "Kembali ke Desktop OS"}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/#produk">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isEn ? `Back to ${storeName(isEn)}` : `Kembali ke ${storeName(isEn)}`}</span>
                <span className="sm:hidden">{isEn ? "Store" : "Toko"}</span>
              </Link>
            </Button>
          </div>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="vt-btn vt-btn-pink h-8 px-3 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>{isEn ? "Cart" : "Keranjang"}</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-white text-black font-extrabold text-[10px]">
              {totalCount}
            </span>
          </button>
        </div>

        <OSWindow
          className="product-detail-panel"
          title={`${title}.zip`}
          icon={<Package className="h-3.5 w-3.5 text-[#ffd400]" />}
          statusText={`Product_Details // ${product.category || "Digital Product"} // Ready`}
          bodyClassName="p-4 sm:p-6 space-y-6 font-mono text-xs"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start">
            {/* Gallery Section */}
            <div className="space-y-2.5">
              <div className="relative overflow-hidden rounded-xs vt-card-inset bg-muted aspect-[16/10] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeImage} alt={title} className="h-full w-full object-cover" />

                {/* Badge if present */}
                {product.badge && (
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-amber-500 text-black text-[11px] font-pixel font-bold shadow-md flex items-center gap-1 rounded-xs">
                    <Sparkles className="h-3 w-3" />
                    <span>{product.badge}</span>
                  </div>
                )}

                {/* Price Display — harga coret di badge chrome terpisah dari
                    badge pink (lihat catatan di products-section, item #4). */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {product.comparePriceLabel && (
                    <span className="vt-btn vt-btn-chrome px-2 py-1 text-[10px] font-pixel font-normal line-through shadow-sm">
                      {product.comparePriceLabel}
                    </span>
                  )}
                  <div className="vt-btn vt-btn-pink px-3 py-1 text-xs font-pixel font-bold shadow-md">
                    <span>{product.priceFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Gallery Thumbnails (if multiple images) */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 vt-scrollbar">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-14 w-14 rounded-xs overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        activeImage === img ? "border-primary scale-105" : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta & Actions */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-pixel text-[10px] text-[var(--vt-blue)] flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>{product.category || (isEn ? "DIGITAL PRODUCT" : "PRODUK DIGITAL")}</span>
                  </span>
                  {product.stock !== null && product.stock !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-xs ${
                        isOutOfStock
                          ? "bg-red-500/20 text-red-500 border border-red-500/40"
                          : product.stock <= 5
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                      }`}
                    >
                      {isOutOfStock
                        ? (isEn ? "OUT OF STOCK" : "STOK HABIS")
                        : product.stock <= 5
                        ? (isEn ? `ONLY ${product.stock} LEFT` : `SISA ${product.stock} UNIT`)
                        : (isEn ? `IN STOCK (${product.stock})` : `STOK TERSEDIA (${product.stock})`)}
                    </span>
                  )}
                </div>

                <h1 className="mt-2 text-xl sm:text-2xl font-bold font-display text-[var(--vt-ink)] leading-tight">
                  {title}
                </h1>
              </div>

              {/* Description Body */}
              <div className="p-3 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)]">
                <p className="text-xs sm:text-sm font-mono font-medium leading-relaxed text-[var(--vt-ink)] whitespace-pre-line">
                  {description}
                </p>
              </div>

              {/* Purchase Actions (Dynamic based on purchaseType) */}
              <div className="space-y-2.5 pt-2">
                {(!product.purchaseType || product.purchaseType === 'whatsapp') ? (
                  <>
                    {/* Quantity Controller */}
                    {!isOutOfStock && (
                      <div className="flex items-center justify-between p-2 bg-muted/40 rounded-xs border border-border">
                        <span className="text-xs font-bold">{isEn ? "Quantity:" : "Jumlah Beli:"}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="font-extrabold w-6 text-center text-xs">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                            disabled={quantity >= maxStock}
                            className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      className={`vt-btn w-full justify-center items-center gap-2 py-2.5 px-4 text-xs font-bold font-mono transition-all cursor-pointer shadow-md ${
                        justAdded
                          ? "bg-emerald-600 text-white font-extrabold"
                          : "vt-btn-pink text-white hover:brightness-110"
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>{isEn ? "ADDED TO CART!" : "BERHASIL DITAMBAHKAN!"}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>{isEn ? "ADD TO CART" : "TAMBAH KE KERANJANG"}</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp Direct Order Button */}
                    {(product.customWhatsapp || profile?.phone) && (
                      <a
                        href={buildSingleProductWhatsAppUrl(product.customWhatsapp || profile?.phone || '', product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vt-btn vt-btn-chrome w-full justify-center items-center gap-2 py-2 px-4 text-xs font-bold font-mono text-foreground hover:bg-muted cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{product.customButtonLabel || (isEn ? "ORDER INSTANT VIA WHATSAPP" : "PESAN LANGSUNG VIA WHATSAPP")}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    {/* External/Referral/Affiliate Button */}
                    {product.ctaUrl && (
                      <a
                        href={product.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vt-btn vt-btn-pink w-full justify-center items-center gap-2 py-3 px-4 text-xs font-bold font-mono text-white hover:brightness-110 cursor-pointer shadow-md"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>
                          {product.customButtonLabel || 
                            (product.purchaseType === 'referral' ? (isEn ? "GET IT VIA REFERRAL" : "GUNAKAN KODE REFERRAL") :
                             product.purchaseType === 'affiliate' ? (isEn ? "BUY VIA AFFILIATE" : "BELI VIA AFFILIATE") :
                             (isEn ? "BUY ON " + (platformLabelFromUrl(product.ctaUrl) || "PARTNER STORE") : "BELI DI " + (platformLabelFromUrl(product.ctaUrl) || "TOKO ONLINE")))}
                        </span>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-border/80 pt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {isEn
                    ? (product.purchaseType === 'whatsapp' || !product.purchaseType 
                        ? "Safe checkout with QRIS & direct confirmation."
                        : "Secured external checkout via partner platform.")
                    : (product.purchaseType === 'whatsapp' || !product.purchaseType
                        ? "Pemesanan aman dengan verifikasi QRIS / Transfer & WhatsApp resmi."
                        : "Transaksi aman melalui platform partner resmi.")}
                </span>
              </div>
            </div>
          </div>
        </OSWindow>
      </div>
    </div>
  );
}
