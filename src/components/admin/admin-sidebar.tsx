"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FolderGit2,
  Briefcase,
  Package,
  MessageSquareQuote,
  FileText,
  Activity,
  Images,
  ExternalLink,
  LogOut,
  Palette,
  Sparkles,
  Languages,
  ToggleLeft,
  Search,
  Newspaper,
  Bot,
  Cloud,
  BarChart3,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { getPendingOrdersCount } from "@/lib/order-actions";

import { cn } from "@/lib/utils";
import { hasUnsavedChanges, setUnsavedChanges } from "@/lib/unsaved-changes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type NavGroup = "toko" | "portofolio" | "otomasi" | "sistem";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Kelompok menu — memisahkan operasional konten dari konfigurasi global. */
  group: NavGroup;
}

/**
 * Kelompok menu sesuai urutan tampilan.
 * Pemisahan 4 grup logis: Toko & Transaksi, Portofolio & Konten, Kecerdasan & Bot, Sistem & Pengaturan.
 */
export const NAV_GROUPS: { id: NavGroup; label: string }[] = [
  { id: "toko", label: "Toko & Transaksi" },
  { id: "portofolio", label: "Portofolio & Konten" },
  { id: "otomasi", label: "Kecerdasan & Bot" },
  { id: "sistem", label: "Sistem & Pengaturan" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  // 1. Toko & Transaksi
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    group: "toko",
  },
  {
    title: "Kelola Pesanan",
    href: "/admin/orders",
    icon: ShoppingBag,
    group: "toko",
  },
  {
    title: "Kelola Produk",
    href: "/admin/products",
    icon: Package,
    group: "toko",
  },

  // 2. Portofolio & Konten
  {
    title: "Profil Pribadi",
    href: "/admin/profile",
    icon: User,
    group: "portofolio",
  },
  {
    title: "Kelola Proyek",
    href: "/admin/projects",
    icon: FolderGit2,
    group: "portofolio",
  },
  {
    title: "Kelola Layanan",
    href: "/admin/services",
    icon: Briefcase,
    group: "portofolio",
  },
  {
    title: "Kelola Artikel",
    href: "/admin/articles",
    icon: FileText,
    group: "portofolio",
  },
  {
    title: "Kelola Testimoni",
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
    group: "portofolio",
  },
  {
    title: "Media Library",
    href: "/admin/media",
    icon: Images,
    group: "portofolio",
  },
  {
    title: "Redaksi: Tulis Konten",
    href: "/admin/redaksi",
    icon: Newspaper,
    group: "portofolio",
  },

  // 3. Kecerdasan & Bot
  {
    title: "Bot WhatsApp AI",
    href: "/admin/whatsapp-bot",
    icon: MessageSquare,
    group: "otomasi",
  },
  {
    title: "Pengaturan Cloud AI",
    href: "/admin/cloud-ai",
    icon: Cloud,
    group: "otomasi",
  },
  {
    title: "Otomasi Redaksi",
    href: "/admin/redaksi/otomasi",
    icon: Bot,
    group: "otomasi",
  },

  // 4. Sistem & Pengaturan
  {
    title: "Tampilan & App OS",
    href: "/admin/appearance",
    icon: Palette,
    group: "sistem",
  },
  {
    title: "Teks & Bahasa",
    href: "/admin/strings",
    icon: Languages,
    group: "sistem",
  },
  {
    title: "Fitur & Mode",
    href: "/admin/features",
    icon: ToggleLeft,
    group: "sistem",
  },
  {
    title: "SEO & SEM",
    href: "/admin/seo",
    icon: Search,
    group: "sistem",
  },
  {
    title: "Visitor Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    badge: "Aktif",
    group: "sistem",
  },
  {
    title: "Sistem & Logs",
    href: "/admin/system",
    icon: Activity,
    group: "sistem",
  },
];

interface AdminSidebarProps {
  onItemClick?: () => void;
  profileAvatar?: string;
  profileName?: string;
}

