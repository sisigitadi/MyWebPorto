import { ToggleLeft, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveFeatures } from "@/lib/features-config";
import { FEATURE_KEYS } from "@/lib/features-meta";
import { FeaturesForm } from "@/components/admin/features-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman "God Mode" Fase 3: hidupkan/matikan fitur besar situs tanpa kode
 * atau redeploy.
 *
 * Disimpan di settings.features (flat boolean); default (semua ON, maintenance
 * OFF) dipakai bila belum diatur atau data rusak. Perubahan langsung tayang
 * di situs publik setelah Simpan (revalidatePath("/", "layout") di
 * saveFeaturesAction). Halaman admin ini sendiri tidak pernah tergate
 * maintenance — route group (admin) punya layout sendiri.
 */
export default async function AdminFeaturesPage() {
  const features = await resolveFeatures();
  const activeCount = FEATURE_KEYS.filter(
    (k) => k !== "maintenance_mode" && features[k]
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-primary" /> Fitur &amp; Mode
        </h1>
        <p className="text-sm text-muted-foreground">
          God Mode — hidupkan/matikan fitur besar situs publik tanpa menyentuh
          kode atau redeploy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Saklar Fitur Global
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {FEATURE_KEYS.length - 1} fitur + mode pemeliharaan.
            <Badge variant={features.maintenance_mode ? "destructive" : "secondary"}>
              {features.maintenance_mode
                ? "mode pemeliharaan AKTIF"
                : `${activeCount}/${FEATURE_KEYS.length - 1} fitur aktif`}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeaturesForm initial={features} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" /> Cara Kerja &amp; Batasan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Sekarang:</span>{" "}
            hidupkan/matikan Terminal &amp; RetroBot, keranjang belanja, artikel,
            dan mode pemeliharaan dari halaman ini.
          </p>
          <p>
            <span className="font-semibold text-foreground">Mode pemeliharaan:</span>{" "}
            seluruh situs publik diganti halaman &ldquo;Sedang Pemeliharaan&rdquo;.
            Panel admin (termasuk halaman ini) tetap berfungsi normal — matikan
            kembali dari sini.
          </p>
          <p>
            <span className="font-semibold text-foreground">Pengaman:</span>{" "}
            data rusak diabaikan, situs tetap memakai default (semua fitur
            aktif, maintenance mati). Hanya key terdaftar &amp; boolean yang
            disimpan; bypass form tidak lolos (validasi 100% server-side).
          </p>
          <p>
            <span className="font-semibold text-foreground">Catatan teknis:</span>{" "}
            disimpan di tabel <code className="font-mono text-xs">settings</code>{" "}
            key <code className="font-mono text-xs">features</code>; akses tulis
            hanya lewat server action yang memverifikasi admin, tercatat di
            audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
