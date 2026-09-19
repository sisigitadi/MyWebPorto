"use client";

import React, {
  useState,
  useEffect,
  useInsertionEffect,
  useRef,
} from "react";
import {
  User,
  Briefcase,
  FolderGit2,
  Package,
  MessageSquareQuote,
  Mail,
  Terminal,
  ChevronRight,
  ArrowUp,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  X,
  Palette,
  RotateCcw,
  Globe,
  FileText,
} from "lucide-react";
import { ProfileData, ServiceData, ProjectData, ProductData, TestimonialData, ArticleData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { appFilename, appHumanLabel, type AppId, type OSAppConfig } from "@/lib/os-apps-meta";
import { useOSTheme, OSTheme } from "./theme-context";
import { useFeature } from "@/lib/features-context";
import { playOS } from "@/lib/os-sound";
import { HeroSection } from "@/components/public/hero-section";
import { ServicesSection } from "@/components/public/services-section";
import { FeaturedProjectsSection } from "@/components/public/featured-projects-section";
import { ProductsSection } from "@/components/public/products-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ArticlesSection } from "@/components/public/articles-section";
import { ContactSection } from "@/components/public/contact-section";
import { OSCrtTerminal } from "@/components/public/os/os-crt-terminal";
import { OSCommandPalette, PaletteAction } from "@/components/public/os/os-command-palette";
import { ScrollFade } from "@/components/public/os/os-scroll-fade";
import { setGsapScroller } from "@/lib/gsap-scroller";

interface OSDesktopManagerProps {
  profile: ProfileData;
  services: ServiceData[];
  projects: ProjectData[];
  products: ProductData[];
  testimonials: TestimonialData[];
  articles: ArticleData[];
  /**
   * Konfigurasi app dari /admin/appearance (settings.os_apps): app mana saja
   * yang aktif dan urutannya. Diisi oleh server component (public)/page.tsx;
   * bila belum diatur, server mengirim default 8 app. Ikon & warna tetap di
   * kode — yang bisa diatur admin hanya "aktif/tidak" dan urutannya.
   */
  appsConfig: OSAppConfig[];
}

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
    activeClass: "text-[#ea580c] dark:text-[#fb923c] bg-[#ea580c]/15 dark:bg-[#fb923c]/15 ring-[#ea580c]/50 dark:ring-[#ea580c]/50",
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
    activeClass: "text-[#7c3aed] dark:text-[#a78bfa] bg-[#7c3aed]/15 dark:bg-[#a78bfa]/15 ring-[#7c3aed]/50 dark:ring-[#7c3aed]/50",
  },
  {
    id: "kontak",
    icon: <Mail className="h-[22px] w-[22px] text-[#e11d48] dark:text-[#fb7185] shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.2} />,
    number: 8,
    colorClass: "hover:bg-[#e11d48]/10 hover:text-[#e11d48] dark:hover:bg-[#fb7185]/10 dark:hover:text-[#fb7185]",
    activeClass: "text-[#e11d48] dark:text-[#fb7185] bg-[#e11d48]/15 dark:bg-[#fb7185]/15 ring-[#e11d48]/50 dark:ring-[#e11d48]/50",
  },
];

