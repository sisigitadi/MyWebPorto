"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Calendar,
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
import { DUMMY_ARTICLES, ArticleData } from "@/lib/dummy-data";
import {
  getArticles,
  saveArticle,
  deleteArticle,
  translateFieldAction,
} from "@/lib/actions";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<ArticleData[]>(DUMMY_ARTICLES);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State (Indonesian)
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");

  // Form State (English)
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formSummaryEn, setFormSummaryEn] = useState("");
  const [formContentEn, setFormContentEn] = useState("");

  // Form State (Common)
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(true);

  const fetchArticles = async () => {
    try {
      const data = await getArticles();
      if (data) {
        setArticles(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenAddDialog = () => {
    setIsEditing(false);
    setSelectedArticle(null);
    setFormTitle("");
    setFormSlug("");
    setFormSummary("");
    setFormContent("");
    setFormTitleEn("");
    setFormSummaryEn("");
    setFormContentEn("");
    setFormImageUrl("");
    setFormTags([]);
    setTagInput("");
    setFormOrder(articles.length + 1);
    setFormFeatured(false);
    setFormPublished(true);
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (article: ArticleData) => {
    setIsEditing(true);
    setSelectedArticle(article);
    setFormTitle(article.title || "");
    setFormSlug(article.slug || "");
    setFormSummary(article.summary || "");
    setFormContent(article.content || "");
    setFormTitleEn(article.titleEn || "");
    setFormSummaryEn(article.summaryEn || "");
    setFormContentEn(article.contentEn || "");
    setFormImageUrl(article.imageUrl || "");
    setFormTags(article.tags || []);
    setTagInput("");
    setFormOrder(article.order || 0);
    setFormFeatured(article.featured);
    setFormPublished(article.published);
    setErrorMessage("");
    setDialogOpen(true);
  };

  const openDeleteConfirmation = (article: ArticleData) => {
    setSelectedArticle(article);
    setDeleteAlertOpen(true);
  };

  const handleAutoTranslateToEn = async () => {
    if (!formTitle && !formSummary && !formContent) return;
    setIsTranslating(true);
    try {
      if (formTitle) {
        const resTitle = await translateFieldAction(formTitle, "id", "en");
        if (resTitle.success && resTitle.text) setFormTitleEn(resTitle.text);
      }
      if (formSummary) {
        const resSum = await translateFieldAction(formSummary, "id", "en");
        if (resSum.success && resSum.text) setFormSummaryEn(resSum.text);
      }
      if (formContent) {
        const resContent = await translateFieldAction(formContent, "id", "en");
        if (resContent.success && resContent.text) setFormContentEn(resContent.text);
      }
    } catch (e) {
      console.error("Auto-translate error:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddTag = () => {
    const value = tagInput.trim().replace(/^#/, "");
    if (!value) return;
    setFormTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const tagsArray = formTags;

    startTransition(async () => {
      const generatedSlug =
        formSlug.trim() ||
        formTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const payload = {
        id: isEditing && selectedArticle ? selectedArticle.id : undefined,
        title: formTitle,
        titleEn: formTitleEn || undefined,
        slug: generatedSlug,
        summary: formSummary.trim() || formContent.slice(0, 140),
        summaryEn: formSummaryEn.trim() || (formContentEn ? formContentEn.slice(0, 140) : undefined),
        content: formContent,
        contentEn: formContentEn || undefined,
        imageUrl: formImageUrl || undefined,
        tags: tagsArray,
        featured: formFeatured,
        published: formPublished,
        order: Number(formOrder) || 0,
      };

      const res = await saveArticle(payload);
      if (res.success) {
        setDialogOpen(false);
        fetchArticles();
      } else {
        setErrorMessage(res.error || "Gagal menyimpan artikel.");
      }
    });
  };

  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    startTransition(async () => {
      const res = await deleteArticle(selectedArticle.id);
      if (res.success) {
        setDeleteAlertOpen(false);
        setSelectedArticle(null);
        fetchArticles();
      } else {
        alert(res.error || "Gagal menghapus artikel.");
      }
    });
  };

  const filteredArticles = articles.filter((a) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = a.title.toLowerCase().includes(query);
    const titleEnMatch = a.titleEn?.toLowerCase().includes(query) || false;
    const slugMatch = a.slug.toLowerCase().includes(query);
    const tagMatch = a.tags.some((t) => t.toLowerCase().includes(query));
    return titleMatch || titleEnMatch || slugMatch || tagMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Kelola Artikel & Tulisan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publikasikan catatan teknis, tutorial, dan wawasan industri di antarmuka Retro OS dan rute mandiri publik.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> Tulis Artikel Baru
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan judul, tag, atau slug..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground ml-auto">
            Menampilkan {filteredArticles.length} dari {articles.length} artikel
          </div>
        </div>

        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Judul & Slug</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Dibuat</TableHead>
                <TableHead className="text-right w-[110px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Memuat data artikel...</span>
                  </TableCell>
                </TableRow>
              ) : filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Belum ada artikel yang sesuai kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      {article.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="h-10 w-14 rounded object-cover border border-border"
                        />
                      ) : (
                        <div className="h-10 w-14 rounded bg-muted/60 flex items-center justify-center border border-border text-[10px] text-muted-foreground">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground leading-snug line-clamp-1">
                        {article.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[11px] text-primary/80">/artikel/{article.slug}</span>
                        {article.featured && (
                          <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {article.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.published ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px]">
                          Terbit
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[11px]">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="h-3 w-3 opacity-60" />
                        {new Date(article.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/artikel/${article.slug}`}
                          target="_blank"
                          title="Lihat Halaman Publik"
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEditDialog(article)}
                          title="Edit Artikel"
                          className="p-1.5 text-muted-foreground hover:text-primary rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirmation(article)}
                          title="Hapus Artikel"
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* DIALOG FORM TAMBAH / EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditing ? "Edit Artikel" : "Tulis Artikel Baru"}
            </DialogTitle>
            <DialogDescription>
              Artikel ini akan dapat dibaca pengunjung di antarmuka retro portofolio dan halaman mandiri SEO.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-destructive/15 text-destructive border border-destructive/30 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveArticle} className="space-y-5 py-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bahasa & Konten
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                onClick={handleAutoTranslateToEn}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isTranslating ? "Menerjemahkan..." : "Terjemahkan (ID → EN)"}
              </Button>
            </div>

            <Tabs defaultValue="id" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="id">Bahasa Indonesia (Utama)</TabsTrigger>
                <TabsTrigger value="en">English (Bilingual)</TabsTrigger>
              </TabsList>

              {/* TAB BAHASA INDONESIA */}
              <TabsContent value="id" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Judul Artikel (ID) *</Label>
                    <Input
                      id="title"
                      required
                      placeholder="Contoh: Membangun Antarmuka Retro OS..."
                      value={formTitle}
                      onChange={(e) => {
                        setFormTitle(e.target.value);
                        if (!isEditing && !formSlug) {
                          setFormSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)/g, "")
                          );
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug URL *</Label>
                    <Input
                      id="slug"
                      required
                      placeholder="arsitektur-retro-os-nextjs-15"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Akan diakses di: /artikel/{formSlug || "slug-artikel"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="summary">Ringkasan Singkat (ID)</Label>
                  <Textarea
                    id="summary"
                    rows={2}
                    placeholder="Ringkasan 1-2 kalimat untuk kartu pratinjau dan meta deskripsi SEO..."
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content">Isi Lengkap Artikel (ID) *</Label>
                  <Textarea
                    id="content"
                    required
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Tulis artikel lengkap di sini. Anda dapat menggunakan format paragraf dan heading..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* TAB ENGLISH */}
              <TabsContent value="en" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="titleEn">Article Title (EN)</Label>
                  <Input
                    id="titleEn"
                    placeholder="e.g. Building an Interactive Retro OS..."
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="summaryEn">Summary (EN)</Label>
                  <Textarea
                    id="summaryEn"
                    rows={2}
                    placeholder="Short 1-2 sentence preview summary for English viewers..."
                    value={formSummaryEn}
                    onChange={(e) => setFormSummaryEn(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contentEn">Full Content (EN)</Label>
                  <Textarea
                    id="contentEn"
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Write the full English version here..."
                    value={formContentEn}
                    onChange={(e) => setFormContentEn(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="pt-2 border-t border-border space-y-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Pengaturan & Media
              </span>

              <div className="space-y-1.5">
                <Label>Gambar Sampul (Cover Image)</Label>
                <ImageUpload
                  value={formImageUrl}
                  onChange={(url) => setFormImageUrl(url)}
                  label={formImageUrl ? "Ganti Cover" : "Unggah Cover"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags / Kategori (Hashtag)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Tambah tag lalu Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddTag} className="h-9 px-3">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {formTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs pl-2.5 pr-1.5 py-1 gap-1.5">
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="h-3.5 w-3.5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="order">Urutan Tampilan</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Tandai sebagai Unggulan (Featured)</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Publikasikan Langsung (Published)</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : isEditing ? (
                  "Perbarui Artikel"
                ) : (
                  "Simpan & Publikasikan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG KONFIRMASI HAPUS */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Artikel Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus artikel{" "}
              <strong className="text-foreground">
                &ldquo;{selectedArticle?.title}&rdquo;
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Artikel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
