"use client";

import React, { useRef, useState, useMemo } from "react";
import {
  ArrowUpRight,
  Package,
  ShoppingCart,
  Search,
  MessageCircle,
  Sparkles,
  Layers,
  ArrowUpDown,
  Tag,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { ProductData, ProfileData } from "@/lib/dummy-data";
import { storeName } from "@/lib/store";
import { getProductSlug } from "@/lib/product-link";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { useCart, buildSingleProductWhatsAppUrl } from "@/lib/cart-context";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ProductsSectionProps {
  products: ProductData[];
  profile?: ProfileData;
}

export function ProductsSection({ products: propProducts, profile }: ProductsSectionProps) {
  const { t, language } = useTranslation();
  const { addItem, totalCount, setIsOpen } = useCart();
  const containerRef = useRef<HTMLElement>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");

  // Tanpa fallback dummy: katalog kosong ditampilkan jujur sebagai empty state
  const allProducts = ((propProducts && Array.isArray(propProducts)) ? propProducts : []).filter(
    (p) => p.published !== false
  );

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [allProducts]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        const matchesCategory =
          selectedCategory === "all" ||
          (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q));
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") {
          return (a.priceAmount || 0) - (b.priceAmount || 0);
        }
        if (sortBy === "price_desc") {
          return (b.priceAmount || 0) - (a.priceAmount || 0);
        }
        return 0;
      });
  }, [allProducts, selectedCategory, searchQuery, sortBy]);

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
        stagger: 0.1,
        duration: 0.7,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: containerRef, dependencies: [selectedCategory, sortBy] }
  );

  const handleAddToCart = (product: ProductData) => {
    // addItem mengembalikan false bila produk habis — jangan beri flash
    // "DITAMBAHKAN!" yang menyesatkan (tombol disabled, tapi pertahanan kedua).
    if (!addItem(product, 1)) return;
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  return (
    <section ref={containerRef} id="produk" className="relative py-8 md:py-14 scroll-mt-14">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 space-y-6">
        {/* Store Header with Floating Cart Access */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-pixel text-xs text-[var(--vt-blue)]">
              <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
              <span>{`${storeName(language === "en")} // ${t.products_badge}`}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
              {t.products_title}
            </h2>
            <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
              {t.products_subtitle}
            </p>
          </div>

          {/* Quick Cart Trigger */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`group vt-btn vt-btn-pink px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all self-start sm:self-auto ${
              totalCount > 0 ? "animate-pulse ring-2 ring-primary" : ""
            }`}
            title="Buka Keranjang Belanja"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{language === "en" ? "Cart.zip" : "Keranjang"}</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-white text-black font-extrabold text-[11px]">
              {totalCount}
            </span>
          </button>
        </div>

        {/* Search, Filter & Sort Toolbar */}
        <div className="p-3 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)] space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "en" ? "Search digital products..." : "Cari produk digital..."}
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--vt-paper)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none focus:border-primary"
              />
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[var(--vt-paper)] border border-[var(--vt-edge-lo-2)] rounded-xs px-2.5 py-1.5 text-xs outline-none font-bold text-[var(--vt-ink)] cursor-pointer"
              >
                <option value="default">{language === "en" ? "Latest First" : "Urutan Default"}</option>
                <option value="price_asc">{language === "en" ? "Price: Low to High" : "Harga Terendah"}</option>
                <option value="price_desc">{language === "en" ? "Price: High to Low" : "Harga Tertinggi"}</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 vt-scrollbar">
            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{language === "en" ? "Category:" : "Kategori:"}</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-xs cursor-pointer transition-colors shrink-0 ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground font-extrabold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              }`}
            >
              {language === "en" ? "All Products" : "Semua Produk"} ({allProducts.length})
            </button>

            {categories.map((cat) => {
              const count = allProducts.filter((p) => p.category?.toLowerCase() === cat.toLowerCase()).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-xs cursor-pointer transition-colors shrink-0 ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-primary text-primary-foreground font-extrabold shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 vt-card-inset p-6 bg-[var(--vt-card)] rounded-xs border border-dashed border-border font-mono text-xs">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--vt-ink)]">
              {allProducts.length === 0
                ? t.products_empty
                : language === "en"
                ? "No products matched your filter."
                : "Tidak ada produk yang cocok dengan pencarian."}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {language === "en" ? "Try another keyword or reset the category." : "Coba kata kunci lain atau pilih Semua Produk."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredProducts.map((product, index) => {
              const title = language === "en" && product.titleEn ? product.titleEn : product.title;
              const description =
                language === "en" && product.descriptionEn ? product.descriptionEn : product.description;
              const productUrl = `/toko/${getProductSlug(product)}`;
              const isAdded = justAddedId === product.id;
              const isOutOfStock = product.stock === 0;

              return (
                <div key={product.id} className="sigit-product-card flex flex-col h-full">
                  <OSWindow
                    title={`Product_Disk_0${index + 1}.zip`}
                    icon={<Package className="h-3 w-3 text-[#ffd400]" />}
                    statusText={
                      product.category
                        ? `Cat: ${product.category} // Ready`
                        : `Release: Ready // Instant Delivery`
                    }
                    className="h-full flex-1"
                    bodyClassName="flex flex-col justify-between h-full space-y-3.5"
                  >
                    <div className="space-y-3">
                      {/* Product Thumbnail with Badges */}
                      <Link
                        href={productUrl}
                        className="relative block aspect-[16/10] overflow-hidden rounded-xs vt-card-inset bg-muted group"
                        aria-label={`${title} details`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Top Left Promo / Status Badge */}
                        {product.badge && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-pixel font-bold shadow-md flex items-center gap-1 rounded-xs">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>{product.badge}</span>
                          </div>
                        )}

                        {/* Top Right Price Badge with Compare Price.
                            Harga coret DILUAR badge pink: aturan CSS
                            `.vt-btn-pink span { color: #fff }` memaksa teks
                            di dalamnya putih, jadi coretan putih di atas
                            background pink praktis tak terlihat (item #4
                            audit). Diberi badge chrome sendiri agar kontras. */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          {product.comparePriceLabel && (
                            <span className="vt-btn vt-btn-chrome px-2 py-1 text-[10px] font-pixel font-normal line-through shadow-sm">
                              {product.comparePriceLabel}
                            </span>
                          )}
                          <div className="vt-btn vt-btn-pink px-2.5 py-1 text-xs font-pixel font-bold shadow-md">
                            <span>{product.priceFormatted}</span>
                          </div>
                        </div>

                        {/* Stock Warning Overlay */}
                        {product.stock !== null && product.stock !== undefined && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-[10px] font-mono font-bold text-white rounded-xs">
                            {isOutOfStock ? (
                              <span className="text-red-400 font-bold">{language === "en" ? "SOLD OUT" : "HABIS"}</span>
                            ) : product.stock <= 5 ? (
                              <span className="text-amber-300">{language === "en" ? `Only ${product.stock} left!` : `Sisa ${product.stock} unit!`}</span>
                            ) : (
                              <span className="text-emerald-300">{language === "en" ? `Stock: ${product.stock}` : `Stok: ${product.stock}`}</span>
                            )}
                          </div>
                        )}
                      </Link>

                      {/* Product Title */}
                      <div className="space-y-1">
                        {product.category && (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {product.category}
                          </span>
                        )}
                        <h3 className="text-base font-bold font-mono text-[var(--vt-ink)] leading-snug">
                          <Link href={productUrl} className="hover:underline underline-offset-2">
                            {title}
                          </Link>
                        </h3>
                      </div>

                      <p className="text-xs font-mono text-[var(--vt-ink)] font-medium leading-relaxed line-clamp-3">
                        {description}
                      </p>
                    </div>

                    {/* Shop Action Buttons */}
                    <div className="pt-3 border-t border-border/80 space-y-2 font-mono text-xs">
                      <div className="flex gap-2">
                        {(!product.purchaseType || product.purchaseType === 'whatsapp') ? (
                          <>
                            {/* Add to Cart Button */}
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(product)}
                              className={`vt-btn flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer transition-colors ${
                                isAdded
                                  ? "bg-emerald-600 text-white font-extrabold"
                                  : "vt-btn-pink text-white"
                              }`}
                              title="Tambah ke Keranjang Belanja"
                            >
                              {isAdded ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>{language === "en" ? "ADDED!" : "DITAMBAHKAN!"}</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>{language === "en" ? "ADD TO CART" : "KERANJANG"}</span>
                                </>
                              )}
                            </button>

                            {/* Instant WhatsApp Order Button */}
                            {(product.customWhatsapp || profile?.phone) && (
                              <a
                                href={buildSingleProductWhatsAppUrl(product.customWhatsapp || profile?.phone || '', product, language === "en" ? "en" : "id")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-bold text-foreground justify-center items-center gap-1.5 group cursor-pointer"
                                title={language === "en" ? "Instant Order via WhatsApp" : "Pesan Langsung via WhatsApp"}
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span className="hidden sm:inline">WA</span>
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {product.ctaUrl && (
                              <a
                                href={product.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vt-btn vt-btn-pink flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer text-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[130px]">
                                  {product.customButtonLabel || 
                                    (product.purchaseType === 'referral' ? (language === "en" ? "VIA REFERRAL" : "KODE REFERRAL") :
                                     product.purchaseType === 'affiliate' ? (language === "en" ? "VIA AFFILIATE" : "LINK AFFILIATE") :
                                     (language === "en" ? "BUY ONLINE" : "BELI SEKARANG"))}
                                </span>
                              </a>
                            )}
                          </>
                        )}
                      </div>

                      {/* Detail Link */}
                      <Link
                        href={productUrl}
                        className="vt-btn vt-btn-chrome w-full py-1.5 px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground justify-between items-center group"
                      >
                        <span>{language === "en" ? "View Full Details" : "Lihat Spesifikasi & Detail"}</span>
                        <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>
                    </div>
                  </OSWindow>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
