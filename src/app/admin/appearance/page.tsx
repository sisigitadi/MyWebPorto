import { Palette, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveOSApps } from "@/lib/os-apps-config";
import { OSAppsConfigForm } from "@/components/admin/os-apps-config-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman "God Mode" Fase 1: atur app SigitOS yang aktif + urutannya.
 *
 * Perubahan di sini mengubah tampilan homepage (taskbar, sidebar ikon, start
 * menu, dan urutan section di mode mobile) — tidak menyentuh konten, i18n,
 * atau kode, dan langsung aktif setelah Simpan (revalidatePath("/") di action).
 */
export default async function AdminAppearancePage() {
  const { apps, source } = await resolveOSApps();
  const activeCount = apps.filter((a) => a.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" /> Tampilan &amp; Aplikasi OS
        </h1>
        <p className="text-sm text-muted-foreground">
          God Mode — atur aplikasi SigitOS yang ditampilkan ke pengunjung dan
          urutannya, tanpa menyentuh kode atau redeploy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Aplikasi SigitOS
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            Centang untuk menampilkan, gunakan tombol panah untuk mengatur urutan.
            <Badge variant={source === "admin" ? "secondary" : "outline"}>
              {source === "admin" ? `${activeCount}/${apps.length} aktif · sudah disimpan` : "belum diatur — pakai default"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OSAppsConfigForm initial={apps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" /> Yang Bisa &amp; Tidak Bisa Diatur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Bisa:</span> status
            aktif tiap aplikasi (centang) dan urutannya — dipakai di taskbar,
            sidebar ikon desktop, Start Menu, command palette (Ctrl+K), jalan
            pintas angka 1–8, dan urutan section mode mobile.
          </p>
          <p>
            <span className="font-semibold text-foreground">Belum bisa:</span>{" "}
            ikon, warna, nama file (Profil.exe dst.), dan teks di dalam tiap
            aplikasi — bagian editor teks menyusul di fase berikutnya.
          </p>
          <p>
            <span className="font-semibold text-foreground">Pengaman:</span>{" "}
            minimal satu aplikasi harus aktif. Konfigurasi rusak/ditulis tangan
            akan diabaikan dan kembali ke default 8 aplikasi.
          </p>
          <p>
            <span className="font-semibold text-foreground">Catatan teknis:</span>{" "}
            disimpan di tabel <code className="font-mono text-xs">settings</code>{" "}
            key <code className="font-mono text-xs">os_apps</code>; akses tulis
            hanya lewat server action yang memverifikasi admin, tercatat di audit
            log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
