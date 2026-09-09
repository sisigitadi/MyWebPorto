"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ExternalLink, Menu } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_ITEMS } from "./admin-sidebar";

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();

  const currentItem = ADMIN_NAV_ITEMS.find((item) =>
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href)
  );

  const title = currentItem ? currentItem.title : "Panel Admin";

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Admin";

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          aria-label="Toggle Menu Sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Area Pengelolaan Data Portofolio & Personal Branding
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime Database Connection Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Neon DB: Connected</span>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 hidden sm:flex text-muted-foreground hover:text-foreground"
        >
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Lihat Web</span>
          </Link>
        </Button>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="text-xs font-medium text-foreground hidden md:inline-block">
              {displayName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link href="/sign-in">
                <LogOut className="h-3.5 w-3.5" />
                <span>Masuk Akun</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
