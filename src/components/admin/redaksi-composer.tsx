"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles, Bot, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContentEditor } from "@/components/admin/content-editor";
import {
  draftContentWithAIAction,
  deleteStagedDraftAction,
  saveProject,
  saveService,
  saveProduct,
  saveTestimonial,
  saveArticle,
  updateProfile,
} from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  REDAKSI_TYPES,
  getRedaksiType,
  type RedaksiContentType,
} from "@/lib/redaksi-meta";
import type { StagedDraft } from "@/lib/redaksi-automation";
import type { CloudProvider } from "@/lib/cloud-ai-config";
import type { ProfileData } from "@/lib/dummy-data";
import { AUTOMATION_SECTION_LABELS } from "@/lib/redaksi-automation-meta";

// ============================================================
// DESKRIPSI FIELD — subset editorial per tipe. Validasi PENUH tetap
// dilakukan server-side oleh action save* (schema validations.ts).
// ============================================================
type FieldKind = "text" | "textarea" | "editor" | "chips" | "toggle" | "number" | "datetime";

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
}

/**
 * Nilai awal form per tipe. Default published=false (draft) — Redaksi adalah
 * alat menulis; konten tayang hanya saat admin sengaja menyalakannya.
 */
function initialFormValues(
  type: RedaksiContentType,
  profile: { name: string; headline: string; bio: string; skills: string[] }
): Record<string, unknown> {
  switch (type) {
    case "article":
      return { title: "", slug: "", summary: "", content: "", tags: [], published: false, publishAt: "" };
    case "project":
      return {
        title: "", slug: "", summary: "", description: "", techStacks: [],
        imageUrl: "", demoUrl: "", repoUrl: "", published: false, publishAt: "",
      };
    case "service":
      return { title: "", description: "", published: false };
    case "product":
      return { title: "", slug: "", description: "", imageUrl: "", priceLabel: "", category: "", published: false };
    case "testimonial":
      return { clientName: "", clientRole: "", content: "", rating: 5, published: false };
    case "profile":
      // Profil tunggal: prefilled dari data ada; hanya field editorial yang
      // diedit. Field lain (email, socialLinks, dst.) digabung ulang saat simpan.
      return {
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
        skills: [...profile.skills],
      };
  }
}

