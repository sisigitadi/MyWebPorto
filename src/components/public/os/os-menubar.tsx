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

interface OSMenubarProps {
  profileName: string;
}

// Authentic Social Media Icons
function MediumIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#0A66C2">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.64 1.64 0 0 0-1.66 1.65c0 .9.74 1.65 1.66 1.65a1.65 1.65 0 0 0 1.66-1.65c0-.91-.74-1.65-1.66-1.65Z" />
    </svg>
  );
}

function GithubIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function PortfolioIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#7c5cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function OSMenubar({ profileName }: OSMenubarProps) {
  const { isLoaded, isSignedIn } = useUser();
  const { theme, setTheme } = useOSTheme();
  const { t, language, setLanguage } = useTranslation();
  const [shortDate, setShortDate] = useState("");
  const [fullDate, setFullDate] = useState("");

  // Tanggal Bulan Tahun Hari Ini
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const locale = language === "en" ? "en-GB" : "id-ID";
      setShortDate(now.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }));
      setFullDate(now.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }));
    };
    updateDate();
  }, [language]);

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
                  window.open("https://portofolio-visitor-tracker.si-sigitadi.workers.dev/dashboard?key=d4f8f4af29e3f8d517bcd44c18962a18b1e767084ba7dd64f2ed7d5a41a8698a", "_blank");
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
              {profileName}
            </span>
          </div>
        </div>

        {/* Center: Social Media Links Bar (Spacious & Tactile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 bg-[var(--vt-paper)] vt-card-inset">
          <a
            href="https://medium.com/@si.sigitadi"
            target="_blank"
            rel="noopener noreferrer"
            className="group vt-btn vt-btn-chrome px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs md:text-[13px] font-bold text-[var(--vt-ink)] flex items-center gap-1.5 sm:gap-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-sm"
            title="Medium: https://medium.com/@si.sigitadi"
            aria-label="Medium"
          >
            <MediumIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Medium</span>
          </a>
          <a
            href="https://www.linkedin.com/in/sigitadi/"
            target="_blank"
            rel="noopener noreferrer"
            className="group vt-btn vt-btn-chrome px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs md:text-[13px] font-bold text-[var(--vt-ink)] flex items-center gap-1.5 sm:gap-2 hover:bg-[#0A66C2] hover:text-white hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-sm"
            title="LinkedIn: https://www.linkedin.com/in/sigitadi/"
            aria-label="LinkedIn"
          >
            <LinkedinIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">LinkedIn</span>
          </a>
          <a
            href="https://github.com/sisigitadi"
            target="_blank"
            rel="noopener noreferrer"
            className="group vt-btn vt-btn-chrome px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs md:text-[13px] font-bold text-[var(--vt-ink)] flex items-center gap-1.5 sm:gap-2 hover:bg-[#2dba4e] hover:text-white hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-sm"
            title="GitHub: https://github.com/sisigitadi"
            aria-label="GitHub"
          >
            <GithubIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>

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

          {/* Digital Date (Tanggal Bulan Tahun Hari Ini) */}
          <div
            className="group vt-card-inset px-2 sm:px-3 py-0.5 sm:py-1 bg-[var(--vt-paper)] font-pixel text-[11px] sm:text-[13px] tracking-wider text-[var(--vt-ink)] font-bold flex items-center gap-1.5 shadow-inner shrink-0 hover:bg-emerald-50 transition-colors dark:hover:bg-emerald-950/30 cursor-default"
            title="Tanggal Hari Ini"
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 group-hover:text-emerald-500 transition-all" />
            <span className="sm:hidden">{shortDate || "10 Sep 2026"}</span>
            <span className="hidden sm:inline">{fullDate || "10 September 2026"}</span>
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
