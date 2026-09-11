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
import { DUMMY_PRODUCTS, ProductData } from "@/lib/dummy-data";
import { getProducts, saveProduct, deleteProduct, translateFieldAction } from "@/lib/actions";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductData[]>(DUMMY_PRODUCTS);
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
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formPriceFormatted, setFormPriceFormatted] = useState("");
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formPublished, setFormPublished] = useState(true);

  const fetchProducts = async () => {
    const data = await getProducts();
    if (data) {
      setProducts(data);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
    setFormTitleEn("");
    setFormDescription("");
    setFormDescriptionEn("");
    setFormPriceFormatted("Gratis");
    setFormThumbnail("https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop");
    setFormCtaUrl("");
    setFormPublished(true);
    setDialogOpen(true);
  };

  const openEditDialog = (product: ProductData) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setErrorMessage("");
    setFormTitle(product.title);
    setFormTitleEn(product.titleEn || "");
    setFormDescription(product.description);
    setFormDescriptionEn(product.descriptionEn || "");
    setFormPriceFormatted(product.priceFormatted);
    setFormThumbnail(product.thumbnailUrl);
    setFormCtaUrl(product.ctaUrl);
    setFormPublished(product.published);
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
        title: formTitle,
        titleEn: formTitleEn,
        description: formDescription,
        descriptionEn: formDescriptionEn,
        imageUrl: formThumbnail,
        priceLabel: formPriceFormatted,
        ctaUrl: formCtaUrl.trim() || undefined,
        published: formPublished,
      };

      const res = await saveProduct(payload);
      if (res.success) {
        setDialogOpen(false);
        await fetchProducts();
      } else {
        setErrorMessage(res.error || "Gagal menyimpan produk.");
      }
    });
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;

    startTransition(async () => {
      const res = await deleteProduct(selectedProduct.id);
      if (res.success) {
        setDeleteAlertOpen(false);
        setSelectedProduct(null);
        await fetchProducts();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Katalog Produk Digital & Template
          </h1>
          <p className="text-sm text-muted-foreground">
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
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama produk atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Total: <strong>{products.length}</strong> produk digital
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[320px] text-xs font-semibold">Produk</TableHead>
                <TableHead className="text-xs font-semibold">Harga</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
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
                        <div className="h-10 w-16 relative rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5 max-w-sm">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">
                            {product.title}
                          </p>
                          {product.titleEn && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 flex items-center gap-1">
                              <span className="text-[9px] bg-muted px-1 rounded border font-mono">EN</span>
                              <span>{product.titleEn}</span>
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Buka Tautan Pembelian"
                          >
                            <Link href={product.ctaUrl} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
            <DialogTitle className="text-base font-semibold">
              {isEditing ? "Sunting Data Produk Digital" : "Tambah Produk Digital Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
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
              <TabsList className="grid grid-cols-2 mb-3">
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
                  <Label htmlFor="title" className="text-xs font-medium">
                    Nama Produk Digital (ID) *
                  </Label>
                  <Input
                    id="title"
                    required
                    placeholder="Contoh: Next.js 15 SaaS Starter Boilerplate"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-xs font-medium">
                    Deskripsi Singkat & Fitur Utama (ID) *
                  </Label>
                  <Textarea
                    id="desc"
                    required
                    rows={3}
                    placeholder="Template production-ready dengan otentikasi, database, dan payment gateway..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-md border border-border/60">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span>Kosongkan jika ingin auto-translate saat simpan</span>
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
                  <Label htmlFor="titleEn" className="text-xs font-medium">
                    Nama Produk Digital (EN)
                  </Label>
                  <Input
                    id="titleEn"
                    placeholder="e.g. Next.js 15 SaaS Starter Boilerplate"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="text-xs"
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
                    className="text-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-medium">
                  Label Harga (ID/EN) *
                </Label>
                <Input
                  id="price"
                  required
                  placeholder="Rp 199.000 / $19"
                  value={formPriceFormatted}
                  onChange={(e) => setFormPriceFormatted(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl" className="text-xs font-medium">
                  URL Checkout / Download
                </Label>
                <Input
                  id="ctaUrl"
                  placeholder="https://lynk.id/sigit/..."
                  value={formCtaUrl}
                  onChange={(e) => setFormCtaUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium block mb-2">Gambar Produk</Label>
              <ImageUpload
                value={formThumbnail}
                onChange={(url) => setFormThumbnail(url)}
                label="Unggah Cover"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Tampilkan di Publik</span>
              </label>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
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
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus produk <strong>{selectedProduct?.title}</strong>? Data yang dihapus tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Produk"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
