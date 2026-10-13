import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  FolderGit2,
  Briefcase,
  Package,
  MessageSquareQuote,
  Eye,
  ArrowUpRight,
  Settings,
  Sparkles,
  Layers,
  FileText,
  Activity,
  Globe2,
  Wifi,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getProfile,
  getProjects,
  getServices,
  getProducts,
  getTestimonials,
  getArticles,
} from "@/lib/actions";
import { isLivePublished } from "@/lib/publish";
import { getVisitorAnalytics } from "@/lib/visitor-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [user, profile, projects, services, products, testimonials, articles, analytics] =
    await Promise.all([
      currentUser(),
      getProfile(),
      getProjects({ includeScheduled: true }),
      getServices(),
      getProducts(),
      getTestimonials(),
      getArticles({ includeScheduled: true }),
      getVisitorAnalytics("30d", false).catch(() => null),
    ]);

  const displayName =
    user?.fullName ||
    (user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : null) ||
    user?.username ||
    profile.name ||
    "Admin";

  // "Terbit" mengikuti aturan tayang yang sama dengan halaman publik:
  // published=true DAN jadwal publishAt sudah lewat (bukan sekadar flag).
  const publishedProjects = projects.filter((p) => isLivePublished(p)).length;
  const publishedServices = services.filter((s) => s.published).length;
  const publishedProducts = products.filter((p) => p.published).length;
  const publishedTestimonials = testimonials.filter((t) => t.published).length;
  const publishedArticles = articles.filter((a) => isLivePublished(a)).length;

  const stats = [
    {
      title: "Total Proyek",
      total: projects.length,
      published: publishedProjects,
      description: "Portofolio karya digital",
      href: "/admin/projects",
      icon: FolderGit2,
      action: "Kelola Proyek",
    },
    {
      title: "Layanan Ditawarkan",
      total: services.length,
      published: publishedServices,
      description: "Solusi & keahlian teknis",
      href: "/admin/services",
      icon: Briefcase,
      action: "Kelola Layanan",
    },
    {
      title: "Katalog Produk",
      total: products.length,
      published: publishedProducts,
      description: "Produk digital & starter",
      href: "/admin/products",
      icon: Package,
      action: "Kelola Produk",
    },
    {
      title: "Testimoni Klien",
      total: testimonials.length,
      published: publishedTestimonials,
      description: "Ulasan kepuasan mitra",
      href: "/admin/testimonials",
      icon: MessageSquareQuote,
      action: "Kelola Testimoni",
    },
    {
      title: "Artikel & Tulisan",
      total: articles.length,
      published: publishedArticles,
      description: "Catatan teknis & wawasan",
      href: "/admin/articles",
      icon: FileText,
      action: "Kelola Artikel",
    },
  ];

  const initial = (displayName[0] || "A").toUpperCase();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6 md:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/40 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Panel Administrasi MyWebPorto</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground break-words">
            Selamat Datang, {displayName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
            Kelola data portofolio, pameran produk digital, keahlian layanan, dan ulasan kepuasan klien Anda secara langsung dan terstruktur dari satu pusat kendali.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild size="sm" className="gap-1.5 text-xs h-9">
            <Link href="/admin/profile">
              <Settings className="h-3.5 w-3.5" />
              <span>Perbarui Profil</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9 text-muted-foreground hover:text-foreground">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" />
              <span>Kunjungi Website Publik</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="flex flex-col justify-between hover:border-foreground/30 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {item.total}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border bg-muted/30 text-muted-foreground">
                    {item.published} Terbit
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
                <div className="pt-2 border-t border-border">
                  <Link
                    href={item.href}
                    className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1 group"
                  >
                    <span>{item.action}</span>
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sebaran Geografi & Trafik Pengunjung (Internal Neon) */}
      <Card className="border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground">
                Sebaran Geografi & Trafik Pengunjung
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Data kunjungan internal PostgreSQL Neon · 30 hari terakhir · UU PDP Friendly (Salted SHA-256)
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 self-start sm:self-auto">
            <Link href="/admin/analytics">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Buka Analytics Lengkap</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                Total Tayangan (30h)
              </span>
              <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                {analytics?.totalHits.toLocaleString("id-ID") ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                Pengunjung Unik
              </span>
              <span className="text-xl font-bold font-mono text-[var(--vt-blue)] mt-0.5 block">
                {analytics?.uniqueVisitors.toLocaleString("id-ID") ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                Tayangan Hari Ini
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-0.5 block">
                {analytics?.todayHits.toLocaleString("id-ID") ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                Unik Hari Ini
              </span>
              <span className="text-xl font-bold font-mono text-purple-600 mt-0.5 block">
                {analytics?.todayUniq.toLocaleString("id-ID") ?? 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border/60">
            {/* Negara Teratas */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5 text-indigo-600" /> Asal Negara
              </span>
              {!analytics || analytics.countryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">Belum ada data.</p>
              ) : (
                <div className="space-y-1.5">
                  {analytics.countryBreakdown.slice(0, 4).map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2 truncate pr-1">
                        <span className="text-sm shrink-0">{c.flag}</span>
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                      </div>
                      <div className="font-mono text-right shrink-0 text-muted-foreground text-[10px]">
                        <span className="font-bold text-foreground text-xs">{c.count}</span> ({c.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lokasi Lengkap (Location) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Lokasi (Location)
              </span>
              {!analytics || analytics.locationBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">Belum ada data.</p>
              ) : (
                <div className="space-y-1.5">
                  {analytics.locationBreakdown.slice(0, 4).map((loc, idx) => (
                    <div key={`${loc.fullLocation}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <span className="text-xs shrink-0">{loc.flag}</span>
                        <span className="font-medium text-foreground truncate">{loc.fullLocation}</span>
                      </div>
                      <div className="font-mono text-right shrink-0 text-muted-foreground text-[10px]">
                        <span className="font-bold text-foreground text-xs">{loc.count}</span> ({loc.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jaringan & ISP (Network) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-cyan-600" /> Jaringan (Network)
              </span>
              {!analytics || analytics.networkBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">Belum ada data.</p>
              ) : (
                <div className="space-y-1.5">
                  {analytics.networkBreakdown.slice(0, 4).map((net) => (
                    <div key={net.network} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                        <span className="font-medium text-foreground font-mono truncate text-[11px]">{net.network}</span>
                      </div>
                      <div className="font-mono text-right shrink-0 text-muted-foreground text-[10px]">
                        <span className="font-bold text-foreground text-xs">{net.count}</span> ({net.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zona Waktu (Timezone) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" /> Zona Waktu
              </span>
              {!analytics || analytics.timezoneBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">Belum ada data.</p>
              ) : (
                <div className="space-y-1.5">
                  {analytics.timezoneBreakdown.slice(0, 4).map((tz) => (
                    <div key={tz.timezone} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="font-medium text-foreground font-mono truncate text-[11px]">{tz.timezone}</span>
                      </div>
                      <div className="font-mono text-right shrink-0 text-muted-foreground text-[10px]">
                        <span className="font-bold text-foreground text-xs">{tz.count}</span> ({tz.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Status & Recent Projects Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects Table Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Ringkasan Proyek Terbaru
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Karya dan aplikasi yang sedang aktif ditampilkan di portofolio Anda.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Link href="/admin/projects">
                <span>Lihat Semua</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {projects.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Belum ada proyek yang dibuat. Tambahkan proyek di menu Kelola Proyek.
                </div>
              ) : (
                projects.slice(0, 4).map((project) => (
                  <div
                    key={project.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {project.title}
                        </span>
                        {project.featured && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            Unggulan
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            project.published
                              ? "text-[10px] h-4 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40"
                              : "text-[10px] h-4 px-1.5 border-border text-muted-foreground"
                          }
                        >
                          {project.published ? "Publik" : "Draf"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {project.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Link href={`/proyek/${project.slug}`} target="_blank">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Pratinjau
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System & Profile Status Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Status Profil Publik
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Informasi identitas yang terlihat oleh calon klien dan rekruter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                {(profile.avatarUrl || user?.imageUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profile.avatarUrl || user?.imageUrl}
                    alt={displayName}
                    className="h-10 w-10 rounded-full border border-border object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.headline || "Web Developer & Content Creator"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3 py-1 border-b border-border/60">
                  <span className="text-muted-foreground shrink-0">Email Kontak</span>
                  <span className="font-medium text-foreground text-right break-all min-w-0 max-w-[60%]">{profile.email || user?.primaryEmailAddress?.emailAddress}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-1 border-b border-border/60">
                  <span className="text-muted-foreground shrink-0">Lokasi</span>
                  <span className="font-medium text-foreground text-right break-words min-w-0">{profile.location}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-1">
                  <span className="text-muted-foreground shrink-0">Status Ketersediaan</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 text-right">
                    {profile.availableForHire ? "Tersedia untuk Proyek Baru" : "Sedang Penuh"}
                  </Badge>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 justify-center">
                <Link href="/admin/profile">
                  Edit Profil Lengkap
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Guidance Card */}
          <Card className="border-dashed bg-muted/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Panduan Kelola Konten
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Pastikan karya dan produk unggulan diatur dengan status <span className="font-medium text-foreground">Unggulan</span> agar tampil langsung di halaman beranda.
              </p>
              <p>
                Gunakan tab <span className="font-medium text-foreground">Kelola Produk</span> untuk mengarahkan pengunjung ke platform Gumroad, GitHub, atau tautan langsung lainnya.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
