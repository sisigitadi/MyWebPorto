"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ExternalLink, Package, ShoppingCart } from "lucide-react";
import type { ProductData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface ProductDetailContentProps {
  product: ProductData;
}

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const { language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const title = language === "en" && product.titleEn ? product.titleEn : product.title;
  const description = language === "en" && product.descriptionEn ? product.descriptionEn : product.description;

  useGSAP(() => {
    gsap.from(".product-detail-panel", {
      opacity: 0,
      y: 18,
      duration: 0.55,
      ease: "power3.out",
      clearProps: "all",
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-full py-6 sm:py-10">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <Link href="/#produk" className="inline-flex items-center gap-1.5 mb-4 text-xs font-mono font-bold text-[var(--vt-ink)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "en" ? "BACK TO STORE.ZIP" : "KEMBALI KE STORE.ZIP"}
        </Link>

        <OSWindow
          className="product-detail-panel"
          title={`${title}.zip`}
          icon={<Package className="h-3 w-3 text-[#ffd400]" />}
          statusText="Product_Details // Ready"
          bodyClassName="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start">
            <div className="relative overflow-hidden rounded-xs vt-card-inset bg-muted aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.thumbnailUrl} alt={title} className="h-full w-full object-cover" />
              <div className="absolute top-2 right-2 vt-btn vt-btn-pink px-3 py-1 text-xs font-pixel font-bold shadow-md">
                {product.priceFormatted}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-pixel text-[10px] text-[var(--vt-blue)]">{language === "en" ? "DIGITAL PRODUCT" : "PRODUK DIGITAL"}</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold font-display text-[var(--vt-ink)] leading-tight">{title}</h1>
              </div>
              <p className="text-sm font-mono font-medium leading-relaxed text-[var(--vt-ink)]">{description}</p>
              <a href={product.ctaUrl} target="_blank" rel="noopener noreferrer" className="vt-btn vt-btn-pink w-full justify-center gap-2 py-2.5 px-4 text-xs font-bold font-mono">
                <ShoppingCart className="h-4 w-4" />
                <span>{language === "en" ? "GET THIS PRODUCT" : "DAPATKAN PRODUK"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="border-t border-border/80 pt-4 flex items-center gap-2 text-xs font-mono text-[var(--vt-ink)]">
            <ExternalLink className="h-3.5 w-3.5 text-[var(--vt-blue)]" />
            <span>{language === "en" ? "Secure checkout opens in a new tab." : "Checkout aman dibuka di tab baru."}</span>
          </div>
        </OSWindow>
      </div>
    </div>
  );
}