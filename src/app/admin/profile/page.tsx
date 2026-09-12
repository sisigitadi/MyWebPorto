"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import {
  Save,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Sparkles,
  Globe,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/admin/image-upload";
import { DUMMY_PROFILE, ProfileData } from "@/lib/dummy-data";
import { getProfile, updateProfile, translateFieldAction } from "@/lib/actions";

const SOCIAL_LINK_FIELDS: Array<{
  key: keyof ProfileData["socialLinks"];
  label: string;
  placeholder: string;
}> = [
  { key: "github", label: "GitHub URL", placeholder: "https://github.com/username" },
  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/username" },
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/username" },
  { key: "twitter", label: "X (Twitter) URL", placeholder: "https://x.com/username" },
  { key: "medium", label: "Medium URL", placeholder: "https://medium.com/@username" },
  { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@channel" },
  { key: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@username" },
  { key: "telegram", label: "Telegram URL", placeholder: "https://t.me/username" },
  { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/username" },
  { key: "discord", label: "Discord URL", placeholder: "https://discord.gg/invite" },
  { key: "slack", label: "Slack URL", placeholder: "https://join.slack.com/..." },
  { key: "reddit", label: "Reddit URL", placeholder: "https://reddit.com/user/username" },
  { key: "portfolio", label: "Portofolio URL", placeholder: "https://porto.sigitadi.id/" },
];

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(DUMMY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [newSkill, setNewSkill] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getProfile();
        if (data) {
          setProfile(data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleAutoTranslateToEn = async () => {
    setTranslating(true);
    try {
      if (profile.headline) {
        const resHeadline = await translateFieldAction(profile.headline, "id", "en");
        if (resHeadline.success && resHeadline.text) {
          setProfile((prev) => ({ ...prev, headlineEn: resHeadline.text }));
        }
      }
      if (profile.bio) {
        const resBio = await translateFieldAction(profile.bio, "id", "en");
        if (resBio.success && resBio.text) {
          setProfile((prev) => ({ ...prev, bioEn: resBio.text }));
        }
      }
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSavedSuccess(false);

    startTransition(async () => {
      const res = await updateProfile({
        name: profile.name,
        headline: profile.headline,
        headlineEn: profile.headlineEn,
        bio: profile.bio,
        bioEn: profile.bioEn,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        availableForHire: profile.availableForHire,
        skills: profile.skills,
        stats: profile.stats,
        socialLinks: profile.socialLinks,
      });

      if (res.success) {
        setSavedSuccess(true);
        const updated = await getProfile();
        if (updated) {
          setProfile(updated);
        }
        setTimeout(() => {
          setSavedSuccess(false);
        }, 3500);
      } else {
        setErrorMessage(res.error || "Gagal menyimpan data profil.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kelola Profil Pribadi
          </h1>
          <p className="text-sm text-muted-foreground">
            Perbarui data identitas, headline, narasi biografi, dan keahlian yang ditampilkan kepada calon klien.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-md border border-emerald-500/30 animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Profil berhasil disimpan</span>
            </div>
          )}
          {errorMessage && (
            <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-md border border-rose-500/30 animate-in fade-in">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={isPending || isLoading} size="sm" className="gap-2 text-xs h-9">
            {isPending || isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isPending ? "Menyimpan..." : isLoading ? "Memuat..." : "Simpan Perubahan"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="utama" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="utama" className="text-xs">
            Informasi Utama
          </TabsTrigger>
          <TabsTrigger value="keahlian" className="text-xs">
            Keahlian & Statistik
          </TabsTrigger>
          <TabsTrigger value="sosial" className="text-xs">
            Sosial Media & Foto
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Informasi Utama */}
        <TabsContent value="utama">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Biodata & Kontak Utama
              </CardTitle>
              <CardDescription className="text-xs">
                Informasi ini langsung tercermin pada Hero Section dan Footer website publik Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">
                  Nama Lengkap
                </Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  className="text-xs max-w-md"
                />
              </div>

              {/* Bilingual tabs for Headline & Bio */}
              <Tabs defaultValue="id" className="w-full pt-1">
                <TabsList className="grid grid-cols-2 max-w-sm mb-3">
                  <TabsTrigger value="id" className="text-xs gap-1.5">
                    <span>🇮🇩</span> Bahasa Indonesia
                  </TabsTrigger>
                  <TabsTrigger value="en" className="text-xs gap-1.5">
                    <span>🇬🇧</span> English (EN)
                    {profile.headlineEn ? (
                      <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 rounded">✓</span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="id" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="headline" className="text-xs font-medium">
                      Headline Profesional (ID)
                    </Label>
                    <Input
                      id="headline"
                      value={profile.headline}
                      onChange={(e) =>
                        setProfile({ ...profile, headline: e.target.value })
                      }
                      className="text-xs"
                      placeholder="Contoh: Senior Fullstack Developer & Cloud Architect"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs font-medium">
                      Biografi Singkat (ID)
                    </Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                      className="text-xs leading-relaxed"
                      placeholder="Tulis ringkasan profil Anda dalam Bahasa Indonesia..."
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
                      disabled={translating || (!profile.headline && !profile.bio)}
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
                    <Label htmlFor="headlineEn" className="text-xs font-medium">
                      Headline Profesional (EN)
                    </Label>
                    <Input
                      id="headlineEn"
                      value={profile.headlineEn || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, headlineEn: e.target.value })
                      }
                      className="text-xs"
                      placeholder="e.g. Senior Fullstack Developer & Cloud Architect"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bioEn" className="text-xs font-medium">
                      Biografi Singkat (EN)
                    </Label>
                    <Textarea
                      id="bioEn"
                      rows={4}
                      value={profile.bioEn || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, bioEn: e.target.value })
                      }
                      className="text-xs leading-relaxed"
                      placeholder="Write your profile summary in English..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>Email Publik</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>Nomor Telepon / Kontak Tambahan (Opsional)</span>
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-medium flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>Lokasi Domisili</span>
                  </Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Status Ketersediaan Proyek (Available for Hire)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Aktifkan jika Anda sedang menerima tawaran proyek freelance atau full-time.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={profile.availableForHire ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      availableForHire: !profile.availableForHire,
                    })
                  }
                  className="text-xs h-8"
                >
                  {profile.availableForHire ? "Tersedia (Aktif)" : "Sedang Penuh (Nonaktif)"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Keahlian & Statistik */}
        <TabsContent value="keahlian">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Daftar Tag Keahlian (Skills)
                </CardTitle>
                <CardDescription className="text-xs">
                  Teknologi, bahasa pemrograman, dan metodologi yang Anda kuasai.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <Input
                    placeholder="Contoh: Docker, Next.js, Figma"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    <span>Tambah</span>
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-xs pl-2.5 pr-1.5 py-1 gap-1.5 border border-border"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="h-3.5 w-3.5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Statistik Ringkas
                </CardTitle>
                <CardDescription className="text-xs">
                  Angka pencapaian yang tampil pada Hero Section beranda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Label Metrik
                      </Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => {
                          const newStats = [...profile.stats];
                          newStats[idx].label = e.target.value;
                          setProfile({ ...profile, stats: newStats });
                        }}
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Nilai (Angka)
                      </Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => {
                          const newStats = [...profile.stats];
                          newStats[idx].value = e.target.value;
                          setProfile({ ...profile, stats: newStats });
                        }}
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Media Sosial & Foto */}
        <TabsContent value="sosial">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Foto Profil Avatar
                </CardTitle>
                <CardDescription className="text-xs">
                  Foto profesional Anda di kartu profil dan header.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="relative mx-auto h-32 w-32 rounded-full overflow-hidden border-2 border-border shadow-xs">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-xs font-medium block mb-2">Gambar Avatar</Label>
                  <ImageUpload
                    value={profile.avatarUrl}
                    onChange={(url) => setProfile({ ...profile, avatarUrl: url })}
                    label="Unggah Avatar"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Tautan Media Sosial
                </CardTitle>
                <CardDescription className="text-xs">
                  Tautan ke akun sosial yang tampil di Kontak.exe dan Footer. Kosongkan untuk menyembunyikan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {SOCIAL_LINK_FIELDS.map((field) => (
                  <div className="space-y-2" key={field.key}>
                    <Label htmlFor={field.key} className="text-xs font-medium">
                      {field.label}
                    </Label>
                    <Input
                      id={field.key}
                      value={profile.socialLinks?.[field.key] || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          socialLinks: {
                            ...profile.socialLinks,
                            [field.key]: e.target.value,
                          },
                        })
                      }
                      placeholder={field.placeholder}
                      className="text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
