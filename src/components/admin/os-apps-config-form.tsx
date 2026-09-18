"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Palette,
  Save,
  User,
  Briefcase,
  FolderGit2,
  Package,
  FileText,
  Terminal,
  MessageSquareQuote,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveOSAppsAction } from "@/lib/actions";
import {
  appHumanLabel,
  appFilename,
  type AppId,
  type OSAppConfig,
} from "@/lib/os-apps-meta";

/** Ikon per app — mencerminkan APPS di os-desktop-manager.tsx. */
const APP_ICONS: Record<AppId, React.ComponentType<{ className?: string }>> = {
  profil: User,
  layanan: Briefcase,
  proyek: FolderGit2,
  toko: Package,
  artikel: FileText,
  terminal: Terminal,
  testimoni: MessageSquareQuote,
  kontak: Mail,
};

interface OSAppsConfigFormProps {
  /** Semua app (aktif + nonaktif) terurut, dibaca server-side. */
  initial: OSAppConfig[];
}

/**
 * Form untuk /admin/appearance: centang aktif + urutkan app SigitOS.
 *
 * State lokal = daftar lengkap (semua app); urutan = posisi di daftar, tombol
 * panah menukar posisi dengan tetangga. Saat submit, order diturunkan dari
 * posisi dan disimpan sebagai settings.os_apps; server memvalidasi ulang
 * (verifyAdmin + Zod) jadi manipulasi client tidak pernah menerobos.
 */
export function OSAppsConfigForm({ initial }: OSAppsConfigFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<OSAppConfig[]>(
    // Salin agar tidak memutasi prop server.
    initial.map((a) => ({ ...a }))
  );
  const [error, setError] = useState("");

  const activeCount = rows.filter((r) => r.enabled).length;

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggle = (id: AppId, enabled: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
  };

  const reset = () => {
    setRows(initial.map((a) => ({ ...a })));
    setError("");
  };

  const isDirty = JSON.stringify(rows) !== JSON.stringify(initial);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      // order diturunkan dari posisi daftar — tidak ada gap/urutan aneh.
      const payload: OSAppConfig[] = rows.map((r, i) => ({
        id: r.id,
        enabled: r.enabled,
        order: i,
      }));
      const res = await saveOSAppsAction(payload);
      if (res.ok) {
        setRows(res.apps.map((a) => ({ ...a })));
        toast.success("Konfigurasi aplikasi disimpan.", {
          description: `${res.apps.filter((a) => a.enabled).length}/${res.apps.length} aplikasi aktif — tampilan publik langsung diperbarui.`,
        });
        // Segarkan data server (badge sumber) tanpa full reload.
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan konfigurasi aplikasi.", {
          description: res.error,
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        {rows.map((row, index) => {
          const Icon = APP_ICONS[row.id];
          return (
            <div
              key={row.id}
              className={`flex items-center gap-3 border-2 rounded-md px-3 py-2 transition-colors ${
                row.enabled
                  ? "border-border bg-card"
                  : "border-border/50 bg-muted/30"
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={row.enabled}
                aria-label={`Tampilkan aplikasi ${appHumanLabel(row.id, "id")}`}
                onClick={() => toggle(row.id, !row.enabled)}
                disabled={pending}
                className={`h-5 w-5 shrink-0 rounded-xs border-2 flex items-center justify-center transition-colors ${
                  row.enabled
                    ? "border-primary bg-primary/15"
                    : "border-border bg-background hover:border-primary/60"
                }`}
              >
                {row.enabled && <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />}
              </button>
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  row.enabled ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggle(row.id, !row.enabled)}
                  disabled={pending}
                  className={`text-sm font-semibold text-left cursor-pointer ${
                    row.enabled ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {appHumanLabel(row.id, "id")}
                  <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                    {appFilename(row.id, "id")}
                  </span>
                </button>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-6 text-right">
                {index + 1}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => move(index, -1)}
                  disabled={pending || index === 0}
                  aria-label={`Naikkan ${appHumanLabel(row.id, "id")}`}
                  title="Naikkan urutan"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => move(index, 1)}
                  disabled={pending || index === rows.length - 1}
                  aria-label={`Turunkan ${appHumanLabel(row.id, "id")}`}
                  title="Turunkan urutan"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {activeCount === 0 && (
        <p className="text-xs text-destructive font-medium">
          Minimal satu aplikasi harus aktif — pengunjung membutuhkan satu
          jendela untuk bernavigasi.
        </p>
      )}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || activeCount === 0}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Tampilan
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={pending || !isDirty}
          className="h-9"
        >
          Batal Perubahan
        </Button>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Palette className="h-3 w-3" />
          {isDirty
            ? "Ada perubahan yang belum disimpan."
            : `${activeCount}/${rows.length} aplikasi aktif.`}
        </span>
      </div>
    </form>
  );
}
