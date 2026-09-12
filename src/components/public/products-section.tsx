"use client";

import React, { useRef } from "react";
import { ArrowUpRight, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ProductData, DUMMY_PRODUCTS } from "@/lib/dummy-data";
import { getProductSlug } from "@/lib/product-link";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ProductsSectionProps {
  products: ProductData[];
}

export function ProductsSection({ products: propProducts }: ProductsSectionProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const rawProducts =
    propProducts && Array.isArray(propProducts) && propProducts.length > 0
      ? propProducts
      : DUMMY_PRODUCTS;
  const published = rawProducts.filter((p) => p.published !== false);
  const products = published.length > 0 ? published : DUMMY_PRODUCTS;

  useGSAP(
    () => {
      gsap.from(".sigit-product-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 40,
        stagger: 0.12,
        duration: 0.85,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="produk"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Section Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>{t.products_badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.products_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
            {t.products_subtitle}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const title = (language === "en" && product.titleEn) ? product.titleEn : product.title;
            const description = (language === "en" && product.descriptionEn) ? product.descriptionEn : product.description;
            const productUrl = `/toko/${getProductSlug(product)}`;

            return (
              <div key={product.id} className="sigit-product-card flex flex-col h-full">
                <OSWindow
                  title={`Product_Disk_0${index + 1}.zip`}
                  icon={<Package className="h-3 w-3 text-[#ffd400]" />}
                  statusText={`Release: Ready // Instant Delivery`}
                  className="h-full flex-1"
                  bodyClassName="flex flex-col justify-between h-full space-y-4"
                >
                  <div className="space-y-3">
                    {/* Retro Software Box Thumbnail */}
                    <Link href={productUrl} className="relative block aspect-[16/10] overflow-hidden rounded-xs vt-card-inset bg-muted" aria-label={`${title} details`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {/* Price Badge */}
                      <div className="absolute top-2 right-2 vt-btn vt-btn-pink px-3 py-1 text-xs font-pixel font-bold shadow-md">
                        {product.priceFormatted}
                      </div>
                    </Link>

                    <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] leading-snug">
                      <Link href={productUrl} className="hover:underline underline-offset-2">{title}</Link>
                    </h3>

                    <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium leading-relaxed">
                      {description}
                    </p>
                  </div>

                  {/* Purchase / Download CTA */}
                  <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row gap-2">
                    <Link
                      href={productUrl}
                      className="vt-btn vt-btn-chrome flex-1 py-2 px-3 text-xs font-bold font-mono text-foreground justify-center"
                    >
                      {language === "en" ? "OPEN PRODUCT" : "LIHAT PRODUK"}
                    </Link>
                    <a
                      href={product.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vt-btn vt-btn-chrome flex-1 py-2 px-3 text-xs font-bold font-mono text-foreground justify-between group"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                        <span>{t.products_cta_get}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </OSWindow>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
