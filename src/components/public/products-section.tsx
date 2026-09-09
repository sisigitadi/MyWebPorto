"use client";

import { useRef } from "react";
import { ArrowRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductData, DUMMY_PRODUCTS } from "@/lib/dummy-data";
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
  const rawProducts =
    propProducts && Array.isArray(propProducts) && propProducts.length > 0
      ? propProducts
      : DUMMY_PRODUCTS;
  const published = rawProducts.filter((p) => p.published !== false);
  const products = published.length > 0 ? published : DUMMY_PRODUCTS;

  useGSAP(
    () => {
      // Header Animation
      gsap.from(".products-eyebrow", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 15,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "all",
      });

      gsap.from(".products-title", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 82%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 30,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power4.out",
        clearProps: "all",
      });

      gsap.from(".products-subtitle", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
        clearProps: "all",
      });

      // Bento Product Cards Stagger
      gsap.from(".bento-product-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 78%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 45,
        scale: 0.95,
        stagger: 0.12,
        duration: 0.85,
        ease: "back.out(1.35)",
        clearProps: "all",
      });
    },
    { scope: containerRef }
  );

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <section
      ref={containerRef}
      id="produk"
      className="relative py-24 md:py-36 border-b border-border/60 scroll-mt-16 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 right-1/3 w-[500px] h-[300px] bg-primary/4 rounded-full blur-[110px] pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3">
            <span className="products-eyebrow text-xs uppercase tracking-[0.2em] font-semibold text-primary inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t.products_eyebrow}
            </span>
            <h2 className="products-title text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              {t.products_title}
            </h2>
          </div>
          <p className="products-subtitle text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
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
            const isExternal = Boolean(
              product.ctaUrl &&
                (product.ctaUrl.startsWith("http://") || product.ctaUrl.startsWith("https://"))
            );
            const targetUrl = product.ctaUrl?.trim() || "#kontak";

            return (
              <Card
                key={product.id}
                onMouseMove={handleCardMouseMove}
                className={`bento-product-card spotlight-card ${colSpan} overflow-hidden flex flex-col group border-border bg-card/75 backdrop-blur-xs hover:border-foreground/35 transition-all duration-300`}
              >
                {/* Product Thumbnail with Hover Physics */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted border-b border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.thumbnailUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="secondary" className="text-xs font-mono font-semibold backdrop-blur-md bg-background/90 shadow-sm border border-border/80 group-hover:border-primary/50 group-hover:text-primary transition-colors">
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
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-normal">
                      {description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button asChild size="default" className="w-full gap-2 text-xs font-medium h-10 shadow-sm group/btn relative overflow-hidden">
                      <a
                        href={targetUrl}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                      >
                        <span className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-12 -translate-x-full group-hover/btn:animate-[shine-sweep_1.2s_ease-in-out]" />
                        <ShoppingBag className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                        <span>{isExternal ? t.products_cta_get : t.products_cta_inquire}</span>
                        {isExternal ? (
                          <ArrowUpRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        ) : (
                          <ArrowRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-1 transition-transform" />
                        )}
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
