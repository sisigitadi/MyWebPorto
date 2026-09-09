"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Terminal,
  FolderGit2,
  Briefcase,
  Package,
  MessageSquareQuote,
  Mail,
  Shield,
  Palette,
  Clock,
  ChevronRight,
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
  const { language, setLanguage } = useTranslation();
  const [startOpen, setStartOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("00:00:00");
  const startRef = useRef<HTMLDivElement>(null);

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

  // Close start menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartOpen(false);
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes: { id: OSTheme; label: string; tag: string }[] = [
    { id: "retro90s", label: "Classic 90s OS", tag: "DEFAULT" },
    { id: "dark", label: "Cyber Dark OS", tag: "DARK" },
    { id: "tokyo", label: "Tokyo Night Cyber", tag: "NEON" },
    { id: "vscode", label: "VS Code Hacker", tag: "DEV" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--vt-chrome)] border-b-2 border-[#5a5750] shadow-[0_2px_8px_rgba(0,0,0,0.35)] select-none">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-10">
        {/* Left Side: Start Button & Section Nav */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Start Button */}
          <div ref={startRef} className="relative">
            <button
              type="button"
              onClick={() => setStartOpen(!startOpen)}
              className={`vt-btn vt-btn-chrome px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 ${
                startOpen ? "translate-x-0.5 translate-y-0.5 shadow-inner" : ""
              }`}
            >
              <div className="w-3.5 h-3.5 bg-gradient-to-br from-[#ff3e9a] via-[#3b2fd6] to-[#37ff9b] rounded-xs flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                S
              </div>
              <span className="font-mono tracking-wider font-extrabold text-foreground">
                START
              </span>
            </button>

            {/* Retro Start Menu Popup */}
            {startOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[var(--vt-chrome)] vt-window p-1 z-50 shadow-[6px_6px_0_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-100">
                {/* Side Banner */}
                <div className="flex">
                  <div className="w-7 bg-gradient-to-b from-[#0a0a5e] via-[#3b2fd6] to-[#ff3e9a] p-1 flex flex-col justify-end text-white font-mono text-[11px] font-black tracking-widest uppercase writing-mode-vertical rotate-180 select-none">
                    <span className="text-[#ffd400]">SIGIT</span>OS 98
                  </div>

                  {/* Menu Items */}
                  <div className="flex-1 p-1 space-y-0.5 text-xs font-mono">
                    <div className="px-2 py-1 bg-muted/60 mb-1 border-b border-border/60">
                      <p className="font-bold text-foreground truncate">{profileName}</p>
                      <p className="text-[10px] text-muted-foreground">Web Systems Architect</p>
                    </div>

                    <a
                      href="#hero"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span>Sistem Terminal (Hero)</span>
                    </a>

                    <a
                      href="#proyek"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <FolderGit2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Katalog Proyek</span>
                    </a>

                    <a
                      href="#layanan"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                      <span>Modul Layanan</span>
                    </a>

                    <a
                      href="#produk"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <Package className="h-3.5 w-3.5 text-amber-600" />
                      <span>Software Store</span>
                    </a>

                    <a
                      href="#testimoni"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <MessageSquareQuote className="h-3.5 w-3.5 text-purple-600" />
                      <span>Log Ulasan Klien</span>
                    </a>

                    <a
                      href="#kontak"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-rose-600" />
                      <span>Kirim Pesan (Mailer)</span>
                    </a>

                    <div className="h-px bg-[#9a968e] my-1 shadow-[0_1px_0_#fff]" />

                    {/* Theme Selector Submenu Toggle */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Palette className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Ganti Tema OS</span>
                        </div>
                        <ChevronRight className="h-3 w-3" />
                      </button>

                      {themeMenuOpen && (
                        <div className="mt-1 pl-4 space-y-1 bg-muted/40 p-1.5 rounded-xs border border-border">
                          {themes.map((th) => (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => {
                                setTheme(th.id);
                                setStartOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1 text-[11px] rounded-xs ${
                                theme === th.id
                                  ? "bg-[var(--vt-blue)] text-white font-bold"
                                  : "hover:bg-muted text-foreground"
                              }`}
                            >
                              <span>{th.label}</span>
                              <span className="text-[9px] opacity-70">[{th.tag}]</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href="/admin"
                      onClick={() => setStartOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
                    >
                      <Shield className="h-3.5 w-3.5 text-foreground" />
                      <span>Panel Admin</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            <a
              href="#hero"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Profile
            </a>
            <a
              href="#layanan"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Services
            </a>
            <a
              href="#proyek"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Projects
            </a>
            <a
              href="#produk"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Store
            </a>
            <a
              href="#testimoni"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Reviews
            </a>
            <a
              href="#kontak"
              className="px-2 py-1 text-foreground hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>

        {/* Right Side: System Status, Language, Theme & Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs">
          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-[var(--vt-card)] vt-card-inset text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--vt-crt)] animate-pulse" />
            <span className="font-semibold text-foreground">SIGIT-OS</span>
            <span>v2.5</span>
          </div>

          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="vt-btn vt-btn-chrome px-2 py-0.5 text-[10px] font-bold"
            title="Ganti Bahasa (ID/EN)"
          >
            <Globe className="h-3 w-3 text-primary" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Quick Theme Switcher Pill */}
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as OSTheme)}
              className="vt-btn vt-btn-chrome px-1.5 py-0.5 text-[10px] font-bold appearance-none cursor-pointer bg-transparent text-foreground"
              title="Pilih Tema Tampilan"
            >
              <option value="retro90s" className="bg-[var(--vt-chrome)] text-foreground">90s Retro</option>
              <option value="dark" className="bg-[var(--vt-chrome)] text-foreground">Cyber Dark</option>
              <option value="tokyo" className="bg-[var(--vt-chrome)] text-foreground">Tokyo Night</option>
              <option value="vscode" className="bg-[var(--vt-chrome)] text-foreground">VS Code</option>
            </select>
          </div>

          {/* Digital Clock Box */}
          <div className="vt-card-inset px-2 py-0.5 bg-[var(--vt-paper)] font-pixel text-[11px] tracking-wider text-foreground flex items-center gap-1 shadow-inner">
            <Clock className="h-3 w-3 text-primary" />
            <span>{timeStr}</span>
          </div>

          {/* User Button / Admin link */}
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Link
                href="/admin"
                className="hidden sm:inline-flex vt-btn vt-btn-chrome px-1.5 py-0.5 text-[10px] font-bold text-foreground"
                title="Masuk ke Panel Admin"
              >
                <Shield className="h-3 w-3 text-primary" />
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
