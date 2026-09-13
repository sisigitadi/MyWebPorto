"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor,
  Shield,
  Calendar,
  Globe,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOSTheme, OSTheme } from "./theme-context";
import { useTranslation } from "@/lib/i18n";
import { ProfileData } from "@/lib/dummy-data";

interface OSMenubarProps {
  profile: ProfileData;
}

export function OSMenubar({ profile }: OSMenubarProps) {
  const { isLoaded, isSignedIn } = useUser();
  const { theme, setTheme } = useOSTheme();
  const { t, language, setLanguage } = useTranslation();
  const [shortDate, setShortDate] = useState("");
  const [fullDate, setFullDate] = useState("");

  // Tanggal format dd/mm/yyyy
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const formatted = `${dd}/${mm}/${yyyy}`;
      setShortDate(formatted);
      setFullDate(formatted);
    };
    updateDate();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--vt-chrome)] border-b-2 border-[#5a5750] shadow-[0_2px_8px_rgba(0,0,0,0.35)] select-none">
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 flex items-center justify-between h-10 sm:h-12 md:h-14 gap-1 sm:gap-2 md:gap-4">
        {/* Left Side: Retro System OS Branding & Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div
            onClick={() => {
              if (typeof window !== "undefined") {
                const currentClicks = Number(sessionStorage.getItem("sigitos_clicks") || "0") + 1;
                sessionStorage.setItem("sigitos_clicks", currentClicks.toString());
                if (currentClicks >= 9) {
                  sessionStorage.setItem("sigitos_clicks", "0");
                  window.open("https://portofolio-visitor-tracker.si-sigitadi.workers.dev/dashboard", "_blank");
                }
              }
            }}
            title="Klik 9 kali untuk membuka Visitor Dashboard"
            className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--vt-card)] vt-card-inset cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:scale-110 group-hover:text-amber-400 transition-all" />
            <span className="font-pixel text-[11px] sm:text-[13px] md:text-sm font-bold tracking-wider text-[var(--vt-ink)] group-hover:text-[var(--vt-ink)]">
              SIGIT-OS
            </span>
            <span className="hidden sm:inline font-mono text-[11px] md:text-xs font-bold text-[var(--vt-ink)] opacity-80">
              Workstation
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[var(--vt-paper)] vt-card-inset text-xs font-mono font-bold text-[var(--vt-ink)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            <span className="text-[12px] text-emerald-700 dark:text-emerald-400 font-bold">ONLINE</span>
            <span className="text-[11px] text-[var(--vt-ink)] opacity-60">|</span>
            <span className="text-[11px] md:text-xs text-[var(--vt-ink)] font-bold truncate max-w-[150px] xl:max-w-none">
              {profile.name}
            </span>
          </div>
        </div>

        {/* Center: spacer agar branding kiri & clock kanan tetap seimbang */}
        <div className="flex-1" />

        {/* Right Side: Language, Theme & Clock */}
        <div className="flex items-center gap-1 sm:gap-2 font-mono text-xs shrink-0">
          {/* Status Badge - desktop only */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-[var(--vt-card)] vt-card-inset text-xs font-bold text-[var(--vt-ink)] hover:bg-primary/10 transition-colors">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-crt)] animate-pulse" />
            <span className="font-bold text-[var(--vt-ink)] tracking-wider">v2.5 PRO</span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="group vt-btn vt-btn-chrome px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold text-[var(--vt-ink)] flex items-center gap-1 sm:gap-1.5 cursor-pointer hover:-translate-y-0.5 hover:text-sky-500 transition-all shadow-sm"
            title={t.os_lang_tooltip}
          >
            <Globe className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-primary group-hover:scale-110 group-hover:rotate-12 transition-all" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Selector - hidden on mobile, shown on sm+ */}
          <div className="hidden sm:block relative">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as OSTheme)}
              className="vt-btn vt-btn-chrome px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold appearance-none cursor-pointer bg-transparent text-[var(--vt-ink)] hover:-translate-y-0.5 hover:text-indigo-500 transition-all shadow-sm"
              title={t.os_theme_tooltip}
            >
              <option value="retro90s" className="bg-[var(--vt-chrome)] text-foreground">90s Retro</option>
              <option value="dark" className="bg-[var(--vt-chrome)] text-foreground">Cyber Dark</option>
              <option value="tokyo" className="bg-[var(--vt-chrome)] text-foreground">Tokyo Night</option>
              <option value="vscode" className="bg-[var(--vt-chrome)] text-foreground">VS Code</option>
            </select>
          </div>

          {/* Digital Date (dd/mm/yyyy) */}
          <div
            className="group vt-card-inset px-2 sm:px-3 py-0.5 sm:py-1 bg-[var(--vt-paper)] font-pixel text-[11px] sm:text-[13px] tracking-wider text-[var(--vt-ink)] font-bold flex items-center gap-1.5 shadow-inner shrink-0 hover:bg-emerald-50 transition-colors dark:hover:bg-emerald-950/30 cursor-default"
            title="Tanggal Hari Ini"
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 group-hover:text-emerald-500 transition-all" />
            <span className="sm:hidden">{shortDate || "13/09/2026"}</span>
            <span className="hidden sm:inline">{fullDate || "13/09/2026"}</span>
          </div>

          {/* User Button / Admin link */}
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Link
                href="/admin"
                className="group hidden sm:inline-flex vt-btn vt-btn-chrome px-2 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold text-foreground hover:-translate-y-0.5 transition-all hover:text-amber-500 shadow-sm"
                title="Masuk ke Panel Admin"
              >
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 mr-1 transition-all" />
                <span>Admin</span>
              </Link>
              <div className="hover:scale-110 transition-transform">
                <UserButton />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
