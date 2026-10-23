import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calendar,
  Compass,
  Eye,
  Globe2,
  Laptop,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Users,
  Clock,
  Wifi,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getVisitorAnalytics,
  type AnalyticsRange,
} from "@/lib/visitor-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    bots?: string;
  }>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawRange = params.range;
  const range: AnalyticsRange =
    rawRange === "today" || rawRange === "7d" || rawRange === "30d" || rawRange === "all"
      ? rawRange
      : "30d";

  const includeBots = params.bots === "1";

  const data = await getVisitorAnalytics(range, includeBots);

  const rangeLabels: Record<AnalyticsRange, string> = {
    today: "Hari Ini",
    "7d": "7 Hari Terakhir",
    "30d": "30 Hari Terakhir",
    all: "Semua Waktu",
  };

  return (
    <div className="space-y-6">
      {/* Status Banner Dinonaktifkan */}
      <div className="flex items-center gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          <strong>Status: Pelacakan Kunjungan Dinonaktifkan.</strong> Pengumpulan hit baru dan beacon publik saat ini dinonaktifkan. Metrik dan log di bawah ini merupakan data historis tersimpan.
        </span>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Visitor Analytics
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-500/40">
              Nonaktif
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Data analitik kunjungan mandiri tersimpan di database PostgreSQL (Supabase) · Nol cookie · UU PDP Friendly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="inline-flex rounded-md shadow-xs bg-muted p-0.5 text-xs">
            {(["today", "7d", "30d", "all"] as AnalyticsRange[]).map((r) => {
              const active = range === r;
              return (
                <Link
                  key={r}
                  href={`/admin/analytics?range=${r}&bots=${includeBots ? "1" : "0"}`}
                  className={`px-2.5 py-1.5 rounded-sm font-medium transition-colors ${
                    active
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rangeLabels[r]}
                </Link>
              );
            })}
          </div>

          {/* Toggle Bots */}
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link
              href={`/admin/analytics?range=${range}&bots=${includeBots ? "0" : "1"}`}
            >
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{includeBots ? "Sembunyikan Bot" : "Tampilkan Bot"}</span>
              {includeBots && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1 bg-amber-500/20 text-amber-600">
                  Aktif
                </Badge>
              )}
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href={`/admin/analytics?range=${range}&bots=${includeBots ? "1" : "0"}`}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Segarkan</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Tayangan ({rangeLabels[range]})
            </CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[var(--vt-ink)]">
              {data.totalHits.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Seluruh akumulasi hit halaman
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pengunjung Unik ({rangeLabels[range]})
            </CardTitle>
            <Users className="h-4 w-4 text-[var(--vt-blue)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[var(--vt-blue)]">
              {data.uniqueVisitors.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Berdasarkan salted SHA-256 hash
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tayangan Hari Ini (WIB)
            </CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {data.todayHits.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sejak 00:00 WIB (Asia/Jakarta) hari ini
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Unik Hari Ini (WIB)
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-600">
              {data.todayUniq.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pengunjung unik sejak 00:00 WIB hari ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Breakdown: Top Pages & Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" /> Halaman Paling Banyak Dikunjungi
            </CardTitle>
            <CardDescription>
              Path URL dengan intensitas kunjungan tertinggi ({rangeLabels[range]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.topPages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data kunjungan tercatat pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.topPages.map((page, idx) => {
                  const pct =
                    data.totalHits > 0 ? Math.round((page.hits / data.totalHits) * 100) : 0;
                  return (
                    <div key={page.path} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="font-mono text-[10px] text-muted-foreground w-4">
                            #{idx + 1}
                          </span>
                          <Link
                            href={page.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono truncate hover:underline hover:text-primary flex items-center gap-1"
                            title={page.path}
                          >
                            <span>{page.path}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          </Link>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-muted-foreground font-mono">
                          <span className="text-[11px] font-bold text-foreground">
                            {page.hits.toLocaleString("id-ID")} hit
                          </span>
                          <span className="text-[10px]">
                            ({page.unique.toLocaleString("id-ID")} unik)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[var(--vt-blue)]" /> Sumber Trafik (Referrers)
            </CardTitle>
            <CardDescription>
              Asal usul tautan luar dan mesin pencari yang mendatangkan pengunjung.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.topReferrers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data referrer tercatat pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.topReferrers.map((ref) => {
                  const pct =
                    data.totalHits > 0 ? Math.round((ref.hits / data.totalHits) * 100) : 0;
                  return (
                    <div key={ref.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-medium text-foreground truncate pr-2 flex items-center gap-1.5">
                          <span>{ref.domain}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="font-bold text-foreground">
                            {ref.hits.toLocaleString("id-ID")}
                          </span>
                          <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--vt-blue)] rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geografi & Sebaran Lokasi Pengunjung (Negara & Lokasi Lengkap) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asal Negara */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-indigo-600" /> Asal Negara Pengunjung
            </CardTitle>
            <CardDescription>
              Distribusi negara asal pengunjung berdasarkan edge geolocation headers ({rangeLabels[range]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.countryBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data negara tercatat pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.countryBreakdown.map((item) => (
                  <div key={item.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium text-foreground truncate pr-2 flex items-center gap-2">
                        <span className="text-base shrink-0">{item.flag}</span>
                        <span className="truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({item.code})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="font-bold text-foreground">
                          {item.count.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lokasi Lengkap (Kota, Wilayah/Provinsi, Negara) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" /> Sebaran Lokasi Lengkap (Location)
            </CardTitle>
            <CardDescription>
              Detail kota dan wilayah administrasi/provinsi pengunjung ({rangeLabels[range]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.locationBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data lokasi tercatat pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.locationBreakdown.map((item, idx) => (
                  <div key={`${item.fullLocation}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium text-foreground truncate pr-2 flex items-center gap-2">
                        <span className="text-base shrink-0">{item.flag}</span>
                        <span className="truncate">{item.fullLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="font-bold text-foreground">
                          {item.count.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Network & Timezone Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network & ASN */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4 text-cyan-600" /> Penyedia Jaringan & ISP (Network)
            </CardTitle>
            <CardDescription>
              Operator jaringan, organisasi ASN, atau jenis koneksi visitor ({rangeLabels[range]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.networkBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data jaringan/ISP terdeteksi pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.networkBreakdown.map((item) => (
                  <div key={item.network} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium text-foreground truncate pr-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                        <span className="truncate font-mono">{item.network}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="font-bold text-foreground">
                          {item.count.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 rounded-full transition-all"
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zona Waktu (Timezone) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Distribusi Zona Waktu (Timezone)
            </CardTitle>
            <CardDescription>
              Zona waktu lokal perangkat browser visitor ({rangeLabels[range]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.timezoneBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data zona waktu tercatat pada periode ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.timezoneBreakdown.map((item) => (
                  <div key={item.timezone} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium text-foreground truncate pr-2 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="truncate font-mono">{item.timezone}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="font-bold text-foreground">
                          {item.count.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full transition-all"
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Systems & Technology Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Devices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Perangkat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nihil</p>
            ) : (
              data.deviceBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize flex items-center gap-1.5">
                    {item.name === "mobile" && <Smartphone className="h-3 w-3" />}
                    {item.name === "desktop" && <Monitor className="h-3 w-3" />}
                    {item.name === "tablet" && <Tablet className="h-3 w-3" />}
                    {item.name === "bot" && <Bot className="h-3 w-3" />}
                    <span>{item.name}</span>
                  </span>
                  <span className="font-mono font-medium">
                    {item.count} <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Operating Systems */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-emerald-600" /> Sistem Operasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.osBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nihil</p>
            ) : (
              data.osBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2">{item.name}</span>
                  <span className="font-mono font-medium shrink-0">
                    {item.count} <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-600" /> Peramban (Browser)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.browserBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nihil</p>
            ) : (
              data.browserBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2">{item.name}</span>
                  <span className="font-mono font-medium shrink-0">
                    {item.count} <span className="text-muted-foreground text-[10px]">({item.percentage}%)</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Log Kunjungan Terbaru (Waktu Asia/Jakarta)
          </CardTitle>
          <CardDescription>
            30 entri hit historis tersimpan dalam zona waktu WIB (UTC+7) di database PostgreSQL (Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentVisits.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Belum ada log kunjungan tersimpan di database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border/60 text-muted-foreground font-mono">
                  <tr>
                    <th className="py-2 pr-3">Waktu (WIB / Jakarta)</th>
                    <th className="py-2 px-3">Halaman</th>
                    <th className="py-2 px-3">Lokasi (Location)</th>
                    <th className="py-2 px-3">Jaringan (Network)</th>
                    <th className="py-2 px-3">Zona Waktu Klien</th>
                    <th className="py-2 px-3">Perangkat / OS</th>
                    <th className="py-2 px-3">Referrer</th>
                    <th className="py-2 pl-3 text-right">Visitor ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {data.recentVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                        <span className="text-foreground font-semibold">
                          {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }).format(new Date(visit.createdAt))}{" "}
                          WIB
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground">
                          ({new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(visit.createdAt))})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground max-w-[180px] truncate" title={visit.path}>
                        {visit.path}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-sans">
                          <span className="text-sm shrink-0" title={visit.countryName}>{visit.countryFlag}</span>
                          <span className="text-foreground font-medium truncate max-w-[170px]" title={visit.fullLocation}>
                            {visit.fullLocation}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {visit.network ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-foreground font-mono truncate max-w-[150px]" title={visit.network}>
                            <Wifi className="h-2.5 w-2.5 text-cyan-500 shrink-0" />
                            <span className="truncate">{visit.network}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic font-sans">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {visit.timezone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-foreground font-mono truncate max-w-[130px]" title={visit.timezone}>
                            <Clock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                            <span className="truncate">{visit.timezone}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic font-sans">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {visit.isBot ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-500/40">
                              BOT
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
                              {visit.device}
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-[11px]">
                            {visit.browser} / {visit.os}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[140px] truncate text-muted-foreground text-[11px]" title={visit.referrer || "Direct"}>
                        {visit.referrer || "Direct"}
                      </td>
                      <td className="py-2.5 pl-3 text-right text-muted-foreground/70">
                        <code>#{visit.ipHashShort}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
