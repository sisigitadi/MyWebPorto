"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ExternalLink, Menu } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { ADMIN_NAV_ITEMS } from "./admin-sidebar";

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  dbConnected?: boolean;
}

export function AdminHeader({ onToggleSidebar, dbConnected }: AdminHeaderProps) {
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
    <header className="vt-raised sticky top-0 lg:static shrink-0 z-30 h-14 sm:h-16 w-full border-b-2 border-[var(--vt-edge-lo-2)] flex items-center justify-between gap-2 px-2 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          className="vt-btn vt-btn-chrome lg:hidden h-9 w-9 shrink-0 p-0"
          onClick={onToggleSidebar}
          aria-label="Toggle Menu Sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-bold font-mono text-[var(--vt-ink)] tracking-tight truncate">
            {title}
          </h1>
          <p className="text-[11px] font-mono text-[var(--vt-ink-mute)] hidden sm:block truncate">
            Area Pengelolaan Data Portofolio &amp; Personal Branding
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Realtime Database Connection Badge — status dari probe layout server */}
        {dbConnected !== undefined && (
          dbConnected ? (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Neon DB: Connected</span>
            </div>
          ) : (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-[11px] font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Neon DB: Offline (fallback lokal)</span>
            </div>
          )
        )}

        {/* Indikator status DB ringkas untuk mobile (hanya titik warna) */}
        {dbConnected !== undefined && (
          <div
            className={`md:hidden h-2.5 w-2.5 rounded-full shrink-0 ${
              dbConnected
                ? "bg-emerald-500 animate-pulse"
                : "bg-rose-500"
            }`}
            title={dbConnected ? "Neon DB: Connected" : "Neon DB: Offline (fallback lokal)"}
            aria-label={dbConnected ? "Database terhubung" : "Database offline"}
          />
        )}

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="vt-btn vt-btn-chrome hidden sm:inline-flex h-8 px-2.5 text-[11px] font-mono font-bold gap-1.5 shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Lihat Web</span>
        </Link>

        <div className="h-5 w-px bg-[var(--vt-edge-lo-2)] hidden sm:block" />

        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="text-xs font-mono font-bold text-[var(--vt-ink)] hidden md:inline-block truncate max-w-[120px]">
              {displayName}
            </span>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="vt-btn vt-btn-chrome h-8 px-2.5 text-[11px] font-mono font-bold gap-1.5 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Masuk Akun</span>
          </Link>
        )}
      </div>
    </header>
  );
}
