"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveFeaturesAction, saveGodModeDraftAction, publishGodModeAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { GodModeVersionBar } from "@/components/admin/godmode-version-bar";
import {
  FEATURE_DEFS,
  FEATURE_GROUPS,
  FEATURE_KEYS,
  type Features,
  type FeatureKey,
} from "@/lib/features-meta";
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
import { cn } from "@/lib/utils";

interface FeaturesFormProps {
  /** Flag efektif dari DB (sudah diresolve server-side). */
  initial: Features;
}

/**
 * Toggle switch inline — tidak ada komponen Switch shadcn di repo ini
 * (src/components/ui/ hanya badge/card/input/textarea/label/tabs/separator/
 * skeleton/sonner/alert-dialog/button/dialog/dropdown-menu/select/table).
 * Mengikuti pola toggle yang sudah ada di os-apps-config-form.tsx: <button>
 * role + aria-checked + aria-label, styling Tailwind murni.
 */
function FeatureToggle({
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

/**
 * Form untuk /admin/features: toggle per flag, dikelompokkan per
 * FEATURE_GROUPS. State selalu menampilkan kondisi EFEKTIF (DB). Submit
 * mengirim seluruh state; server memvalidasi ulang (verifyAdmin + key
 * terdaftar + boolean) — manipulasi client tidak pernah menerobos.
 */
export function FeaturesForm({ initial }: FeaturesFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Features>(() => ({ ...initial }));
  const [error, setError] = useState("");
  // Konfirmasi bila maintenance_mode akan dinyalakan (situs langsung terganti).
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  const baseline = { ...initial };
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);

  // Guard "belum disimpan" (sama dengan 7 form admin lain). sessionKey memakai
  // isi initial, bukan object-nya — lihat penjelasan di ui-strings-form.tsx.
  useUnsavedChanges(JSON.stringify(initial), values);

  const handleChange = (key: FeatureKey, next: boolean): void => {
    setValues((prev) => ({ ...prev, [key]: next }));
    setError("");
  };

  const persist = (payload: Features): void => {
    startTransition(async () => {
      const res = await saveFeaturesAction(payload);
      if (res.ok) {
        setValues({ ...res.features });
        toast.success("Fitur disimpan.", {
          description: "Tampilan situs publik langsung diperbarui.",
        });
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan fitur.", { description: res.error });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    // Konfirmasi berbahaya: menyalakan mode pemeliharaan langsung mengganti
    // seluruh situs publik saat tombol Simpan diklik. Kunci ke flag
    // `dangerous` di FEATURE_DEFS, bukan hardcode key maintenance_mode.
    const turningDangerousOn = FEATURE_DEFS.filter((d) => d.dangerous).some(
      (d) => values[d.key] && !initial[d.key]
    );
    if (turningDangerousOn) {
      setPendingMaintenance(true);
      return;
    }
    persist(values);
  };

  const confirmMaintenance = (): void => {
    setPendingMaintenance(false);
    persist(values);
  };

  const resetAll = (): void => {
    setValues(baseline);
    setError("");
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    const res = await saveGodModeDraftAction("features", values);
    if (!res.ok) {
      toast.error("Gagal menyimpan draf: " + res.error);
      return false;
    }
    return true;
  };

  const handlePublishLive = async (): Promise<boolean> => {
    const turningDangerousOn = FEATURE_DEFS.filter((d) => d.dangerous).some(
      (d) => values[d.key] && !initial[d.key]
    );
    if (turningDangerousOn) {
      if (!confirm("Mode pemeliharaan akan aktif di situs publik! Lanjutkan publikasi?")) {
        return false;
      }
    }
    const res = await publishGodModeAction("features", values);
    if (!res.ok) {
      toast.error("Gagal mempublikasikan: " + res.error);
      return false;
    }
    setBaseline({ ...values });
    return true;
  };

  return (
    <div className="space-y-6">
      {/* God Mode Fase 4: Draft, Live Preview, dan Rollback Bar */}
      <GodModeVersionBar
        categoryKey="features"
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishLive}
        isDirty={isDirty}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
      {FEATURE_GROUPS.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {group}
          </h3>
          {FEATURE_DEFS.filter((d) => d.group === group).map((def) => {
            const k = def.key;
            const changed = baseline[k] !== values[k];
            return (
              <div
                key={k}
                className="flex items-start justify-between gap-4 border-2 rounded-md p-3 transition-colors"
                style={{ borderColor: changed ? "var(--primary)" : "var(--border)" }}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{def.label}</span>
                    <code className="font-mono text-[10px] text-muted-foreground">
                      {k}
                    </code>
                    {def.dangerous && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        BERBAHAYA
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {def.description.id}
                  </p>
                </div>
                <FeatureToggle
                  checked={values[k]}
                  onChange={(next) => handleChange(k, next)}
                  disabled={pending}
                  ariaLabel={`${def.label} — ${values[k] ? "aktif" : "nonaktif"}`}
                />
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Fitur
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={resetAll}
          disabled={pending || !isDirty}
          className="h-9"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Batal Perubahan
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {isDirty ? "Ada perubahan yang belum disimpan." : `${FEATURE_KEYS.length} saklar.`}
        </span>
      </div>

      <AlertDialog open={pendingMaintenance} onOpenChange={(open) => !open && setPendingMaintenance(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nyalakan mode pemeliharaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh situs publik langsung diganti halaman &ldquo;Sedang
              Pemeliharaan&rdquo; begitu Anda menekan Simpan. Panel admin (termasuk
              halaman ini) tetap dapat diakses untuk mematikannya kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMaintenance}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ya, nyalakan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  </div>
  );
}
