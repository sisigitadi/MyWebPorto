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
  ShoppingBag,
  MessageSquare,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
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
import { getOrders } from "@/lib/order-actions";
import { getWABotState } from "@/lib/whatsapp-bot/wa-service";
import { formatIdr } from "@/lib/whatsapp-order";
import { isLivePublished } from "@/lib/publish";
import { getVisitorAnalytics } from "@/lib/visitor-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [
    user,
    profile,
    projects,
    services,
    products,
    testimonials,
    articles,
    ordersResult,
    analytics,
  ] = await Promise.all([
    currentUser(),
    getProfile(),
    getProjects({ includeScheduled: true }),
    getServices(),
    getProducts(),
    getTestimonials(),
    getArticles({ includeScheduled: true }),
    getOrders().catch(() => ({ success: false, orders: [], total: 0 })),
    getVisitorAnalytics("30d", false).catch(() => null),
  ]);

  const orders = Array.isArray(ordersResult)
    ? ordersResult
    : (ordersResult && "orders" in ordersResult && Array.isArray(ordersResult.orders)
      ? ordersResult.orders
      : []);

  const waState = getWABotState();

  const displayName =
    user?.fullName ||
    (user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : null) ||
    user?.username ||
    profile.name ||
    "Admin";

  const publishedProjects = projects.filter((p) => isLivePublished(p)).length;
  const publishedServices = services.filter((s) => s.published).length;
  const publishedProducts = products.filter((p) => p.published).length;
  const publishedTestimonials = testimonials.filter((t) => t.published).length;
  const publishedArticles = articles.filter((a) => isLivePublished(a)).length;

  // Metrik Pesanan & Pendapatan Toko
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const paidOrders = orders.filter((o) =>
    ["paid", "processing", "completed"].includes(o.status)
  );
  const totalRevenueIdr = paidOrders
    .filter((o) => o.currency === "IDR")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const initial = (displayName[0] || "A").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Welcome & Command Center Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6 md:p-8">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border border-border bg-muted/40 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Command Center MyWebPorto</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground font-mono break-words">
            Selamat Datang, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
            Pusat kendali terpadu untuk memantau transaksi toko, merespons chat WhatsApp otomatis, dan memperbarui portofolio digital Anda.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" className="gap-1.5 text-xs h-8 font-mono">
            <Link href="/admin/orders">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Kelola Pesanan ({pendingOrders.length} Pending)</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-8 font-mono">
            <Link href="/admin/whatsapp-bot">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
              <span>Bot WhatsApp AI</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs h-8 font-mono text-muted-foreground hover:text-foreground">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" />
              <span>Kunjungi Website Publik</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Actionable Alert: Pesanan Baru Menunggu Tindakan */}
      {pendingOrders.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold font-mono text-amber-900 dark:text-amber-200">
                  {pendingOrders.length} Pesanan Baru Menunggu Verifikasi Pembayaran
                </CardTitle>
                <CardDescription className="text-xs text-amber-700/80 dark:text-amber-300/80 font-mono">
                  Segera hubungi pelanggan via WhatsApp untuk konfirmasi bukti transfer atau kirim pesanan.
                </CardDescription>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="text-xs font-mono h-8 border-amber-500/30">
              <Link href="/admin/orders">Lihat Semua Pesanan</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs">
              {pendingOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-[var(--vt-card)] border border-border"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--vt-ink)]">
                        {order.invoiceNumber}
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase border-amber-500/40 text-amber-600">
                        Menunggu Pembayaran
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {order.customerName} ({order.customerPhone}) • Total:{" "}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {order.currency === "USD" ? `$${order.totalAmount}` : formatIdr(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Halo Kak ${order.customerName}, kami dari Sigit Web Store mengonfirmasi pesanan #${order.invoiceNumber}. Apakah pembayaran sudah dilakukan? Terima kasih!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Follow Up WA</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command Center 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pesanan & Toko */}
        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground">
              Pesanan Toko
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {orders.length}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] h-5 px-1.5 font-bold ${
                  pendingOrders.length > 0
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse"
                    : "border-border text-muted-foreground"
                }`}
              >
                {pendingOrders.length} Pending
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Omzet Selesai: <span className="font-bold text-emerald-600">{formatIdr(totalRevenueIdr)}</span>
            </p>
            <div className="pt-2 border-t border-border">
              <Link
                href="/admin/orders"
                className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1 group"
              >
                <span>Buka Kelola Pesanan</span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Bot WhatsApp AI */}
        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground">
              Bot WhatsApp AI
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                {waState.status === "CONNECTED"
                  ? "● Online 24/7"
                  : waState.status === "QR_READY"
                  ? "▲ Siap Scan QR"
                  : "■ Terputus"}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] h-4 px-1 ${
                  waState.status === "CONNECTED"
                    ? "text-emerald-500 border-emerald-500/30"
                    : "text-muted-foreground"
                }`}
              >
                {waState.connectedPhone || "Offline"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-Reply: <span className="font-bold text-blue-500">{waState.messagesCount.replied} Terkirim</span>
            </p>
            <div className="pt-2 border-t border-border">
              <Link
                href="/admin/whatsapp-bot"
                className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1 group"
              >
                <span>Pusat Kendali WhatsApp</span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Katalog Produk */}
        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground">
              Katalog Produk
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {products.length}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border bg-muted/30 text-muted-foreground">
                {publishedProducts} Terbit
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Starter pack, SaaS &amp; Template digital
            </p>
            <div className="pt-2 border-t border-border">
              <Link
                href="/admin/products"
                className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1 group"
              >
                <span>Kelola Etalase Produk</span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Portofolio & Proyek */}
        <Card className="hover:border-foreground/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground">
              Portofolio &amp; Layanan
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {projects.length}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border bg-muted/30 text-muted-foreground">
                {publishedProjects} Terbit
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {services.length} Solusi &amp; Jasa aktif
            </p>
            <div className="pt-2 border-t border-border">
              <Link
                href="/admin/projects"
                className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1 group"
              >
                <span>Kelola Karya &amp; Jasa</span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sebaran Geografi & Trafik Pengunjung (Internal Neon) */}
      <Card className="border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground">
                Sebaran Geografi Pengunjung (30 Hari)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Data analitik privat dari beacon tanpa cookies.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              Total Hits: {analytics?.totalHits ?? 0}
            </Badge>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/admin/analytics">
                Detail Lengkap
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground">Pengunjung Unik</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {analytics?.uniqueVisitors ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground">Tayangan Halaman (Hits)</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {analytics?.totalHits ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground">Aktivitas Hari Ini</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {analytics?.todayHits ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({analytics?.todayUniq ?? 0} unik)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row Bawah: Karya Terbaru & Status Profil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Proyek &amp; Karya Portofolio
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Karya terbaru yang dikurasi di platform.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <Link href="/admin/projects">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Belum ada proyek ditambahkan.
                </p>
              ) : (
                projects.slice(0, 4).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {project.title}
                        </span>
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
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0">
                      <Link href={`/proyek/${project.slug}`} target="_blank">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Pratinjau
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Profil Pemilik
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Informasi identitas publik Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
              {profile.avatarUrl || user?.imageUrl ? (
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
                  {profile.headline || "AI & Cybersecurity Engineer"}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3 py-1 border-b border-border/60">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span className="font-medium text-foreground text-right truncate">{profile.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1 border-b border-border/60">
                <span className="text-muted-foreground shrink-0">Lokasi</span>
                <span className="font-medium text-foreground text-right truncate">{profile.location || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-muted-foreground shrink-0">Ketersediaan</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40">
                  {profile.availableForHire ? "Tersedia untuk Proyek" : "Sedang Penuh"}
                </Badge>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 justify-center">
              <Link href="/admin/profile">Edit Profil Lengkap</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
