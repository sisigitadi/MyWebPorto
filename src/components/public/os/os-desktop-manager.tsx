"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { ProfileData, ServiceData, ProjectData, ProductData, TestimonialData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
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
  const [activeApp, setActiveApp] = useState<AppId>("profil");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isStartPressed, setIsStartPressed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      <div className="flex-1 flex overflow-hidden p-1 sm:p-2 md:p-4 gap-1.5 sm:gap-3 relative">
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
            <div className="vt-titlebar select-none py-1 sm:py-1.5 px-2 sm:px-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="shrink-0">{currentApp.icon}</span>
                <span className="font-mono text-[10px] sm:text-xs font-bold text-white tracking-wide truncate">
                  <span className="hidden sm:inline">SigitOS_Viewer :: </span>[{currentApp.number}/{APPS.length}] {getAppFilename(currentApp.id)}
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

            {/* 2. Window Body Canvas (Internal Scroll, Page stays 100% viewport locked) */}
            {!isMinimized && (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto vt-scrollbar bg-[var(--vt-paper)] text-[var(--vt-ink)] p-2 sm:p-3 md:p-6"
              >
                {activeApp === "profil" && <HeroSection profile={profile} />}
                {activeApp === "layanan" && (
                  <ServicesSection services={services} profile={profile} />
                )}
                {activeApp === "proyek" && (
                  <FeaturedProjectsSection projects={projects} profile={profile} />
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
              <div className="vt-taskbar py-1 sm:py-2 px-2 sm:px-3 flex items-center justify-between gap-1 sm:gap-2 border-t-2 border-border text-xs font-mono shrink-0">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="vt-btn vt-btn-chrome h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-foreground flex items-center gap-1 cursor-pointer"
                  title={t.os_nav_prev_tooltip}
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t.os_nav_prev}</span>
                </button>

                {/* Section Counter & Keyboard Guide */}
                <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-[var(--vt-ink)] font-mono font-bold">
                  <span className="hidden md:inline-flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-primary" />
                    <span>C:\SIGIT\APP_{currentApp.number}.EXE</span>
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 bg-muted rounded border border-border text-[var(--vt-ink)] font-bold">
                    {currentApp.number} / {APPS.length}
                  </span>
                  <span className="hidden lg:inline text-[11px] text-[var(--vt-ink)] opacity-75 font-medium">
                    {t.os_nav_keys}
                  </span>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="vt-btn vt-btn-pink h-7 sm:h-8 px-2.5 sm:px-4 text-[10px] sm:text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-sm"
                  title={t.os_nav_next_tooltip}
                >
                  <span className="hidden sm:inline">{t.os_nav_next}</span>
                  <span className="sm:hidden">{language === "en" ? "Next" : "Lanjut"}</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Taskbar (Windows 95/98 Classic OS Taskbar) */}
      <div className="vt-taskbar h-8 sm:h-10 px-1.5 sm:px-3 flex items-center justify-between border-t-2 border-border select-none z-30 shrink-0">
        {/* Left Side: Windows Start Button + Separator + Open Windows Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto vt-scrollbar py-0.5 sm:py-1">
          {/* 1. Classic Windows 95/98 Start Button (Hanya efek ditekan saja saat diklik) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsStartPressed((prev) => !prev)}
              className={`vt-btn px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer select-none transition-all active:vt-btn-inset ${
                isStartPressed
                  ? "vt-btn-inset bg-[var(--vt-card)] translate-y-0.5"
                  : "vt-btn-chrome text-foreground"
              }`}
              title={t.os_start_btn}
            >
              <div className="grid grid-cols-2 gap-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 p-0.5 bg-black/20 rounded-xs">
                <span className="bg-red-500 rounded-xs" />
                <span className="bg-green-500 rounded-xs" />
                <span className="bg-blue-500 rounded-xs" />
                <span className="bg-yellow-400 rounded-xs" />
              </div>
              <span className="font-pixel text-[10px] sm:text-xs tracking-wide font-bold">{t.os_start_btn}</span>
            </button>
          </div>

          {/* Retro Taskbar Separator */}
          <div className="h-5 sm:h-6 w-[2px] bg-[#5a5750] shadow-[1px_0_0_#fff] mx-0.5 sm:mx-1 shrink-0" />

          {/* Open windows taskbar buttons (All tabs directly accessible & scrollable on mobile & desktop) */}
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => switchApp(app.id)}
              className={`vt-taskbar-tab h-6 sm:h-7 px-1.5 sm:px-2.5 text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer shrink-0 ${
                activeApp === app.id
                  ? "active text-[var(--vt-blue)] font-bold shadow-xs"
                  : "text-foreground font-semibold opacity-90 hover:opacity-100"
              }`}
            >
              {app.icon}
              <span className="truncate max-w-[70px] sm:max-w-[85px] lg:max-w-none">{getAppFilename(app.id)}</span>
            </button>
          ))}
        </div>

        {/* System Status on Bottom Right */}
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono font-bold shrink-0 pl-1 sm:pl-2">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline text-emerald-700 dark:text-emerald-400">{t.os_status_online}</span>
        </div>
      </div>
    </div>
  );
}
