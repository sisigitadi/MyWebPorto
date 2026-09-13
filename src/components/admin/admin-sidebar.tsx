"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FolderGit2,
  Briefcase,
  Package,
  MessageSquareQuote,
  FileText,
  Activity,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  const { isSignedIn, user } = useUser();

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
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Brand & Logo Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border">
        <Link
          href="/admin"
          onClick={onItemClick}
          className="flex items-center gap-2 font-semibold text-foreground group"
        >
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-none">
            MW
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight group-hover:text-primary transition-colors">
              MyWebPorto
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
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
              onClick={onItemClick}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.title}</span>
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
      <div className="p-3 border-t border-border">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <span>Lihat Website Publik</span>
          </div>
          <Sparkles className="h-3 w-3 text-muted-foreground/60" />
        </Link>
      </div>

      <Separator />

      {/* User Info & Logout Footer */}
      <div className="p-4 bg-muted/20">
        <div className="flex items-center gap-3 mb-3">
          {displayAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayAvatar}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {displayName}
            </p>
            {displayEmail && (
              <p className="text-[11px] text-muted-foreground truncate">
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
              className="w-full justify-center text-xs h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30 cursor-pointer"
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
            className="w-full justify-center text-xs h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30"
          >
            <Link href="/sign-in">
              <LogOut className="h-3.5 w-3.5" />
              <span>Masuk Akun</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
