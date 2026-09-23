import {
  Activity,
  Bug,
  CheckCircle2,
  Database,
  FolderCheck,
  Globe,
  History,
  Route,
  Server,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSystemStatus } from "@/lib/system-status";
import { getAuditLogs } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatusBadge({ ok, trueLabel = "OK", falseLabel = "Perhatian" }: { ok: boolean; trueLabel?: string; falseLabel?: string }) {
  return ok ? (
    <Badge className="bg-emerald-600 text-white border-0 gap-1">
      <CheckCircle2 className="h-3 w-3" /> {trueLabel}
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> {falseLabel}
    </Badge>
  );
}

export default async function AdminSystemPage() {
  const status = await getSystemStatus();
  const { logs: audits, source: auditSource } = await getAuditLogs(30);
  const envOk = status.env.filter((e) => e.key !== "NEXT_PUBLIC_APP_URL" && e.key !== "ENABLE_EXTERNAL_TRANSLATE").every((e) => e.configured);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Sistem, Logging &amp; Tracing
        </h1>
        <p className="text-sm text-muted-foreground">
          Feasibility produksi + observabilitas. Dicek {new Date(status.generatedAt).toLocaleString("id-ID")} ·{" "}
          {status.runtime.nodeVersion} · {status.runtime.platform}
          {status.runtime.isVercel ? " · Vercel" : " · VPS/lokal"}.
        </p>
      </div>

      {/* Feasibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-primary" /> Kelayakan Deploy (Feasibility)
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Checklist pra-deploy dari SECURITY.md.
            <StatusBadge ok={status.deployReady} trueLabel="Siap deploy" falseLabel="Belum siap" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {status.env.map((e) => (
            <div key={e.key} className="flex items-start justify-between gap-3 border-b border-border/60 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-semibold font-mono text-xs">{e.key}</p>
                <p className="text-xs text-muted-foreground truncate">{e.maskedValue}</p>
                <p className="text-[11px] text-muted-foreground">{e.hint}</p>
              </div>
              <StatusBadge ok={e.configured} />
            </div>
          ))}
          <div className="pt-2 text-xs text-muted-foreground">
            Kesimpulan env: {envOk ? "siap deploy." : "belum siap — lengkapi yang bertanda Perhatian."}
          </div>
          {status.envIssues.length > 0 && (
            <div className="pt-1 space-y-1">
              <p className="text-xs font-semibold">Temuan validasi env (src/lib/env.ts):</p>
              {status.envIssues.map((issue) => (
                <p key={issue.key} className="text-xs font-mono">
                  <Badge variant={issue.severity === "info" ? "outline" : "destructive"} className="mr-1.5">
                    {issue.severity}
                  </Badge>
                  <span className="font-semibold">{issue.key}:</span>{" "}
                  <span className="text-muted-foreground">{issue.message}</span>
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database + filesystem */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" /> Database
            </CardTitle>
            <CardDescription>{status.database.detail}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <StatusBadge ok={status.database.configured} trueLabel="Configured" falseLabel="Fallback lokal" />
            {status.database.configured && (
              <StatusBadge
                ok={status.database.reachable}
                trueLabel={status.database.latencyMs !== null ? `Reachable ${status.database.latencyMs}ms` : "Reachable"}
                falseLabel="Unreachable"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderCheck className="h-4 w-4 text-primary" /> Filesystem
            </CardTitle>
            <CardDescription>Upload lokal tidak persisten di serverless.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {status.filesystem.map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-xs">{f.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">{f.path}</p>
                  <p className="text-[11px] text-muted-foreground">{f.detail}</p>
                </div>
                <StatusBadge ok={f.writable} trueLabel="Writable" falseLabel="Read-only" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Integrasi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" /> Integrasi
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="font-semibold">Clerk:</span> {status.integrations.clerk}</p>
          <p><span className="font-semibold">Translate:</span> {status.integrations.translate}</p>
          <p><span className="font-semibold">IndexNow:</span> {status.integrations.indexNow}</p>
          <p><span className="font-semibold">Formspree:</span> {status.integrations.formspree}</p>
          <p className="md:col-span-2"><span className="font-semibold">Storage:</span> {status.integrations.storage}</p>
          <p className="md:col-span-2"><span className="font-semibold">Cloud AI:</span> {status.integrations.cloudAI}</p>
        </CardContent>
      </Card>

      {/* Tracing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-primary" /> Tracing
          </CardTitle>
          <CardDescription>Korelasi request untuk audit tanpa bocor PII.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="font-semibold">Header:</span> {status.observability.tracing.header}</p>
          <p><span className="font-semibold">Middleware:</span> {status.observability.tracing.middleware}</p>
          <p className="text-muted-foreground"><span className="font-semibold">Batasan:</span> {status.observability.tracing.limitation}</p>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> Audit Log Admin
          </CardTitle>
          <CardDescription>
            30 mutasi terakhir (sumber: {auditSource}). Ditulis best-effort setiap save/delete — tidak pernah menggagalkan mutasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada aktivitas tercatat. Lakukan simpan/hapus konten via panel admin untuk mengisi log ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {audits.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs">
                      <Badge variant={a.action === "delete" ? "destructive" : "secondary"} className="mr-1.5">
                        {a.action}
                      </Badge>
                      <span className="font-semibold font-mono">{a.entity}</span>
                      {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground truncate">
                      {a.entityId ?? "—"} · actor {a.actor ? `${a.actor.slice(0, 12)}…` : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4 text-primary" /> Logging
          </CardTitle>
          <CardDescription>Mutasi admin persisten di tabel audit_logs; error teknis tetap disanitasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="font-semibold">Strategi:</span> {status.observability.logging.strategy}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {status.observability.logging.sources.map((s) => (
              <li key={s} className="font-mono text-xs">{s}</li>
            ))}
          </ul>
          <p><span className="font-semibold">Sanitasi:</span> {status.observability.logging.sanitization}</p>
          <p className="text-muted-foreground"><span className="font-semibold">Persistence:</span> {status.observability.logging.persistence}</p>
        </CardContent>
      </Card>
    </div>
  );
}
