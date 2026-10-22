"use client";

import React, { useState } from "react";
import {
  Cpu,
  Clock,
  ShieldCheck,
  FileCode,
  Sliders,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
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
  CredentialItem,
  PhilosophyItem,
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
  // CREDENTIALS HANDLERS
  // ==========================================
  const handleUpdateCredential = (
    index: number,
    field: keyof CredentialItem,
    value: string
  ) => {
    const updated = [...cards.credentials];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cards, credentials: updated });
  };

  const handleAddCredential = () => {
    const newCred: CredentialItem = {
      id: `cred-${Date.now()}`,
      title: "Sertifikasi / Pencapaian Baru",
      titleEn: "New Certification / Achievement",
      issuer: "Penerbit / Penyelenggara",
      year: new Date().getFullYear().toString(),
      badgeText: "VERIFIED",
    };
    onChange({ ...cards, credentials: [...cards.credentials, newCred] });
  };

  const handleDeleteCredential = (index: number) => {
    const updated = cards.credentials.filter((_, idx) => idx !== index);
    onChange({ ...cards, credentials: updated });
  };

  // ==========================================
  // PHILOSOPHY HANDLERS
  // ==========================================
  const handleUpdatePhilosophy = (
    index: number,
    field: keyof PhilosophyItem,
    value: string
  ) => {
    const updated = [...cards.philosophy];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cards, philosophy: updated });
  };

  const handleAddPhilosophy = () => {
    const newPhil: PhilosophyItem = {
      id: `phil-${Date.now()}`,
      principle: "Prinsip Rekayasa Baru",
      principleEn: "New Engineering Principle",
      detail: "Penjelasan bagaimana prinsip ini diterapkan dalam penulisan kode...",
      detailEn: "Explanation of how this principle is applied in engineering...",
    };
    onChange({ ...cards, philosophy: [...cards.philosophy, newPhil] });
  };

  const handleDeletePhilosophy = (index: number) => {
    const updated = cards.philosophy.filter((_, idx) => idx !== index);
    onChange({ ...cards, philosophy: updated });
  };

  return (
    <Card className="bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span>Pengaturan Kartu Detail Profil OS (Sigit_Profile.exe)</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Kelola konten 5 kartu detail yang ditampilkan pada tab dialog retro di jendela profil pengunjung.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60 border border-[var(--vt-edge-lo-2)]">
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
            <TabsTrigger value="credentials" className="text-xs gap-1.5 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>04 Kredensial</span>
            </TabsTrigger>
            <TabsTrigger value="philosophy" className="text-xs gap-1.5 py-1.5 col-span-2 sm:col-span-1">
              <FileCode className="h-3.5 w-3.5 text-indigo-500" />
              <span>05 Filosofi</span>
            </TabsTrigger>
          </TabsList>

          {/* ====================================================
              SUB-TAB 1: TECH STACK
              ==================================================== */}
          <TabsContent value="tech" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Arsenal Keahlian Terkategori (4 Kategori)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Masing-masing kategori memiliki daftar skill chips
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.techStack.map((cat, catIdx) => (
                <div
                  key={cat.id || catIdx}
                  className="p-3.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold">Judul Kategori (ID & EN)</Label>
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
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">
                Preferensi Kerja, Jaminan SLA, & Permintaan Resume
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Menampilkan parameter kesiapan kerja dan tombol pemicu permintaan resume via form kontak
              </p>
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

          {/* ====================================================
              SUB-TAB 4: CREDENTIALS & BADGES
              ==================================================== */}
          <TabsContent value="credentials" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Kredensial, Sertifikasi & Keamanan ({cards.credentials.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Pencapaian khusus di bidang keamanan siber, kualitas rekayasa, dan standar industri
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddCredential}
                size="sm"
                className="text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Kredensial
              </Button>
            </div>

            <div className="space-y-3">
              {cards.credentials.map((cred, idx) => (
                <div
                  key={cred.id || idx}
                  className="p-3.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Kredensial #{idx + 1}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCredential(idx)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Judul Pencapaian / Sertifikasi (ID)</Label>
                      <Input
                        value={cred.title}
                        onChange={(e) =>
                          handleUpdateCredential(idx, "title", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Title (EN)</Label>
                      <Input
                        value={cred.titleEn || ""}
                        onChange={(e) =>
                          handleUpdateCredential(idx, "titleEn", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Penerbit / Penyelenggara</Label>
                      <Input
                        value={cred.issuer}
                        onChange={(e) =>
                          handleUpdateCredential(idx, "issuer", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Tahun</Label>
                      <Input
                        value={cred.year}
                        onChange={(e) =>
                          handleUpdateCredential(idx, "year", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Badge / Status Label</Label>
                      <Input
                        value={cred.badgeText || ""}
                        onChange={(e) =>
                          handleUpdateCredential(idx, "badgeText", e.target.value)
                        }
                        placeholder="Contoh: VERIFIED"
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ====================================================
              SUB-TAB 5: CODE PHILOSOPHY
              ==================================================== */}
          <TabsContent value="philosophy" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Filosofi Rekayasa & Manifesto Pengembang ({cards.philosophy.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Prinsip utama yang Anda pegang dalam merancang dan mengeksekusi perangkat lunak
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddPhilosophy}
                size="sm"
                className="text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Prinsip
              </Button>
            </div>

            <div className="space-y-3">
              {cards.philosophy.map((phil, idx) => (
                <div
                  key={phil.id || idx}
                  className="p-3.5 bg-muted/30 border border-[var(--vt-edge-lo-2)] rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-bold text-xs text-indigo-500 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5" />
                      <span>Prinsip #{idx + 1}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePhilosophy(idx)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Nama Prinsip (ID)</Label>
                      <Input
                        value={phil.principle}
                        onChange={(e) =>
                          handleUpdatePhilosophy(idx, "principle", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Principle (EN)</Label>
                      <Input
                        value={phil.principleEn || ""}
                        onChange={(e) =>
                          handleUpdatePhilosophy(idx, "principleEn", e.target.value)
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Detail / Elaborasi (ID)</Label>
                      <Textarea
                        rows={2}
                        value={phil.detail}
                        onChange={(e) =>
                          handleUpdatePhilosophy(idx, "detail", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Detail / Elaboration (EN)</Label>
                      <Textarea
                        rows={2}
                        value={phil.detailEn || ""}
                        onChange={(e) =>
                          handleUpdatePhilosophy(idx, "detailEn", e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
