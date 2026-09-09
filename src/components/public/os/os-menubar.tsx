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

// Authentic Social Media Icons
function GmailIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M2 6.5C2 5.39543 2.89543 4.5 4 4.5H6.5L12 9L17.5 4.5H20C21.1046 4.5 22 5.39543 22 6.5V7L12 14.5L2 7V6.5Z"
        fill="#EA4335"
      />
      <path
        d="M2 7.5L7.5 11.5V19.5H4C2.89543 19.5 2 18.6046 2 17.5V7.5Z"
        fill="#4285F4"
      />
      <path
        d="M22 7.5L16.5 11.5V19.5H20C21.1046 19.5 22 18.6046 22 17.5V7.5Z"
        fill="#34A853"
      />
      <path
        d="M7.5 19.5H16.5V11.5L12 15L7.5 11.5V19.5Z"
        fill="#FBBC04"
      />
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
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 flex items-center justify-between h-8 sm:h-10 gap-1 sm:gap-2">
        {/* Left Side: Retro System OS Branding & Status */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[var(--vt-card)] vt-card-inset">
            <Monitor className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            <span className="font-pixel text-[10px] sm:text-xs font-bold tracking-wider text-[var(--vt-ink)]">
              SIGIT-OS
            </span>
            <span className="hidden sm:inline font-mono text-[10px] font-bold text-[var(--vt-ink)] opacity-80">
              Workstation
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-[var(--vt-paper)] vt-card-inset text-xs font-mono font-bold text-[var(--vt-ink)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">ONLINE</span>
            <span className="text-[10px] text-[var(--vt-ink)] opacity-60">|</span>
            <span className="text-[10px] text-[var(--vt-ink)] font-bold truncate max-w-[120px] xl:max-w-none">
              {profileName}
            </span>
          </div>
        </div>

        {/* Center: Social Media Links Bar */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 px-1 sm:px-1.5 py-0.5 bg-[var(--vt-paper)] vt-card-inset">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=si.sigitadi@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="vt-btn vt-btn-chrome px-1 sm:px-2 py-0.5 text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-1 hover:text-[#EA4335] transition-colors cursor-pointer"
            title="Gmail: si.sigitadi@gmail.com"
            aria-label="Gmail"
          >
            <GmailIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden md:inline">Gmail</span>
          </a>
          <a
            href="https://www.linkedin.com/in/sigitadi/"
            target="_blank"
            rel="noopener noreferrer"
            className="vt-btn vt-btn-chrome px-1 sm:px-2 py-0.5 text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-1 hover:text-[#0A66C2] transition-colors cursor-pointer"
            title="LinkedIn: https://www.linkedin.com/in/sigitadi/"
            aria-label="LinkedIn"
          >
            <LinkedinIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden md:inline">LinkedIn</span>
          </a>
          <a
            href="https://github.com/sisigitadi"
            target="_blank"
            rel="noopener noreferrer"
            className="vt-btn vt-btn-chrome px-1 sm:px-2 py-0.5 text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
            title="GitHub: https://github.com/sisigitadi"
            aria-label="GitHub"
          >
            <GithubIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden md:inline">GitHub</span>
          </a>
          <a
            href="https://porto.sigitadi.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="vt-btn vt-btn-chrome px-1 sm:px-2 py-0.5 text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-1 hover:text-[#7c5cff] transition-colors cursor-pointer"
            title="Portofolio: https://porto.sigitadi.id/"
            aria-label="Portofolio"
          >
            <PortfolioIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden md:inline">Porto</span>
          </a>
        </div>

        {/* Right Side: Language, Theme & Clock */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 font-mono text-xs shrink-0">
          {/* Status Badge - desktop only */}
          <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 bg-[var(--vt-card)] vt-card-inset text-xs font-bold text-[var(--vt-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--vt-crt)] animate-pulse" />
            <span className="font-bold text-[var(--vt-ink)]">v2.5 PRO</span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="vt-btn vt-btn-chrome px-1 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[var(--vt-ink)] flex items-center gap-0.5 sm:gap-1 cursor-pointer"
            title={t.os_lang_tooltip}
          >
            <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Selector - hidden on mobile, shown on sm+ */}
          <div className="hidden sm:block relative">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as OSTheme)}
              className="vt-btn vt-btn-chrome px-1 sm:px-1.5 py-0.5 text-[11px] font-bold appearance-none cursor-pointer bg-transparent text-[var(--vt-ink)]"
              title={t.os_theme_tooltip}
            >
              <option value="retro90s" className="bg-[var(--vt-chrome)] text-foreground">90s Retro</option>
              <option value="dark" className="bg-[var(--vt-chrome)] text-foreground">Cyber Dark</option>
              <option value="tokyo" className="bg-[var(--vt-chrome)] text-foreground">Tokyo Night</option>
              <option value="vscode" className="bg-[var(--vt-chrome)] text-foreground">VS Code</option>
            </select>
          </div>

          {/* Digital Clock */}
          <div className="vt-card-inset px-1.5 sm:px-2 py-0.5 bg-[var(--vt-paper)] font-pixel text-[10px] sm:text-xs tracking-wider text-[var(--vt-ink)] font-bold flex items-center gap-0.5 sm:gap-1 shadow-inner">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            {/* Mobile: HH:MM only, Desktop: HH:MM:SS */}
            <span className="sm:hidden">{timeStr.slice(0, 5)}</span>
            <span className="hidden sm:inline">{timeStr}</span>
          </div>

          {/* User Button / Admin link */}
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-1 ml-0.5">
              <Link
                href="/admin"
                className="hidden sm:inline-flex vt-btn vt-btn-chrome px-1.5 py-0.5 text-xs font-bold text-foreground"
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