export function AdminSidebar({
  onItemClick,
  profileAvatar,
  profileName,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  // Guard navigasi in-app: AdminSidebar tidak tahu state form (form hidup di
  // halaman), jadi cek flag module saat klik terjadi. Sebelumnya, pindah menu
  // sambil sedang mengetik draf artikel/proyek langsung membuang isinya tanpa
  // peringatan: kerugian paling nyata bagi admin.
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    getPendingOrdersCount()
      .then((cnt) => {
        if (isMounted) setPendingOrdersCount(cnt);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!hasUnsavedChanges()) {
      onItemClick?.();
      return;
    }
    e.preventDefault();
    setPendingNav(href);
  };

  const confirmDiscardAndNavigate = () => {
    const href = pendingNav;
    setPendingNav(null);
    // Admin memilih buang perubahan: matikan guard dulu agar navigasi yang
    // sama (jika diklik lagi) tidak diblokir kedua kalinya.
    setUnsavedChanges(false);
    if (href) router.push(href);
    onItemClick?.();
  };

  const displayName =
    profileName ||
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Admin";

  const displayAvatar = profileAvatar || user?.imageUrl;

  const displayEmail = user?.primaryEmailAddress?.emailAddress || "";
  const initial = (displayName[0] || "A").toUpperCase();

  // Item aktif = prefix terpanjang yang cocok, sehingga induk & anak dari route
  // bertingkat (mis. /admin/redaksi vs /admin/redaksi/otomasi) tidak menyala
  // bersamaan. Sebelumnya pakai startsWith mentah, yang juga keliru menandai
  // /admin/projects-xyz saat berada di /admin/projects.
  const activeHref = ADMIN_NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`)
  )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex flex-col h-full">
      {/* Brand & Logo Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b-2 border-[var(--vt-edge-lo-2)]">
        <Link
          href="/admin"
          onClick={onItemClick}
          className="flex items-center gap-2 font-semibold text-[var(--vt-ink)] group"
        >
          <div className="h-8 w-8 rounded-xs overflow-hidden border border-[var(--vt-edge-lo-2)] bg-[#0a0f1e] flex items-center justify-center shrink-0 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="Sigit Adi Shield Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--vt-ink)] group-hover:text-primary transition-colors">
              Sigit Adi
            </span>
            <span className="text-[10px] text-[var(--vt-ink-mute)] uppercase tracking-wider font-medium">
              Admin Workstation
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {NAV_GROUPS.map((grp) => {
          const items = ADMIN_NAV_ITEMS.filter((i) => i.group === grp.id);
          if (!items.length) return null;
          return (
            <div key={grp.id} className="space-y-1">
              <div className="px-3 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--vt-ink-mute)] uppercase">
                {grp.label}
              </div>
              {items.map((item) => {
                const isActive = activeHref === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xs text-xs font-mono font-bold transition-colors group",
                      isActive
                        ? "bg-[var(--vt-blue)] text-white font-bold"
                        : "text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-[var(--vt-ink-mute)] group-hover:text-[var(--vt-ink)]"
                        )}
                      />
                      <span className={isActive ? "text-white" : "text-[var(--vt-ink)]"}>{item.title}</span>
                    </div>
                    {item.href === "/admin/orders" && pendingOrdersCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] h-4 px-1.5 font-bold animate-pulse",
                          isActive
                            ? "bg-amber-400 text-slate-900"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        )}
                      >
                        {pendingOrdersCount}
                      </Badge>
                    ) : item.badge ? (
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        className={cn(
                          "text-[10px] h-4 px-1.5 font-normal",
                          item.badge === "Aktif" && !isActive && "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>

                );
              })}
            </div>
          );
        })}
      </div>

      {/* Quick Public View */}
      <div className="p-3 border-t border-[var(--vt-edge-lo-2)]">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xs text-xs font-mono font-bold text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--vt-ink-mute)] group-hover:text-[var(--vt-ink)]" />
            <span>Lihat Website Publik</span>
          </div>
          <Sparkles className="h-3 w-3 text-[var(--vt-amber)]" />
        </Link>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t-2 border-[var(--vt-edge-lo-2)]">
        <div className="flex items-center gap-3 mb-3">
          {displayAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayAvatar}
              alt={displayName}
              className="h-9 w-9 rounded-xs object-cover border border-[var(--vt-edge-lo-2)] shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-xs bg-[var(--vt-blue)] border border-[var(--vt-edge-lo-2)] flex items-center justify-center text-white font-pixel font-bold text-xs shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--vt-ink)] truncate">
              {displayName}
            </p>
            {displayEmail && (
              <p className="text-[11px] text-[var(--vt-ink-mute)] truncate">
                {displayEmail}
              </p>
            )}
          </div>
        </div>

        {isSignedIn ? (
          <SignOutButton redirectUrl="/sign-in">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs h-8 gap-1.5 text-[var(--vt-ink)] hover:text-[var(--vt-pink)] hover:border-[var(--vt-edge-lo-2)] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar Akun</span>
            </Button>
          </SignOutButton>
        ) : (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs h-8 gap-1.5 text-[var(--vt-ink)] hover:text-[var(--vt-pink)] hover:border-[var(--vt-edge-lo-2)]"
          >
            <Link href="/sign-in">
              <LogOut className="h-3.5 w-3.5" />
              <span>Masuk Akun</span>
            </Link>
          </Button>
        )}
      </div>

      <AlertDialog open={pendingNav !== null} onOpenChange={(open) => !open && setPendingNav(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan yang belum disimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Ada perubahan di form yang belum disimpan. Pindah halaman sekarang akan membuang perubahan tersebut dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tetap di sini</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardAndNavigate}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Buang &amp; pindah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
