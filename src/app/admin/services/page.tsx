"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
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
import { ServiceData } from "@/lib/dummy-data";
import { getServices, saveService, deleteService, translateFieldAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { toast } from "sonner";

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [translating, setTranslating] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formOrder, setFormOrder] = useState(1);
  const [formPublished, setFormPublished] = useState(true);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      if (data) {
        setServices(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Guard "belum disimpan": baseline direset saat sessionKey berubah — yaitu
  // saat dialog tambah/edit dibuka atau item lain dipilih. Mengetik di form
  // tidak mengubah sessionKey, jadi perubahan terdeteksi sebagai dirty.
  useUnsavedChanges(
    selectedService?.id ?? (dialogOpen ? "new" : null),
    {
      formTitle,
      formTitleEn,
      formDescription,
      formDescriptionEn,
      formOrder,
      formPublished,
    },
  );

  const openCreateDialog = () => {
    setSelectedService(null);
    setErrorMessage("");
    setFormTitle("");
    setFormTitleEn("");
    setFormDescription("");
    setFormDescriptionEn("");
    setFormOrder(services.length + 1);
    setFormPublished(true);
    setDialogOpen(true);
  };

  const openEditDialog = (service: ServiceData) => {
    setSelectedService(service);
    setErrorMessage("");
    setFormTitle(service.title);
    setFormTitleEn(service.titleEn || "");
    setFormDescription(service.description);
    setFormDescriptionEn(service.descriptionEn || "");
    setFormOrder(service.order);
    setFormPublished(service.published);
    setDialogOpen(true);
  };

  const openDeleteDialog = (service: ServiceData) => {
    setSelectedService(service);
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

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const payload = {
        id: selectedService ? selectedService.id : undefined,
        title: formTitle,
        titleEn: formTitleEn,
        description: formDescription,
        descriptionEn: formDescriptionEn,
        order: Number(formOrder),
        published: formPublished,
      };

      try {
        const res = await saveService(payload);
        if (res.success) {
          setDialogOpen(false);
          toast.success(res.message || "Layanan berhasil disimpan!");
          await fetchServices();
        } else {
          setErrorMessage(res.error || "Gagal menyimpan layanan.");
          toast.error(res.error || "Gagal menyimpan layanan.");
        }
      } catch (err) {
        console.error("[admin] saveService gagal:", err);
        setErrorMessage("Gagal menghubungi server. Periksa koneksi, muat ulang halaman, lalu coba lagi.");
        toast.error("Gagal menghubungi server. Coba simpan lagi.");
      }
    });
  };

  const handleDeleteService = () => {
    if (!selectedService) return;

    startTransition(async () => {
      try {
        const res = await deleteService(selectedService.id);
        if (res.success) {
          setDeleteAlertOpen(false);
          setSelectedService(null);
          toast.success(res.message || "Layanan berhasil dihapus!");
          await fetchServices();
        } else {
          toast.error(res.error || "Gagal menghapus layanan.");
        }
      } catch (err) {
        console.error("[admin] deleteService gagal:", err);
        toast.error("Gagal menghubungi server. Muat ulang halaman lalu coba lagi.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Kelola Layanan & Keahlian
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {services.length} Layanan
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tawarkan keahlian spesialis Anda untuk menarik klien konsultasi atau pembuatan sistem. Layanan dengan status Aktif akan langsung tampil di beranda.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-2 text-xs h-9">
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Layanan Baru</span>
        </Button>
      </div>

      {/* Services Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16 text-center text-xs font-semibold">Urutan</TableHead>
                <TableHead className="w-64 text-xs font-semibold">Nama Layanan</TableHead>
                <TableHead className="text-xs font-semibold">Deskripsi Layanan</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Memuat data layanan...</span>
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                    Belum ada layanan yang ditambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id} className="hover:bg-muted/30">
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {service.order}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-xs text-foreground">
                      <div>{service.title}</div>
                      {service.titleEn && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] bg-muted px-1 py-0.2 rounded border text-muted-foreground font-mono">EN</span>
                          <span>{service.titleEn}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground max-w-md line-clamp-2">
                      {service.description}
                    </TableCell>
                    <TableCell className="py-3 admin-cell-meta">
                      <Badge
                        variant={service.published ? "secondary" : "outline"}
                        className="text-[10px] py-0 px-2 font-normal"
                      >
                        {service.published ? "Aktif" : "Draf"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right admin-cell-actions">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(service)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Sunting Layanan"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(service)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Hapus Layanan"
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

      {/* Dialog Modal Buat / Edit Layanan */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selectedService ? "Sunting Layanan" : "Tambah Layanan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sajikan penawaran solusi terbaik untuk membantu calon klien memahami nilai tambah yang Anda bawa.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveService} className="space-y-4 pt-2">
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
                    Nama Layanan (ID) *
                  </Label>
                  <Input
                    id="title"
                    required
                    placeholder="Contoh: Web Application Development"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">
                    Deskripsi Solusi (ID) *
                  </Label>
                  <Textarea
                    id="description"
                    required
                    rows={3}
                    placeholder="Menjelaskan apa yang didapatkan klien serta hasil akhirnya..."
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
                  <Label htmlFor="titleEn" className="text-xs font-medium">
                    Nama Layanan (EN)
                  </Label>
                  <Input
                    id="titleEn"
                    placeholder="e.g. Web Application Development"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionEn" className="text-xs font-medium">
                    Deskripsi Solusi (EN)
                  </Label>
                  <Textarea
                    id="descriptionEn"
                    rows={3}
                    placeholder="Explaining what the client gets and the final delivery..."
                    value={formDescriptionEn}
                    onChange={(e) => setFormDescriptionEn(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label htmlFor="order" className="text-xs font-medium">
                  Urutan Tampil
                </Label>
                <Input
                  id="order"
                  type="number"
                  min={1}
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground pb-2">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Terbitkan ke Publik</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
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
                <span>{selectedService ? "Simpan Perubahan" : "Buat Layanan"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Konfirmasi Hapus */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Layanan Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus layanan <strong>{selectedService?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8" disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              disabled={isPending}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Layanan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
