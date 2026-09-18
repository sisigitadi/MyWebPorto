"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { TestimonialData } from "@/lib/dummy-data";
import { toast } from "sonner";
import { getTestimonials, saveTestimonial, deleteTestimonial, translateFieldAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialData | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TestimonialData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [clientRoleEn, setClientRoleEn] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [content, setContent] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [rating, setRating] = useState(5);
  const [published, setPublished] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  const fetchTestimonials = async () => {
    setIsLoading(true);
    try {
      const data = await getTestimonials();
      if (data) {
        setTestimonials(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  // Guard "belum disimpan": baseline direset saat sessionKey berubah — yaitu
  // saat dialog tambah/edit dibuka atau item lain dipilih. Mengetik di form
  // tidak mengubah sessionKey, jadi perubahan terdeteksi sebagai dirty.
  useUnsavedChanges(
    editingItem?.id ?? (dialogOpen ? "new" : null),
    {
      clientName,
      clientRole,
      clientRoleEn,
      avatarUrl,
      content,
      contentEn,
      rating,
      published,
    },
  );

  const filteredTestimonials = testimonials.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.clientName.toLowerCase().includes(q) ||
      t.clientRole.toLowerCase().includes(q) ||
      (t.clientRoleEn && t.clientRoleEn.toLowerCase().includes(q)) ||
      t.content.toLowerCase().includes(q) ||
      (t.contentEn && t.contentEn.toLowerCase().includes(q))
    );
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setErrorMessage("");
    setClientName("");
    setClientRole("");
    setClientRoleEn("");
    setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80");
    setContent("");
    setContentEn("");
    setRating(5);
    setPublished(true);
    setDialogOpen(true);
  };

  const openEditDialog = (item: TestimonialData) => {
    setEditingItem(item);
    setErrorMessage("");
    setClientName(item.clientName);
    setClientRole(item.clientRole);
    setClientRoleEn(item.clientRoleEn || "");
    setAvatarUrl(item.avatarUrl || "");
    setContent(item.content);
    setContentEn(item.contentEn || "");
    setRating(item.rating);
    setPublished(item.published);
    setDialogOpen(true);
  };

  const openDeleteConfirmation = (item: TestimonialData) => {
    setItemToDelete(item);
    setDeleteAlertOpen(true);
  };

  const handleAutoTranslateToEn = async () => {
    if (!clientRole.trim() && !content.trim()) return;
    setIsTranslating(true);
    try {
      if (clientRole.trim()) {
        const resRole = await translateFieldAction(clientRole, "id", "en");
        if (resRole.success && resRole.text) {
          setClientRoleEn(resRole.text);
        }
      }
      if (content.trim()) {
        const resContent = await translateFieldAction(content, "id", "en");
        if (resContent.success && resContent.text) {
          setContentEn(resContent.text);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!clientName.trim() || !content.trim()) return;

    startTransition(async () => {
      const payload = {
        id: editingItem ? editingItem.id : undefined,
        clientName,
        clientRole,
        clientRoleEn: clientRoleEn.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        content,
        contentEn: contentEn.trim() || undefined,
        rating,
        published,
      };

      try {
        const res = await saveTestimonial(payload);
        if (res.success) {
          setDialogOpen(false);
          toast.success(res.message || "Testimoni berhasil disimpan!");
          await fetchTestimonials();
        } else {
          setErrorMessage(res.error || "Gagal menyimpan testimoni.");
          toast.error(res.error || "Gagal menyimpan testimoni.");
        }
      } catch (err) {
        console.error("[admin] saveTestimonial gagal:", err);
        setErrorMessage("Gagal menghubungi server. Periksa koneksi, muat ulang halaman, lalu coba lagi.");
        toast.error("Gagal menghubungi server. Coba simpan lagi.");
      }
    });
  };

  const handleDelete = () => {
    if (!itemToDelete) return;

    startTransition(async () => {
      try {
        const res = await deleteTestimonial(itemToDelete.id);
        if (res.success) {
          setDeleteAlertOpen(false);
          setItemToDelete(null);
          toast.success(res.message || "Testimoni berhasil dihapus!");
          await fetchTestimonials();
        } else {
          toast.error(res.error || "Gagal menghapus testimoni.");
        }
      } catch (err) {
        console.error("[admin] deleteTestimonial gagal:", err);
        toast.error("Gagal menghubungi server. Muat ulang halaman lalu coba lagi.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Testimoni Klien
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola ulasan dan rekomendasi dari klien atau mitra kerja Anda dalam dua bahasa (ID/EN).
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-2 text-xs h-9">
          <PlusIcon className="w-4 h-4" />
          Tambah Testimoni
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, jabatan, atau isi ulasan..."
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Testimonials Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">Klien</TableHead>
                <TableHead className="text-xs font-semibold">Rating</TableHead>
                <TableHead className="text-xs font-semibold">Isi Ulasan</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat testimoni...
                  </TableCell>
                </TableRow>
              ) : filteredTestimonials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada testimoni yang sesuai kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTestimonials.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                          {item.avatarUrl ? (
                            <Image
                              src={item.avatarUrl}
                              alt={item.clientName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase">
                              {item.clientName.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs">
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            {item.clientName}
                            {(item.clientRoleEn || item.contentEn) && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-emerald-500/40 text-emerald-600 bg-emerald-500/5 font-mono">
                                EN
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {item.clientRole}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: item.rating }).map((_, i) => (
                          <StarIcon key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-w-xs">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        &#34;{item.content}&#34;
                      </p>
                    </TableCell>
                    <TableCell className="py-3 admin-cell-meta">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          item.published
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.published ? "Diterbitkan" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right admin-cell-actions">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Hapus"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? "Edit Testimoni" : "Tambah Testimoni Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan informasi klien dan testimonial dalam bahasa Indonesia dan Inggris.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Nama Klien <span className="text-destructive">*</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                required
                className="text-xs h-9"
              />
            </div>

            <Tabs defaultValue="id" className="w-full">
              <TabsList className="grid grid-cols-2 mb-3">
                <TabsTrigger value="id" className="text-xs gap-1.5">
                  🇮🇩 Indonesia (Utama)
                </TabsTrigger>
                <TabsTrigger value="en" className="text-xs gap-1.5">
                  🇬🇧 English (Internasional)
                  {contentEn && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="id" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Jabatan / Perusahaan (ID) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={clientRole}
                    onChange={(e) => setClientRole(e.target.value)}
                    placeholder="Contoh: CEO, FinTech Maju Bersama"
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Isi Testimoni (ID) <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tulis ulasan positif atau feedback dari klien di sini..."
                    rows={4}
                    required
                    className="text-xs leading-relaxed"
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-md border border-border/60">
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    💡 Terjemahkan teks Indonesia ke bahasa Inggris secara instan menggunakan AI Google Translate.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAutoTranslateToEn}
                    disabled={isTranslating || (!clientRole.trim() && !content.trim())}
                    className="shrink-0 ml-2 text-xs h-7 px-2.5 gap-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                  >
                    {isTranslating ? "Menerjemahkan..." : "⚡ Terjemahkan (ID → EN)"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Role / Company (EN)</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Opsional</span>
                  </label>
                  <Input
                    value={clientRoleEn}
                    onChange={(e) => setClientRoleEn(e.target.value)}
                    placeholder="Example: CEO, FinTech Forward Inc"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Testimonial Content (EN)</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Opsional</span>
                  </label>
                  <Textarea
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="Write client positive review or feedback in English..."
                    rows={4}
                    className="text-xs leading-relaxed"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Rating Bintang
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={5}>★★★★★ (5 Bintang)</option>
                  <option value={4}>★★★★☆ (4 Bintang)</option>
                  <option value={3}>★★★☆☆ (3 Bintang)</option>
                  <option value={2}>★★☆☆☆ (2 Bintang)</option>
                  <option value={1}>★☆☆☆☆ (1 Bintang)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  URL Foto Avatar
                </label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <ImageUpload
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              label="Unggah Avatar Klien"
            />

            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                Publikasikan ke Website
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
                <Button type="submit" disabled={isPending} size="sm" className="text-xs h-8">
                  {isPending ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Testimoni"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              Hapus Testimoni Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus testimoni dari{" "}
              <span className="font-semibold text-foreground">
                {itemToDelete?.clientName}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
