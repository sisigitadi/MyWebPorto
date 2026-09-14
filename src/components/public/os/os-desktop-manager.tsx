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
  Volume2,
  VolumeX,
  X,
  HardDrive,
  Palette,
  RotateCcw,
  Globe,
  FileText,
} from "lucide-react";
import { ProfileData, ServiceData, ProjectData, ProductData, TestimonialData, ArticleData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { useOSTheme, OSTheme } from "./theme-context";
import { HeroSection } from "@/components/public/hero-section";
import { ServicesSection } from "@/components/public/services-section";
import { FeaturedProjectsSection } from "@/components/public/featured-projects-section";
import { ProductsSection } from "@/components/public/products-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ArticlesSection } from "@/components/public/articles-section";
import { ContactSection } from "@/components/public/contact-section";
import { OSCrtTerminal } from "@/components/public/os/os-crt-terminal";
import { OSCommandPalette, PaletteAction } from "@/components/public/os/os-command-palette";

interface OSDesktopManagerProps {
  profile: ProfileData;
  services: ServiceData[];
  projects: ProjectData[];
  products: ProductData[];
  testimonials: TestimonialData[];
  articles: ArticleData[];
}

type AppId = "profil" | "layanan" | "proyek" | "toko" | "testimoni" | "artikel" | "kontak" | "terminal";

const THEMES: { id: OSTheme; label: string; tag: string }[] = [
  { id: "retro90s", label: "Classic 90s OS", tag: "DEFAULT" },
  { id: "dark", label: "Cyber Dark OS", tag: "DARK" },
  { id: "tokyo", label: "Tokyo Night Cyber", tag: "NEON" },
  { id: "vscode", label: "VS Code Hacker", tag: "DEV" },
];

interface AppItem {
  id: AppId;
  icon: React.ReactNode;
  number: number;
  colorClass: string;
  activeClass: string;
}

const APPS: AppItem[] = [
  {
    id: "profil",
    icon: <User className="h-[22px] w-[22px] text-[#0044cc] dark:text-[#38bdf8] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 1,
    colorClass: "hover:bg-[#0044cc]/10 hover:text-[#0044cc] dark:hover:bg-[#38bdf8]/10 dark:hover:text-[#38bdf8]",
    activeClass: "text-[#0044cc] dark:text-[#38bdf8] bg-[#0044cc]/15 dark:bg-[#38bdf8]/15 ring-[#0044cc]/50 dark:ring-[#38bdf8]/50",
  },
  {
    id: "layanan",
    icon: <Briefcase className="h-[22px] w-[22px] text-[#d97706] dark:text-[#fbbf24] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 2,
    colorClass: "hover:bg-[#d97706]/10 hover:text-[#d97706] dark:hover:bg-[#fbbf24]/10 dark:hover:text-[#fbbf24]",
    activeClass: "text-[#d97706] dark:text-[#fbbf24] bg-[#d97706]/15 dark:bg-[#fbbf24]/15 ring-[#d97706]/50 dark:ring-[#fbbf24]/50",
  },
  {
    id: "proyek",
    icon: <FolderGit2 className="h-[22px] w-[22px] text-[#0891b2] dark:text-[#22d3ee] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 3,
    colorClass: "hover:bg-[#0891b2]/10 hover:text-[#0891b2] dark:hover:bg-[#22d3ee]/10 dark:hover:text-[#22d3ee]",
    activeClass: "text-[#0891b2] dark:text-[#22d3ee] bg-[#0891b2]/15 dark:bg-[#22d3ee]/15 ring-[#0891b2]/50 dark:ring-[#22d3ee]/50",
  },
  {
    id: "toko",
    icon: <Package className="h-[22px] w-[22px] text-[#c026d3] dark:text-[#e879f9] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 4,
    colorClass: "hover:bg-[#c026d3]/10 hover:text-[#c026d3] dark:hover:bg-[#e879f9]/10 dark:hover:text-[#e879f9]",
    activeClass: "text-[#c026d3] dark:text-[#e879f9] bg-[#c026d3]/15 dark:bg-[#e879f9]/15 ring-[#c026d3]/50 dark:ring-[#e879f9]/50",
  },
  {
    id: "artikel",
    icon: <FileText className="h-[22px] w-[22px] text-[#ea580c] dark:text-[#fb923c] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 5,
    colorClass: "hover:bg-[#ea580c]/10 hover:text-[#ea580c] dark:hover:bg-[#fb923c]/10 dark:hover:text-[#fb923c]",
    activeClass: "text-[#ea580c] dark:text-[#fb923c] bg-[#ea580c]/15 dark:bg-[#fb923c]/15 ring-[#ea580c]/50 dark:ring-[#fb923c]/50",
  },
  {
    id: "terminal",
    icon: <Terminal className="h-[22px] w-[22px] text-[#059669] dark:text-[#34d399] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 6,
    colorClass: "hover:bg-[#059669]/10 hover:text-[#059669] dark:hover:bg-[#34d399]/10 dark:hover:text-[#34d399]",
    activeClass: "text-[#059669] dark:text-[#34d399] bg-[#059669]/15 dark:bg-[#34d399]/15 ring-[#059669]/50 dark:ring-[#34d399]/50",
  },
  {
    id: "testimoni",
    icon: <MessageSquareQuote className="h-[22px] w-[22px] text-[#7c3aed] dark:text-[#a78bfa] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 7,
    colorClass: "hover:bg-[#7c3aed]/10 hover:text-[#7c3aed] dark:hover:bg-[#a78bfa]/10 dark:hover:text-[#a78bfa]",
    activeClass: "text-[#7c3aed] dark:text-[#a78bfa] bg-[#7c3aed]/15 dark:bg-[#a78bfa]/15 ring-[#7c3aed]/50 dark:ring-[#a78bfa]/50",
  },
  {
    id: "kontak",
    icon: <Mail className="h-[22px] w-[22px] text-[#e11d48] dark:text-[#fb7185] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 8,
    colorClass: "hover:bg-[#e11d48]/10 hover:text-[#e11d48] dark:hover:bg-[#fb7185]/10 dark:hover:text-[#fb7185]",
    activeClass: "text-[#e11d48] dark:text-[#fb7185] bg-[#e11d48]/15 dark:bg-[#fb7185]/15 ring-[#e11d48]/50 dark:ring-[#fb7185]/50",
  },
];

export function OSDesktopManager({
  profile,
  services,
  projects,
  products,
  testimonials,
  articles,
}: OSDesktopManagerProps) {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useOSTheme();
  const [activeApp, setActiveApp] = useState<AppId>("profil");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage?.getItem("sigitos_sound") !== "off";
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getAppFilename = useCallback((id: AppId) => {
    switch (id) {
      case "profil": return language === "en" ? "Profile.exe" : "Profil.exe";
      case "layanan": return language === "en" ? "Services.exe" : "Layanan.exe";
      case "proyek": return language === "en" ? "Projects.exe" : "Proyek.exe";
      case "toko": return language === "en" ? "Store.zip" : "Toko.zip";
      case "testimoni": return language === "en" ? "Reviews.txt" : "Testimoni.txt";
      case "artikel": return language === "en" ? "Articles.doc" : "Artikel.doc";
      case "kontak": return language === "en" ? "Contact.exe" : "Kontak.exe";
      case "terminal": return "Terminal.bat";
      default: return `${id}.exe`;
    }
  }, [language]);

  const currentIndex = APPS.findIndex((a) => a.id === activeApp);
  const currentApp = APPS[currentIndex] || APPS[0];

  const switchApp = React.useCallback((id: AppId, updateUrl = true) => {
    setActiveApp(id);
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (updateUrl && typeof window !== "undefined") {
      const hash = id === "profil" ? "" : "#" + id;
      const newUrl = window.location.pathname + hash;
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", newUrl || window.location.pathname);
      }
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

  // Keyboard navigation: Arrow Left/Right and Number keys 1-8
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
      } else if (e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        if (APPS[idx]) {
          e.preventDefault();
          switchApp(APPS[idx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const handleSwitchAppEvent = (e: CustomEvent<AppId>) => {
      if (e.detail) {
        switchApp(e.detail);
      }
    };
    window.addEventListener("switch-os-app", handleSwitchAppEvent as EventListener);

    // Sync from initial URL hash on mount or hash change (for direct share links)
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const aliasMap: Record<string, AppId> = {
        profil: "profil",
        profile: "profil",
        hero: "profil",
        about: "profil",
        layanan: "layanan",
        services: "layanan",
        proyek: "proyek",
        projects: "proyek",
        toko: "toko",
        produk: "toko",
        store: "toko",
        products: "toko",
        testimoni: "testimoni",
        testimonials: "testimoni",
        reviews: "testimoni",
        artikel: "artikel",
        articles: "artikel",
        blog: "artikel",
        kontak: "kontak",
        contact: "kontak",
        terminal: "terminal",
      };

      if (hash && aliasMap[hash]) {
        switchApp(aliasMap[hash], false);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("switch-os-app", handleSwitchAppEvent as EventListener);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [handleNext, handlePrev, switchApp]);

  // Command palette: Ctrl+K / Cmd+K (bekerja walau fokus di input)
  useEffect(() => {
    const openPalette = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", openPalette);
    return () => window.removeEventListener("keydown", openPalette);
  }, []);

  const paletteActions: PaletteAction[] = React.useMemo(
    () => [
      ...THEMES.map((th) => ({
        id: `theme-${th.id}`,
        label: `${language === "en" ? "Theme" : "Tema"}: ${th.label}`,
        hint: th.tag,
        run: () => setTheme(th.id),
      })),
      {
        id: "toggle-language",
        label: language === "id" ? "Ganti ke English (EN)" : "Switch to Bahasa (ID)",
        hint: language.toUpperCase(),
        run: () => setLanguage(language === "id" ? "en" : "id"),
      },
      {
        id: "reboot",
        label: "Reboot SigitOS",
        hint: "BIOS",
        run: () => {
          sessionStorage.removeItem("sigitos_booted_session");
          window.location.reload();
        },
      },
    ],
    [language, setLanguage, setTheme]
  );

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
            className={`vt-window flex flex-col h-full transition-all duration-150 animate-in fade-in-50 zoom-in-95 ${
              isMaximized ? "fixed inset-2 z-50" : "flex-1"
            } ${isMinimized ? "h-auto" : ""}`}
          >
            {/* 1. OS Titlebar (double-click = maximize toggle) */}
            <div
              className="vt-titlebar select-none py-1 sm:py-1.5 px-2 sm:px-3 flex items-center justify-between"
              onDoubleClick={() => setIsMaximized((v) => !v)}
              title={language === "en" ? "Double-click to maximize" : "Klik 2x untuk maximize"}
            >
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
                  <FeaturedProjectsSection projects={projects} />
                )}
                {activeApp === "toko" && <ProductsSection products={products} />}
                {activeApp === "testimoni" && (
                  <TestimonialsSection testimonials={testimonials} />
                )}
                {activeApp === "artikel" && (
                  <ArticlesSection articles={articles} />
                )}
                {activeApp === "kontak" && <ContactSection profile={profile} />}
                {activeApp === "terminal" && (
                  <div className="max-w-4xl mx-auto py-4">
                    <OSCrtTerminal
                      ownerName={profile.name}
                      profile={profile}
                      services={services}
                      projects={projects}
                      articles={articles}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. In-Window Bottom Navigation & Statusbar (Previous / Next Buttons) */}
            {!isMinimized && (
              <div className="vt-taskbar py-2 sm:py-3 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 border-t-2 border-border text-xs font-mono shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="group vt-btn vt-btn-chrome h-8 sm:h-10 px-3 sm:px-4 text-[11px] sm:text-sm font-bold text-foreground flex items-center gap-1.5 cursor-pointer hover:bg-[var(--vt-blue)] hover:text-white transition-colors shadow-sm"
                  title={t.os_nav_prev_tooltip}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">{t.os_nav_prev}</span>
                </button>

                {/* Section Counter & Keyboard Guide */}
                <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-[13px] text-[var(--vt-ink)] font-mono font-bold">
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 rounded-sm border border-border/50">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <span>C:\SIGIT\APP_{currentApp.number}.EXE</span>
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 bg-muted rounded border border-border text-[var(--vt-ink)] font-extrabold shadow-inner">
                    {currentApp.number} / {APPS.length}
                  </span>
                  <span className="hidden lg:inline text-xs text-[var(--vt-ink)] opacity-75 font-medium italic">
                    {t.os_nav_keys}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded-sm border border-border/50 text-xs text-[var(--vt-ink)] font-medium hover:bg-muted transition-colors cursor-pointer"
                    title={language === "en" ? "Open command palette (Ctrl+K)" : "Buka palet perintah (Ctrl+K)"}
                  >
                    <span className="opacity-75">Ctrl+K</span>
                  </button>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="group vt-btn vt-btn-pink h-8 sm:h-10 px-3 sm:px-5 text-[11px] sm:text-sm font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:brightness-90 transition-all"
                  title={t.os_nav_next_tooltip}
                >
                  <span className="hidden sm:inline" style={{ color: "#1a1512" }}>{t.os_nav_next}</span>
                  <span className="sm:hidden" style={{ color: "#1a1512" }}>{language === "en" ? "Next" : "Lanjut"}</span>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command palette Ctrl+K */}
      <OSCommandPalette
        open={paletteOpen}
        apps={APPS.map((a) => ({ id: a.id, label: getAppFilename(a.id), icon: a.icon }))}
        actions={paletteActions}
        language={language}
        onSelectApp={(id) => switchApp(id as AppId)}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Fixed Start Menu Popup (Placed at root level so it is NEVER clipped by taskbar) */}
      {startOpen && (
        <>
          {/* Backdrop for outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setStartOpen(false);
              setThemeMenuOpen(false);
              setMenuQuery("");
            }}
          />

          {/* Start Menu Window */}
          <div
            className="fixed left-1.5 sm:left-3 bottom-9 sm:bottom-11 w-64 max-w-[calc(100vw-1rem)] vt-window bg-[var(--vt-chrome)] text-foreground text-xs shadow-2xl z-50 flex flex-row overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Left Blue Gradient Sidebar (Dikosongkan sesuai instruksi) */}
            <div className="w-5 sm:w-6 bg-gradient-to-t from-[var(--vt-navy)] via-[var(--vt-blue)] to-[#7c5cff] select-none shrink-0" />

            {/* Menu Items List */}
            <div className="flex-1 p-1 space-y-0.5 font-mono overflow-y-auto max-h-[75vh]">
              <div className="px-2 py-1.5 bg-muted/60 mb-1 border-b border-border/60">
                <p className="font-bold text-foreground truncate">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  {t.os_start_title}
                </p>
              </div>

              <div className="px-1 pb-1">
                <input
                  type="text"
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  placeholder={language === "en" ? "Search apps..." : "Cari aplikasi..."}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-muted/60 border border-border/60 rounded-xs outline-none placeholder:text-muted-foreground focus:border-[var(--vt-blue)]"
                />
              </div>

              {APPS.filter((app) =>
                getAppFilename(app.id).toLowerCase().includes(menuQuery.trim().toLowerCase())
              ).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    switchApp(app.id);
                    setStartOpen(false);
                    setMenuQuery("");
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer ${
                    activeApp === app.id ? "bg-[var(--vt-blue)]/20 font-bold text-[var(--vt-blue)]" : ""
                  }`}
                >
                  <span className="shrink-0">{app.icon}</span>
                  <span className="font-bold">{getAppFilename(app.id)}</span>
                </button>
              ))}

              <div className="h-px bg-[#9a968e] my-1 shadow-[0_1px_0_#fff]" />

              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => {
                  setLanguage(language === "id" ? "en" : "id");
                  setStartOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-sky-500" />
                  <span>{language === "id" ? "Bahasa (ID)" : "Language (EN)"}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">
                  {language.toUpperCase()}
                </span>
              </button>

              {/* Sound Toggle (persist localStorage, dibaca boot beep) */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  try {
                    window.localStorage?.setItem("sigitos_sound", next ? "on" : "off");
                  } catch {
                    // abaikan bila storage diblokir
                  }
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {soundOn ? (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{language === "en" ? "Sound" : "Suara"}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">
                  {soundOn ? "ON" : "OFF"}
                </span>
              </button>

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
                    {THEMES.map((th) => (
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
        </>
      )}

      {/* Bottom Taskbar (Windows 95/98 Classic OS Taskbar) */}
      <div className="vt-taskbar h-10 sm:h-12 md:h-14 px-1.5 sm:px-3 md:px-4 flex items-center justify-between gap-1 border-t-2 border-border select-none z-30 shrink-0 overflow-hidden">
        {/* Left Side: Windows Start Button + Separator + Open Windows Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
          {/* 1. Classic Windows 95/98 Start Button — proporsional di mobile */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setStartOpen(!startOpen);
                setThemeMenuOpen(false);
              }}
              className={`vt-btn px-2.5 sm:px-4 py-1 sm:py-1.5 md:py-2 text-[11px] sm:text-xs md:text-sm font-bold flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none transition-all duration-200 group ${
                startOpen
                  ? "vt-btn-inset bg-[var(--vt-card)] translate-y-0.5"
                  : "vt-btn-chrome text-foreground hover:scale-105"
              }`}
              title={t.os_start_btn}
            >
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5 sm:w-5 sm:h-5 md:w-5 md:h-5 p-0.5 bg-black/20 rounded-xs group-hover:rotate-12 transition-transform shrink-0">
                <span className="bg-red-500 rounded-xs" />
                <span className="bg-green-500 rounded-xs" />
                <span className="bg-blue-500 rounded-xs" />
                <span className="bg-yellow-400 rounded-xs" />
              </div>
              <span className="hidden sm:inline font-pixel text-xs md:text-[13px] tracking-wide font-bold">{t.os_start_btn}</span>
            </button>
          </div>

          {/* Retro Taskbar Separator */}
          <div className="h-7 sm:h-8 md:h-10 w-[2px] bg-[#5a5750] shadow-[1px_0_0_#fff] mx-0.5 sm:mx-2 shrink-0" />

          {/* Open windows taskbar buttons (Icon-only on mobile so ALL items fit without overflow; Icon + Text on md+) */}
          <div className="flex items-center gap-0.5 sm:gap-2 overflow-hidden min-w-0 flex-1 pr-0.5 sm:pr-2">
            {APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => switchApp(app.id)}
                title={
                  activeApp === app.id && isMinimized
                    ? `${getAppFilename(app.id)} (${language === "en" ? "minimized — click to restore" : "minimize — klik untuk pulihkan"})`
                    : getAppFilename(app.id)
                }
                aria-label={getAppFilename(app.id)}
                className={`vt-taskbar-tab group relative h-6 sm:h-9 md:h-10 px-1 sm:px-3 text-[9px] sm:text-[11px] md:text-xs flex items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer shrink-0 transition-all duration-300 ${
                  activeApp === app.id
                    ? `active shadow-md ring-2 font-extrabold -translate-y-0.5 ${app.activeClass} ${
                        isMinimized ? "opacity-70 ring-dashed animate-pulse" : ""
                      }`
                    : `text-foreground font-semibold opacity-85 hover:opacity-100 ${app.colorClass}`
                }`}
              >
                <span className="shrink-0">{app.icon}</span>
                <span className="hidden md:inline truncate max-w-[100px] lg:max-w-none">
                  {getAppFilename(app.id)}
                </span>
                {activeApp === app.id && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-current rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* System Status on Bottom Right */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 text-[9px] sm:text-xs md:text-sm font-mono font-bold shrink-0 pl-1 sm:pl-3 md:pl-4">
          <span className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          <span className="hidden sm:inline text-[#065f46] dark:text-[#6ee7b7]">{t.os_status_online}</span>
        </div>
      </div>
    </div>
  );
}
