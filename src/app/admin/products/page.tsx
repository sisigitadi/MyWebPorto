"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  Globe,
  Share2,
  ShoppingBag,
  Settings,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  GripVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/admin/image-upload";
import { ProductData } from "@/lib/dummy-data";
import { getProducts, saveProduct, deleteProduct, translateFieldAction, reorderProducts } from "@/lib/actions";
import {
  getStoreConfig,
  getPendingOrdersCount,
  type StoreConfig,
} from "@/lib/order-actions";
import { DEFAULT_STORE_CONFIG } from "@/lib/store-config";
import { PaymentMethodsManager } from "@/components/admin/payment-methods-manager";
import { ProductShareModal } from "@/components/public/product-share-modal";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { getProductSlug, slugifyProduct } from "@/lib/product-link";
import { isTranslationErrorPayload } from "@/lib/content-edit";
import { toast } from "sonner";

const DEFAULT_PRODUCT_CATEGORIES = [
  "Template",
  "E-Book",
  "Source Code",
  "Akun Berlangganan",
  "Jasa & Layanan",
  "Aplikasi & Tools",
  "Kelas & Kursus",
  "Desain & Aset",
  "Affiliate & Mitra",
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isReorderActive = searchQuery.trim() === "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [translating, setTranslating] = useState(false);

  // Promo & Share modal state
  const [promoProduct, setPromoProduct] = useState<ProductData | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);

  // Store Settings (No WA Admin, Rekening, QRIS, Internasional)
  const [storeConfigOpen, setStoreConfigOpen] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formPriceFormatted, setFormPriceFormatted] = useState("");
  const [formPriceLabelEn, setFormPriceLabelEn] = useState("");
  const [formComparePrice, setFormComparePrice] = useState("");
  const [formPriceAmount, setFormPriceAmount] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Kumpulan kategori produk unik dari produk terdaftar + preset standar
  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_PRODUCT_CATEGORIES);
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);
  const [formStock, setFormStock] = useState("");
  const [formGallery, setFormGallery] = useState<string[]>([]);
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formPublished, setFormPublished] = useState(true);
  const [formPurchaseType, setFormPurchaseType] = useState<
    "whatsapp" | "whatsapp_custom" | "freelanceops" | "external" | "referral" | "affiliate"
  >("whatsapp");
  const [formCustomWhatsapp, setFormCustomWhatsapp] = useState("");
  const [formCustomButtonLabel, setFormCustomButtonLabel] = useState("");
  const [formReferralCode, setFormReferralCode] = useState("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      if (data) {
        setProducts(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = (newItems: ProductData[]) => {
    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
    setProducts(reordered);

    startTransition(async () => {
      try {
        const payload = reordered.map((item) => ({ id: item.id, order: item.order ?? 0 }));
        const res = await reorderProducts(payload);
        if (res.success) {
          toast.success(res.message || "Urutan produk berhasil diperbarui!");
        } else {
          toast.error(res.error || "Gagal memperbarui urutan.");
          await fetchProducts();
        }
      } catch (err) {
        console.error("Reorder products failed:", err);
        toast.error("Gagal menyimpan perubahan urutan.");
        await fetchProducts();
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReorderActive) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isReorderActive) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isReorderActive) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...products];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    setDraggedIndex(null);
    setDragOverIndex(null);
    handleReorder(newItems);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!isReorderActive) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;
    const newItems = [...products];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, movedItem);
    handleReorder(newItems);
  };

  const loadStoreConfig = async () => {
    try {
      const [cfg, count] = await Promise.all([
        getStoreConfig(),
        getPendingOrdersCount(),
      ]);
      if (cfg) setStoreConfig(cfg);
      setPendingOrdersCount(count);
    } catch (err) {
      console.error("[admin] loadStoreConfig failed:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      loadStoreConfig();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useUnsavedChanges(
    selectedProduct?.id ?? (dialogOpen ? "new" : null),
    {
      formTitle,
      formSlug,
      formTitleEn,
      formDescription,
      formDescriptionEn,
      formPriceFormatted,
      formPriceLabelEn,
      formComparePrice,
      formPriceAmount,
      formBadge,
      formCategory,
      formStock,
      formGallery,
      formThumbnail,
      formCtaUrl,
      formPublished,
      formPurchaseType,
      formCustomWhatsapp,
      formCustomButtonLabel,
      formReferralCode,
    }
  );

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.titleEn && p.titleEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openCreateDialog = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setErrorMessage("");
    setFormTitle("");
    setFormSlug("");
    setFormTitleEn("");
    setFormDescription("");
    setFormDescriptionEn("");
    setFormPriceFormatted("Gratis / Diskusi");
    setFormPriceLabelEn("");
    setFormComparePrice("");
    setFormPriceAmount("");
    setFormBadge("");
    setFormCategory("");
    setIsCustomCategory(false);
    setFormStock("");
    setFormGallery([]);
    setFormThumbnail("https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop");
    setFormCtaUrl("");
    setFormPublished(true);
    setFormPurchaseType("whatsapp");
    setFormCustomWhatsapp("");
    setFormCustomButtonLabel("");
    setFormReferralCode("");
    setDialogOpen(true);
  };

  const openEditDialog = (product: ProductData) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setErrorMessage("");
    setFormTitle(product.title);
    setFormSlug(product.slug || getProductSlug(product));
    setFormTitleEn(product.titleEn && !isTranslationErrorPayload(product.titleEn) ? product.titleEn : "");
    setFormDescription(product.description);
    setFormDescriptionEn(product.descriptionEn && !isTranslationErrorPayload(product.descriptionEn) ? product.descriptionEn : "");
    setFormPriceFormatted(product.priceFormatted);
    setFormPriceLabelEn(product.priceLabelEn || "");
    setFormComparePrice(product.comparePriceLabel || "");
    setFormPriceAmount(product.priceAmount !== null && product.priceAmount !== undefined ? String(product.priceAmount) : "");
    setFormBadge(product.badge || "");
    const initialCategory = product.category || "";
    setFormCategory(initialCategory);
    setIsCustomCategory(Boolean(initialCategory && !availableCategories.includes(initialCategory)));
    setFormStock(product.stock !== null && product.stock !== undefined ? String(product.stock) : "");
    setFormGallery(product.gallery || []);
    setFormThumbnail(product.thumbnailUrl);
    setFormCtaUrl(product.ctaUrl);
    setFormPublished(product.published);
    setFormPurchaseType(
      (product.purchaseType as "whatsapp" | "whatsapp_custom" | "freelanceops" | "external" | "referral" | "affiliate") || "whatsapp"
    );
    setFormCustomWhatsapp(product.customWhatsapp || "");
    setFormCustomButtonLabel(product.customButtonLabel || "");
    setFormReferralCode(product.referralCode || "");
    setDialogOpen(true);
  };

  const openDeleteConfirmation = (product: ProductData) => {
    setSelectedProduct(product);
    setDeleteAlertOpen(true);
  };

  const handleAutoTranslateToEn = async () => {
    if (!formTitle && !formDescription) return;
    setTranslating(true);
    if (isTranslationErrorPayload(formTitleEn)) setFormTitleEn("");
    if (isTranslationErrorPayload(formDescriptionEn)) setFormDescriptionEn("");
    let titleSuccess = false;
    let descSuccess = false;
    let errMessage = "";

    try {
      if (formTitle) {
        const resTitle = await translateFieldAction(formTitle, "id", "en");
        if (resTitle.success && resTitle.text && !isTranslationErrorPayload(resTitle.text)) {
          setFormTitleEn(resTitle.text);
          titleSuccess = true;
        } else if (resTitle.error) {
          errMessage = resTitle.error;
        }
      }
      if (formDescription) {
        const resDesc = await translateFieldAction(formDescription, "id", "en");
        if (resDesc.success && resDesc.text && !isTranslationErrorPayload(resDesc.text)) {
          setFormDescriptionEn(resDesc.text);
          descSuccess = true;
        } else if (resDesc.error) {
          errMessage = resDesc.error;
        }
      }

      if (titleSuccess || descSuccess) {
        toast.success("Berhasil menerjemahkan ke bahasa Inggris!");
      } else if (errMessage) {
        toast.error("Gagal menerjemahkan", { description: errMessage });
      }
    } catch (err: unknown) {
      toast.error("Gagal menerjemahkan teks", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan koneksi",
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const payload = {
        id: isEditing && selectedProduct ? selectedProduct.id : undefined,
        slug: formSlug.trim() || slugifyProduct(formTitle),
        title: formTitle,
        titleEn: formTitleEn,
        description: formDescription,
        descriptionEn: formDescriptionEn,
        imageUrl: formThumbnail,
        priceLabel: formPriceFormatted,
        priceLabelEn: formPriceLabelEn.trim() || undefined,
        comparePriceLabel: formComparePrice.trim() || undefined,
        priceAmount: formPriceAmount.trim() === "" ? undefined : formPriceAmount.trim(),
        badge: formBadge.trim() || undefined,
        category: formCategory.trim() || undefined,
        stock: formStock.trim() === "" ? undefined : formStock.trim(),
        gallery: formGallery,
        ctaUrl: formCtaUrl.trim() || undefined,
        published: formPublished,
        purchaseType: formPurchaseType,
        customWhatsapp: formCustomWhatsapp.trim() || undefined,
        customButtonLabel: formCustomButtonLabel.trim() || undefined,
        referralCode: formReferralCode.trim() || undefined,
      };

      try {
        const res = await saveProduct(payload);
        if (res.success) {
          setDialogOpen(false);
          toast.success(res.message || "Produk berhasil disimpan!");
          await fetchProducts();
        } else {
          setErrorMessage(res.error || "Gagal menyimpan produk.");
          toast.error(res.error || "Gagal menyimpan produk.");
        }
      } catch (err) {
        console.error("[admin] saveProduct gagal:", err);
        setErrorMessage("Gagal menghubungi server. Periksa koneksi, muat ulang halaman, lalu coba lagi.");
        toast.error("Gagal menghubungi server. Coba simpan lagi.");
      }
    });
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;

    startTransition(async () => {
      try {
        const res = await deleteProduct(selectedProduct.id);
        if (res.success) {
          setDeleteAlertOpen(false);
          setSelectedProduct(null);
          toast.success(res.message || "Produk berhasil dihapus!");
          await fetchProducts();
        } else {
          toast.error(res.error || "Gagal menghapus produk.");
        }
      } catch (err) {
        console.error("[admin] deleteProduct gagal:", err);
        toast.error("Gagal menghubungi server. Muat ulang halaman lalu coba lagi.");
      }
    });
  };



  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--vt-edge-lo-2)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--vt-ink)]">
            Katalog Produk Digital, Jasa & Template
          </h1>
          <p className="text-sm text-[var(--vt-ink-mute)]">
            Kelola template kode, jasa proyek FreelanceOps, ebook, dan aset digital dengan nomor WA admin terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="vt-btn vt-btn-chrome h-9 px-3 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            <span>Kelola Pesanan</span>
            {pendingOrdersCount > 0 && (
              <Badge className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0 h-4">
                {pendingOrdersCount} Baru
              </Badge>
            )}
          </Link>
          <Button onClick={openCreateDialog} size="sm" className="gap-2 text-xs h-9">
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Produk Baru</span>
          </Button>
        </div>
      </div>

      {/* BANNER PENGATURAN TOKO & METODE PEMBAYARAN TERPUSAT */}
      <Card className="bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)] overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => setStoreConfigOpen(!storeConfigOpen)}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Pengaturan Metode Pembayaran &amp; Rekening Toko</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Multi Rekening &amp; Toggle Aktif/Nonaktif
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {storeConfig.adminWhatsapp
                  ? `Nomor WA Admin: ${storeConfig.adminWhatsapp} • ${storeConfig.bankAccounts.filter((b) => b.isActive !== false).length} Rekening Bank Aktif`
                  : "Kelola nomor rekening bank, status aktif/nonaktif, QRIS, dan metode pembayaran toko."}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <span>{storeConfigOpen ? "Tutup Pengaturan" : "Buka Pengaturan"}</span>
            {storeConfigOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {storeConfigOpen && (
          <div className="p-4 pt-0 border-t border-border animate-in fade-in">
            <PaymentMethodsManager
              showCardWrapper={false}
              onSaved={(newCfg) => setStoreConfig(newCfg)}
            />
          </div>
        )}
      </Card>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--vt-ink-mute)]" />
          <Input
            placeholder="Cari..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
          />
        </div>

        <div className="text-xs text-[var(--vt-ink-mute)]">
          Total: <strong>{products.length}</strong> produk / jasa
        </div>
      </div>

      {/* Table Katalog Produk (Mobile Cards + Desktop Table) */}
      <Card className="overflow-hidden bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)]">
        {/* Mobile View (<md) */}
        <div className="md:hidden divide-y divide-[var(--vt-edge-lo-2)]">
          {isLoading ? (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <span>Memuat produk...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-xs font-mono">
              Tidak ada produk digital yang ditemukan.
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <div key={`m-prod-${product.id}`} className="p-3.5 space-y-3 font-mono text-xs">
                <div className="flex items-start gap-3">
                  {isReorderActive && (
                    <div className="flex flex-col items-center justify-center pt-1 shrink-0">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground mb-1">
                        #{index + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1 rounded hover:bg-muted"
                          title="Pindahkan ke atas"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === products.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-1 rounded hover:bg-muted"
                          title="Pindahkan ke bawah"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0 border border-[var(--vt-edge-lo-2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold text-xs text-[var(--vt-ink)] truncate">{product.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{product.priceFormatted}</span>
                      {product.priceLabelEn && (
                        <span className="text-[10px] text-muted-foreground">({product.priceLabelEn})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Badge variant={product.published ? "default" : "outline"} className="text-[9px] px-1 h-4">
                        {product.published ? "Terbit" : "Draf"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1 h-4 uppercase">
                        {product.purchaseType || "whatsapp"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPromoProduct(product);
                      setPromoOpen(true);
                    }}
                    className="h-7 px-2 text-xs text-primary gap-1 shrink-0"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Bagikan</span>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Link href={`/toko/${getProductSlug(product)}`} target="_blank">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Lihat</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(product)}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteConfirmation(product)}
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>=md) */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow className="bg-[var(--vt-card)] hover:bg-[var(--vt-edge-hi-2)]">
                <TableHead className="w-20 text-xs font-semibold">Urutan</TableHead>
                <TableHead className="w-[320px] text-xs font-semibold">Produk / Layanan</TableHead>
                <TableHead className="text-xs font-semibold">Harga (ID / EN)</TableHead>
                <TableHead className="text-xs font-semibold">Tipe Penjualan</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat produk...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    Tidak ada produk digital yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => (
                  <TableRow
                    key={product.id}
                    draggable={isReorderActive}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`transition-colors hover:bg-[var(--vt-edge-hi-2)] ${
                      draggedIndex === index ? "opacity-40 bg-muted/60" : ""
                    } ${
                      dragOverIndex === index && draggedIndex !== index
                        ? "border-t-2 border-primary"
                        : ""
                    }`}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center text-muted-foreground ${
                            isReorderActive
                              ? "cursor-grab active:cursor-grabbing hover:text-foreground"
                              : "opacity-40 cursor-not-allowed"
                          }`}
                          title={
                            isReorderActive
                              ? "Tahan dan geser untuk mengubah urutan"
                              : "Hapus filter pencarian untuk mengatur urutan"
                          }
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground font-semibold min-w-4 text-center">
                          {isReorderActive ? index + 1 : (product.order || "-")}
                        </span>
                        {isReorderActive && (
                          <div className="flex flex-col ml-0.5">
                            <button
                              type="button"
                              onClick={() => handleMove(index, "up")}
                              disabled={index === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 transition-opacity"
                              title="Pindahkan ke atas"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(index, "down")}
                              disabled={index === products.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 transition-opacity"
                              title="Pindahkan ke bawah"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0 border border-[var(--vt-edge-lo-2)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-[240px]">
                          <p className="font-medium text-xs truncate text-[var(--vt-ink)]">{product.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{product.category || "Digital"}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono">
                      <div>{product.priceFormatted}</div>
                      {product.priceLabelEn && (
                        <div className="text-[10px] text-muted-foreground">{product.priceLabelEn}</div>
                      )}
                    </TableCell>

                    <TableCell>
                      {product.purchaseType === "freelanceops" ? (
                        <Badge className="bg-primary text-primary-foreground text-[10px]">
                          FreelanceOps
                        </Badge>
                      ) : product.purchaseType === "whatsapp_custom" ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500 text-[10px]">
                          WA Khusus
                        </Badge>
                      ) : product.purchaseType === "referral" ? (
                        <Badge variant="outline" className="text-amber-500 border-amber-500 text-[10px]">
                          Referral
                        </Badge>
                      ) : product.purchaseType === "affiliate" ? (
                        <Badge variant="outline" className="text-purple-500 border-purple-500 text-[10px]">
                          Affiliate
                        </Badge>
                      ) : product.purchaseType === "external" ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Eksternal
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Toko Web
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={product.published ? "default" : "secondary"}
                        className="text-[10px] font-normal"
                      >
                        {product.published ? "Tayang" : "Draft"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Tombol Bagikan & Promosi (Share Kit) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPromoProduct(product);
                            setPromoOpen(true);
                          }}
                          className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                          title="Alat Promosi & Bagikan (Share Kit)"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)] cursor-pointer"
                          title="Preview Halaman Publik"
                        >
                          <Link href={`/toko/${getProductSlug(product)}`} target="_blank">
                            <Globe className="h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)] cursor-pointer"
                          title="Sunting Produk"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(product)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Dialog Form Tambah/Sunting Produk */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[var(--vt-ink)]">
              {isEditing ? "Sunting Data Produk / Jasa" : "Tambah Produk / Jasa Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--vt-ink-mute)]">
              Katalog produk digital dan jasa proyek yang dipajang di etalase toko.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <Tabs defaultValue="id" className="w-full">
              <TabsList className="grid grid-cols-2 mb-3 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]">
                <TabsTrigger value="id" className="text-xs gap-1.5">
                  <span>🇮🇩</span> Bahasa Indonesia
                </TabsTrigger>
                <TabsTrigger value="en" className="text-xs gap-1.5">
                  <span>🇬🇧</span> English (EN)
                  {formTitleEn ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="id" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-medium text-[var(--vt-ink)]">
                    Nama Produk / Jasa (ID) *
                  </Label>
                  <Input
                    id="title"
                    required
                    placeholder="Contoh: Next.js 15 SaaS Starter Boilerplate"
                    value={formTitle}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setFormTitle(nextTitle);
                      if (!isEditing) setFormSlug(slugifyProduct(nextTitle));
                    }}
                    className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="desc" className="text-xs font-medium text-[var(--vt-ink)]">
                      Deskripsi Singkat &amp; Fitur Utama (ID) *
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formDescription.length.toLocaleString("id-ID")} / 50.000
                    </span>
                  </div>
                  <Textarea
                    id="desc"
                    required
                    rows={4}
                    placeholder="Template production-ready dengan auth, database, dan payment..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                <div className="flex items-center justify-between bg-[var(--vt-card)] p-2.5 rounded-md border border-[var(--vt-edge-lo-2)]">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span>Kosongkan bila mode EN cukup memakai teks Indonesia</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAutoTranslateToEn}
                    disabled={translating || (!formTitle && !formDescription)}
                    className="h-7 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                  >
                    {translating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    <span>Terjemahkan (ID &rarr; EN)</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titleEn" className="text-xs font-medium text-[var(--vt-ink)]">
                    Nama Produk / Jasa (EN)
                  </Label>
                  <Input
                    id="titleEn"
                    placeholder="e.g. Next.js 15 SaaS Starter Boilerplate"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="descEn" className="text-xs font-medium">
                      Deskripsi Singkat &amp; Fitur Utama (EN)
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formDescriptionEn.length.toLocaleString("id-ID")} / 50.000
                    </span>
                  </div>
                  <Textarea
                    id="descEn"
                    rows={4}
                    placeholder="Production-ready template with auth, database, and payments..."
                    value={formDescriptionEn}
                    onChange={(e) => setFormDescriptionEn(e.target.value)}
                    className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2 border-t border-[var(--vt-edge-lo-2)] pt-4">
              <Label htmlFor="slug" className="text-xs font-medium">
                Slug URL Produk *
              </Label>
              <Input
                id="slug"
                required
                placeholder="template-portfolio-notion"
                value={formSlug}
                onChange={(e) => setFormSlug(slugifyProduct(e.target.value))}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-[var(--vt-ink-mute)] font-mono">
                Link share: /toko/{formSlug || "slug-produk"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--vt-edge-lo-2)]">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-medium text-[var(--vt-ink)]">
                  Label Harga (ID) *
                </Label>
                <Input
                  id="price"
                  required
                  placeholder="Rp 199.000"
                  value={formPriceFormatted}
                  onChange={(e) => setFormPriceFormatted(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceEn" className="text-xs font-medium text-[var(--vt-ink)]">
                  Label Harga Internasional (EN)
                </Label>
                <Input
                  id="priceEn"
                  placeholder="$19 USD"
                  value={formPriceLabelEn}
                  onChange={(e) => setFormPriceLabelEn(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comparePrice" className="text-xs font-medium text-[var(--vt-ink)]">
                  Harga Coret (opsional)
                </Label>
                <Input
                  id="comparePrice"
                  placeholder="Rp 299.000"
                  value={formComparePrice}
                  onChange={(e) => setFormComparePrice(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceAmount" className="text-xs font-medium text-[var(--vt-ink)]">
                  Nominal Angka (untuk kalkulasi keranjang)
                </Label>
                <Input
                  id="priceAmount"
                  type="number"
                  min={0}
                  placeholder="199000 (kosong = hubungi)"
                  value={formPriceAmount}
                  onChange={(e) => setFormPriceAmount(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs font-medium text-[var(--vt-ink)]">
                  Stok (kosong = digital/tanpa batas)
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  placeholder="10"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge" className="text-xs font-medium text-[var(--vt-ink)]">
                  Badge (mis. Baru, Terlaris)
                </Label>
                <Input
                  id="badge"
                  placeholder="Terlaris"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              {/* Kategori Produk (Pilihan Dropdown, Kustom, & Quick-Pick Chips) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="categorySelect" className="text-xs font-medium text-[var(--vt-ink)] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[var(--vt-accent)]" />
                    <span>Kategori Produk</span>
                  </Label>
                  {formCategory && (
                    <span className="text-[11px] text-[var(--vt-ink-mute)]">
                      Terpilih: <strong className="text-[var(--vt-ink)]">{formCategory}</strong>
                    </span>
                  )}
                </div>

                {/* Dropdown Pilihan Kategori */}
                <select
                  id="categorySelect"
                  value={
                    isCustomCategory
                      ? "__custom__"
                      : availableCategories.includes(formCategory)
                      ? formCategory
                      : formCategory
                      ? "__custom__"
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__custom__") {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setFormCategory(val);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-[var(--vt-edge-lo-2)] bg-[var(--vt-paper)] px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- Pilih Kategori Produk --</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">✏️ + Tambah Kategori Baru (Kustom)...</option>
                </select>

                {/* Input teks kustom bila memilih opsi kustom atau kategori belum terdaftar */}
                {(isCustomCategory || (formCategory && !availableCategories.includes(formCategory))) && (
                  <div className="p-2.5 rounded-md border border-dashed border-[var(--vt-edge-lo-2)] bg-[var(--vt-paper-lo)] space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customCategoryInput" className="text-[11px] font-medium text-[var(--vt-ink-mute)]">
                        Nama Kategori Baru / Kustom:
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setFormCategory("");
                        }}
                        className="text-[11px] text-[var(--vt-accent)] hover:underline"
                      >
                        Batal / Pilih dari daftar
                      </button>
                    </div>
                    <Input
                      id="customCategoryInput"
                      placeholder="Contoh: UI Kit, Video Tutorial, Plugin"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                      autoFocus
                    />
                  </div>
                )}

                {/* Quick-Pick Chips (Badges) */}
                <div className="pt-0.5">
                  <div className="text-[10px] font-semibold text-[var(--vt-ink-mute)] uppercase tracking-wider mb-1.5">
                    Pilihan Cepat (Klik untuk memilih):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCategories.map((cat) => {
                      const isSelected = formCategory === cat && !isCustomCategory;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormCategory("");
                              setIsCustomCategory(false);
                            } else {
                              setFormCategory(cat);
                              setIsCustomCategory(false);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition-all border inline-flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-[var(--vt-accent)] text-white border-[var(--vt-accent)] font-semibold shadow-xs"
                              : "bg-[var(--vt-paper)] text-[var(--vt-ink)] border-[var(--vt-edge-lo-2)] hover:border-[var(--vt-accent)] hover:bg-[var(--vt-paper-hi)]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(true);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all border border-dashed inline-flex items-center gap-1 cursor-pointer ${
                        isCustomCategory
                          ? "bg-[var(--vt-accent-lo)] text-[var(--vt-accent)] border-[var(--vt-accent)] font-semibold"
                          : "bg-transparent text-[var(--vt-ink-mute)] border-[var(--vt-edge-lo-2)] hover:border-[var(--vt-accent)] hover:text-[var(--vt-ink)]"
                      }`}
                    >
                      <span>+ Lainnya...</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tipe Penjualan */}
              <div className="space-y-2">
                <Label htmlFor="purchaseType" className="text-xs font-medium text-[var(--vt-ink)]">
                  Tipe Penjualan *
                </Label>
                <select
                  id="purchaseType"
                  value={formPurchaseType}
                  onChange={(e) => {
                    const nextVal = e.target.value as "whatsapp" | "whatsapp_custom" | "freelanceops" | "external" | "referral" | "affiliate";
                    setFormPurchaseType(nextVal);
                    if (nextVal === "freelanceops" && !formCtaUrl) {
                      setFormCtaUrl("https://freelanceops.sigitadi.id/");
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-[var(--vt-edge-lo-2)] bg-[var(--vt-paper)] px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="whatsapp">Toko Digital (Keranjang & Express Checkout Web)</option>
                  <option value="whatsapp_custom">Pesanan Khusus / Nego (Langsung Chat WhatsApp)</option>
                  <option value="freelanceops">Jasa / Proyek (Portal FreelanceOps)</option>
                  <option value="external">Toko Online / Platform Eksternal</option>
                  <option value="referral">Link Referral (Direct Link)</option>
                  <option value="affiliate">Link Affiliate (Direct Link)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl" className="text-xs font-medium text-[var(--vt-ink)]">
                  URL Tujuan (FreelanceOps / Eksternal / Affiliate / Referral)
                </Label>
                <Input
                  id="ctaUrl"
                  placeholder="https://freelanceops.sigitadi.id/..."
                  value={formCtaUrl || ""}
                  onChange={(e) => setFormCtaUrl(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  disabled={formPurchaseType === "whatsapp" || formPurchaseType === "whatsapp_custom"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-xs font-medium text-[var(--vt-ink)]">
                  Kode Promo Referral Mitra (Opsional)
                </Label>
                <Input
                  id="referralCode"
                  placeholder="PROMO50"
                  value={formReferralCode || ""}
                  onChange={(e) => setFormReferralCode(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)] font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customButtonLabel" className="text-xs font-medium text-[var(--vt-ink)]">
                  Teks Tombol Kustom (Opsional)
                </Label>
                <Input
                  id="customButtonLabel"
                  placeholder="Mis: Mulai Proyek di FreelanceOps"
                  value={formCustomButtonLabel || ""}
                  onChange={(e) => setFormCustomButtonLabel(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--vt-ink)] block mb-2">Gambar Produk</Label>
              <ImageUpload
                value={formThumbnail}
                onChange={(url) => setFormThumbnail(url)}
                label="Unggah Cover"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--vt-ink)] block mb-2">
                Galeri Tambahan ({formGallery.length}/10)
              </Label>
              {formGallery.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formGallery.map((url) => (
                    <div key={url} className="relative h-14 w-14 rounded overflow-hidden border border-[var(--vt-edge-lo-2)] bg-muted shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Galeri" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormGallery((prev) => prev.filter((u) => u !== url))}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 text-white text-[10px] leading-none cursor-pointer"
                        title="Hapus gambar ini"
                        aria-label="Hapus gambar galeri"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formGallery.length < 10 && (
                <ImageUpload
                  value=""
                  onChange={(url) => {
                    if (url) setFormGallery((prev) => (prev.includes(url) || prev.length >= 10 ? prev : [...prev, url]));
                  }}
                  label="Tambah ke Galeri"
                />
              )}
            </div>

            <div className="pt-3 border-t border-[var(--vt-edge-lo-2)] flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--vt-ink)]">
                <input
                  type="checkbox"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                  className="rounded border-[var(--vt-edge-lo-2)]"
                />
                <span>Tampilkan di Publik</span>
              </label>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} size="sm" className="text-xs h-8 gap-1.5">
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isEditing ? "Simpan Perubahan" : "Buat Produk"}</span>
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Konfirmasi Hapus Produk */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Produk Digital?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[var(--vt-ink-mute)]">
              Apakah Anda yakin ingin menghapus produk <strong>{selectedProduct?.title}</strong>? Data yang dihapus tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8" disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={isPending}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Produk"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Share & Promo Kit */}
      {promoProduct && (
        <ProductShareModal
          product={promoProduct}
          isOpen={promoOpen}
          onClose={() => {
            setPromoOpen(false);
            setPromoProduct(null);
          }}
          isEn={false}
        />
      )}
    </div>
  );
}
