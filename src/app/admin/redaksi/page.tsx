import { Newspaper } from "lucide-react";
import { getCloudAIConfigForAdmin } from "@/lib/cloud-ai-config";
import { listStagedDrafts } from "@/lib/redaksi-automation";
import { getProfile } from "@/lib/actions";
import { RedaksiComposer } from "@/components/admin/redaksi-composer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman Redaksi — hub penulisan konten terpadu (manual + bantuan AI).
 *
 * Server component: memuat status Cloud AI (sudah di-mask, tidak ada key mentah),
 * daftar draf hasil otomasi yang tertahan, dan profil untuk tipe konten Profil.
 * Semua operasi tulis dilakukan lewat server action (verifyAdmin) di composer.
 */
export default async function AdminRedaksiPage() {
  const [cloudAI, staged, profile] = await Promise.all([
    getCloudAIConfigForAdmin(),
    listStagedDrafts(),
    getProfile(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" /> Redaksi — Tulis Konten
        </h1>
        <p className="text-sm text-muted-foreground">
          Satu tempat menulis semua jenis konten: dari Profil sampai produk &quot;exe&quot;.
          Manual atau dibantu AI (mengikuti format &amp; validasi yang sama dengan halaman
          kelola masing-masing).
        </p>
      </div>

      {cloudAI.provider === "off" && (
        <div className="border-l-4 border-amber-500 bg-amber-500/10 p-3 rounded-r-md">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Cloud AI sedang OFF.</strong> Mode manual tetap bisa dipakai sepenuhnya.
            Untuk memakai &quot;Bantuan AI&quot;, aktifkan provider di God Mode → Sistem &amp; Logs.
          </p>
        </div>
      )}

      <RedaksiComposer
        cloudProvider={cloudAI.provider}
        cloudModel={cloudAI.model}
        staged={staged}
        profile={profile}
      />
    </div>
  );
}