/** Slug kebab-case dari judul (sama konsep dengan halaman kelola). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

const COMPOSER_FIELDS: Record<RedaksiContentType, FieldDef[]> = {
  article: [
    { key: "title", label: "Judul", kind: "text", required: true, maxLength: 200 },
    { key: "slug", label: "Slug (kosong = otomatis dari judul)", kind: "text", maxLength: 100 },
    { key: "summary", label: "Ringkasan", kind: "textarea", maxLength: 500 },
    { key: "content", label: "Isi Artikel", kind: "editor", required: true },
    { key: "tags", label: "Tag", kind: "chips", hint: "Ketik lalu Enter" },
    { key: "published", label: "Langsung tayang (published)", kind: "toggle" },
    { key: "publishAt", label: "Jadwal tayang (kosong = ikut published)", kind: "datetime" },
  ],
  project: [
    { key: "title", label: "Judul Proyek", kind: "text", required: true, maxLength: 150 },
    { key: "slug", label: "Slug", kind: "text", maxLength: 100 },
    { key: "summary", label: "Ringkasan", kind: "textarea", maxLength: 500 },
    { key: "description", label: "Deskripsi Proyek", kind: "editor", required: true },
    { key: "techStacks", label: "Tech Stack", kind: "chips" },
    { key: "imageUrl", label: "URL Gambar (wajib)", kind: "text", required: true },
    { key: "demoUrl", label: "URL Demo", kind: "text" },
    { key: "repoUrl", label: "URL Repository", kind: "text" },
    { key: "published", label: "Langsung tayang (published)", kind: "toggle" },
    { key: "publishAt", label: "Jadwal tayang", kind: "datetime" },
  ],
  service: [
    { key: "title", label: "Nama Layanan", kind: "text", required: true, maxLength: 150 },
    { key: "description", label: "Deskripsi Layanan", kind: "editor", required: true },
    { key: "published", label: "Langsung tayang (published)", kind: "toggle" },
  ],
  product: [
    { key: "title", label: "Nama Produk", kind: "text", required: true, maxLength: 150 },
    { key: "slug", label: "Slug", kind: "text", maxLength: 100 },
    { key: "description", label: "Deskripsi Produk", kind: "editor", required: true },
    { key: "imageUrl", label: "URL Gambar (wajib)", kind: "text", required: true },
    { key: "priceLabel", label: "Label Harga", kind: "text", maxLength: 100 },
    { key: "category", label: "Kategori", kind: "text", maxLength: 60 },
    { key: "published", label: "Langsung tayang (published)", kind: "toggle" },
  ],
  testimonial: [
    { key: "clientName", label: "Nama Klien", kind: "text", required: true, maxLength: 100 },
    { key: "clientRole", label: "Peran Klien", kind: "text", maxLength: 100 },
    { key: "content", label: "Isi Testimoni", kind: "editor", required: true },
    { key: "rating", label: "Rating (1-5)", kind: "number", required: true },
    { key: "published", label: "Langsung tayang (published)", kind: "toggle" },
  ],
  profile: [
    { key: "name", label: "Nama", kind: "text", required: true, maxLength: 100 },
    { key: "headline", label: "Headline", kind: "text", required: true, maxLength: 200 },
    { key: "bio", label: "Bio", kind: "editor", required: true },
    { key: "skills", label: "Keahlian", kind: "chips" },
  ],
};

// ============================================================
// KOMPONEN KECIL
// ============================================================

/** Toggle inline (tidak ada komponen Switch di repo — lihat features-form.tsx). */
function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-[var(--vt-edge-lo-2)] transition-colors",
        checked ? "bg-[var(--vt-blue)]" : "bg-[var(--vt-edge-lo-2)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** Chip editor sederhana: tambah via Enter/blur, hapus via ×. */
