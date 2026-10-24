"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Monitor,
  Package,
  Search,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { ProductData, ProfileData } from "@/lib/dummy-data";
import { getProductSlug } from "@/lib/product-link";
import { useFeature } from "@/lib/features-context";
import { OSWindow } from "@/components/public/os/os-window";
import { ShareButton } from "@/components/public/share-button";
import { useCart } from "@/lib/cart-context";
import { getOrderByInvoice, getStoreConfig, type StoreConfig } from "@/lib/order-actions";
import type { Order } from "@/db/schema";
import { formatIdr } from "@/lib/whatsapp-order";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ProductsCatalogContentProps {
  products: ProductData[];
  profile?: ProfileData;
}

export function ProductsCatalogContent({ products: propProducts, profile }: ProductsCatalogContentProps) {
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

  const enableStoreCart = useFeature("enable_store_cart");
  const isEn = language === "en";
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const pageAddress = "https://sigitadi.id/toko";

  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // State untuk modal Lacak_Pesanan.exe
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerInvoiceInput, setTrackerInvoiceInput] = useState("");
  const [trackerError, setTrackerError] = useState("");
  const [isSearchingTracker, setIsSearchingTracker] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const handleCopyAddress = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pageAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(isEn ? "URL address copied to clipboard!" : "Alamat URL berhasil disalin!");
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = trackerInvoiceInput.trim().toUpperCase();
    if (!raw) {
      setTrackerError(isEn ? "Please enter an invoice number." : "Masukkan nomor invoice.");
      return;
    }
    const match = raw.match(/INV-\d{8}-[A-Za-z0-9]{4}/);
    if (!match) {
      setTrackerError(
        isEn
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

  const allProducts = useMemo(() => {
    return (propProducts && Array.isArray(propProducts) ? propProducts : []).filter(
      (p) => p.published !== false
    );
  }, [propProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [allProducts]);

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
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [allProducts, selectedCategory, searchQuery, sortBy]);

  useGSAP(
    () => {
      if (viewMode === "grid") {
        gsap.from(".catalog-product-card", {
          y: 35,
          opacity: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "all",
        });
      }
    },
    { scope: containerRef, dependencies: [selectedCategory, sortBy, viewMode] }
  );

  const handleAddToCart = (product: ProductData) => {
    if (!addItem(product, 1)) return;
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1800);
  };

  return (
    <div ref={containerRef} className="py-8 md:py-14 relative overflow-hidden h-full w-full overflow-y-auto vt-scrollbar vt-crt-on">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-6">
        <OSWindow
          id="products-catalog"
          title="SigitOS_Explorer :: https://sigitadi.id/toko"
          icon={<Package className="h-4 w-4 text-[#ffd400]" />}
          statusText={`Total records: ${allProducts.length} digital products | Status: MOUNTED // READY`}
        >
          {/* Explorer Navigation Bar - Single Row Compact */}
          <div className="mb-6 p-2 rounded bg-muted/40 border border-border flex items-center justify-between gap-1.5 sm:gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Link
                href="/"
                className="vt-btn vt-btn-chrome px-2 sm:px-3 py-1 text-xs font-bold text-foreground inline-flex items-center gap-1 shrink-0"
              >
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{isEn ? "Back to Desktop" : "Kembali ke Desktop"}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[var(--vt-ink)] font-bold">Address:</span>
                <div
                  onClick={handleCopyAddress}
                  title={isEn ? "Click to copy address URL" : "Klik untuk menyalin alamat URL"}
                  className="px-2 py-1 bg-background border border-border/80 rounded flex items-center gap-1.5 text-primary font-bold cursor-pointer hover:border-primary/50 transition-colors group select-all"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCopyAddress();
                    }
                  }}
                  aria-label={isEn ? "Copy address URL https://sigitadi.id/toko" : "Salin alamat URL https://sigitadi.id/toko"}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{pageAddress}</span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-1" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 ml-1 transition-colors" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <ShareButton
                title={isEn ? `Sigit Adi Digital Store - ${profile?.name || "Sigit Adi Irianto"}` : `Toko Digital & Tools Developer - ${profile?.name || "Sigit Adi Irianto"}`}
                url="/toko"
                summary={
                  isEn
                    ? "Browse high-quality digital products, Next.js boilerplates, ready-to-use source code, SaaS templates, and developer tools curated by Sigit Adi Irianto."
                    : "Dapatkan produk digital berkualitas, boilerplates Next.js, source code siap pakai, template SaaS, dan tools developer praktis untuk mempercepat pengembangan aplikasi."
                }
                badge={isEn ? "STORE" : "TOKO"}
                buttonText={isEn ? "Share" : "Bagikan"}
                className="vt-btn vt-btn-chrome text-xs font-mono font-bold px-2 sm:px-3 py-1"
              />

              <button
                type="button"
                onClick={() => {
                  setTrackerError("");
                  setShowTrackerModal(true);
                }}
                className="vt-btn vt-btn-chrome px-2 sm:px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-sm hover:border-[var(--vt-cyan)]"
                title={isEn ? "Track order status by invoice" : "Lacak status pesanan invoice"}
              >
                <Search className="h-3.5 w-3.5 text-[var(--vt-cyan)]" />
                <span className="hidden sm:inline">{isEn ? "Track Order" : "Lacak Pesanan"}</span>
              </button>

              {enableStoreCart && !storeConfig?.whatsappOnlyMode && (
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className={`group vt-btn vt-btn-pink px-2 sm:px-3 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-md ${
                    totalCount > 0 ? "animate-pulse ring-2 ring-primary" : ""
                  }`}
                  title={isEn ? "Open Shopping Cart" : "Buka Keranjang Belanja"}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{isEn ? "Cart" : "Keranjang"}</span>
                  <span className="px-1.5 py-0.2 rounded-xs bg-white text-black font-extrabold text-[10px]">
                    {totalCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Header Banner */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[#7a5f00] dark:text-[#ffd400]">
              <span className="h-2 w-2 rounded-full bg-[#ffd400] animate-pulse" />
              <span>{t.products_badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
              {t.products_title}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
              {t.products_subtitle}
            </p>
          </div>

          {/* Search, Filter & Sort Toolbar */}
          <div className="p-3 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)] space-y-3 font-mono text-xs mb-6">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? "Search digital products..." : "Cari produk digital..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--vt-paper)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none focus:border-primary"
                />
              </div>

              {/* Sort Select & View Toggle */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={sortBy}
                    aria-label={isEn ? "Sort products" : "Urutkan produk"}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-[var(--vt-paper)] border border-[var(--vt-edge-lo-2)] rounded-xs px-2.5 py-1.5 text-xs outline-none font-bold text-[var(--vt-ink)] cursor-pointer"
                  >
                    <option value="default">{isEn ? "Latest First" : "Urutan Default"}</option>
                    <option value="price_asc">{isEn ? "Price: Low to High" : "Harga Terendah"}</option>
                    <option value="price_desc">{isEn ? "Price: High to Low" : "Harga Tertinggi"}</option>
                  </select>
                </div>

                <div className="flex items-center border border-[var(--vt-edge-lo-2)] bg-[var(--vt-paper)] p-0.5 rounded-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 transition-colors cursor-pointer rounded-2xs ${
                      viewMode === "grid"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isEn ? "Grid View" : "Tampilan Grid Visual"}
                    aria-label="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 transition-colors cursor-pointer rounded-2xs ${
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isEn ? "Compact Explorer List View" : "Tampilan Berkas Padat (Explorer)"}
                    aria-label="List View"
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 vt-scrollbar">
              <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                <span>{isEn ? "Category:" : "Kategori:"}</span>
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
                {isEn ? "All Products" : "Semua Produk"} ({allProducts.length})
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

          {/* Products Content: Empty vs List vs Grid */}
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center space-y-3 font-mono bg-[var(--vt-card)] vt-card-inset rounded-xs border border-dashed border-border p-6">
              <Package className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-bold text-[var(--vt-ink)]">
                {allProducts.length === 0
                  ? t.products_empty
                  : isEn
                  ? "No products matched your filter."
                  : "Tidak ada produk yang cocok dengan pencarian."}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Try another keyword or select All Products." : "Coba kata kunci lain atau pilih Semua Produk."}
              </p>
            </div>
          ) : viewMode === "list" ? (
            /* =======================================================
               COMPACT EXPLORER LIST VIEW
               ======================================================= */
            <div className="overflow-x-auto border border-border rounded-xs bg-[var(--vt-paper)] shadow-inner">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--vt-chrome)] border-b-2 border-[var(--vt-edge-lo-2)] text-[10px] text-[var(--vt-ink-mute)] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold">Produk / Item</th>
                    <th className="py-2.5 px-3 font-bold hidden sm:table-cell">Kategori</th>
                    <th className="py-2.5 px-3 font-bold">Harga</th>
                    <th className="py-2.5 px-3 font-bold hidden md:table-cell">Status</th>
                    <th className="py-2.5 px-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vt-edge-hi-2)] text-[var(--vt-ink)]">
                  {filteredProducts.map((product) => {
                    const title = isEn && product.titleEn ? product.titleEn : product.title;
                    const productUrl = `/toko/${getProductSlug(product)}`;
                    const isOutOfStock = product.stock === 0;

                    return (
                      <tr key={product.id} className="hover:bg-[var(--vt-chrome)] transition-colors group">
                        <td className="py-2.5 px-3">
                          <Link href={productUrl} className="flex items-center gap-2.5 group-hover:text-primary transition-colors">
                            {product.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.thumbnailUrl}
                                alt={title}
                                className="h-8 w-8 rounded-xs object-cover border border-border shrink-0 bg-muted"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-[#ffd400] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold font-display line-clamp-1 text-xs sm:text-sm">
                                {title}
                              </span>
                              <span className="text-[10px] text-muted-foreground block sm:hidden">
                                {product.category || "General"}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-2xs bg-muted border border-border">
                            {product.category || "General"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-pixel font-bold text-xs text-primary">
                          {formatIdr(product.priceAmount || 0)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[10px] hidden md:table-cell">
                          {isOutOfStock ? (
                            <span className="text-red-500 font-bold">Habis</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersedia</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {enableStoreCart && (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(product)}
                                disabled={isOutOfStock}
                                className="vt-btn vt-btn-chrome px-2 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-40 inline-flex items-center"
                                title={justAddedId === product.id ? "Ditambahkan" : "Tambah ke Keranjang"}
                              >
                                {justAddedId === product.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <ShoppingCart className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => buyNow(product)}
                              disabled={isOutOfStock}
                              className="vt-btn vt-btn-pink px-2.5 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-40"
                            >
                              <span>Beli</span>
                            </button>
                            <Link
                              href={productUrl}
                              className="vt-btn vt-btn-chrome px-2 py-1 text-[11px] font-bold inline-flex items-center"
                              title="Lihat Detail"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* =======================================================
               GRID VIEW
               ======================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((product, index) => {
                const title = isEn && product.titleEn ? product.titleEn : product.title;
                const description = isEn && product.descriptionEn ? product.descriptionEn : product.description;
                const productUrl = `/toko/${getProductSlug(product)}`;
                const isOutOfStock = product.stock === 0;

                return (
                  <div key={product.id} className="catalog-product-card flex flex-col h-full">
                    <OSWindow
                      title={`Product_Disk_0${index + 1}.zip`}
                      icon={<Package className="h-3 w-3 text-[#ffd400]" />}
                      statusText={
                        product.category
                          ? `Cat: ${product.category} // Ready`
                          : `Release: Ready // Instant Delivery`
                      }
                      className="h-full flex-1 shadow-sm hover:border-primary/50 transition-colors"
                      bodyClassName="flex flex-col justify-between h-full space-y-3.5"
                    >
                      <div className="space-y-3">
                        {/* Thumbnail */}
                        {product.thumbnailUrl && (
                          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xs border border-border bg-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.thumbnailUrl}
                              alt={title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            {product.badge && (
                              <span className="absolute top-2 left-2 bg-[#ffd400] text-black text-[9px] font-pixel font-bold px-1.5 py-0.5 border border-black shadow">
                                {product.badge}
                              </span>
                            )}
                          </div>
                        )}

                        <div>
                          <Link href={productUrl} className="group block">
                            <h3 className="font-bold text-base font-display text-[var(--vt-ink)] group-hover:text-primary transition-colors line-clamp-1 mb-1">
                              {title}
                            </h3>
                          </Link>
                          <p className="text-xs font-mono text-[var(--vt-ink-soft)] line-clamp-2 leading-relaxed">
                            {description}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-border/80">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold font-pixel text-primary">
                            {formatIdr(product.priceAmount || 0)}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-2xs border ${
                            isOutOfStock
                              ? "text-red-500 border-red-500/40 bg-red-500/10"
                              : "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                          }`}>
                            {isOutOfStock ? "Habis" : "Tersedia"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => buyNow(product)}
                            disabled={isOutOfStock}
                            className="flex-1 vt-btn vt-btn-pink py-2 text-xs font-bold text-white justify-center items-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Beli Langsung</span>
                          </button>
                          {enableStoreCart && (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              disabled={isOutOfStock}
                              className="vt-btn vt-btn-chrome p-2 text-xs font-bold inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                              title={justAddedId === product.id ? "Ditambahkan!" : "Tambah ke Keranjang"}
                            >
                              {justAddedId === product.id ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <Link
                            href={productUrl}
                            className="vt-btn vt-btn-chrome p-2 text-xs font-bold inline-flex items-center justify-center"
                            title="Lihat Detail"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </OSWindow>
                  </div>
                );
              })}
            </div>
          )}
        </OSWindow>
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
              {!trackedOrder ? (
                <form onSubmit={handleTrackOrder} className="space-y-3">
                  <p className="font-bold text-sm mb-1 text-[var(--vt-ink)]">
                    {isEn ? "Track Your Digital Order" : "Lacak Status Pesanan Digital"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Enter your invoice number received after checkout (e.g. INV-13102026-4821)."
                      : "Masukkan nomor invoice yang Anda dapatkan setelah checkout (contoh: INV-13102026-4821)."}
                  </p>
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
                      {isEn ? "Cancel" : "Batal"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSearchingTracker}
                      className="vt-btn vt-btn-pink flex-1 py-2 px-4 font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>
                        {isSearchingTracker
                          ? isEn
                            ? "Searching..."
                            : "Mencari..."
                          : isEn
                          ? "Check Order Status"
                          : "Cek Status Pesanan"}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
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
                  </div>
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
    </div>
  );
}
