"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Calendar, Globe } from "lucide-react";
import { useOSTheme, OSTheme } from "./theme-context";
import { useTranslation } from "@/lib/i18n";
import { ProfileData } from "@/lib/dummy-data";
import { hasClerkPublishableKey } from "@/lib/env";

// Dynamic import for MenubarUser: ensures @clerk/nextjs is code-split away from the initial homepage chunk
const MenubarUser = dynamic(
  () => import("./os-menubar-user").then((mod) => mod.MenubarUser),
  { ssr: false }
);

interface OSMenubarProps {
  profile: ProfileData;
}

export function OSMenubar({ profile }: OSMenubarProps) {
  const { theme, setTheme } = useOSTheme();
  const { t, language, setLanguage } = useTranslation();
  const [fullDate, setFullDate] = useState("");

  // Tanggal format DD/MM/YYYY (contoh: 13/10/2026) seragam untuk semua viewport.
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      setFullDate(`${dd}/${mm}/${yyyy}`);
    };
    updateDate();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--vt-chrome)] border-b-2 border-[#5a5750] shadow-[0_2px_8px_rgba(0,0,0,0.35)] select-none">
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 flex items-center justify-between h-10 sm:h-12 md:h-14 gap-1 sm:gap-2 md:gap-4 overflow-x-auto vt-menubar-scroll">
        {/* Left Side: Retro System OS Branding & Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div
            onClick={() => {
              if (typeof window !== "undefined") {
                const currentClicks = Number(sessionStorage.getItem("sigitos_clicks") || "0") + 1;
                sessionStorage.setItem("sigitos_clicks", currentClicks.toString());
                if (currentClicks >= 9) {
                  sessionStorage.setItem("sigitos_clicks", "0");
                  window.open("/admin/analytics", "_blank");
                }
              }
            }}
            title="Klik 9 kali untuk membuka Visitor Dashboard"
            className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--vt-card)] vt-card-inset cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-48.webp"
              alt="Sigit Adi Irianto Logo"
              width={20}
              height={20}
              className="h-4 w-4 sm:h-5 sm:w-5 rounded-xs object-cover group-hover:scale-110 group-hover:shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all"
            />
            <span className="font-pixel text-[11px] sm:text-[13px] md:text-sm font-bold tracking-wider text-[var(--vt-ink)] group-hover:text-[var(--vt-ink)]">
              SIGIT-OS
            </span>
            <span className="hidden sm:inline font-mono text-[11px] md:text-xs font-bold text-[var(--vt-ink)] opacity-80">
              Workstation
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[var(--vt-paper)] vt-card-inset text-xs font-mono font-bold text-[var(--vt-ink)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            <span className="text-[12px] text-emerald-900 dark:text-emerald-300 font-bold">ONLINE</span>
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
            className="group vt-btn vt-btn-chrome px-1.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold text-[var(--vt-ink)] flex items-center gap-1 sm:gap-1.5 cursor-pointer hover:-translate-y-0.5 hover:text-sky-500 transition-all shadow-sm"
            title={t.os_lang_tooltip}
          >
            {/* Ikon globe disembunyikan di mobile: header kanan sempit (language
              + theme + tanggal di <400px), label "ID"/"EN" saja sudah jelas. */}
            <Globe className="hidden sm:block h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-primary group-hover:scale-110 group-hover:rotate-12 transition-all" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Selector - terlihat di semua ukuran layar */}
          <div className="block relative">
            <select
              value={theme}
              aria-label={t.os_theme_tooltip}
              onChange={(e) => setTheme(e.target.value as OSTheme)}
              className="vt-btn vt-btn-chrome px-1.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold appearance-none cursor-pointer bg-transparent text-[var(--vt-ink)] hover:-translate-y-0.5 hover:text-indigo-500 transition-all shadow-sm whitespace-nowrap"
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
            className="group vt-card-inset px-1.5 sm:px-3 py-0.5 sm:py-1 bg-[var(--vt-paper)] font-pixel text-[11px] sm:text-[13px] tracking-wider text-[var(--vt-ink)] font-bold hidden xs:flex items-center gap-1 sm:gap-1.5 shadow-inner shrink-0 hover:bg-emerald-50 transition-colors dark:hover:bg-emerald-950/30 cursor-default"
            title="Tanggal Hari Ini"
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 group-hover:text-emerald-500 transition-all" />
            {/* Tanggal hanya diisi setelah mount (useEffect di atas). */}
            <span>{fullDate}</span>
          </div>

          {/* User Button / Admin link — dimuat secara lazy saat Clerk aktif */}
          {hasClerkPublishableKey() ? <MenubarUser /> : null}
        </div>
      </div>
    </header>
  );
}