function ChipInput({
  values,
  onChange,
  disabled,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 text-[11px]">
            {v}
            <button
              type="button"
              aria-label={`Hapus ${v}`}
              disabled={disabled}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-destructive disabled:opacity-40 cursor-pointer"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder || "Ketik lalu Enter"}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ============================================================
// KOMPOSER UTAMA
// ============================================================

interface RedaksiComposerProps {
  cloudProvider: CloudProvider;
  cloudModel: string;
  staged: StagedDraft[];
  /** Profil penuh (dibutuhkan untuk merge saat menyimpan tipe Profil). */
  profile: ProfileData;
}

type SaveResult = { success: boolean; error?: string };

/** Aksi simpan per tipe — memakai action yang SAMA dengan halaman kelola, jadi
 *  validasi schema penuh, slug-unik, audit, dan revalidatePath tetap berlaku. */
async function saveByType(type: RedaksiContentType, payload: unknown): Promise<SaveResult> {
  switch (type) {
    case "article":
      return saveArticle(payload);
    case "project":
      return saveProject(payload);
    case "service":
      return saveService(payload);
    case "product":
      return saveProduct(payload);
    case "testimonial":
      return saveTestimonial(payload);
    case "profile":
      return updateProfile(payload);
  }
}

export function RedaksiComposer({
  cloudProvider,
  cloudModel,
  staged,
  profile,
}: RedaksiComposerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drafting, startDrafting] = useTransition();
  const [type, setType] = useState<RedaksiContentType>("article");
  const [brief, setBrief] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialFormValues("article", profile)
  );
  const [error, setError] = useState("");
  const [stagedList, setStagedList] = useState<StagedDraft[]>(staged);

  const tdef = getRedaksiType(type);
  const fields = COMPOSER_FIELDS[type];

  // Guard navigasi (sama dengan 7 form admin lain) — lihat ui-strings-form.tsx.
  const baseline = initialFormValues(type, profile);
  useUnsavedChanges(JSON.stringify(baseline), values);

  const setField = (key: string, value: unknown): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (next: RedaksiContentType): void => {
    setType(next);
    setValues(initialFormValues(next, profile));
    setBrief("");
    setError("");
  };

  /** Minta draf AI (server action: verifyAdmin + rate-limit + validasi draf). */
  const handleDraft = (): void => {
    setError("");
    startDrafting(async () => {
      const res = await draftContentWithAIAction(type, brief, "id");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const draft = res.draft as Record<string, unknown>;
      setValues((prev) => {
        const merged = { ...prev };
        // Timbul field yang dihasilkan AI, tapi hanya bila tidak menghapus isian
        // admin yang sudah ada (array kosong tidak menimpa array berisi).
        for (const [k, v] of Object.entries(draft)) {
          const empty =
            v === undefined ||
            v === null ||
            v === "" ||
            (Array.isArray(v) && v.length === 0);
          if (empty) continue;
          merged[k] = v;
        }
        // Slug otomatis bila masih kosong & ada judul.
        const titleKey = getRedaksiType(type)?.titleField ?? "title";
        if (!merged.slug && typeof merged[titleKey] === "string") {
          merged.slug = slugify(String(merged[titleKey]));
        }
        return merged;
      });
      toast.success("Draf AI berhasil dimuat. Tinjau & lengkapi sebelum menyimpan.");
    });
  };

  /** Susun payload akhir: auto-slug + normalisasi publishAt kosong. */
  const buildPayload = (): Record<string, unknown> => {
    const payload = { ...values };
    const titleKey = tdef?.titleField ?? "title";
    if (!payload.slug && typeof payload[titleKey] === "string") {
      payload.slug = slugify(String(payload[titleKey]));
    }
    if (payload.publishAt === "") payload.publishAt = undefined;
    return payload;
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      let payload = buildPayload();
      // Profil tunggal: gabung field editorial yang diedit dengan data penuh
      // (email, socialLinks, stats, dst.) agar schema lengkap terpenuhi.
      if (type === "profile") {
        payload = { ...profile, ...payload };
      }
      const res = await saveByType(type, payload);
      if (!res.success) {
        setError(res.error || "Gagal menyimpan. Periksa kembali isian.");
        return;
      }
      toast.success(`${tdef?.label ?? "Konten"} berhasil disimpan.`);
      setValues(initialFormValues(type, profile));
      setBrief("");
      router.refresh();
    });
  };

  /** Muat draf hasil otomasi ke form (menerapkan niat publish-nya). */
  const handleLoadStaged = (s: StagedDraft): void => {
    setType(s.type);
    const base = initialFormValues(s.type, profile);
    setValues({
      ...base,
      ...s.data,
      published: s.intendedPublished,
      publishAt: s.intendedPublishAt ?? "",
    });
    setBrief(s.topic);
    setError("");
    toast.info(`Draf "${s.topic}" dimuat untuk direview.`);
  };

  /** Buang draf tertahan. */
  const handleDiscardStaged = (id: string): void => {
    startTransition(async () => {
      const res = await deleteStagedDraftAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStagedList((prev) => prev.filter((s) => s.id !== id));
      toast.success("Draf dibuang.");
    });
  };

  /** Render satu field sesuai kind-nya. */
  const renderField = (f: FieldDef): React.ReactNode => {
    const val = values[f.key];
    const id = `redaksi-${type}-${f.key}`;
    switch (f.kind) {
      case "text":
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={id}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              required={f.required}
              disabled={pending}
              maxLength={f.maxLength}
            />
          </div>
        );
      case "textarea":
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id={id}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setField(f.key, e.target.value)}
              rows={3}
              required={f.required}
              disabled={pending}
              maxLength={f.maxLength}
            />
          </div>
        );
      case "editor":
        return (
          <ContentEditor
            key={f.key}
            id={id}
            label={f.label + (f.required ? " *" : "")}
            value={typeof val === "string" ? val : ""}
            onChange={(v) => setField(f.key, v)}
            rows={10}
            required={f.required}
          />
        );
      case "chips":
        return (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <ChipInput
              values={Array.isArray(val) ? (val as string[]) : []}
              onChange={(v) => setField(f.key, v)}
              disabled={pending}
              placeholder={f.hint}
            />
            {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
          </div>
        );
      case "toggle":
        return (
          <div
            key={f.key}
            className="flex items-center justify-between gap-4 border-2 rounded-md p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-sm font-semibold">{f.label}</span>
            <Toggle
              checked={Boolean(val)}
              onChange={(next) => setField(f.key, next)}
              disabled={pending}
              ariaLabel={f.label}
            />
          </div>
        );
      case "number":
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={id}
              type="number"
              min={1}
              max={5}
              value={typeof val === "number" ? val : typeof val === "string" ? val : ""}
              onChange={(e) => setField(f.key, e.target.valueAsNumber)}
              required={f.required}
              disabled={pending}
            />
          </div>
        );
      case "datetime":
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={id}>{f.label}</Label>
            <Input
              id={id}
              type="datetime-local"
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setField(f.key, e.target.value)}
              disabled={pending}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Draf hasil otomasi yang menunggu review */}
      {stagedList.length > 0 && (
        <div className="space-y-2 border-2 border-dashed rounded-md p-3" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Draf hasil otomasi menunggu review ({stagedList.length})
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Draf dibuat otomatis sesuai pengaturan Otomasi Redaksi, tetap perlu
            ditinjau &amp; disimpan agar tayang (niat publish sudah diterapkan).
          </p>
          <div className="space-y-1.5">
            {stagedList.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 border border-border rounded p-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {AUTOMATION_SECTION_LABELS[s.type]?.label ?? s.type} — {s.topic}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("id-ID")}
                    {s.intendedPublished
                      ? s.intendedPublishAt
                        ? ` · terjadwal ${new Date(s.intendedPublishAt).toLocaleString("id-ID")}`
                        : " · langsung tayang saat disimpan"
                      : " · tersimpan sebagai draft"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleLoadStaged(s)}
                    disabled={pending || drafting}
                  >
                    <UploadCloud className="h-3 w-3" /> Muat
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] gap-1 hover:text-destructive"
                    onClick={() => handleDiscardStaged(s.id)}
                    disabled={pending || drafting}
                  >
                    <Trash2 className="h-3 w-3" /> Buang
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pemilih jenis konten */}
      <div className="space-y-2">
        <Label>Jenis konten</Label>
        <div className="flex flex-wrap gap-2">
          {REDAKSI_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTypeChange(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-xs text-xs font-mono font-bold border-2 transition-colors cursor-pointer",
                type === t.key
                  ? "bg-[var(--vt-blue)] text-white border-[var(--vt-blue)]"
                  : "text-[var(--vt-ink)] border-[var(--vt-edge-lo-2)] hover:bg-[var(--vt-edge-hi-2)]"
              )}
              aria-pressed={type === t.key}
            >
              {t.short}
            </button>
          ))}
        </div>
        {tdef && <p className="text-[11px] text-muted-foreground">{tdef.description}</p>}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Brief + bantuan AI */}
        <div className="space-y-1.5 border-2 rounded-md p-3" style={{ borderColor: "var(--border)" }}>
          <Label htmlFor="redaksi-brief" className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Brief untuk AI (opsional)
          </Label>
          <Textarea
            id="redaksi-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            disabled={drafting || pending}
            placeholder="Contoh: artikel tentang optimasi gambar di Next.js 15; fokus praktik, 5 bagian."
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDraft}
              disabled={drafting || pending || cloudProvider === "off"}
              className="h-8 gap-1.5"
            >
              {drafting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Bantuan AI
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {cloudProvider === "off"
                ? "Cloud AI OFF — aktifkan di God Mode → Pengaturan Cloud AI."
                : `Provider: ${cloudProvider} · model: ${cloudModel}`}
            </span>
          </div>
        </div>

        {fields.map(renderField)}

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan {tdef?.label ?? "Konten"}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Disimpan lewat action yang sama dengan halaman kelola — validasi
            penuh, slug unik, &amp; audit log berlaku.
          </span>
        </div>
      </form>
    </div>
  );
}





