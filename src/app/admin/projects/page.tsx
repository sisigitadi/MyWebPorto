"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Sparkles,
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
import { DUMMY_PROJECTS, ProjectData } from "@/lib/dummy-data";
import {
  getProjects,
  saveProject,
  deleteProject,
  translateFieldAction,
} from "@/lib/actions";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>(DUMMY_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State (Indonesian)
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Form State (English)
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formSummaryEn, setFormSummaryEn] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");

  // Form State (Common)
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formTechStack, setFormTechStack] = useState("");
  const [formDemoUrl, setFormDemoUrl] = useState("");
  const [formRepoUrl, setFormRepoUrl] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(true);

  const fetchProjects = async () => {
    const data = await getProjects();
    if (data) {
      setProjects(data);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects by search
  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.titleEn && p.titleEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openCreateDialog = () => {
    setIsEditing(false);
    setSelectedProject(null);
    setErrorMessage("");
    setFormTitle("");
    setFormSlug("");
    setFormSummary("");
    setFormDescription("");
    setFormTitleEn("");
    setFormSummaryEn("");
    setFormDescriptionEn("");
    setFormThumbnail("https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop");
    setFormTechStack("Next.js, TypeScript, Tailwind CSS");
    setFormDemoUrl("");
    setFormRepoUrl("");
    setFormFeatured(false);
    setFormPublished(true);
    setDialogOpen(true);
  };

  const openEditDialog = (project: ProjectData) => {
    setIsEditing(true);
    setSelectedProject(project);
    setErrorMessage("");
    setFormTitle(project.title);
    setFormSlug(project.slug);
    setFormSummary(project.summary);
    setFormDescription(project.description);
    setFormTitleEn(project.titleEn || "");
    setFormSummaryEn(project.summaryEn || "");
    setFormDescriptionEn(project.descriptionEn || "");
    setFormThumbnail(project.thumbnailUrl);
    setFormTechStack(project.techStack.join(", "));
    setFormDemoUrl(project.demoUrl || "");
    setFormRepoUrl(project.repoUrl || "");
    setFormFeatured(project.featured);
    setFormPublished(project.published);
    setDialogOpen(true);
  };

  const openDeleteConfirmation = (project: ProjectData) => {
    setSelectedProject(project);
    setDeleteAlertOpen(true);
  };

  const handleAutoTranslateToEn = async () => {
    if (!formTitle && !formSummary && !formDescription) return;
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
      if (formDescription) {
        const resDesc = await translateFieldAction(formDescription, "id", "en");
        if (resDesc.success && resDesc.text) setFormDescriptionEn(resDesc.text);
      }
    } catch (e) {
      console.error("Auto-translate error:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const techArray = formTechStack
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const finalDescription = formDescription.trim() || formSummary.trim();
      const finalDescriptionEn = formDescriptionEn.trim() || formSummaryEn.trim() || undefined;

      const payload = {
        id: isEditing && selectedProject ? selectedProject.id : undefined,
        title: formTitle,
        titleEn: formTitleEn || undefined,
        slug: formSlug || formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        summary: formSummary.trim() || finalDescription.slice(0, 120),
        summaryEn: formSummaryEn.trim() || (finalDescriptionEn ? finalDescriptionEn.slice(0, 120) : undefined),
        description: finalDescription,
        descriptionEn: finalDescriptionEn,
        imageUrl: formThumbnail,
        demoUrl: formDemoUrl || undefined,
        repoUrl: formRepoUrl || undefined,
        techStacks: techArray,
        featured: formFeatured,
        published: formPublished,
      };

      const res = await saveProject(payload);
      if (res.success) {
        setDialogOpen(false);
        await fetchProjects();
      } else {
        setErrorMessage(res.error || "Gagal menyimpan proyek.");
      }
    });
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;

    startTransition(async () => {
      const res = await deleteProject(selectedProject.id);
      if (res.success) {
        setDeleteAlertOpen(false);
        setSelectedProject(null);
        await fetchProjects();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kelola Portofolio Proyek
          </h1>
          <p className="text-sm text-muted-foreground">
            Tambah, sunting, arsipkan, atau tampilkan proyek-proyek unggulan Anda ke publik (mendukung dwibahasa ID & EN).
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-2 text-xs h-9">
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Proyek Baru</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul proyek atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{filteredProjects.length}</span> proyek
        </div>
      </div>

      {/* Projects Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16 text-xs font-semibold">Cover</TableHead>
                <TableHead className="text-xs font-semibold">Judul & Ringkasan</TableHead>
                <TableHead className="text-xs font-semibold">Teknologi</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Unggulan</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Tidak ada proyek yang cocok dengan kata kunci pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3">
                      <div className="relative h-10 w-16 rounded overflow-hidden bg-muted border border-border shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="space-y-1 max-w-md">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                          <span>{project.title}</span>
                          {project.titleEn && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground">
                              EN
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {project.summary}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {project.techStack.slice(0, 3).map((tech) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 font-normal bg-background"
                          >
                            {tech}
                          </Badge>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{project.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant={project.published ? "secondary" : "outline"}
                        className="text-[10px] py-0 px-2 font-normal"
                      >
                        {project.published ? "Publik" : "Draf"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3">
                      {project.featured ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          ★ Ya
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Lihat Pratinjau Publik"
                        >
                          <Link href={`/proyek/${project.slug}`} target="_blank">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(project)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Sunting Proyek"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(project)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Hapus Proyek"
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

      {/* Modal Dialog Form Tambah / Sunting Proyek */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isEditing ? "Sunting Data Proyek" : "Tambah Proyek Portofolio Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isi formulir dalam Bahasa Indonesia atau Inggris. Sistem otomatis menerjemahkan ke EN bila dikosongkan.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveProject} className="space-y-4 pt-2">
            {/* Tabs Dwibahasa ID & EN */}
            <Tabs defaultValue="id" className="w-full">
              <TabsList className="grid grid-cols-2 mb-3">
                <TabsTrigger value="id" className="text-xs">
                  Bahasa Indonesia (ID)
                </TabsTrigger>
                <TabsTrigger value="en" className="text-xs">
                  English (EN)
                </TabsTrigger>
              </TabsList>

              {/* Tab ID */}
              <TabsContent value="id" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-medium">
                      Judul Proyek (ID) *
                    </Label>
                    <Input
                      id="title"
                      required
                      placeholder="Contoh: Pojok Baca Digital"
                      value={formTitle}
                      onChange={(e) => {
                        setFormTitle(e.target.value);
                        if (!isEditing) {
                          setFormSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, "")
                          );
                        }
                      }}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-xs font-medium">
                      URL Slug Proyek *
                    </Label>
                    <Input
                      id="slug"
                      required
                      placeholder="pojok-baca-digital"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary" className="text-xs font-medium">
                    Ringkasan Singkat (ID) *
                  </Label>
                  <Input
                    id="summary"
                    required
                    placeholder="Deskripsi singkat yang tampil di daftar kartu proyek"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">
                    Deskripsi Lengkap Latar Belakang & Solusi (ID)
                  </Label>
                  <Textarea
                    id="description"
                    rows={4}
                    placeholder="Jelaskan tantangan, arsitektur sistem, dan solusi yang diimplementasikan"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </TabsContent>

              {/* Tab EN */}
              <TabsContent value="en" className="space-y-4">
                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-md border border-border/60">
                  <div className="text-[11px] text-muted-foreground">
                    Terjemahan bahasa Inggris untuk pengunjung global.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoTranslateToEn}
                    disabled={isTranslating}
                    className="h-7 text-xs gap-1.5 bg-background shadow-none"
                  >
                    {isTranslating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    <span>{isTranslating ? "Menerjemahkan..." : "Auto Translate (ID -> EN)"}</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titleEn" className="text-xs font-medium">
                    Judul Proyek (English)
                  </Label>
                  <Input
                    id="titleEn"
                    placeholder="e.g. Digital Reading Corner"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summaryEn" className="text-xs font-medium">
                    Ringkasan Singkat (English)
                  </Label>
                  <Input
                    id="summaryEn"
                    placeholder="Brief summary shown on project cards"
                    value={formSummaryEn}
                    onChange={(e) => setFormSummaryEn(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionEn" className="text-xs font-medium">
                    Deskripsi Lengkap (English)
                  </Label>
                  <Textarea
                    id="descriptionEn"
                    rows={4}
                    placeholder="Detailed project background, technical architecture, and impact"
                    value={formDescriptionEn}
                    onChange={(e) => setFormDescriptionEn(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground italic">
                  * Catatan: Jika kolom di tab English ini dikosongkan, sistem akan otomatis menerjemahkan teks Indonesia ke Bahasa Inggris saat disimpan.
                </p>
              </TabsContent>
            </Tabs>

            {/* Parameter Umum */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label htmlFor="tech" className="text-xs font-medium">
                Teknologi yang Digunakan (Pisahkan dengan koma)
              </Label>
              <Input
                id="tech"
                placeholder="Next.js, Tailwind CSS, PostgreSQL, Stripe"
                value={formTechStack}
                onChange={(e) => setFormTechStack(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail" className="text-xs font-medium">
                URL Gambar Pratinjau / Cover *
              </Label>
              <Input
                id="thumbnail"
                required
                placeholder="https://images.unsplash.com/..."
                value={formThumbnail}
                onChange={(e) => setFormThumbnail(e.target.value)}
                className="text-xs"
              />
              <ImageUpload
                value={formThumbnail}
                onChange={(url) => setFormThumbnail(url)}
                label="Unggah Cover ke Bunny CDN"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demoUrl" className="text-xs font-medium">
                  Tautan Demo Live (Opsional)
                </Label>
                <Input
                  id="demoUrl"
                  placeholder="https://demo-app.com"
                  value={formDemoUrl}
                  onChange={(e) => setFormDemoUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repoUrl" className="text-xs font-medium">
                  Tautan Repositori GitHub (Opsional)
                </Label>
                <Input
                  id="repoUrl"
                  placeholder="https://github.com/dimas/repo"
                  value={formRepoUrl}
                  onChange={(e) => setFormRepoUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Tandai Sebagai Proyek Unggulan</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Terbitkan ke Publik</span>
                </label>
              </div>

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
                  <span>{isEditing ? "Simpan Perubahan" : "Buat Proyek"}</span>
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Konfirmasi Hapus Proyek */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Proyek Portofolio?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus <strong>{selectedProject?.title}</strong>? Data yang dihapus tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              Ya, Hapus Proyek
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
