"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor,
  Shield,
  Clock,
  Globe,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOSTheme, OSTheme } from "./theme-context";
import { useTranslation } from "@/lib/i18n";

interface OSMenubarProps {
  profileName: string;
}

export function OSMenubar({ profileName }: OSMenubarProps) {
  const { isLoaded, isSignedIn } = useUser();
  const { theme, setTheme } = useOSTheme();
  const { t, language, setLanguage } = useTranslation();
  const [timeStr, setTimeStr] = useState("00:00:00");

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${h}:${m}:${s}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--vt-chrome)] border-b-2 border-[#5a5750] shadow-[0_2px_8px_rgba(0,0,0,0.35)] select-none">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-10">
        {/* Left Side: Retro System OS Branding & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--vt-card)] vt-card-inset">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            <span className="font-pixel text-xs font-bold tracking-wider text-[var(--vt-ink)]">
              SIGIT-OS
            </span>
            <span className="hidden sm:inline font-mono text-[10px] font-bold text-[var(--vt-ink)] opacity-80">
              Workstation
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-[var(--vt-paper)] vt-card-inset text-xs font-mono font-bold text-[var(--vt-ink)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">ONLINE</span>
            <span className="text-[10px] text-[var(--vt-ink)] opacity-60">|</span>
            <span className="text-[10px] text-[var(--vt-ink)] font-bold truncate max-w-[120px] lg:max-w-none">
              {profileName}
            </span>
          </div>
        </div>

        {/* Right Side: System Status, Language, Theme & Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs">
          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-[var(--vt-card)] vt-card-inset text-xs font-bold text-[var(--vt-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--vt-crt)] animate-pulse" />
            <span className="font-bold text-[var(--vt-ink)]">v2.5 PRO</span>
          </div>

          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="vt-btn vt-btn-chrome px-2 py-0.5 text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-1 cursor-pointer"
            title={t.os_lang_tooltip}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Quick Theme Switcher Pill */}
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as OSTheme)}
              className="vt-btn vt-btn-chrome px-2 py-0.5 text-[11px] font-bold appearance-none cursor-pointer bg-transparent text-[var(--vt-ink)]"
              title={t.os_theme_tooltip}
            >
              <option value="retro90s" className="bg-[var(--vt-chrome)] text-foreground">90s Retro</option>
              <option value="dark" className="bg-[var(--vt-chrome)] text-foreground">Cyber Dark</option>
              <option value="tokyo" className="bg-[var(--vt-chrome)] text-foreground">Tokyo Night</option>
              <option value="vscode" className="bg-[var(--vt-chrome)] text-foreground">VS Code</option>
            </select>
          </div>

          {/* Digital Clock Box */}
          <div className="vt-card-inset px-2.5 py-0.5 bg-[var(--vt-paper)] font-pixel text-xs tracking-wider text-[var(--vt-ink)] font-bold flex items-center gap-1.5 shadow-inner">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{timeStr}</span>
          </div>

          {/* User Button / Admin link */}
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Link
                href="/admin"
                className="hidden sm:inline-flex vt-btn vt-btn-chrome px-2 py-0.5 text-xs font-bold text-foreground"
                title="Masuk ke Panel Admin"
              >
                <Shield className="h-3.5 w-3.5 text-primary mr-1" />
                <span>Admin</span>
              </Link>
              <UserButton />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
