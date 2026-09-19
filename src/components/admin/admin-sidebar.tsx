"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";
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

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Profil Pribadi",
    href: "/admin/profile",
    icon: User,
  },
  {
    title: "Kelola Proyek",
    href: "/admin/projects",
    icon: FolderGit2,
  },
  {
    title: "Kelola Layanan",
    href: "/admin/services",
    icon: Briefcase,
  },
  {
    title: "Kelola Produk",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Kelola Testimoni",
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
  },
  {
    title: "Kelola Artikel",
    href: "/admin/articles",
    icon: FileText,
  },
  {
    title: "Media Library",
    href: "/admin/media",
    icon: Images,
  },
  {
    title: "Tampilan & App OS",
    href: "/admin/appearance",
    icon: Palette,
  },
  {
    title: "Teks & Bahasa",
    href: "/admin/strings",
    icon: Languages,
  },
  {
    title: "Sistem & Logs",
    href: "/admin/system",
    icon: Activity,
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
  // peringatan — kerugian paling nyata bagi admin.
  const [pendingNav, setPendingNav] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full">
      {/* Brand & Logo Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b-2 border-[var(--vt-edge-lo-2)]">
        <Link
          href="/admin"
          onClick={onItemClick}
          className="flex items-center gap-2 font-semibold text-[var(--vt-ink)] group"
        >
          <div className="h-8 w-8 rounded-xs bg-[var(--vt-blue)] text-white flex items-center justify-center font-pixel font-bold text-xs shadow-none">
            MW
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--vt-ink)] group-hover:text-primary transition-colors">
              MyWebPorto
            </span>
            <span className="text-[10px] text-[var(--vt-ink-mute)] uppercase tracking-wider font-medium">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[var(--vt-ink-mute)] uppercase">
          Menu Manajemen
        </div>
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
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
              {item.badge && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="text-[10px] h-4 px-1.5 font-normal"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
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
