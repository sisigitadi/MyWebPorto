"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  saveRedaksiAutomationAction,
  runRedaksiAutomationAction,
  type AutomationJobResult,
} from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  AUTOMATION_SECTIONS,
  AUTOMATION_SECTION_LABELS,
  DEFAULT_REDAKSI_AUTOMATION,
  MAX_PER_RUN_HARD_CAP,
  type AutomationSection,
  type RedaksiAutomationConfig,
} from "@/lib/redaksi-automation-meta";
import type { CloudProvider } from "@/lib/cloud-ai-config";
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

interface RedaksiAutomationFormProps {
  initial: RedaksiAutomationConfig;
  cloudProvider: CloudProvider;
}

export function RedaksiAutomationForm({ initial, cloudProvider }: RedaksiAutomationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, startRunning] = useTransition();
  const [values, setValues] = useState<RedaksiAutomationConfig>(() => ({
    ...initial,
    sections: { ...initial.sections },
    topics: { ...initial.topics },
  }));
  const [error, setError] = useState("");
  const [runResult, setRunResult] = useState<AutomationJobResult[] | null>(null);
  // Konfirmasi ekspllisikan untuk menyalakan auto-publish (autoUpload/terjadwal).
  const [pendingAutoPublish, setPendingAutoPublish] = useState<null | "upload" | "schedule">(null);

  const baseline = { ...initial, sections: { ...initial.sections }, topics: { ...initial.topics } };
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);
  useUnsavedChanges(JSON.stringify(baseline), values);

  const setSection = (key: AutomationSection, next: boolean): void => {
    setValues((prev) => ({ ...prev, sections: { ...prev.sections, [key]: next } }));
  };

  /** Topik disimpan sebagai array; textarea memakai satu topik per baris. */
  const setTopicsText = (key: AutomationSection, text: string): void => {
    const list = text
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    setValues((prev) => ({ ...prev, topics: { ...prev.topics, [key]: list } }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await saveRedaksiAutomationAction({
        enabled: values.enabled,
        sections: values.sections,
        topics: values.topics,
        autoUpload: values.autoUpload,
        scheduleMode: values.scheduleMode,
        publishAt: values.publishAt,
        maxPerRun: values.maxPerRun,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Pengaturan otomasi redaksi disimpan.");
      router.refresh();
    });
  };

  const resetAll = (): void => {
    setValues({
      ...DEFAULT_REDAKSI_AUTOMATION,
      sections: { ...DEFAULT_REDAKSI_AUTOMATION.sections },
      topics: { ...DEFAULT_REDAKSI_AUTOMATION.topics },
      lastRunAt: initial.lastRunAt,
    });
    setError("");
  };

  /**
   * "Perlu izin": menyalakan publish-otomatis (autoUpload atau mode terjadwal)
   * memerlukan konfirmasi eksplisit — konten AI tayang tanpa review adalah
   * tindakan berbahaya (pola `dangerous` di features-form.tsx).
   */
  const requestAutoPublish = (kind: "upload" | "schedule"): void => {
    setPendingAutoPublish(kind);
  };

  const confirmAutoPublish = (): void => {
    const kind = pendingAutoPublish;
    setPendingAutoPublish(null);
    if (kind === "upload") setValues((prev) => ({ ...prev, autoUpload: true }));
    if (kind === "schedule") setValues((prev) => ({ ...prev, scheduleMode: "scheduled" }));
  };

  const handleRun = (): void => {
    setError("");
    setRunResult(null);
    startRunning(async () => {
      const res = await runRedaksiAutomationAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRunResult(res.summary.results);
      toast.success(
        `Auto-tulis selesai: ${res.summary.created} draf dibuat, ${res.summary.failed} gagal.`
      );
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Master switch */}
      <div
        className="flex items-start justify-between gap-4 border-2 rounded-md p-3"
        style={{ borderColor: values.enabled ? "var(--primary)" : "var(--border)" }}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Otomasi Redaksi (master)</span>
            <code className="font-mono text-[10px] text-muted-foreground">redaksi_auto.enabled</code>
            {values.enabled && <Badge className="text-[10px] h-4">AKTIF</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Menyalakan ini mengizinkan pembuatan draf otomatis untuk section yang
            dipilih di bawah. Hasil tetap masuk antrian review sebelum tayang.
            Mematikan = tidak ada penulisan otomatis sama sekali.
          </p>
        </div>
        <Toggle
          checked={values.enabled}
          onChange={(next) => setValues((prev) => ({ ...prev, enabled: next }))}
          disabled={pending}
          ariaLabel="Master switch otomasi redaksi"
        />
      </div>

      {/* Section per bagian */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Bagian yang Ditulis Otomatis
        </h3>
        {AUTOMATION_SECTIONS.map((key) => {
          const meta = AUTOMATION_SECTION_LABELS[key];
          const on = values.sections[key];
          return (
            <div
              key={key}
              className="border-2 rounded-md p-3 transition-colors"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {meta.description}
                  </p>
                </div>
                <Toggle
                  checked={on}
                  onChange={(next) => setSection(key, next)}
                  disabled={pending || !values.enabled}
                  ariaLabel={`Otomasi ${meta.label}`}
                />
              </div>
              {on && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor={`topics-${key}`}>
                    Topik/brief (satu per baris, minimal 4 karakter)
                  </Label>
                  <Textarea
                    id={`topics-${key}`}
                    value={values.topics[key].join("\n")}
                    onChange={(e) => setTopicsText(key, e.target.value)}
                    rows={3}
                    disabled={pending}
                    placeholder={"Contoh:\nArtikel tentang Next.js 15 untuk developer Indonesia\nTips performa Tailwind CSS"}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {values.topics[key].length} topik · saat dijalankan, dibuat
                    hingga {values.maxPerRun} draf per run (maks {MAX_PER_RUN_HARD_CAP}).
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Izin & waktu publish */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Izin &amp; Waktu Upload
        </h3>

        {/* Auto upload — butuh izin eksplisit */}
        <div
          className="flex items-start justify-between gap-4 border-2 rounded-md p-3"
          style={{ borderColor: values.autoUpload ? "var(--primary)" : "var(--border)" }}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Auto Upload (publish langsung)</span>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                BUTUH IZIN
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Draf otomatis ditandai tayang-langsung. Tetap harus Anda tinjau &amp;
              simpan di Redaksi — ini hanya menentukan status publish-nya. Tanpa
              ini, draf tersimpan sebagai draft biasa.
            </p>
          </div>
          <Toggle
            checked={values.autoUpload}
            onChange={(next) => {
              if (next) requestAutoPublish("upload");
              else setValues((prev) => ({ ...prev, autoUpload: false }));
            }}
            disabled={pending}
            ariaLabel="Auto upload (publish langsung)"
          />
        </div>

        {/* Mode jadwal */}
        <div className="space-y-1.5">
          <Label htmlFor="schedule-mode">Waktu Upload</Label>
          <select
            id="schedule-mode"
            value={values.scheduleMode}
            onChange={(e) => {
              const next = e.target.value === "scheduled" ? "scheduled" : "manual";
              if (next === "scheduled") requestAutoPublish("schedule");
              else setValues((prev) => ({ ...prev, scheduleMode: "manual" }));
            }}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="manual">Manual — draf siar saat dijalankan</option>
            <option value="scheduled">Terjadwal — tayang pada waktu yang ditentukan</option>
          </select>
          {values.scheduleMode === "scheduled" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="publish-at">Tanggal &amp; Jam Tayang</Label>
              <Input
                id="publish-at"
                type="datetime-local"
                value={values.publishAt ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, publishAt: e.target.value }))}
                disabled={pending}
                required={values.scheduleMode === "scheduled"}
              />
              <p className="text-[11px] text-muted-foreground">
                Menggunakan kembali infrastruktur <code>publishAt</code> yang sudah
                ada: konten tersembunyi dari publik sampai waktunya tiba.
              </p>
            </div>
          )}
        </div>

        {/* Batas per run */}
        <div className="space-y-1.5">
          <Label htmlFor="max-per-run">Maksimal Draf per Run</Label>
          <Input
            id="max-per-run"
            type="number"
            min={1}
            max={MAX_PER_RUN_HARD_CAP}
            value={values.maxPerRun}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, maxPerRun: e.target.valueAsNumber }))
            }
            disabled={pending}
            className="max-w-[160px]"
          />
          <p className="text-[11px] text-muted-foreground">
            Batas biaya AI per sekali jalan (hard cap {MAX_PER_RUN_HARD_CAP}).
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      {runResult && (
        <div className="space-y-1.5 border-2 border-dashed rounded-md p-3" style={{ borderColor: "var(--border)" }}>
          <h4 className="text-xs font-bold">Hasil Run Terakhir</h4>
          {runResult.map((r, i) => (
            <p key={i} className="text-[11px] font-mono">
              {r.ok ? "✓" : "✗"} {r.type} — {r.topic}
              {r.error ? ` · ${r.error}` : ""}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetAll}
          disabled={pending || !isDirty}
          className="h-9"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Kembalikan Default (mati semua)
        </Button>
        <Button
          type="button"
          onClick={handleRun}
          disabled={running || pending || !values.enabled}
          className="h-9"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Jalankan Auto-Tulis Sekarang
        </Button>
        {values.lastRunAt && (
          <span className="text-[11px] text-muted-foreground">
            Run terakhir: {new Date(values.lastRunAt).toLocaleString("id-ID")}
          </span>
        )}
      </div>

      {cloudProvider === "off" && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Catatan: Cloud AI sedang OFF — menjalankan auto-tulis akan gagal sampai
          provider diaktifkan di God Mode → Sistem &amp; Logs.
        </p>
      )}

      <AlertDialog
        open={pendingAutoPublish !== null}
        onOpenChange={(open) => !open && setPendingAutoPublish(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAutoPublish === "upload"
                ? "Nyalakan auto upload (publish langsung)?"
                : "Gunakan mode terjadwal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAutoPublish === "upload"
                ? "Draf hasil otomatis akan ditandai untuk tayang langsung begitu Anda menyimpannya di Redaksi. Pastikan Anda meninjau setiap draf sebelum simpan — konten AI bisa mengandung kesalahan halus."
                : "Draf hasil otomatis akan ditandai published dengan jadwal tayang. Konten akan otomatis muncul di situs publik saat waktunya tiba tanpa langkah tambahan dari Anda."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAutoPublish}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ya, lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}




