"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Briefcase,
  FolderGit2,
  Package,
  MessageSquareQuote,
  Mail,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  HardDrive,
  Shield,
  Palette,
  RotateCcw,
} from "lucide-react";
import { ProfileData, ServiceData, ProjectData, ProductData, TestimonialData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { useOSTheme, OSTheme } from "./theme-context";
import { HeroSection } from "@/components/public/hero-section";
import { ServicesSection } from "@/components/public/services-section";
import { FeaturedProjectsSection } from "@/components/public/featured-projects-section";
import { ProductsSection } from "@/components/public/products-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ContactSection } from "@/components/public/contact-section";
import { OSCrtTerminal } from "@/components/public/os/os-crt-terminal";

interface OSDesktopManagerProps {
  profile: ProfileData;
  services: ServiceData[];
  projects: ProjectData[];
  products: ProductData[];
  testimonials: TestimonialData[];
}

type AppId = "profil" | "layanan" | "proyek" | "toko" | "testimoni" | "kontak" | "terminal";

interface AppItem {
  id: AppId;
  icon: React.ReactNode;
  number: number;
}

const APPS: AppItem[] = [
  {
    id: "profil",
    icon: <User className="h-4 w-4 text-emerald-400" />,
    number: 1,
  },
  {
    id: "layanan",
    icon: <Briefcase className="h-4 w-4 text-amber-400" />,
    number: 2,
  },
  {
    id: "proyek",
    icon: <FolderGit2 className="h-4 w-4 text-cyan-400" />,
    number: 3,
  },
  {
    id: "toko",
    icon: <Package className="h-4 w-4 text-pink-400" />,
    number: 4,
  },
  {
    id: "testimoni",
    icon: <MessageSquareQuote className="h-4 w-4 text-violet-400" />,
    number: 5,
  },
  {
    id: "kontak",
    icon: <Mail className="h-4 w-4 text-rose-400" />,
    number: 6,
  },
  {
    id: "terminal",
    icon: <Terminal className="h-4 w-4 text-emerald-300" />,
    number: 7,
  },
];

export function OSDesktopManager({
  profile,
  services,
  projects,
  products,
  testimonials,
}: OSDesktopManagerProps) {
  const { t, language } = useTranslation();
  const { theme, setTheme } = useOSTheme();
  const [activeApp, setActiveApp] = useState<AppId>("profil");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);

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

  const getAppLabel = useCallback((id: AppId) => {
    switch (id) {
      case "profil": return t.app_profile;
      case "layanan": return t.app_services;
      case "proyek": return t.app_projects;
      case "toko": return t.app_store;
      case "testimoni": return t.app_testimonials;
      case "kontak": return t.app_contact;
      case "terminal": return t.app_terminal;
      default: return id;
    }
  }, [t]);

  const getAppFilename = useCallback((id: AppId) => {
    switch (id) {
      case "profil": return language === "en" ? "Profile.exe" : "Profil.exe";
      case "layanan": return language === "en" ? "Services.exe" : "Layanan.exe";
      case "proyek": return language === "en" ? "Projects.exe" : "Proyek.exe";
      case "toko": return language === "en" ? "Store.zip" : "Toko.zip";
      case "testimoni": return language === "en" ? "Reviews.txt" : "Testimoni.txt";
      case "kontak": return language === "en" ? "Contact.exe" : "Kontak.exe";
      case "terminal": return "Terminal.bat";
      default: return `${id}.exe`;
    }
  }, [language]);

  const currentIndex = APPS.findIndex((a) => a.id === activeApp);
  const currentApp = APPS[currentIndex] || APPS[0];

  const switchApp = React.useCallback((id: AppId) => {
    setActiveApp(id);
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const handleNext = React.useCallback(() => {
    setActiveApp((curr) => {
      const idx = APPS.findIndex((a) => a.id === curr);
      const nextIdx = (idx + 1) % APPS.length;
      return APPS[nextIdx].id;
    });
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const handlePrev = React.useCallback(() => {
    setActiveApp((curr) => {
      const idx = APPS.findIndex((a) => a.id === curr);
      const prevIdx = (idx - 1 + APPS.length) % APPS.length;
      return APPS[prevIdx].id;
    });
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Keyboard navigation: Arrow Left/Right and Number keys 1-7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key >= "1" && e.key <= "7") {
        const idx = parseInt(e.key, 10) - 1;
        if (APPS[idx]) {
          e.preventDefault();
          switchApp(APPS[idx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, switchApp]);

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative select-none">
      {/* Main Desktop Space */}
      <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3 relative">
        {/* Left Side: Desktop Shortcut Icons (90s / 2000s OS Icons) */}
        <div className="hidden lg:flex flex-col gap-2 shrink-0 z-10 w-24 py-1">
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => switchApp(app.id)}
              className={`vt-icon text-left transition-all cursor-pointer ${
                activeApp === app.id ? "scale-105" : "opacity-85 hover:opacity-100"
              }`}
            >
              <div className="vt-icon-glyph relative">
                {app.icon}
                {activeApp === app.id && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="vt-icon-label font-mono text-xs font-bold text-white tracking-wider drop-shadow-md">
                {getAppFilename(app.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Center: The Active OS Application Window */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 z-20">
          <div
            className={`vt-window flex flex-col h-full transition-all duration-150 ${
              isMaximized ? "fixed inset-2 z-50" : "flex-1"
            } ${isMinimized ? "h-auto" : ""}`}
          >
            {/* 1. OS Titlebar */}
            <div className="vt-titlebar select-none py-1.5 px-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{currentApp.icon}</span>
                <span className="font-mono text-xs font-bold text-white tracking-wide truncate">
                  SigitOS_Viewer :: [{currentApp.number}/{APPS.length}] {getAppFilename(currentApp.id)} - {getAppLabel(currentApp.id)}
                </span>
              </div>

              {/* Titlebar window controls */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="vt-titlebar-btn"
                  title={isMinimized ? "Restore" : "Minimize"}
                  aria-label="Minimize"
                >
                  <Minimize2 className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="vt-titlebar-btn"
                  title={isMaximized ? "Normal" : "Maximize"}
                  aria-label="Maximize"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="vt-titlebar-btn hover:bg-rose-500 hover:text-white"
                  title="Close to taskbar"
                  aria-label="Close"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* 2. Window Top App Switcher Tabs (Click to open other section directly) */}
            <div className="bg-muted/80 border-b-2 border-border p-1.5 flex items-center gap-1.5 overflow-x-auto vt-scrollbar shrink-0 select-none">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => switchApp(app.id)}
                  className={`vt-taskbar-tab text-xs py-1 px-3 rounded-none flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                    activeApp === app.id
                      ? "active bg-[var(--vt-paper)] text-[var(--vt-ink)] font-bold shadow-xs"
                      : "text-[var(--vt-ink)] font-semibold opacity-85 hover:opacity-100 hover:text-[var(--vt-blue)]"
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-primary">[{app.number}]</span>
                  <span>{getAppLabel(app.id)}</span>
                </button>
              ))}
            </div>

            {/* 3. Window Body Canvas (Internal Scroll, Page stays 100% viewport locked) */}
            {!isMinimized && (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto vt-scrollbar bg-[var(--vt-paper)] text-[var(--vt-ink)] p-3 sm:p-6"
              >
                {activeApp === "profil" && <HeroSection profile={profile} />}
                {activeApp === "layanan" && (
                  <ServicesSection services={services} profile={profile} />
                )}
                {activeApp === "proyek" && (
                  <FeaturedProjectsSection projects={projects} />
                )}
                {activeApp === "toko" && <ProductsSection products={products} />}
                {activeApp === "testimoni" && (
                  <TestimonialsSection testimonials={testimonials} />
                )}
                {activeApp === "kontak" && <ContactSection profile={profile} />}
                {activeApp === "terminal" && (
                  <div className="max-w-4xl mx-auto py-4">
                    <OSCrtTerminal ownerName={profile.name} />
                  </div>
                )}
              </div>
            )}

            {/* 4. In-Window Bottom Navigation & Statusbar (Previous / Next Buttons) */}
            {!isMinimized && (
              <div className="vt-taskbar py-2 px-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-border text-xs font-mono shrink-0">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="vt-btn vt-btn-chrome h-8 px-3 text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
                  title={t.os_nav_prev_tooltip}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t.os_nav_prev}</span>
                </button>

                {/* Section Counter & Keyboard Guide */}
                <div className="flex items-center gap-3 text-xs text-[var(--vt-ink)] font-mono font-bold">
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-primary" />
                    <span>C:\SIGIT\APP_{currentApp.number}.EXE</span>
                  </span>
                  <span className="px-2.5 py-0.5 bg-muted rounded border border-border text-[var(--vt-ink)] font-bold">
                    {t.os_nav_page} {currentApp.number} {t.os_nav_of} {APPS.length}
                  </span>
                  <span className="hidden md:inline text-[11px] text-[var(--vt-ink)] opacity-75 font-medium">
                    {t.os_nav_keys}
                  </span>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="vt-btn vt-btn-pink h-8 px-4 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={t.os_nav_next_tooltip}
                >
                  <span>{t.os_nav_next}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Taskbar (Windows 95/98 Classic OS Taskbar) */}
      <div className="vt-taskbar h-10 px-2 sm:px-3 flex items-center justify-between border-t-2 border-border select-none z-30 shrink-0">
        {/* Left Side: Windows Start Button + Separator + Open Windows Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto vt-scrollbar py-1">
          {/* 1. Classic Windows 95/98 Start Button */}
          <div ref={startRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setStartOpen(!startOpen)}
              className={`vt-btn px-2.5 sm:px-3 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none transition-all ${
                startOpen
                  ? "vt-btn-inset bg-[var(--vt-card)]"
                  : "vt-btn-chrome text-foreground"
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 p-0.5 bg-black/20 rounded-xs">
                <span className="bg-red-500 rounded-xs" />
                <span className="bg-green-500 rounded-xs" />
                <span className="bg-blue-500 rounded-xs" />
                <span className="bg-yellow-400 rounded-xs" />
              </div>
              <span className="font-pixel text-xs tracking-wide font-bold">{t.os_start_btn}</span>
            </button>

            {/* Classic Windows 95 Start Menu Dropdown (Pops UPWARDS) */}
            {startOpen && (
              <div
                className="absolute left-0 bottom-full mb-1.5 w-64 vt-window bg-[var(--vt-chrome)] text-foreground text-xs shadow-2xl z-50 flex flex-row overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
              >
                {/* Left Blue Gradient Sidebar */}
                <div className="w-8 bg-gradient-to-t from-[var(--vt-navy)] via-[var(--vt-blue)] to-[#7c5cff] text-white flex items-end justify-center pb-4 select-none">
                  <span className="font-pixel text-xs tracking-widest -rotate-90 origin-bottom-center whitespace-nowrap text-[#37ff9b]">
                    SIGIT 98
                  </span>
                </div>

                {/* Menu Items List */}
                <div className="flex-1 p-1 space-y-0.5 font-mono">
                  <div className="px-2 py-1.5 bg-muted/60 mb-1 border-b border-border/60">
                    <p className="font-bold text-foreground truncate">{profile.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      {t.os_start_title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("profil");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-bold">{t.os_start_profile}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("layanan");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-bold">{t.os_start_services}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("proyek");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <FolderGit2 className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="font-bold">{t.os_start_projects}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("toko");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-pink-500" />
                    <span className="font-bold">{t.os_start_store}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("testimoni");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <MessageSquareQuote className="h-3.5 w-3.5 text-purple-500" />
                    <span className="font-bold">{t.os_start_testimonials}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("kontak");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5 text-rose-500" />
                    <span className="font-bold">{t.os_start_contact}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchApp("terminal");
                      setStartOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer"
                  >
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-bold">{t.app_terminal}</span>
                  </button>

                  <div className="h-px bg-[#9a968e] my-1 shadow-[0_1px_0_#fff]" />

                  {/* Theme Selector Submenu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left font-bold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{t.os_start_theme}</span>
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
                            className={`w-full flex items-center justify-between px-2 py-1 text-[11px] rounded-xs font-bold cursor-pointer ${
                              theme === th.id
                                ? "bg-[var(--vt-blue)] text-white"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <span>{th.label}</span>
                            <span className="text-[9px] opacity-75">[{th.tag}]</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/admin"
                    onClick={() => setStartOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors font-bold"
                  >
                    <Shield className="h-3.5 w-3.5 text-foreground" />
                    <span>{t.os_start_admin}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem("sigitos_booted_session");
                      window.location.reload();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-amber-600 hover:text-white rounded-xs transition-colors text-left cursor-pointer font-bold"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-500 hover:text-white" />
                    <span>{t.os_start_reboot}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Retro Taskbar Separator */}
          <div className="h-6 w-[2px] bg-[#5a5750] shadow-[1px_0_0_#fff] mx-1 shrink-0" />

          {/* Open windows taskbar buttons */}
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => switchApp(app.id)}
              className={`vt-taskbar-tab h-7 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeApp === app.id
                  ? "active text-[var(--vt-blue)] font-bold shadow-xs"
                  : "text-foreground font-semibold opacity-90 hover:opacity-100"
              }`}
            >
              {app.icon}
              <span className="truncate max-w-[90px] sm:max-w-none">{getAppFilename(app.id)}</span>
            </button>
          ))}
        </div>

        {/* System Status on Bottom Right */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold shrink-0 pl-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 dark:text-emerald-400">{t.os_status_online}</span>
        </div>
      </div>
    </div>
  );
}
