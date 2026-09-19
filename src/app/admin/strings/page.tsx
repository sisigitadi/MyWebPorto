import { Languages, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveUIStrings } from "@/lib/ui-strings-config";
import { EDITABLE_KEYS } from "@/lib/ui-strings-meta";
import { UIStringsForm } from "@/components/admin/ui-strings-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman "God Mode" Fase 2: ubah teks marketing UI tanpa kode/redeploy.
 *
 * Yang disimpan hanya overlay (key terdaftar) di settings.ui_strings; teks
 * default tetap di src/lib/translations.ts dan dipakai bila key belum ditimpa
 * atau data rusak. Perubahan langsung tayang di situs publik setelah Simpan
 * (revalidatePath("/", "layout") di saveUIStringsAction).
 */
export default async function AdminStringsPage() {
  const strings = await resolveUIStrings();
  const editedSlots = Object.keys(strings.id).length + Object.keys(strings.en).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" /> Teks &amp; Bahasa
        </h1>
        <p className="text-sm text-muted-foreground">
          God Mode — ubah teks marketing situs tanpa menyentuh kode atau
          redeploy. Mendukung Indonesia &amp; English.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Editor Teks UI
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {EDITABLE_KEYS.length} teks bisa diubah, masing-masing untuk dua
            bahasa.
            <Badge variant={strings.source === "admin" ? "secondary" : "outline"}>
              {strings.source === "admin"
                ? `${editedSlots} slot disunting · sudah disimpan`
                : "belum diatur — pakai default"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UIStringsForm initial={{ id: strings.id, en: strings.en }} />
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
            <span className="font-semibold text-foreground">Bisa:</span> teks
            marketing (judul section, subjudul, badge, tombol CTA) untuk kedua
            bahasa. Kosongkan kolom untuk kembali ke teks default.
          </p>
          <p>
            <span className="font-semibold text-foreground">Belum bisa:</span>{" "}
            teks dalam tiap aplikasi (proyek, layanan, testimoni), label OS,
            dan pesan terminal — menyusul di fase berikutnya.
          </p>
          <p>
            <span className="font-semibold text-foreground">Pengaman:</span>{" "}
            hanya teks polos (tidak ada HTML), panjang dibatasi per kolom, dan
            hanya key terdaftar yang disimpan. Data rusak diabaikan, situs
            tetap memakai teks default.
          </p>
          <p>
            <span className="font-semibold text-foreground">Catatan teknis:</span>{" "}
            disimpan di tabel <code className="font-mono text-xs">settings</code>{" "}
            key <code className="font-mono text-xs">ui_strings</code>; akses
            tulis hanya lewat server action yang memverifikasi admin, tercatat
            di audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
