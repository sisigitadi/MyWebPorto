"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
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
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductData, ProfileData } from "@/lib/dummy-data";
import { storeName } from "@/lib/store";
import { getProductSlug } from "@/lib/product-link";
import { useTranslation } from "@/lib/i18n";
import { useFeature } from "@/lib/features-context";
import { OSWindow } from "@/components/public/os/os-window";
import { useCart, buildSingleProductWhatsAppUrl } from "@/lib/cart-context";
import { getOrderByInvoice, getStoreConfig, type StoreConfig } from "@/lib/order-actions";
import type { Order } from "@/db/schema";
import { formatIdr, formatUsd } from "@/lib/whatsapp-order";
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
  const router = useRouter();
  const { t, language } = useTranslation();
  const { addItem, buyNow, totalCount, setIsOpen } = useCart();
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    getStoreConfig()
      .then((cfg) => {
        if (mounted && cfg) setStoreConfig(cfg);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Gate feature flag (settings.features): saat OFF, tombol keranjang dan
  // tombol "Tambah ke Keranjang" per produk disembunyikan; addItem dan
  // setIsOpen(true) tak pernah dipanggil.
  const enableStoreCart = useFeature("enable_store_cart");

  const containerRef = useRef<HTMLElement>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");

  // State untuk modal Lacak_Pesanan.exe
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerInvoiceInput, setTrackerInvoiceInput] = useState("");
  const [trackerError, setTrackerError] = useState("");
  const [isSearchingTracker, setIsSearchingTracker] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = trackerInvoiceInput.trim().toUpperCase();
    if (!raw) {
      setTrackerError(language === "en" ? "Please enter an invoice number." : "Masukkan nomor invoice.");
      return;
    }
    const match = raw.match(/INV-\d{8}-[A-Za-z0-9]{4}/);
    if (!match) {
      setTrackerError(
        language === "en"
          ? "Invoice format should be INV-DDMMYYYY-XXXX (e.g. INV-13102026-0001)"
          : "Format invoice harus berupa INV-DDMMYYYY-XXXX (contoh: INV-13102026-0001)"
      );
      return;
    }
    setTrackerError("");
    setIsSearchingTracker(true);
    try {
      const order = await getOrderByInvoice(match[0]);
      if (order) {
        setTrackedOrder(order);
      } else {
        // Jika tidak langsung ditemukan di server cache, buka halaman status
        setShowTrackerModal(false);
        router.push(`/order/${match[0]}`);
      }
    } catch {
      setShowTrackerModal(false);
      router.push(`/order/${match[0]}`);
    } finally {
      setIsSearchingTracker(false);
    }
  };

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

          {/* Quick Actions: Lacak Pesanan & Cart Trigger */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTrackerError("");
                setShowTrackerModal(true);
              }}
              className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-[var(--vt-cyan)]"
              title={language === "en" ? "Track order status by invoice" : "Lacak status pesanan invoice"}
            >
              <Search className="h-3.5 w-3.5 text-[var(--vt-cyan)]" />
              <span>{language === "en" ? "Track Order" : "Lacak Pesanan"}</span>
            </button>

            {enableStoreCart && !storeConfig?.whatsappOnlyMode && (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`group vt-btn vt-btn-pink px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                  totalCount > 0 ? "animate-pulse ring-2 ring-primary" : ""
                }`}
                title={language === "en" ? "Open Shopping Cart" : "Buka Keranjang Belanja"}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{language === "en" ? "Cart.zip" : "Keranjang"}</span>
                <span className="px-1.5 py-0.2 rounded-xs bg-white text-black font-extrabold text-[11px]">
                  {totalCount}
                </span>
              </button>
            )}
          </div>
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
                aria-label={language === "en" ? "Sort products" : "Urutkan produk"}
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
                        {/* 1. Tipe Eksternal / Referral / Affiliate: Langsung ke link tujuan tanpa keranjang/checkout web */}
                        {(product.purchaseType === 'referral' || product.purchaseType === 'affiliate' || product.purchaseType === 'external') ? (
                          <>
                            {product.ctaUrl && (
                              <a
                                href={product.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vt-btn vt-btn-pink flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer text-white shadow-xs hover:brightness-110"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[170px]">
                                  {product.customButtonLabel || 
                                    (product.purchaseType === 'referral' ? (language === "en" ? "OPEN REFERRAL" : "KODE REFERRAL") :
                                     product.purchaseType === 'affiliate' ? (language === "en" ? "BUY VIA AFFILIATE" : "LINK AFFILIATE") :
                                     (language === "en" ? "BUY AT PARTNER" : "BELI DI TOKO RESMI"))}
                                </span>
                              </a>
                            )}
                          </>
                        ) : product.purchaseType === 'freelanceops' ? (
                          /* 2. Jasa Proyek FreelanceOps */
                          <a
                            href={product.ctaUrl || 'https://freelanceops.sigitadi.id/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vt-btn vt-btn-pink flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer text-white shadow-xs hover:brightness-110"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>{product.customButtonLabel || (language === "en" ? "START PROJECT" : "MULAI PROYEK")}</span>
                          </a>
                        ) : product.purchaseType === 'whatsapp_custom' ? (
                          /* 3. Pesanan Khusus / Nego / Konsultasi WhatsApp */
                          <a
                            href={buildSingleProductWhatsAppUrl(product.customWhatsapp || profile?.phone || '', product, language === "en" ? "en" : "id")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vt-btn vt-btn-pink flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer text-white shadow-xs hover:brightness-110"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{product.customButtonLabel || (language === "en" ? "CUSTOM INQUIRY" : "KONSULTASI KHUSUS")}</span>
                          </a>
                        ) : storeConfig?.whatsappOnlyMode ? (
                          /* 4. Global WhatsApp Only Mode: Seluruh produk langsung diarahkan ke WA */
                          <a
                            href={buildSingleProductWhatsAppUrl(product.customWhatsapp || profile?.phone || '', product, language === "en" ? "en" : "id")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vt-btn vt-btn-pink flex-1 py-2 px-2.5 font-bold justify-center items-center gap-1.5 cursor-pointer text-white shadow-xs hover:brightness-110"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{language === "en" ? "ORDER VIA WA" : "PESAN VIA WA (CEK STOK)"}</span>
                          </a>
                        ) : (
                          /* 5. Alur Standar Web Toko: Beli Langsung (Express) + Ikon Keranjang + Ikon WA */
                          <>
                            {/* Tombol Utama: Beli Langsung (Express Checkout) */}
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => buyNow(product)}
                              className="vt-btn vt-btn-pink flex-1 py-2 px-2 font-bold justify-center items-center gap-1.5 cursor-pointer text-white shadow-xs hover:brightness-110 disabled:opacity-50"
                              title={language === "en" ? "Express Checkout (Instant Buy)" : "Beli Langsung (Checkout Cepat)"}
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span>{language === "en" ? "BUY NOW" : "BELI LANGSUNG"}</span>
                            </button>

                            {/* Tombol Tambah ke Keranjang */}
                            {enableStoreCart && (
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => handleAddToCart(product)}
                                className={`vt-btn px-2.5 py-2 font-bold justify-center items-center gap-1 cursor-pointer transition-colors ${
                                  isAdded
                                    ? "bg-emerald-600 text-white font-extrabold"
                                    : "vt-btn-chrome text-foreground hover:bg-muted"
                                }`}
                                title={language === "en" ? "Add to Shopping Cart" : "Tambah ke Keranjang Belanja"}
                              >
                                {isAdded ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}

                            {/* Ikon Tanya WA Cepat */}
                            {(product.customWhatsapp || profile?.phone) && (
                              <a
                                href={buildSingleProductWhatsAppUrl(product.customWhatsapp || profile?.phone || '', product, language === "en" ? "en" : "id")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vt-btn vt-btn-chrome px-2.5 py-2 text-xs font-bold text-foreground justify-center items-center gap-1 group cursor-pointer"
                                title={language === "en" ? "Ask questions on WhatsApp" : "Tanya via WhatsApp"}
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
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

      {/* Order Tracker Modal */}
      {showTrackerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto vt-scrollbar"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowTrackerModal(false);
            setTrackedOrder(null);
            setTrackerError("");
          }}
        >
          <div
            className="w-full max-w-md sm:max-w-lg my-auto max-h-[90dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <OSWindow
              title={trackedOrder ? `Lacak_${trackedOrder.invoiceNumber}.exe` : "Lacak_Pesanan.exe"}
              icon={<Search className="h-4 w-4 text-[var(--vt-cyan)]" />}
              statusText={
                trackedOrder
                  ? `STATUS: ${trackedOrder.status.toUpperCase()} // LIVE`
                  : "INVOICE_TRACKER_V1.0"
              }
              onClose={() => {
                setShowTrackerModal(false);
                setTrackedOrder(null);
                setTrackerError("");
              }}
              className="w-full flex-1 flex flex-col max-h-full overflow-hidden shadow-2xl vt-window-pop"
              bodyClassName="p-4 sm:p-5 bg-[var(--vt-paper)] text-[var(--vt-ink)] font-mono text-xs space-y-4 flex-1 min-h-0 overflow-y-auto vt-scrollbar"
            >
              {/* TAMPILAN 1: FORM INPUT INVOICE */}
              {!trackedOrder && (
                <>
                  <div>
                    <p className="font-bold text-sm mb-1 text-[var(--vt-ink)]">
                      {language === "en" ? "Track Your Digital Order" : "Lacak Status Pesanan Digital"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {language === "en"
                        ? "Enter your invoice number received after checkout (e.g. INV-13102026-4821)."
                        : "Masukkan nomor invoice yang Anda peroleh saat checkout (contoh: INV-13102026-4821)."}
                    </p>
                  </div>

                  <form onSubmit={handleTrackOrder} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold block text-muted-foreground uppercase">
                        {language === "en" ? "Invoice Number" : "Nomor Invoice"}
                      </label>
                      <input
                        type="text"
                        value={trackerInvoiceInput}
                        onChange={(e) => {
                          setTrackerInvoiceInput(e.target.value);
                          if (trackerError) setTrackerError("");
                        }}
                        placeholder="INV-DDMMYYYY-XXXX"
                        autoFocus
                        disabled={isSearchingTracker}
                        className="w-full px-3 py-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs font-mono font-bold text-xs uppercase focus:outline-none focus:border-[var(--vt-cyan)] placeholder:text-muted-foreground/60 disabled:opacity-60"
                      />
                      {trackerError && (
                        <p className="text-red-500 font-bold text-[11px] mt-1">{trackerError}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTrackerModal(false);
                          setTrackerError("");
                        }}
                        disabled={isSearchingTracker}
                        className="vt-btn vt-btn-chrome px-3 py-2 font-bold cursor-pointer"
                      >
                        {language === "en" ? "Cancel" : "Batal"}
                      </button>
                      <button
                        type="submit"
                        disabled={isSearchingTracker}
                        className="vt-btn vt-btn-pink flex-1 py-2 px-4 font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>
                          {isSearchingTracker
                            ? language === "en"
                              ? "Searching..."
                              : "Mencari..."
                            : language === "en"
                            ? "Check Order Status"
                            : "Cek Status Pesanan"}
                        </span>
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* TAMPILAN 2: HASIL PELACAKAN LIVE LANGSUNG DI MODAL */}
              {trackedOrder && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        NOMOR INVOICE
                      </span>
                      <p className="text-base font-bold font-pixel text-[var(--vt-ink)]">
                        {trackedOrder.invoiceNumber}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xs text-[11px] font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-pixel uppercase">
                      {trackedOrder.status}
                    </span>
                  </div>

                  {/* Rincian Pemesan & Waktu */}
                  <div className="p-3 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)] space-y-1">
                    <p className="font-bold text-xs">Pemesan: {trackedOrder.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Telepon / WA: {trackedOrder.customerPhone}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Metode Pembayaran: <strong className="uppercase">{trackedOrder.paymentMethod}</strong>
                    </p>
                  </div>

                  {/* Daftar Item */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-[11px] text-primary block uppercase">
                      Daftar Pesanan:
                    </span>
                    <div className="border border-border rounded-xs divide-y divide-border/60 overflow-hidden">
                      {(trackedOrder.items || []).map((it, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold">{it.title}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {it.quantity}</p>
                          </div>
                          <span className="font-bold font-mono">
                            {trackedOrder.currency === "USD" ? formatUsd(it.subtotal) : formatIdr(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Tagihan */}
                  <div className="flex justify-between items-center p-2.5 bg-muted/60 rounded-xs border border-border">
                    <span className="font-bold">Total Pembayaran:</span>
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-pixel">
                      {trackedOrder.currency === "USD"
                        ? formatUsd(trackedOrder.totalAmount)
                        : formatIdr(trackedOrder.totalAmount)}
                    </span>
                  </div>

                  {/* Tombol Aksi Modal */}
                  <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackedOrder(null);
                        setTrackerError("");
                      }}
                      className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-bold cursor-pointer"
                    >
                      Lacak Lain
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTrackerModal(false);
                        router.push(`/order/${trackedOrder.invoiceNumber}`);
                      }}
                      className="vt-btn vt-btn-pink flex-1 py-2 px-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:brightness-110"
                    >
                      <span>Buka Halaman Lengkap & Cetak (A4)</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </OSWindow>
          </div>
        </div>
      )}
    </section>
  );
}
