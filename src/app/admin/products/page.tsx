"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  Globe,
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
import { getProducts, saveProduct, deleteProduct, translateFieldAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { getProductSlug, slugifyProduct } from "@/lib/product-link";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [translating, setTranslating] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formPriceFormatted, setFormPriceFormatted] = useState("");
  const [formComparePrice, setFormComparePrice] = useState("");
  const [formPriceAmount, setFormPriceAmount] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formGallery, setFormGallery] = useState<string[]>([]);
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formPublished, setFormPublished] = useState(true);
  const [formPurchaseType, setFormPurchaseType] = useState<"whatsapp" | "external" | "referral" | "affiliate">("whatsapp");
  const [formCustomWhatsapp, setFormCustomWhatsapp] = useState("");
  const [formCustomButtonLabel, setFormCustomButtonLabel] = useState("");

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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Guard "belum disimpan": baseline direset saat sessionKey berubah — yaitu
  // saat dialog tambah/edit dibuka atau item lain dipilih. Mengetik di form
  // tidak mengubah sessionKey, jadi perubahan terdeteksi sebagai dirty.
  useUnsavedChanges(
    selectedProduct?.id ?? (dialogOpen ? "new" : null),
    {
      formTitle,
      formSlug,
      formTitleEn,
      formDescription,
      formDescriptionEn,
      formPriceFormatted,
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
    },
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
    setFormPriceFormatted("Gratis");
    setFormComparePrice("");
    setFormPriceAmount("");
    setFormBadge("");
    setFormCategory("");
    setFormStock("");
    setFormGallery([]);
    setFormThumbnail("https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop");
    setFormCtaUrl("");
    setFormPublished(true);
    setFormPurchaseType("whatsapp");
    setFormCustomWhatsapp("");
    setFormCustomButtonLabel("");
    setDialogOpen(true);
  };

  const openEditDialog = (product: ProductData) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setErrorMessage("");
    setFormTitle(product.title);
    setFormSlug(product.slug || getProductSlug(product));
    setFormTitleEn(product.titleEn || "");
    setFormDescription(product.description);
    setFormDescriptionEn(product.descriptionEn || "");
    setFormPriceFormatted(product.priceFormatted);
    setFormComparePrice(product.comparePriceLabel || "");
    setFormPriceAmount(product.priceAmount !== null && product.priceAmount !== undefined ? String(product.priceAmount) : "");
    setFormBadge(product.badge || "");
    setFormCategory(product.category || "");
    setFormStock(product.stock !== null && product.stock !== undefined ? String(product.stock) : "");
    setFormGallery(product.gallery || []);
    setFormThumbnail(product.thumbnailUrl);
    setFormCtaUrl(product.ctaUrl);
    setFormPublished(product.published);
    setFormPurchaseType(product.purchaseType ?? "whatsapp");
    setFormCustomWhatsapp(product.customWhatsapp || "");
    setFormCustomButtonLabel(product.customButtonLabel || "");
    setDialogOpen(true);
  };

  const openDeleteConfirmation = (product: ProductData) => {
    setSelectedProduct(product);
    setDeleteAlertOpen(true);
  };

  const handleAutoTranslateToEn = async () => {
    setTranslating(true);
    try {
      if (formTitle) {
        const resTitle = await translateFieldAction(formTitle, "id", "en");
        if (resTitle.success && resTitle.text) {
          setFormTitleEn(resTitle.text);
        }
      }
      if (formDescription) {
        const resDesc = await translateFieldAction(formDescription, "id", "en");
        if (resDesc.success && resDesc.text) {
          setFormDescriptionEn(resDesc.text);
        }
      }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--vt-edge-lo-2)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--vt-ink)]">
            Katalog Produk Digital & Template
          </h1>
          <p className="text-sm text-[var(--vt-ink-mute)]">
            Kelola boilerplate kode, ebook teknis, dan asset digital berbayar maupun gratis yang Anda tawarkan.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-2 text-xs h-9">
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Produk Baru</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--vt-ink-mute)]" />
          <Input
            placeholder="Cari nama produk atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
          />
        </div>

        <div className="text-xs text-[var(--vt-ink-mute)]">
          Total: <strong>{products.length}</strong> produk digital
        </div>
      </div>

      {/* Table */}
       <Card className="overflow-hidden bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
                 <TableRow className="bg-[var(--vt-card)] hover:bg-[var(--vt-edge-hi-2)]">
                <TableHead className="w-[320px] text-xs font-semibold">Produk</TableHead>
                <TableHead className="text-xs font-semibold">Harga</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat produk...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs">
                    Tidak ada produk digital yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 relative rounded-md overflow-hidden bg-muted/50 shrink-0 border border-[var(--vt-edge-lo-2)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5 max-w-sm">
                           <p className="text-xs font-semibold text-[var(--vt-ink)] line-clamp-1">
                            {product.title}
                          </p>
                          {product.titleEn && (
                               <p className="text-[10px] text-[var(--vt-ink-mute)] line-clamp-1 flex items-center gap-1">
                              <span className="text-[9px] bg-muted px-1 rounded border font-mono">EN</span>
                              <span>{product.titleEn}</span>
                            </p>
                          )}
                           <p className="text-[11px] text-[var(--vt-ink-mute)] line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {product.priceFormatted}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant={product.published ? "secondary" : "outline"}
                        className="text-[10px] py-0 px-2 font-normal"
                      >
                        {product.published ? "Tersedia" : "Disembunyikan"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {product.ctaUrl && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)]"
                            title="Buka Tautan Pembelian"
                          >
                            <Link href={product.ctaUrl} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)]"
                          title="Preview Halaman Produk"
                        >
                          <Link href={`/toko/${getProductSlug(product)}`}>
                            <Globe className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)]"
                          title="Sunting Produk"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(product)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
              {isEditing ? "Sunting Data Produk Digital" : "Tambah Produk Digital Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--vt-ink-mute)]">
              Katalog produk digital yang dipajang di halaman muka portofolio Anda.
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
                  {formTitleEn ? (
                    <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 rounded">✓</span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="id" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-medium text-[var(--vt-ink)]">
                    Nama Produk Digital (ID) *
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
                  <Label htmlFor="desc" className="text-xs font-medium text-[var(--vt-ink)]">
                    Deskripsi Singkat & Fitur Utama (ID) *
                  </Label>
                  <Textarea
                    id="desc"
                    required
                    rows={3}
                    placeholder="Template production-ready dengan otentikasi, database, dan payment gateway..."
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
                    Nama Produk Digital (EN)
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
                  <Label htmlFor="descEn" className="text-xs font-medium">
                    Deskripsi Singkat & Fitur Utama (EN)
                  </Label>
                  <Textarea
                    id="descEn"
                    rows={3}
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
                  Label Harga (ID/EN) *
                </Label>
                <Input
                  id="price"
                  required
                  placeholder="Rp 199.000 / $19"
                  value={formPriceFormatted}
                  onChange={(e) => setFormPriceFormatted(e.target.value)}
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
                  Nominal Rp (angka, untuk keranjang)
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

              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-medium text-[var(--vt-ink)]">
                  Kategori
                </Label>
                <Input
                  id="category"
                  placeholder="Template, E-Book, Jasa"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseType" className="text-xs font-medium text-[var(--vt-ink)]">
                  Tipe Penjualan *
                </Label>
                <select
                  id="purchaseType"
                  value={formPurchaseType}
                  onChange={(e) =>
                    setFormPurchaseType(e.target.value as "whatsapp" | "external" | "referral" | "affiliate")
                  }
                  className="flex h-9 w-full rounded-md border border-[var(--vt-edge-lo-2)] bg-[var(--vt-paper)] px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="whatsapp">WhatsApp Langsung</option>
                  <option value="external">Toko Online / Platform Eksternal</option>
                  <option value="referral">Link Referral</option>
                  <option value="affiliate">Link Affiliate</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl" className="text-xs font-medium text-[var(--vt-ink)]">
                  URL Tujuan (Jika eksternal/referral/affiliate)
                </Label>
                <Input
                  id="ctaUrl"
                  placeholder="https://shopee.co.id/..."
                  value={formCtaUrl || ''}
                  onChange={(e) => setFormCtaUrl(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  disabled={formPurchaseType === "whatsapp"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customWhatsapp" className="text-xs font-medium text-[var(--vt-ink)]">
                  No. WA Khusus (Jika WhatsApp)
                </Label>
                <Input
                  id="customWhatsapp"
                  placeholder="6281234567890 (kosongkan u/ profil utama)"
                  value={formCustomWhatsapp || ''}
                  onChange={(e) => setFormCustomWhatsapp(e.target.value)}
                  className="text-xs bg-[var(--vt-paper)] border-[var(--vt-edge-lo-2)]"
                  disabled={formPurchaseType !== "whatsapp"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customButtonLabel" className="text-xs font-medium text-[var(--vt-ink)]">
                  Teks Tombol Kustom (Opsional)
                </Label>
                <Input
                  id="customButtonLabel"
                  placeholder="Mis: Beli di Shopee"
                  value={formCustomButtonLabel || ''}
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
    </div>
  );
}
