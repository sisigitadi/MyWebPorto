import { Cloud, Gauge } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCloudAIConfigForAdmin } from "@/lib/cloud-ai-config";
import { CloudAIConfigForm } from "@/components/admin/cloud-ai-config-form";
import { getGeminiFallbackModels } from "@/lib/ai-provider";
import {
  getGeminiQuotaSnapshot,
  type GeminiModelQuota,
} from "@/lib/gemini-quota";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<GeminiModelQuota["status"], string> = {
  ok: "Aman",
  near: "Mendekati batas",
  limited: "Dibatasi",
};

const STATUS_VARIANT: Record<
  GeminiModelQuota["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ok: "secondary",
  near: "outline",
  limited: "destructive",
};

const LIMIT_SOURCE_LABEL: Record<GeminiModelQuota["limitSource"], string> = {
  default: "perkiraan default",
  env: "env var",
  learned: "dipelajari dari error 429",
};

/** Satu batas (RPM/RPD) dengan progress bar pakai/batas. */
function QuotaBar({
  label,
  used,
  limit,
  windowLabel,
}: {
  label: string;
  used: number;
  limit: number;
  windowLabel: string;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const danger = used >= limit;
  const near = !danger && pct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {limit}{" "}
          <span className="text-[10px] opacity-70">({windowLabel})</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${used} dari ${limit}`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            danger ? "bg-destructive" : near ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminCloudAIPage() {
  const cloudAIConfig = await getCloudAIConfigForAdmin();

  // Estimasi quota hanya untuk Gemini (provider lain punya skema batas
  // berbeda). Cakup model aktif + model cadangan yang dipakai retry 429.
  const quotaSnapshot =
    cloudAIConfig.provider === "gemini"
      ? getGeminiQuotaSnapshot([
          cloudAIConfig.model,
          ...getGeminiFallbackModels(cloudAIConfig.model),
        ])
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" /> Pengaturan Cloud AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi koneksi dengan provider AI pihak ketiga untuk membantu pembuatan draf konten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-primary" /> Pengaturan Provider AI
          </CardTitle>
          <CardDescription>
            Atur kredensial dan preferensi model. API Key disimpan dalam database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CloudAIConfigForm initial={cloudAIConfig} />
        </CardContent>
      </Card>

      {quotaSnapshot && quotaSnapshot.models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" /> Estimasi Sisa Quota Gemini (Free-Tier)
            </CardTitle>
            <CardDescription>
              Perkiraan pemakaian requests per menit (RPM) &amp; per hari (RPD) untuk model aktif
              dan model cadangan. Angka dihitung dari permintaan nyata di instance yang sedang
              berjalan (estimasi, bukan angka resmi Google) dan ter-reset saat server restart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {quotaSnapshot.models.map((m, index) => (
              <div
                key={m.model}
                className="space-y-3 rounded-md border border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{m.model}</span>
                  {index === 0 ? (
                    <Badge>Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Cadangan</Badge>
                  )}
                  <Badge variant={STATUS_VARIANT[m.status]}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                  {m.limitedUntil && m.limitedUntil > quotaSnapshot.generatedAt && (
                    <span className="text-xs text-destructive">
                      dibatasi hingga{" "}
                      {new Date(m.limitedUntil).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    batas: {LIMIT_SOURCE_LABEL[m.limitSource]}
                  </span>
                </div>
                <QuotaBar
                  label="RPM"
                  used={m.rpmUsed}
                  limit={m.rpmLimit}
                  windowLabel="60 detik terakhir"
                />
                <QuotaBar
                  label="RPD"
                  used={m.rpdUsed}
                  limit={m.rpdLimit}
                  windowLabel="24 jam terakhir"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Catatan: bila belum ada permintaan sejak server menyala, pemakaian menampilkan 0.
              Batas default adalah perkiraan konservatif; setiap error 429 pertama akan
              mengoreksi angka secara otomatis dari pesan Google. Anda bisa menimpa batas lewat
              env <code className="rounded bg-muted px-1">GEMINI_FREE_RPM</code> /{" "}
              <code className="rounded bg-muted px-1">GEMINI_FREE_RPD</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

