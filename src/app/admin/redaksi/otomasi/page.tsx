import { Bot } from "lucide-react";
import { getCloudAIConfigForAdmin } from "@/lib/cloud-ai-config";
import { getRedaksiAutomationForAdmin } from "@/lib/redaksi-automation";
import { RedaksiAutomationForm } from "@/components/admin/redaksi-automation-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman pengaturan Otomasi Redaksi — on/off per section, topik, perlu izin
 * (auto upload), dan waktu upload. Config disimpan di tabel settings
 * (key "redaksi_auto") tanpa redeploy.
 */
export default async function AdminRedaksiOtomasiPage() {
  const [cloudAI, automation] = await Promise.all([
    getCloudAIConfigForAdmin(),
    getRedaksiAutomationForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" /> Otomasi Redaksi
        </h1>
        <p className="text-sm text-muted-foreground">
          Menulis konten otomatis untuk semua bagian yang dipilih: bisa
          diaktifkan per section, memerlukan izin untuk publish langsung, dan
          terjadwal saat waktunya.
        </p>
      </div>

      {cloudAI.provider === "off" && (
        <div className="border-l-4 border-amber-500 bg-amber-500/10 p-3 rounded-r-md">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Cloud AI sedang OFF.</strong> Otomasi butuh provider AI untuk
            membuat draf. Aktifkan di God Mode → Sistem &amp; Logs. Pengaturan di
            bawah tetap bisa disimpan.
          </p>
        </div>
      )}

      <RedaksiAutomationForm initial={automation} cloudProvider={cloudAI.provider} />
    </div>
  );
}
