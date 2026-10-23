"use client";

import React, { useState } from "react";
import {
  Cpu,
  Clock,
  Sliders,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Loader2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { translateFieldAction, translateBatchAction } from "@/lib/actions";
import { isTranslationErrorPayload } from "@/lib/content-edit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProfileCardsConfig,
  TechCategory,
  CareerItem,
} from "@/lib/profile-cards-meta";

interface ProfileCardsEditorProps {
  cards: ProfileCardsConfig;
  onChange: (updated: ProfileCardsConfig) => void;
}

export function ProfileCardsEditor({ cards, onChange }: ProfileCardsEditorProps) {
  const [subTab, setSubTab] = useState("tech");
  const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});
  const [newBadgeInputs, setNewBadgeInputs] = useState<Record<string, string>>({});

  // ==========================================
  // TECH STACK HANDLERS
  // ==========================================
  const handleUpdateTechCategory = (
    index: number,
    field: keyof TechCategory,
    value: unknown
  ) => {
    const updated = [...cards.techStack];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cards, techStack: updated });
  };

  const handleAddSkillToCategory = (catIndex: number, catId: string) => {
    const skill = (newSkillInputs[catId] || "").trim();
    if (!skill) return;
    const cat = cards.techStack[catIndex];
    if (cat.items.includes(skill)) return;

    const updated = [...cards.techStack];
    updated[catIndex] = { ...cat, items: [...cat.items, skill] };
    onChange({ ...cards, techStack: updated });
    setNewSkillInputs((prev) => ({ ...prev, [catId]: "" }));
  };

  const handleRemoveSkillFromCategory = (catIndex: number, skill: string) => {
    const cat = cards.techStack[catIndex];
    const updated = [...cards.techStack];
    updated[catIndex] = {
      ...cat,
      items: cat.items.filter((s) => s !== skill),
    };
    onChange({ ...cards, techStack: updated });
  };

  // ==========================================
  // CAREER TIMELINE HANDLERS
  // ==========================================
  const handleUpdateCareerItem = (
    index: number,
    field: keyof CareerItem,
    value: unknown
  ) => {
    const updated = [...cards.careerTimeline];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cards, careerTimeline: updated });
  };

  const handleAddCareerItem = () => {
    const newItem: CareerItem = {
      id: `career-${Date.now()}`,
      period: "2024 — Sekarang",
      periodEn: "2024 — Present",
      role: "Peran Baru",
      roleEn: "New Role",
      company: "Nama Perusahaan / Proyek",
      description: "Deskripsi tanggung jawab dan pencapaian rekayasa...",
      descriptionEn: "Description of responsibilities and achievements...",
      badges: ["Next.js", "TypeScript"],
    };
    onChange({ ...cards, careerTimeline: [newItem, ...cards.careerTimeline] });
  };

  const handleDeleteCareerItem = (index: number) => {
    const updated = cards.careerTimeline.filter((_, idx) => idx !== index);
    onChange({ ...cards, careerTimeline: updated });
  };

  const handleAddBadgeToCareer = (careerIndex: number, careerId: string) => {
    const badge = (newBadgeInputs[careerId] || "").trim();
    if (!badge) return;
    const item = cards.careerTimeline[careerIndex];
    if (item.badges?.includes(badge)) return;

    const updated = [...cards.careerTimeline];
    updated[careerIndex] = {
      ...item,
      badges: [...(item.badges || []), badge],
    };
    onChange({ ...cards, careerTimeline: updated });
    setNewBadgeInputs((prev) => ({ ...prev, [careerId]: "" }));
  };

  const handleRemoveBadgeFromCareer = (careerIndex: number, badge: string) => {
    const item = cards.careerTimeline[careerIndex];
    const updated = [...cards.careerTimeline];
    updated[careerIndex] = {
      ...item,
      badges: (item.badges || []).filter((b) => b !== badge),
    };
    onChange({ ...cards, careerTimeline: updated });
  };

  // ==========================================
  // WORK PREFERENCES HANDLERS
  // ==========================================
  const handleUpdatePreferences = (field: string, value: unknown) => {
    onChange({
      ...cards,
      workPreferences: {
        ...cards.workPreferences,
        [field]: value,
      },
    });
  };

  const handleUpdateCollabType = (
    index: number,
    field: "title" | "titleEn",
    value: string
  ) => {
    const types = [...cards.workPreferences.collaborationTypes];
    types[index] = { ...types[index], [field]: value };
    onChange({
      ...cards,
      workPreferences: {
        ...cards.workPreferences,
        collaborationTypes: types,
      },
    });
  };

  const handleAddCollabType = () => {
    const types = [
      ...cards.workPreferences.collaborationTypes,
      { title: "Lingkup Kolaborasi Baru", titleEn: "New Collaboration Scope" },
    ];
    onChange({
      ...cards,
      workPreferences: {
        ...cards.workPreferences,
        collaborationTypes: types,
      },
    });
  };

  const handleDeleteCollabType = (index: number) => {
    const types = cards.workPreferences.collaborationTypes.filter(
      (_, idx) => idx !== index
    );
    onChange({
      ...cards,
      workPreferences: {
        ...cards.workPreferences,
        collaborationTypes: types,
      },
    });
  };

  // ==========================================
  // TRANSLATION HANDLERS (ID -> EN)
  // ==========================================
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingSection, setTranslatingSection] = useState<string | null>(null);
  const [translatingItem, setTranslatingItem] = useState<string | null>(null);

  const translateField = async (text: string): Promise<string | null> => {
    if (!text || !text.trim()) return null;
    const res = await translateFieldAction(text, "id", "en");
    if (res.success && res.text && !isTranslationErrorPayload(res.text)) {
      return res.text;
    }
    return null;
  };

  const handleTranslateTechCategory = async (catIdx: number) => {
    const cat = cards.techStack[catIdx];
    if (!cat?.title?.trim()) return;
    setTranslatingItem(`tech-${catIdx}`);
    try {
      const translated = await translateField(cat.title);
      if (translated) {
        handleUpdateTechCategory(catIdx, "titleEn", translated);
        toast.success(`Judul kategori "${cat.title}" berhasil diterjemahkan!`);
      } else {
        toast.error("Gagal menerjemahkan judul kategori.");
      }
    } finally {
      setTranslatingItem(null);
    }
  };

  const handleTranslateAllTech = async () => {
    setTranslatingSection("tech");
    try {
      const titles = cards.techStack.map((c) => c.title || "");
      const res = await translateBatchAction(titles, "id", "en");
      if (res.success && res.results) {
        const updated = cards.techStack.map((c, idx) => ({
          ...c,
          titleEn: res.results[idx] || c.titleEn,
        }));
        onChange({ ...cards, techStack: updated });
        toast.success("Seluruh judul kategori keahlian berhasil diterjemahkan!");
      } else {
        toast.error("Gagal menerjemahkan judul kategori.");
      }
    } finally {
      setTranslatingSection(null);
    }
  };

  const handleTranslateCareerItem = async (idx: number) => {
    const item = cards.careerTimeline[idx];
    if (!item) return;
    setTranslatingItem(`career-${idx}`);
    try {
      const texts = [item.period || "", item.role || "", item.description || ""];
      const res = await translateBatchAction(texts, "id", "en");
      if (res.success && res.results) {
        const updated = [...cards.careerTimeline];
        updated[idx] = {
          ...updated[idx],
          periodEn: res.results[0] || updated[idx].periodEn,
          roleEn: res.results[1] || updated[idx].roleEn,
          descriptionEn: res.results[2] || updated[idx].descriptionEn,
        };
        onChange({ ...cards, careerTimeline: updated });
        toast.success(`Riwayat karir #${idx + 1} berhasil diterjemahkan!`);
      } else {
        toast.error("Gagal menerjemahkan riwayat karir.");
      }
    } finally {
      setTranslatingItem(null);
    }
  };

  const handleTranslateAllCareer = async () => {
    setTranslatingSection("career");
    try {
      const texts: string[] = [];
      cards.careerTimeline.forEach((item) => {
        texts.push(item.period || "");
        texts.push(item.role || "");
        texts.push(item.description || "");
      });
      const res = await translateBatchAction(texts, "id", "en");
      if (res.success && res.results) {
        const updated = cards.careerTimeline.map((item, idx) => ({
          ...item,
          periodEn: res.results[idx * 3] || item.periodEn,
          roleEn: res.results[idx * 3 + 1] || item.roleEn,
          descriptionEn: res.results[idx * 3 + 2] || item.descriptionEn,
        }));
        onChange({ ...cards, careerTimeline: updated });
        toast.success("Seluruh riwayat karir berhasil diterjemahkan!");
      } else {
        toast.error("Gagal menerjemahkan riwayat karir.");
      }
    } finally {
      setTranslatingSection(null);
    }
  };

  const handleTranslatePreferences = async () => {
    setTranslatingSection("preferences");
    try {
      const texts: string[] = [
        cards.workPreferences.statusBadge || "",
        cards.workPreferences.locationTimezone || "",
        cards.workPreferences.responseTimeSla || "",
        cards.workPreferences.contactPrompt || "",
        ...cards.workPreferences.collaborationTypes.map((c) => c.title || ""),
      ];
      const res = await translateBatchAction(texts, "id", "en");
      if (res.success && res.results) {
        const collabTypes = cards.workPreferences.collaborationTypes.map((c, i) => ({
          ...c,
          titleEn: res.results[4 + i] || c.titleEn,
        }));
        const updatedPrefs = {
          ...cards.workPreferences,
          statusBadgeEn: res.results[0] || cards.workPreferences.statusBadgeEn,
          locationTimezoneEn: res.results[1] || cards.workPreferences.locationTimezoneEn,
          responseTimeSlaEn: res.results[2] || cards.workPreferences.responseTimeSlaEn,
          contactPromptEn: res.results[3] || cards.workPreferences.contactPromptEn,
          collaborationTypes: collabTypes,
        };
        onChange({ ...cards, workPreferences: updatedPrefs });
        toast.success("Preferensi kerja & SLA berhasil diterjemahkan!");
      } else {
        toast.error("Gagal menerjemahkan preferensi kerja.");
      }
    } finally {
      setTranslatingSection(null);
    }
  };

  const handleTranslateAll = async () => {
    setTranslatingAll(true);
    try {
      type Target =
        | { type: "tech"; catIdx: number }
        | { type: "career_period"; itemIdx: number }
        | { type: "career_role"; itemIdx: number }
        | { type: "career_desc"; itemIdx: number }
        | { type: "pref_status" }
        | { type: "pref_loc" }
        | { type: "pref_sla" }
        | { type: "pref_prompt" }
        | { type: "pref_collab"; collabIdx: number };

      const targets: Target[] = [];
      const texts: string[] = [];

      cards.techStack.forEach((cat, idx) => {
        if (cat.title?.trim()) {
          targets.push({ type: "tech", catIdx: idx });
          texts.push(cat.title);
        }
      });

      cards.careerTimeline.forEach((item, idx) => {
        if (item.period?.trim()) {
          targets.push({ type: "career_period", itemIdx: idx });
          texts.push(item.period);
        }
        if (item.role?.trim()) {
          targets.push({ type: "career_role", itemIdx: idx });
          texts.push(item.role);
        }
        if (item.description?.trim()) {
          targets.push({ type: "career_desc", itemIdx: idx });
          texts.push(item.description);
        }
      });

      if (cards.workPreferences.statusBadge?.trim()) {
        targets.push({ type: "pref_status" });
        texts.push(cards.workPreferences.statusBadge);
      }
      if (cards.workPreferences.locationTimezone?.trim()) {
        targets.push({ type: "pref_loc" });
        texts.push(cards.workPreferences.locationTimezone);
      }
      if (cards.workPreferences.responseTimeSla?.trim()) {
        targets.push({ type: "pref_sla" });
        texts.push(cards.workPreferences.responseTimeSla);
      }
      if (cards.workPreferences.contactPrompt?.trim()) {
        targets.push({ type: "pref_prompt" });
        texts.push(cards.workPreferences.contactPrompt);
      }
      cards.workPreferences.collaborationTypes.forEach((collab, idx) => {
        if (collab.title?.trim()) {
          targets.push({ type: "pref_collab", collabIdx: idx });
          texts.push(collab.title);
        }
      });

      if (texts.length === 0) {
        toast.error("Tidak ada teks bahasa Indonesia untuk diterjemahkan.");
        return;
      }

      const res = await translateBatchAction(texts, "id", "en");
      if (!res.success || !res.results) {
        toast.error("Gagal menerjemahkan", {
          description: res.error || "Terjadi masalah pada layanan penerjemah.",
        });
        return;
      }

      const newCards: ProfileCardsConfig = JSON.parse(JSON.stringify(cards));

      targets.forEach((target, i) => {
        const translated = res.results[i];
        if (!translated || isTranslationErrorPayload(translated)) return;

        switch (target.type) {
          case "tech":
            newCards.techStack[target.catIdx].titleEn = translated;
            break;
          case "career_period":
            newCards.careerTimeline[target.itemIdx].periodEn = translated;
            break;
          case "career_role":
            newCards.careerTimeline[target.itemIdx].roleEn = translated;
            break;
          case "career_desc":
            newCards.careerTimeline[target.itemIdx].descriptionEn = translated;
            break;
          case "pref_status":
            newCards.workPreferences.statusBadgeEn = translated;
            break;
          case "pref_loc":
            newCards.workPreferences.locationTimezoneEn = translated;
            break;
          case "pref_sla":
            newCards.workPreferences.responseTimeSlaEn = translated;
            break;
          case "pref_prompt":
            newCards.workPreferences.contactPromptEn = translated;
            break;
          case "pref_collab":
            newCards.workPreferences.collaborationTypes[target.collabIdx].titleEn = translated;
            break;
        }
      });

      onChange(newCards);
      toast.success("Berhasil menerjemahkan seluruh 3 kartu profil ke bahasa Inggris!");
    } catch (err: unknown) {
      toast.error("Gagal menerjemahkan teks", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan koneksi",
      });
    } finally {
      setTranslatingAll(false);
    }
  };

  return (
    <Card className="bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span>Pengaturan Kartu Detail Profil OS (Sigit_Profile.exe)</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Kelola konten 3 kartu detail (Specs, Timeline, Availability) yang ditampilkan pada tab dialog retro di jendela profil pengunjung.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Banner Fitur Dwibahasa (ID -> EN) & Tombol Master Terjemahkan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 border border-[var(--vt-edge-lo-2)] rounded-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Dukungan Dwibahasa (ID -&gt; EN):</strong> Terjemahkan konten 3 kartu otomatis ke bahasa Inggris sekali klik, atau gunakan tombol terjemahkan per kartu/item di bawah.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTranslateAll}
            disabled={translatingAll}
            className="h-8 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shrink-0 font-medium cursor-pointer"
          >
            {translatingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            <span>
              {translatingAll ? "Menerjemahkan Semua..." : "Terjemahkan Seluruh Kartu (3 Kartu)"}
            </span>
          </Button>
        </div>

        <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 h-auto p-1 bg-muted/60 border border-[var(--vt-edge-lo-2)]">
            <TabsTrigger value="tech" className="text-xs gap-1.5 py-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <span>01 Stack</span>
            </TabsTrigger>
            <TabsTrigger value="career" className="text-xs gap-1.5 py-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>02 Karir</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs gap-1.5 py-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>03 Preferensi</span>
            </TabsTrigger>
          </TabsList>

          {/* ====================================================
              SUB-TAB 1: TECH STACK
              ==================================================== */}
          <TabsContent value="tech" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Arsenal Keahlian Terkategori (4 Kategori)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Masing-masing kategori memiliki daftar skill chips
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTranslateAllTech}
                disabled={translatingSection === "tech"}
                className="h-7 text-xs gap-1.5"
              >
                {translatingSection === "tech" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
                <span>Terjemahkan Judul Kategori</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.techStack.map((cat, catIdx) => (
                <div
                  key={cat.id || catIdx}
                  className="p-3.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold">Judul Kategori (ID & EN)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslateTechCategory(catIdx)}
                        disabled={translatingItem === `tech-${catIdx}`}
                        className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10"
                      >
                        {translatingItem === `tech-${catIdx}` ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-2.5 w-2.5" />
                        )}
                        <span>Terjemahkan</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={cat.title}
                        onChange={(e) =>
                          handleUpdateTechCategory(catIdx, "title", e.target.value)
                        }
                        placeholder="Judul ID"
                        className="text-xs h-8"
                      />
                      <Input
                        value={cat.titleEn || ""}
                        onChange={(e) =>
                          handleUpdateTechCategory(catIdx, "titleEn", e.target.value)
                        }
                        placeholder="Title EN (opsional)"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Skills tags list */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                      Daftar Keahlian ({cat.items.length})
                    </Label>
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-background/80 border border-border/60 rounded-xs">
                      {cat.items.map((item, iIdx) => (
                        <span
                          key={iIdx}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-muted text-foreground border border-border rounded-xs"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkillFromCategory(catIdx, item)}
                            className="hover:text-rose-500 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add new skill input */}
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={newSkillInputs[cat.id] || ""}
                        onChange={(e) =>
                          setNewSkillInputs((prev) => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkillToCategory(catIdx, cat.id);
                          }
                        }}
                        placeholder="Ketik nama skill lalu Enter / Tambah..."
                        className="text-xs h-7"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddSkillToCategory(catIdx, cat.id)}
                        className="h-7 text-xs px-2.5"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ====================================================
              SUB-TAB 2: CAREER TIMELINE
              ==================================================== */}
          <TabsContent value="career" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Riwayat Karir & Milestones Rekayasa ({cards.careerTimeline.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Urutan kronologis ditampilkan dari atas ke bawah
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateAllCareer}
                  disabled={translatingSection === "career"}
                  className="text-xs h-8 gap-1.5"
                >
                  {translatingSection === "career" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-primary" />
                  )}
                  <span>Terjemahkan Semua</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleAddCareerItem}
                  size="sm"
                  className="text-xs h-8 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Riwayat
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {cards.careerTimeline.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Entry #{idx + 1}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslateCareerItem(idx)}
                        disabled={translatingItem === `career-${idx}`}
                        className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                      >
                        {translatingItem === `career-${idx}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span>Terjemahkan</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCareerItem(idx)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 px-2 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Periode (ID)</Label>
                      <Input
                        value={item.period}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "period", e.target.value)
                        }
                        placeholder="Contoh: 2024 — Sekarang"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Period (EN)</Label>
                      <Input
                        value={item.periodEn || ""}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "periodEn", e.target.value)
                        }
                        placeholder="Contoh: 2024 — Present"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Perusahaan / Lembaga</Label>
                      <Input
                        value={item.company}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "company", e.target.value)
                        }
                        placeholder="Nama Perusahaan"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Peran / Jabatan (ID)</Label>
                      <Input
                        value={item.role}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "role", e.target.value)
                        }
                        placeholder="Contoh: Senior Software Engineer"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Role / Title (EN)</Label>
                      <Input
                        value={item.roleEn || ""}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "roleEn", e.target.value)
                        }
                        placeholder="Senior Software Engineer (EN)"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Deskripsi Pencapaian (ID)</Label>
                      <Textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "description", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Description (EN)</Label>
                      <Textarea
                        rows={2}
                        value={item.descriptionEn || ""}
                        onChange={(e) =>
                          handleUpdateCareerItem(idx, "descriptionEn", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Badges / Tech Tags */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                      Tag Teknologi / Sorotan
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(item.badges || []).map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-background border border-border rounded-xs"
                        >
                          <span>#{badge}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBadgeFromCareer(idx, badge)}
                            className="hover:text-rose-500 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1 max-w-sm">
                      <Input
                        value={newBadgeInputs[item.id] || ""}
                        onChange={(e) =>
                          setNewBadgeInputs((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBadgeToCareer(idx, item.id);
                          }
                        }}
                        placeholder="Tambah tag..."
                        className="text-xs h-7"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddBadgeToCareer(idx, item.id)}
                        className="h-7 text-xs px-2.5"
                      >
                        Tambah Tag
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ====================================================
              SUB-TAB 3: WORK PREFERENCES & SLA
              ==================================================== */}
          <TabsContent value="preferences" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Preferensi Kerja, Jaminan SLA, & Permintaan Resume
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Menampilkan parameter kesiapan kerja dan tombol pemicu permintaan resume via form kontak
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTranslatePreferences}
                disabled={translatingSection === "preferences"}
                className="text-xs h-8 gap-1.5"
              >
                {translatingSection === "preferences" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
                <span>Terjemahkan Preferensi & SLA</span>
              </Button>
            </div>

            <div className="p-4 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Banner Status Ketersediaan (ID)</Label>
                  <Input
                    value={cards.workPreferences.statusBadge}
                    onChange={(e) =>
                      handleUpdatePreferences("statusBadge", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Availability Status Banner (EN)</Label>
                  <Input
                    value={cards.workPreferences.statusBadgeEn || ""}
                    onChange={(e) =>
                      handleUpdatePreferences("statusBadgeEn", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Lokasi & Zona Waktu (ID)</Label>
                  <Input
                    value={cards.workPreferences.locationTimezone}
                    onChange={(e) =>
                      handleUpdatePreferences("locationTimezone", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Location & Timezone (EN)</Label>
                  <Input
                    value={cards.workPreferences.locationTimezoneEn || ""}
                    onChange={(e) =>
                      handleUpdatePreferences("locationTimezoneEn", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Jaminan Waktu Respon SLA (ID)</Label>
                  <Input
                    value={cards.workPreferences.responseTimeSla}
                    onChange={(e) =>
                      handleUpdatePreferences("responseTimeSla", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Response Time SLA (EN)</Label>
                  <Input
                    value={cards.workPreferences.responseTimeSlaEn || ""}
                    onChange={(e) =>
                      handleUpdatePreferences("responseTimeSlaEn", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Prompt Ajakan Minta CV (ID)</Label>
                  <Input
                    value={cards.workPreferences.contactPrompt}
                    onChange={(e) =>
                      handleUpdatePreferences("contactPrompt", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Prompt Request CV (EN)</Label>
                  <Input
                    value={cards.workPreferences.contactPromptEn || ""}
                    onChange={(e) =>
                      handleUpdatePreferences("contactPromptEn", e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Collaboration Types */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold">
                    Lingkup / Jenis Kolaborasi ({cards.workPreferences.collaborationTypes.length})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCollabType}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah Lingkup
                  </Button>
                </div>

                <div className="space-y-2">
                  {cards.workPreferences.collaborationTypes.map((type, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2">
                      <Input
                        value={type.title}
                        onChange={(e) =>
                          handleUpdateCollabType(tIdx, "title", e.target.value)
                        }
                        placeholder="Lingkup ID"
                        className="text-xs h-8 flex-1"
                      />
                      <Input
                        value={type.titleEn || ""}
                        onChange={(e) =>
                          handleUpdateCollabType(tIdx, "titleEn", e.target.value)
                        }
                        placeholder="Scope EN"
                        className="text-xs h-8 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCollabType(tIdx)}
                        className="h-8 px-2 text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