export function OSDesktopManager({
  profile,
  services,
  projects,
  products,
  testimonials,
  articles,
  appsConfig,
}: OSDesktopManagerProps) {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useOSTheme();
  const [mounted, setMounted] = useState(false);
  const [activeApp, setActiveApp] = useState<AppId>("profil");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  // Mode tampilan: "mobile" = single-page scroll (<768px), "desktop" =
  // window manager tab (>=768px). Sengaja memakai breakpoint md Tailwind
  // (768px) agar sinkron dengan utility hidden/md:flex di JSX.
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("desktop");

  // Feature flag (settings.features): matikan app Terminal/Artikel tanpa
  // menyentuh /admin/appearance. Satu flag "asisten AI retro" mengikat app
  // Terminal + widget RetroBot + endpoint /api/retrobot + askSigitBot
  // (titik-titik lain digate di task masing-masing).
  const enableTerminal = useFeature("enable_terminal");
  const enableArticles = useFeature("enable_articles");

  // App yang BENAR-BENAR ditampilkan: filter feature flag + filter enabled +
  // urut dari appsConfig, digabung dengan metadata visual (ikon/warna) dari
  // APPS. `number` diisi ulang dari posisi agar titlebar "[n/total]" selalu
  // konsisten dengan urutan yang diatur admin — angka statis di APPS hanya
  // untuk bacaan kode.
  const apps = React.useMemo<AppItem[]>(() => {
    const meta = new Map(APPS.map((a) => [a.id, a]));
    // Feature flag diletakkan SEBELUM filter enabled sehingga taskbar, start
    // menu, command palette, dan tab mobile (semuanya membaca daftar ini)
    // otomatis ikut mati.
    const gated = appsConfig.filter((c) => {
      if (c.id === "terminal" && !enableTerminal) return false;
      if (c.id === "artikel" && !enableArticles) return false;
      return true;
    });
    const list = gated
      .filter((c) => c.enabled && meta.has(c.id))
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...meta.get(c.id)!, number: i + 1 }));
    // Pengaman terakhir: resolveOSApps() di server menjamin daftar tidak pernah
    // kosong, tapi komponen ini tidak boleh runtuh walau menerima props aneh —
    // kembali ke daftar lengkap (yang sudah digate flag) daripada merender
    // tanpa app sama sekali, atau merender app yang seharusnya dimatikan.
    if (list.length) return list;
    return APPS.filter(
      (a) =>
        (a.id !== "terminal" || enableTerminal) &&
        (a.id !== "artikel" || enableArticles)
    );
  }, [appsConfig, enableTerminal, enableArticles]);

  // Urutan section mode mobile = urutan app aktif. Sebelumnya daftar ini
  // hardcode terpisah (SCROLL_SECTIONS) sehingga bisa beda dengan urutan
  // taskbar/start menu — sekarang keduanya turun dari satu sumber (appsConfig).
  const scrollSections = React.useMemo<AppId[]>(() => apps.map((a) => a.id), [apps]);

  // Pengaman: bila app yang sedang terbuka dimatikan admin (props berganti
  // tanpa remount), kembalikan ke app aktif pertama. Tanpa ini, currentApp
  // jadi undefined dan titlebar/taskbar runtuh. Server menjamin apps tidak
  // pernah kosong, jadi apps[0] selalu ada.
  useEffect(() => {
    if (apps.length && !apps.some((a) => a.id === activeApp)) {
      setActiveApp(apps[0].id);
      setIsMinimized(false);
    }
  }, [apps, activeApp]);

  // Ref container scroll window (desktop) — dideklarasikan di atas agar semua
  // callback di bawah mereferensikan binding yang sudah diinisialisasi.
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Preferensi suara dibaca SETELAH mount — useState initializer yang membaca
  // localStorage membuat render pertama server vs klien berbeda (hydration mismatch).
  useEffect(() => {
    try {
      setSoundOn(window.localStorage?.getItem("sigitos_sound") !== "off");
    } catch {
      // Storage diblokir — pakai default ON
    }
  }, []);

  // Deteksi mode viewport (md = 768px, sinkron dengan utility Tailwind).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      setViewMode(mq.matches ? "desktop" : "mobile");
    };
    apply();
    mq.addEventListener("change", apply);
    setMounted(true);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const currentIndex = apps.findIndex((a) => a.id === activeApp);
  const currentApp = apps[currentIndex] || apps[0];

  // =================== MODE DESKTOP (window manager) ===================

  const switchApp = React.useCallback((id: AppId, updateUrl = true) => {
    playOS("nav");
    setActiveApp(id);
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (updateUrl && typeof window !== "undefined") {
      const hash = id === "profil" ? "" : "#" + id;
      const search = window.location.search;
      const newUrl = window.location.pathname + search + hash;
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", newUrl || window.location.pathname);
      }
    }
  }, []);

  const handleNext = React.useCallback(() => {
    playOS("nav");
    setActiveApp((curr) => {
      const idx = apps.findIndex((a) => a.id === curr);
      const nextIdx = (idx + 1) % apps.length;
      return apps[nextIdx].id;
    });
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [apps]);

  const handlePrev = React.useCallback(() => {
    playOS("nav");
    setActiveApp((curr) => {
      const idx = apps.findIndex((a) => a.id === curr);
      const prevIdx = (idx - 1 + apps.length) % apps.length;
      return apps[prevIdx].id;
    });
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [apps]);

  // Infinite scroll antar jendela (desktop saja).
  useEffect(() => {
    if (viewMode !== "desktop") return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (activeApp === "terminal") return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 0;
      const atTop = el.scrollTop <= 0;
      if (Math.abs(e.deltaY) < 4) return;

      if (e.deltaY > 0 && atBottom) {
        e.preventDefault();
        handleNext();
      } else if (e.deltaY < 0 && atTop) {
        e.preventDefault();
        handlePrev();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [activeApp, handleNext, handlePrev, viewMode]);

  // Keyboard navigation (desktop saja).
  useEffect(() => {
    if (viewMode !== "desktop") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (active instanceof HTMLElement && active.isContentEditable) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        // Posisi mengikuti urutan app aktif (bisa diatur admin), bukan APPS
        // statis — angka 3 tidak selalu = "proyek".
        if (apps[idx]) {
          e.preventDefault();
          switchApp(apps[idx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [apps, handleNext, handlePrev, switchApp, viewMode]);

  // Command palette: Ctrl+K / Cmd+K (bekerja walau fokus di input).
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

  // Hash routing: dibaca saat mount + saat berubah (deep link share).
  useEffect(() => {
    const aliasMap: Record<string, AppId> = {
      profil: "profil", profile: "profil", hero: "profil", about: "profil",
      layanan: "layanan", services: "layanan",
      proyek: "proyek", projects: "proyek",
      toko: "toko", produk: "toko", store: "toko", products: "toko",
      testimoni: "testimoni", testimonials: "testimoni", reviews: "testimoni",
      artikel: "artikel", articles: "artikel", blog: "artikel",
      kontak: "kontak", contact: "kontak",
      terminal: "terminal",
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      // Hanya buka app yang aktif. Deep link ke app yang sedang dimatikan
      // admin tidak boleh menjebak tampilan di luar daftar — biarkan guard
      // effect yang memilih app aktif pertama.
      if (hash && aliasMap[hash] && apps.some((a) => a.id === aliasMap[hash])) {
        switchApp(aliasMap[hash], false);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [apps, switchApp]);

  // =================== MODE MOBILE (single-page scroll) ===================

  const mobileScrollRef = useRef<HTMLDivElement>(null);
  // Section ID -> sectionRef untuk scroll-to via taskbar/bot.
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll-spy mobile: tandai section yang paling terlihat sebagai app
  // aktif. Memakai scroll listener + hitung posisi (bukan IntersectionObserver
  // yang berbasis rasio) — deterministik untuk section yang jauh lebih tinggi
  // dari viewport, dan tidak bergantung jadwal callback IO di WebView.
  useEffect(() => {
    if (viewMode !== "mobile") return;
    const root = mobileScrollRef.current;
    if (!root) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      // Garis fokus: ~35% tinggi container dari tepi atasnya. Section dianggap
      // "aktif" bila TEPinya sudah naik melewati garis ini di ruang konten.
      // Konversi: posisi tepi section di viewport = offsetTop - scrollTop,
      // jadi syaratnya offsetTop <= scrollTop + focusOffset. (Versi awal
      // salah membandingkan offsetTop dengan garis viewport tanpa scrollTop
      // → sisi kanan konstan → label taskbar tidak pernah berganti.)
      const focusOffset = Math.min(root.clientHeight * 0.35, 220);
      const children = sectionRefs.current;
      let current: AppId | null = null;
      // Pilih section TERAKHIR yang top-nya sudah melewati garis fokus.
      for (const id of scrollSections) {
        const el = children[id];
        if (!el) continue;
        if (el.offsetTop <= root.scrollTop + focusOffset) {
          current = id;
        } else {
          break;
        }
      }
      // Fallback: belum ada yang lewat garis → section pertama yang terlihat.
      if (!current) {
        for (const id of scrollSections) {
          const el = children[id];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom > root.getBoundingClientRect().top) {
            current = id;
            break;
          }
        }
      }
      if (current) setActiveApp(current);
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [viewMode, mounted, scrollSections]);

  // Scroll ke section tertentu (mode mobile) — dipakai taskbar & event bot.
  const scrollToSection = React.useCallback((id: AppId) => {
    if (viewMode !== "mobile") return;
    const el = sectionRefs.current[id];
    const root = mobileScrollRef.current;
    if (!el || !root) return;
    playOS("nav");
    setActiveApp(id);
    root.scrollTo({ top: el.offsetTop - 4, behavior: "smooth" });
  }, [viewMode]);

  // Membuka Terminal. Di desktop = jendela biasa (switchApp). Di mobile =
  // scroll ke section Terminal (sama seperti section lain). TIDAK boleh memaksa
  // setViewMode("desktop") — matchMedia listener hanya memantau event "change"
  // (resize), jadi viewMode nyangkut "desktop" → taskbar desktop (8 ikon)
  // dirender di layar kecil & single-page scroll hilang (bug "harus buka tab
  // baru").
  const openTerminal = React.useCallback(() => {
    if (viewMode === "mobile") {
      scrollToSection("terminal");
    } else {
      switchApp("terminal");
    }
  }, [viewMode, scrollToSection, switchApp]);

  // Ref callback container scroll: selain menyimpan ref, daftarkan elemen ini
  // sebagai scroller GSAP ScrollTrigger.
  const bindMobileScroller = React.useCallback((el: HTMLDivElement | null) => {
    mobileScrollRef.current = el;
    setGsapScroller(el);
  }, []);

  const bindDesktopScroller = React.useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
    setGsapScroller(el);
  }, []);

  // PENTING — urutan commit React vs GSAP:
  // ScrollTrigger membaca scroller dari ScrollTrigger.defaults() saat trigger
  // DIBUAT (lihat _setDefaults(vars, _defaults) di ScrollTrigger.js). Trigger
  // section dibuat di useGSAP = useLayoutEffect. React menjalankan layout
  // effect ANAK sebelum INDUK, sementara ref callback container (induk) baru
  // berjalan di akhir fase layout — terlambat. Akibatnya di produksi (tanpa
  // double-invoke StrictMode dev) semua trigger section terikat ke window/
  // document, yang tidak pernah scroll di mode ini → toggleActions "play"
  // tidak pernah memicu → kartu menetap di opacity 0 (gsap.from) → section
  // tampak "blank putih" setelah judul+deskripsi.
  //
  // useInsertionEffect berjalan di fase mutation — sebelum SELURUH layout
  // effect — dan saat ia jalan node container sudah terpasang di DOM. Ref
  // belum terisi di fase ini, jadi kita ambil elemen lewat atribut data yang
  // spesifik per mode (tidak ambigu saat kedua mode transit pada resize).
  useInsertionEffect(() => {
    if (!mounted) return;
    const sel =
      viewMode === "mobile"
        ? "[data-gsap-scroller='mobile']"
        : "[data-gsap-scroller='desktop']";
    const el = document.querySelector(sel);
    if (el instanceof HTMLDivElement) setGsapScroller(el);
  }, [viewMode, mounted]);

  // Jembatan lintas-mode: event "switch-os-app" (dari RetroBot, hero CONTACT,
  // terminal) → desktop switchApp, mobile scrollToSection.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AppId>).detail;
      if (!detail) return;
      // Abai-bila app yang diminta sedang dimatikan admin — tidak ada jendela
      // yang bisa dibuka, dan setActiveApp ilegal akan diluruskan ke apps[0]
      // oleh guard effect (kedip singkat). Lebih baik diam di tempat.
      if (!apps.some((a) => a.id === detail)) return;
      if (viewMode === "mobile") {
        // Semua app (termasuk terminal) adalah section scroll — tidak ada
        // layer terpisah yang harus ditutup/dibuka, viewMode tidak diubah.
        scrollToSection(detail);
      } else {
        switchApp(detail);
      }
    };
    window.addEventListener("switch-os-app", handler);
    return () => window.removeEventListener("switch-os-app", handler);
  }, [apps, viewMode, switchApp, scrollToSection]);

  // Saat resize melewati breakpoint, posisikan scroll mobile ke section yang
  // sama dengan window yang terbuka di desktop. Hanya bergantung viewMode —
  // BUKAN activeApp (scroll-spy terus memutakhirkan activeApp saat user
  // scroll; efek yang bergantung padanya akan "melawan" scroll pengguna).
  const lastDesktopAppRef = useRef<AppId>("profil");
  useEffect(() => {
    if (activeApp !== "terminal") lastDesktopAppRef.current = activeApp;
  }, [activeApp]);

  useEffect(() => {
    if (viewMode !== "mobile") return;
    const id = lastDesktopAppRef.current;
    const raf = requestAnimationFrame(() => {
      const el = sectionRefs.current[id];
      const root = mobileScrollRef.current;
      if (el && root) root.scrollTop = el.offsetTop - 4;
    });
    return () => cancelAnimationFrame(raf);
  }, [viewMode]);

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

  // =================== RENDER ===================

  // Sebelum mount + deteksi viewport: render kerangka netral (mencegah
  // hydration mismatch dan flash konten salah mode).
  if (!mounted) {
    return (
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative select-none">
        <div className="flex-1 flex items-center justify-center">
          <div className="vt-window px-6 py-4 font-mono text-xs font-bold text-[var(--vt-ink)]">
            SIGIT_KERNEL :: initializing display ...
          </div>
        </div>
      </div>
    );
  }

  // ===== MODE MOBILE: single-page scroll =====
  if (viewMode === "mobile") {
    const activeAppItem = apps.find((a) => a.id === activeApp) || apps[0];

    return (
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative select-none">
        <div
          ref={bindMobileScroller}
          data-gsap-scroller="mobile"
          // Sama seperti body window mode desktop (lihat bawah): kanvas section
          // harus --vt-paper + --vt-ink. Tanpa ini, background jatuh ke
          // body{--vt-desktop} (navy gelap) → judul section ber-teks --vt-ink
          // (nyaris hitam) tak terlihat di latar biru.
          className="flex-1 overflow-y-auto vt-scrollbar overscroll-contain relative bg-[var(--vt-paper)] text-[var(--vt-ink)]"
        >
          <div className="p-1.5 space-y-1.5">
            {scrollSections.map((id) => (
              <section
                key={id}
                data-app-id={id}
                ref={(el) => {
                  sectionRefs.current[id] = el;
                }}
                className="scroll-mt-1"
              >
                {id === "profil" && <HeroSection profile={profile} />}
                {id === "layanan" && <ServicesSection services={services} profile={profile} />}
                {id === "proyek" && <FeaturedProjectsSection projects={projects} />}
                {id === "toko" && <ProductsSection products={products} profile={profile} />}
                {id === "artikel" && <ArticlesSection articles={articles} />}
                {id === "terminal" && (
                  // Terminal sebagai section baca (bukan overlay): kartu
                  // ber-height tetap biar pengguna bisa scroll melewatinya.
                  // Tinggi tetap penting — tanpanya, panel interaktif akan
                  // tumbuh seiring output dan memakan seluruh dokumen.
                  <div className="rounded-xs border-2 border-border bg-[var(--vt-desktop)] overflow-hidden shadow-md">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--vt-card)] border-b-2 border-border font-mono text-[10px] font-bold">
                      <span className="shrink-0">
                        {apps.find((a) => a.id === "terminal")?.icon}
                      </span>
                      <span className="truncate">{appFilename("terminal", language)}</span>
                      <span className="ml-auto opacity-60 font-normal hidden xs:inline">
                        {language === "en" ? "type “help”" : "ketik “help”"}
                      </span>
                    </div>
                    <div className="h-[60vh] min-h-[300px]">
                      <OSCrtTerminal
                        ownerName={profile.name}
                        profile={profile}
                        services={services}
                        projects={projects}
                        articles={articles}
                        fullscreen
                      />
                    </div>
                  </div>
                )}
                {id === "testimoni" && <TestimonialsSection testimonials={testimonials} />}
                {id === "kontak" && <ContactSection profile={profile} />}
              </section>
            ))}

            {/* Penutup retro: EOF marker + tombol kembali ke awal dokumen.
                Sebelumnya hanya ada teks "ketuk ikon taskbar" — taskbar mobile
                cuma menampilkan SATU ikon (section aktif), jadi petunjuk itu
                membingungkan. Tombol di bawah ini bekerja di mana pun. */}
            <div className="pt-3 pb-5 flex flex-col items-center gap-2 font-mono text-[10px] font-bold text-[var(--vt-ink)]">
              <span className="opacity-60">
                {language === "en" ? "— END OF DOCUMENT —" : "— AKHIR DOKUMEN —"}
              </span>
              <button
                type="button"
                onClick={() => {
                  playOS("nav");
                  // apps[0] (bukan hardcode "profil") — section paling atas
                  // bergantung urutan yang diatur admin.
                  setActiveApp(apps[0].id);
                  mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label={language === "en" ? "Back to top" : "Kembali ke atas"}
                className="vt-btn vt-btn-chrome px-3 py-1.5 rounded-xs flex items-center gap-1.5 cursor-pointer select-none"
              >
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                <span>{language === "en" ? "BACK TO TOP" : "KEMBALI KE ATAS"}</span>
              </button>
              <span className="opacity-50 font-normal text-center px-4">
                {language === "en"
                  ? "or tap the Start button to jump to any section"
                  : "atau ketuk tombol Start untuk lompat ke section mana pun"}
              </span>
            </div>
          </div>
        </div>

        {/* Taskbar mobile: Start + SATU ikon section aktif (scroll-spy) */}
        <div className="vt-taskbar h-10 px-1.5 flex items-center justify-between gap-1 border-t-2 border-border select-none z-30 shrink-0 overflow-hidden">
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {/* Start button (compact, mobile) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStartOpen(!startOpen);
                  setThemeMenuOpen(false);
                }}
                className={`vt-btn px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer select-none transition-all duration-200 group ${
                  startOpen
                    ? "vt-btn-inset bg-[var(--vt-card)] translate-y-0.5"
                    : "vt-btn-chrome text-foreground hover:scale-105"
                }`}
                title={t.os_start_btn}
              >
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4 p-0.5 bg-black/20 rounded-xs group-hover:rotate-12 transition-transform shrink-0">
                  <span className="bg-red-500 rounded-xs" />
                  <span className="bg-green-500 rounded-xs" />
                  <span className="bg-blue-500 rounded-xs" />
                  <span className="bg-yellow-400 rounded-xs" />
                </div>
              </button>
            </div>

            <div className="h-6 w-[2px] bg-[#5a5750] shadow-[1px_0_0_#fff] mx-0.5 shrink-0" />

            {/* SATU tab section aktif: ketuk = kembali ke atas section itu */}
            <button
              type="button"
              onClick={() => scrollToSection(activeAppItem.id)}
              title={`${appFilename(activeAppItem.id, language)} — ${language === "en" ? "tap to scroll to top of section" : "ketuk untuk kembali ke atas section"}`}
              aria-label={appFilename(activeAppItem.id, language)}
              className={`vt-taskbar-tab group relative h-7 px-2 text-[10px] flex items-center justify-center gap-1 cursor-pointer shrink-0 transition-all duration-300 active shadow-md ring-2 font-extrabold -translate-y-0.5 ${activeAppItem.activeClass}`}
            >
              <span className="shrink-0">{activeAppItem.icon}</span>
              <span className="leading-none">{appHumanLabel(activeAppItem.id, language)}</span>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-current rounded-full animate-pulse" />
            </button>
          </div>

          {/* Status kanan */}
          <div className="flex items-center gap-1 text-[9px] font-mono font-bold shrink-0 pl-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            <span className="hidden xs:inline text-[#065f46] dark:text-[#6ee7b7]">{t.os_status_online}</span>
          </div>
        </div>

        {/* Start Menu (dipakai bersama dengan mode desktop — komponen inline) */}
        {startOpen && (
          <StartMenuMobile
            profile={profile}
            apps={apps}
            close={() => {
              setStartOpen(false);
              setThemeMenuOpen(false);
              setMenuQuery("");
            }}
            onOpenTerminal={() => {
              setStartOpen(false);
              openTerminal();
            }}
            onScrollTo={(id) => {
              setStartOpen(false);
              scrollToSection(id);
            }}
            language={language}
            setLanguage={setLanguage}
            soundOn={soundOn}
            setSoundOn={(v) => {
              setSoundOn(v);
              try {
                window.localStorage?.setItem("sigitos_sound", v ? "on" : "off");
              } catch {
                // abaikan
              }
            }}
            theme={theme}
            setTheme={setTheme}
          />
        )}

        {/* Command palette Ctrl+K */}
        <OSCommandPalette
          open={paletteOpen}
          apps={apps.map((a) => ({ id: a.id, label: appFilename(a.id, language), icon: a.icon }))}
          actions={paletteActions}
          language={language}
          onSelectApp={(id) => {
            if (id === "terminal") {
              openTerminal();
            } else {
              scrollToSection(id as AppId);
            }
          }}
          onClose={() => setPaletteOpen(false)}
        />

      </div>
    );
  }

  // ===== MODE DESKTOP: window manager tab (perilaku lama penuh) =====
  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative select-none">
      <div className="flex-1 flex overflow-hidden p-1 sm:p-2 md:p-4 gap-1.5 sm:gap-3 relative">
        <div className="hidden lg:flex flex-col gap-2 shrink-0 z-10 w-24 py-1">
          {apps.map((app) => (
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
                {appFilename(app.id, language)}
              </span>
            </button>
          ))}
        </div>

        {/* Center: The Active OS Application Window */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 z-20">
          {activeApp === "terminal" ? (
            <div key="terminal-fullscreen" className="vt-window vt-crt-on flex flex-col h-full">
              {!isMinimized && (
                <OSCrtTerminal
                  ownerName={profile.name}
                  profile={profile}
                  services={services}
                  projects={projects}
                  articles={articles}
                  fullscreen
                />
              )}
            </div>
          ) : (
          <div
            key={activeApp}
            className={`vt-window flex flex-col h-full vt-crt-on transition-all duration-150 relative ${
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
                  <span className="hidden sm:inline">SigitOS_Viewer :: </span>[{currentApp.number}/{apps.length}] {appFilename(currentApp.id, language)}
                </span>
              </div>

              {/* Titlebar window controls */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    playOS(isMinimized ? "maximize" : "minimize");
                    setIsMinimized(!isMinimized);
                  }}
                  className="vt-titlebar-btn"
                  title={isMinimized ? "Restore" : "Minimize"}
                  aria-label="Minimize"
                >
                  <Minimize2 className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playOS("maximize");
                    setIsMaximized(!isMaximized);
                  }}
                  className="vt-titlebar-btn"
                  title={isMaximized ? "Normal" : "Maximize"}
                  aria-label="Maximize"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playOS("minimize");
                    setIsMinimized(true);
                  }}
                  className="vt-titlebar-btn hover:bg-rose-500 hover:text-white"
                  title="Close to taskbar"
                  aria-label="Close"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* 2. Window Body Canvas (Internal Scroll) */}
            {!isMinimized && (
              <div
                ref={bindDesktopScroller}
                data-gsap-scroller="desktop"
                className="flex-1 overflow-y-auto vt-scrollbar bg-[var(--vt-paper)] text-[var(--vt-ink)] p-2 sm:p-3 md:p-6"
              >
                {activeApp === "profil" && <HeroSection profile={profile} />}
                {activeApp === "layanan" && (
                  <ServicesSection services={services} profile={profile} />
                )}
                {activeApp === "proyek" && (
                  <FeaturedProjectsSection projects={projects} />
                )}
                {activeApp === "toko" && <ProductsSection products={products} profile={profile} />}
                {activeApp === "testimoni" && (
                  <TestimonialsSection testimonials={testimonials} />
                )}
                {activeApp === "artikel" && (
                  <ArticlesSection articles={articles} />
                )}
                {activeApp === "kontak" && <ContactSection profile={profile} />}
              </div>
            )}

            {/* 2b. Continuation signifier: gradien di tepi bawah body window */}
            {!isMinimized && (
              <ScrollFade containerRef={scrollContainerRef} />
            )}
          </div>
          )}
        </div>
      </div>

      {/* Command palette Ctrl+K */}
      <OSCommandPalette
        open={paletteOpen}
        apps={apps.map((a) => ({ id: a.id, label: appFilename(a.id, language), icon: a.icon }))}
        actions={paletteActions}
        language={language}
        onSelectApp={(id) => switchApp(id as AppId)}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Fixed Start Menu Popup */}
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
          <div className="fixed left-1.5 sm:left-3 bottom-9 sm:bottom-11 w-64 max-w-[calc(100vw-1rem)] vt-window bg-[var(--vt-chrome)] text-foreground text-xs shadow-2xl z-50 flex flex-row overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Left Blue Gradient Sidebar */}
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

              {apps.filter((app) =>
                appFilename(app.id, language).toLowerCase().includes(menuQuery.trim().toLowerCase())
              ).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    if (app.id === "terminal") {
                      switchApp("terminal");
                    } else {
                      // Di desktop: buka window; mobile tidak memakai start menu ini.
                      switchApp(app.id);
                    }
                    setStartOpen(false);
                    setMenuQuery("");
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer ${
                    activeApp === app.id ? "bg-[var(--vt-blue)]/20 font-bold text-[var(--vt-blue)]" : ""
                  }`}
                >
                  <span className="shrink-0">{app.icon}</span>
                  <span className="font-bold">{appFilename(app.id, language)}</span>
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

              {/* Sound Toggle */}
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
        {/* Left Side: Start Button + Separator + Open Windows Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
          {/* 1. Classic Start Button */}
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

          {/* Open windows taskbar buttons */}
          <div className="flex items-center gap-0.5 sm:gap-2 overflow-hidden min-w-0 flex-1 pr-0.5 sm:pr-2">
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => switchApp(app.id)}
                title={
                  activeApp === app.id && isMinimized
                    ? `${appFilename(app.id, language)} (${language === "en" ? "minimized — click to restore" : "minimize — klik untuk pulihkan"})`
                    : appFilename(app.id, language)
                }
                aria-label={appFilename(app.id, language)}
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
                  {appFilename(app.id, language)}
                </span>
                <span className="md:hidden text-[9px] leading-none">
                  {appHumanLabel(app.id, language)}
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

// ===================== Start Menu versi mobile =====================
// Dipisah agar JSX utama tidak terlalu panjang; perilaku identik dengan
// start menu desktop tapi item aplikasi = scroll ke section, dan Terminal
// membuka mode desktop window (satu-satunya app non-scroll).

interface StartMenuMobileProps {
  profile: ProfileData;
  /** Hanya app aktif (sudah difilter & diurutkan oleh induk). */
  apps: AppItem[];
  close: () => void;
  onOpenTerminal: () => void;
  onScrollTo: (id: AppId) => void;
  language: "id" | "en";
  setLanguage: (l: "id" | "en") => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  theme: OSTheme;
  setTheme: (t: OSTheme) => void;
}

function StartMenuMobile({
  profile,
  apps,
  close,
  onOpenTerminal,
  onScrollTo,
  language,
  setLanguage,
  soundOn,
  setSoundOn,
  theme,
  setTheme,
}: StartMenuMobileProps) {
  const { t } = useTranslation();
  const [menuQuery, setMenuQuery] = useState("");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div className="fixed left-1.5 bottom-9 w-[calc(100vw-0.75rem)] max-w-64 vt-window bg-[var(--vt-chrome)] text-foreground text-xs shadow-2xl z-50 flex flex-row overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="w-5 bg-gradient-to-t from-[var(--vt-navy)] via-[var(--vt-blue)] to-[#7c5cff] select-none shrink-0" />

        <div className="flex-1 p-1 space-y-0.5 font-mono overflow-y-auto max-h-[70vh]">
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

          {apps.filter((app) =>
            appFilename(app.id, language).toLowerCase().includes(menuQuery.trim().toLowerCase())
          ).map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                if (app.id === "terminal") {
                  onOpenTerminal();
                } else {
                  onScrollTo(app.id);
                }
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--vt-blue)] hover:text-white rounded-xs transition-colors text-left cursor-pointer ${
                app.id === "terminal" ? "" : ""
              }`}
            >
              <span className="shrink-0">{app.icon}</span>
              <span className="font-bold">{appFilename(app.id, language)}</span>
            </button>
          ))}

          <div className="h-px bg-[#9a968e] my-1 shadow-[0_1px_0_#fff]" />

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => {
              setLanguage(language === "id" ? "en" : "id");
              close();
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

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
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
                      close();
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
  );
}

