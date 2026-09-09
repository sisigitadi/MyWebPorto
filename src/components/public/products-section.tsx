"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
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
  const products = propProducts.filter((p) => p.published);

  useGSAP(
    () => {
      gsap.from(".bento-product-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.85,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="produk"
      className="py-24 md:py-36 border-b border-border/60 scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary block">
              {t.products_eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              {t.products_title}
            </h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-md">
            {t.products_subtitle}
          </p>
        </div>

        {/* Bento Products Grid (12-col dense) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-flow-dense">
          {products.map((product, idx) => {
            let colSpan = "md:col-span-6";
            if (products.length === 1) {
              colSpan = "md:col-span-12";
            } else if (products.length === 3) {
              colSpan = "md:col-span-4";
            } else if (products.length % 2 !== 0 && idx === 0) {
              colSpan = "md:col-span-12";
            }

            const title = (language === "en" && product.titleEn) ? product.titleEn : product.title;
            const description = (language === "en" && product.descriptionEn) ? product.descriptionEn : product.description;

            return (
              <Card
                key={product.id}
                className={`bento-product-card ${colSpan} overflow-hidden flex flex-col group border-border bg-card/60 backdrop-blur-sm hover:border-foreground/30 hover:shadow-xl transition-all duration-300`}
              >
                {/* Product Thumbnail with GSAP Hover Physics */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted border-b border-border">
                  <Image
                    src={product.thumbnailUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="secondary" className="text-xs font-mono font-semibold backdrop-blur-md bg-background/90 shadow-sm border border-border/80">
                      {product.priceFormatted}
                    </Badge>
                  </div>
                </div>

                {/* Product Content */}
                <CardContent className="p-6 md:p-8 flex flex-col justify-between flex-1 space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="font-semibold text-lg md:text-xl text-foreground group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button asChild size="default" className="w-full gap-2 text-xs font-medium h-10 shadow-sm">
                      <a
                        href={product.ctaUrl || "#kontak"}
                        target={product.ctaUrl ? "_blank" : undefined}
                        rel="noreferrer"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>{product.ctaUrl ? t.products_cta_get : t.products_cta_inquire}</span>
                        <ArrowUpRight className="h-4 w-4 ml-auto" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
