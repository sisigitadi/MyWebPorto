"use client";

import React, { useState } from "react";
import {
  Clock,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Globe,
  Layers,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { translateBatchAction } from "@/lib/actions";
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
  const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingCareerIdx, setTranslatingCareerIdx] = useState<number | null>(null);

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
  // WORK PREFERENCES & SCOPE HANDLERS
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
    const updated = [...cards.workPreferences.collaborationTypes];
    updated[index] = { ...updated[index], [field]: value };
    handleUpdatePreferences("collaborationTypes", updated);
  };

  const handleAddCollabType = () => {
    const updated = [
      ...cards.workPreferences.collaborationTypes,
      { title: "Lingkup Rekayasa Baru", titleEn: "New Engineering Scope" },
    ];
    handleUpdatePreferences("collaborationTypes", updated);
  };

  const handleDeleteCollabType = (index: number) => {
    const updated = cards.workPreferences.collaborationTypes.filter(
      (_, idx) => idx !== index
    );
    handleUpdatePreferences("collaborationTypes", updated);
  };

  // ==========================================
  // CAREER HIGHLIGHT HANDLERS
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
      period: "2024 - Sekarang",
      periodEn: "2024 - Present",
      role: "Peran Baru",
      roleEn: "New Role",
      company: "Nama Perusahaan / Proyek",
      companyEn: "Company / Project Name",
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

  const handleTranslateCareerItem = async (idx: number) => {
    const item = cards.careerTimeline[idx];
    if (!item) return;
    setTranslatingCareerIdx(idx);
    try {
      const texts = [
        item.role || "",
        item.company || "",
        item.period || "",
        item.description || "",
      ];
      const res = await translateBatchAction(texts, "id", "en");
      if (res.success && res.results) {
        const updated = [...cards.careerTimeline];
        updated[idx] = {
          ...updated[idx],
          roleEn: res.results[0] || updated[idx].roleEn,
          companyEn: res.results[1] || updated[idx].companyEn,
          periodEn: res.results[2] || updated[idx].periodEn,
          descriptionEn: res.results[3] || updated[idx].descriptionEn,
        };
        onChange({ ...cards, careerTimeline: updated });
        toast.success(`Sorotan pengalaman #${idx + 1} berhasil diterjemahkan!`);
      } else {
        toast.error("Gagal menerjemahkan sorotan pengalaman.");
      }
    } catch {
      toast.error("Gagal menerjemahkan teks.");
    } finally {
      setTranslatingCareerIdx(null);
    }
  };

  // ==========================================
  // AUTO TRANSLATE HANDLERS
  // ==========================================
  const handleTranslateAll = async () => {
    setTranslatingAll(true);
    try {
      type Target =
        | { type: "tech"; catIdx: number }
        | { type: "career_period"; itemIdx: number }
        | { type: "career_role"; itemIdx: number }
        | { type: "career_company"; itemIdx: number }
        | { type: "career_desc"; itemIdx: number }
        | { type: "pref_status" }
        | { type: "pref_loc" }
        | { type: "pref_sla" }
        | { type: "pref_sla_desc" }
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
        if (item.company?.trim()) {
          targets.push({ type: "career_company", itemIdx: idx });
          texts.push(item.company);
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
      if (cards.workPreferences.slaDescription?.trim()) {
        targets.push({ type: "pref_sla_desc" });
        texts.push(cards.workPreferences.slaDescription);
      }
      cards.workPreferences.collaborationTypes.forEach((c, idx) => {
        if (c.title?.trim()) {
          targets.push({ type: "pref_collab", collabIdx: idx });
          texts.push(c.title);
        }
      });

      if (texts.length === 0) {
        toast.info("Tidak ada teks bahasa Indonesia yang perlu diterjemahkan.");
        return;
      }

      const res = await translateBatchAction(texts, "id", "en");
      if (!res.success || !res.results) {
        toast.error("Gagal menerjemahkan teks kartu profil.");
        return;
      }

      const newCards: ProfileCardsConfig = JSON.parse(JSON.stringify(cards));

      targets.forEach((target, i) => {
        const translated = res.results?.[i];
        if (!translated) return;

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
          case "career_company":
            newCards.careerTimeline[target.itemIdx].companyEn = translated;
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
          case "pref_sla_desc":
            newCards.workPreferences.slaDescriptionEn = translated;
            break;
          case "pref_collab":
            newCards.workPreferences.collaborationTypes[target.collabIdx].titleEn = translated;
            break;
        }
      });

      onChange(newCards);
      toast.success("Seluruh spesifikasi kartu profil berhasil diterjemahkan ke bahasa Inggris!");
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
      {/* Header Kartu Tunggal */}
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Pengaturan Kartu Profil Terpadu (Sigit_Profile.exe)</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Kelola status ketersediaan, jaminan SLA, stack teknologi, dan lingkup kolaborasi dalam satu kartu profil terpadu.
            </CardDescription>
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
              {translatingAll ? "Menerjemahkan..." : "Terjemahkan (ID &rarr; EN)"}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Banner Info Dwibahasa */}
        <div className="flex items-center gap-2 p-2.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Input kolom (EN) dipakai saat pengunjung beralih ke mode bahasa Inggris di header website.
          </span>
        </div>

        {/* ========================================================
            GRUP 1: STATUS KETERSEDIAAN & JAMINAN SLA
            ======================================================== */}
        <div className="space-y-3 p-3.5 bg-muted/20 border border-[var(--vt-edge-lo-2)] rounded-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Status Ketersediaan &amp; Jaminan SLA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Banner Status Ketersediaan (ID)</Label>
              <Input
                value={cards.workPreferences.statusBadge}
                onChange={(e) => handleUpdatePreferences("statusBadge", e.target.value)}
                className="text-xs h-8"
                placeholder="Contoh: AVAILABLE FOR FREELANCE & CONTRACT"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Availability Banner (EN)</Label>
              <Input
                value={cards.workPreferences.statusBadgeEn || ""}
                onChange={(e) => handleUpdatePreferences("statusBadgeEn", e.target.value)}
                className="text-xs h-8"
                placeholder="e.g. AVAILABLE FOR FREELANCE & CONTRACT"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Lokasi &amp; Zona Waktu (ID)</Label>
              <Input
                value={cards.workPreferences.locationTimezone}
                onChange={(e) => handleUpdatePreferences("locationTimezone", e.target.value)}
                className="text-xs h-8"
                placeholder="Contoh: Jakarta, ID (UTC+7)"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Location &amp; Timezone (EN)</Label>
              <Input
                value={cards.workPreferences.locationTimezoneEn || ""}
                onChange={(e) => handleUpdatePreferences("locationTimezoneEn", e.target.value)}
                className="text-xs h-8"
                placeholder="e.g. Jakarta, ID (UTC+7)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Jaminan Waktu Respon SLA (ID)</Label>
              <Input
                value={cards.workPreferences.responseTimeSla}
                onChange={(e) => handleUpdatePreferences("responseTimeSla", e.target.value)}
                className="text-xs h-8"
                placeholder="Contoh: < 2 Jam"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Response Time SLA (EN)</Label>
              <Input
                value={cards.workPreferences.responseTimeSlaEn || ""}
                onChange={(e) => handleUpdatePreferences("responseTimeSlaEn", e.target.value)}
                className="text-xs h-8"
                placeholder="e.g. < 2 Hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Deskripsi Komitmen SLA (ID)</Label>
              <Textarea
                rows={2}
                value={cards.workPreferences.slaDescription ?? ""}
                onChange={(e) => handleUpdatePreferences("slaDescription", e.target.value)}
                placeholder="Konsultasi rekayasa langsung dengan penilaian kelayakan cepat."
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">SLA Description (EN)</Label>
              <Textarea
                rows={2}
                value={cards.workPreferences.slaDescriptionEn ?? ""}
                onChange={(e) => handleUpdatePreferences("slaDescriptionEn", e.target.value)}
                placeholder="Direct technical consultation with rapid feasibility feedback."
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            GRUP 2: LINGKUP REKAYASA & KOLABORASI
            ======================================================== */}
        <div className="space-y-3 p-3.5 bg-muted/20 border border-[var(--vt-edge-lo-2)] rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span>Lingkup Rekayasa &amp; Kolaborasi ({cards.workPreferences.collaborationTypes.length})</span>
            </div>
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
                  onChange={(e) => handleUpdateCollabType(tIdx, "title", e.target.value)}
                  placeholder="Lingkup (ID)"
                  className="text-xs h-8 flex-1"
                />
                <Input
                  value={type.titleEn || ""}
                  onChange={(e) => handleUpdateCollabType(tIdx, "titleEn", e.target.value)}
                  placeholder="Scope (EN)"
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

        {/* ========================================================
            GRUP 3: ARSENAL STACK TEKNOLOGI
            ======================================================== */}
        <div className="space-y-3 p-3.5 bg-muted/20 border border-[var(--vt-edge-lo-2)] rounded-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Arsenal Stack Teknologi Utama ({cards.techStack.length} Kategori)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.techStack.map((cat, catIdx) => (
              <div
                key={cat.id || catIdx}
                className="p-3 bg-background border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={cat.title}
                    onChange={(e) => handleUpdateTechCategory(catIdx, "title", e.target.value)}
                    placeholder="Judul (ID)"
                    className="text-xs h-7 font-bold"
                  />
                  <Input
                    value={cat.titleEn || ""}
                    onChange={(e) => handleUpdateTechCategory(catIdx, "titleEn", e.target.value)}
                    placeholder="Title (EN)"
                    className="text-xs h-7 font-bold"
                  />
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-1 min-h-[28px]">
                  {cat.items.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded-2xs"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillFromCategory(catIdx, tech)}
                        className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input Add Chip */}
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newSkillInputs[cat.id] || ""}
                    onChange={(e) =>
                      setNewSkillInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkillToCategory(catIdx, cat.id);
                      }
                    }}
                    placeholder="Tambah teknologi..."
                    className="text-xs h-7 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSkillToCategory(catIdx, cat.id)}
                    className="h-7 text-xs px-2"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            GRUP 4: SOROTAN PENGALAMAN / REKAM JEJAK UTAMA
            ======================================================== */}
        <div className="space-y-3 p-3.5 bg-muted/20 border border-[var(--vt-edge-lo-2)] rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sorotan Pengalaman Utama ({cards.careerTimeline.length})</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCareerItem}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Tambah Riwayat
            </Button>
          </div>

          <div className="space-y-3">
            {cards.careerTimeline.slice(0, 2).map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 bg-background border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)]/60 pb-1.5">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Sorotan #{idx + 1} (Experience Highlight)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTranslateCareerItem(idx)}
                      disabled={translatingCareerIdx === idx}
                      className="h-6 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      {translatingCareerIdx === idx ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      <span>Terjemahkan Item</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCareerItem(idx)}
                      className="h-6 px-1.5 text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Peran / Jabatan (ID & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Peran / Jabatan (ID)</Label>
                    <Input
                      value={item.role}
                      onChange={(e) => handleUpdateCareerItem(idx, "role", e.target.value)}
                      placeholder="Contoh: Lead Full-Stack Developer"
                      className="text-xs h-7 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Role / Title (EN)</Label>
                    <Input
                      value={item.roleEn || ""}
                      onChange={(e) => handleUpdateCareerItem(idx, "roleEn", e.target.value)}
                      placeholder="e.g. Lead Full-Stack Developer"
                      className="text-xs h-7 font-bold"
                    />
                  </div>
                </div>

                {/* Perusahaan / Proyek (ID & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Perusahaan / Proyek (ID)</Label>
                    <Input
                      value={item.company}
                      onChange={(e) => handleUpdateCareerItem(idx, "company", e.target.value)}
                      placeholder="Contoh: SigitOS Tech"
                      className="text-xs h-7"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Company / Project (EN)</Label>
                    <Input
                      value={item.companyEn || ""}
                      onChange={(e) => handleUpdateCareerItem(idx, "companyEn", e.target.value)}
                      placeholder="e.g. SigitOS Tech"
                      className="text-xs h-7"
                    />
                  </div>
                </div>

                {/* Periode Waktu (ID & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Periode Waktu (ID)</Label>
                    <Input
                      value={item.period}
                      onChange={(e) => handleUpdateCareerItem(idx, "period", e.target.value)}
                      placeholder="Contoh: 2024 — Sekarang"
                      className="text-xs h-7"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Time Period (EN)</Label>
                    <Input
                      value={item.periodEn || ""}
                      onChange={(e) => handleUpdateCareerItem(idx, "periodEn", e.target.value)}
                      placeholder="e.g. 2024 — Present"
                      className="text-xs h-7"
                    />
                  </div>
                </div>

                {/* Deskripsi Singkat / Ringkasan (ID & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Deskripsi Pencapaian (ID)</Label>
                    <Textarea
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => handleUpdateCareerItem(idx, "description", e.target.value)}
                      placeholder="Deskripsi singkat tanggung jawab dan teknologi..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Achievement Description (EN)</Label>
                    <Textarea
                      rows={2}
                      value={item.descriptionEn || ""}
                      onChange={(e) => handleUpdateCareerItem(idx, "descriptionEn", e.target.value)}
                      placeholder="Brief description of responsibilities and impact..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
