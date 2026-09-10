"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Language = "id" | "en";

export interface Translations {
  hero_cta_contact: string;
  // Navigation & Header
  nav_home: string;
  nav_projects: string;
  nav_services: string;
  nav_products: string;
  nav_testimonials: string;
  nav_contact: string;
  nav_admin_panel: string;
  nav_contact_me: string;

  // OS Menubar & Start Menu
  os_start_btn: string;
  os_start_title: string;
  os_start_profile: string;
  os_start_services: string;
  os_start_projects: string;
  os_start_store: string;
  os_start_testimonials: string;
  os_start_contact: string;
  os_start_theme: string;
  os_start_admin: string;
  os_start_reboot: string;
  os_lang_tooltip: string;
  os_theme_tooltip: string;

  // Desktop Manager & Apps
  app_profile: string;
  app_services: string;
  app_projects: string;
  app_store: string;
  app_testimonials: string;
  app_contact: string;
  app_terminal: string;
  os_nav_prev: string;
  os_nav_next: string;
  os_nav_page: string;
  os_nav_of: string;
  os_nav_keys: string;
  os_nav_prev_tooltip: string;
  os_nav_next_tooltip: string;
  os_window_title: string;
  os_status_online: string;

  // Boot Loader
  boot_skip_btn: string;
  boot_skip_hint: string;

  // Hero Section
  hero_available_badge: string;
  hero_verified_badge: string;
  hero_cta_projects: string;
  hero_cta_portfolio: string;
  hero_skills_label: string;
  hero_contact_heading: string;
  hero_window_title: string;
  hero_status_text: string;
  hero_stat_exp: string;
  hero_stat_projects: string;
  hero_stat_rating: string;
  hero_stat_partners: string;

  // Services Section
  services_eyebrow: string;
  services_badge: string;
  services_title: string;
  services_subtitle: string;
  services_cta: string;
  services_discuss_btn: string;

  // Projects Section
  projects_eyebrow: string;
  projects_badge: string;
  projects_title: string;
  projects_view_all: string;
  projects_featured_badge: string;
  projects_detail_btn: string;
  projects_page_badge: string;
  projects_page_title: string;
  projects_page_subtitle: string;
  projects_empty: string;
  projects_live_demo: string;
  projects_repo: string;

  // Project Detail Page
  detail_back_all: string;
  detail_published_on: string;
  detail_about_title: string;
  detail_overview_title: string;
  detail_overview_desc: string;
  detail_tech_title: string;
  detail_cta_discuss: string;
  detail_cta_box_title: string;
  detail_cta_box_desc: string;
  detail_cta_gmail: string;
  detail_cta_demo: string;
  detail_cta_repo: string;
  detail_not_found_title: string;
  detail_not_found_desc: string;
  date_locale: string;

  // Products Section
  products_eyebrow: string;
  products_badge: string;
  products_title: string;
  products_subtitle: string;
  products_cta_get: string;
  products_cta_inquire: string;

  // Testimonials Section
  testi_eyebrow: string;
  testi_badge: string;
  testi_title: string;
  testi_subtitle: string;
  testi_verified: string;

  // Contact Section
  contact_eyebrow: string;
  contact_title: string;
  contact_subtitle: string;
  contact_direct_channels_title: string;
  contact_direct_channels_desc: string;
  contact_open_gmail: string;
  contact_email_label: string;
  contact_location_label: string;
  contact_form_title: string;
  contact_form_desc: string;
  contact_name_label: string;
  contact_name_placeholder: string;
  contact_subject_label: string;
  contact_subject_placeholder: string;
  contact_message_label: string;
  contact_message_placeholder: string;
  contact_send_btn: string;

  // Terminal CRT
  terminal_title: string;
  terminal_help_skills: string;
  terminal_help_projects: string;
  terminal_help_ai: string;
  terminal_help_contact: string;
  terminal_help_clear: string;
  terminal_help_about: string;
  terminal_unknown_cmd: string;
  terminal_about_text: string;

  // Footer
  footer_brand_desc: string;
  footer_rights: string;
  footer_navigation: string;
  footer_contact_info: string;
  footer_legal: string;
  footer_back_to_top: string;
}

const translations: Record<Language, Translations> = {
  id: {
    // Navigation & Header
    nav_home: "Beranda",
    nav_projects: "Proyek",
    nav_services: "Layanan",
    nav_products: "Produk",
    nav_testimonials: "Testimoni",
    nav_contact: "Kontak",
    nav_admin_panel: "Panel Admin",
    nav_contact_me: "Hubungi Saya",

    // OS Menubar & Start Menu
    os_start_btn: "Mulai",
    os_start_title: "Program Aplikasi",
    os_start_profile: "Profil Pengembang",
    os_start_services: "Modul Layanan",
    os_start_projects: "Portofolio Proyek",
    os_start_store: "Software Store",
    os_start_testimonials: "Log Ulasan Klien",
    os_start_contact: "Kirim Pesan (Mailer)",
    os_start_theme: "Ganti Tema OS",
    os_start_admin: "Panel Admin",
    os_start_reboot: "Restart SigitOS (Reboot BIOS)",
    os_lang_tooltip: "Ganti Bahasa (ID/EN)",
    os_theme_tooltip: "Pilih Tema Tampilan",

    // Desktop Manager & Apps
    app_profile: "Profil",
    app_services: "Layanan",
    app_projects: "Proyek",
    app_store: "Toko Digital",
    app_testimonials: "Testimoni",
    app_contact: "Kontak",
    app_terminal: "Terminal AI",
    os_nav_prev: "< Sebelumnya",
    os_nav_next: "Selanjutnya >",
    os_nav_page: "Halaman",
    os_nav_of: "dari",
    os_nav_keys: "[Gunakan Tombol ← / →]",
    os_nav_prev_tooltip: "Tekan Panah Kiri (←)",
    os_nav_next_tooltip: "Tekan Panah Kanan (→)",
    os_window_title: "SigitOS Desktop Manager - Sistem Portofolio Interaktif",
    os_status_online: "ONLINE",

    // Boot Loader
    boot_skip_btn: "[ESC / Lewati Boot]",
    boot_skip_hint: "Tekan ESC untuk langsung masuk",

    // Hero Section
    hero_available_badge: "Full-time // Freelance // Konsultasi Proyek",
    hero_verified_badge: "Diverifikasi Profesional",
    hero_cta_projects: "Lihat Proyek",
    hero_cta_portfolio: "Portofolio",
    hero_cta_contact: "Kontak",
    hero_skills_label: "Keahlian Utama",
    hero_contact_heading: "Hubungi Saya",
    hero_window_title: "Sigit_Profile.exe // Detail Pengembang",
    hero_status_text: "Status: Siap menerima proyek & konsultasi sistem",
    hero_stat_exp: "Tahun Pengalaman",
    hero_stat_projects: "Proyek Selesai",
    hero_stat_rating: "Kepuasan Klien",
    hero_stat_partners: "Mitra Kolaborasi",

    // Services Section
    services_eyebrow: "Layanan & Keahlian",
    services_badge: "SERVICES_DIRECTORY // KEAHLIAN TEKNIS",
    services_title: "Solusi Digital yang Saya Tawarkan",
    services_subtitle:
      "Membantu Anda mewujudkan kehadiran digital yang profesional, terukur, dan berdampak nyata bagi pertumbuhan bisnis.",
    services_cta: "Tanyakan Layanan Ini",
    services_discuss_btn: "Diskusikan Kebutuhan Ini",

    // Projects Section
    projects_eyebrow: "Portofolio Pilihan",
    projects_badge: "PROJECT_SHOWCASE // KARYA DIGITAL TERPILIH",
    projects_title: "Proyek Unggulan Terkini",
    projects_view_all: "Lihat Semua Proyek",
    projects_featured_badge: "Unggulan",
    projects_detail_btn: "Detail",
    projects_page_badge: "Koleksi Karya Digital",
    projects_page_title: "Daftar Proyek & Portofolio",
    projects_page_subtitle:
      "Eksplorasi solusi digital yang saya kembangkan untuk menjawab tantangan nyata bisnis, komunitas, dan institusi pendidikan.",
    projects_empty: "Belum ada proyek yang dipublikasikan.",
    projects_live_demo: "Demo Langsung",
    projects_repo: "Repositori",

    // Project Detail Page
    detail_back_all: "Kembali ke Semua Proyek",
    detail_published_on: "Dipublikasikan pada",
    detail_about_title: "Tentang Proyek Ini",
    detail_overview_title: "Latar Belakang & Solusi Proyek",
    detail_overview_desc:
      "Proyek ini dirancang mengutamakan keandalan sistem, kecepatan waktu muat, dan pengalaman navigasi yang intuitif baik pada perangkat mobile maupun desktop.",
    detail_tech_title: "Teknologi yang Digunakan",
    detail_cta_discuss: "Diskusikan Proyek Serupa",
    detail_cta_box_title: "Tertarik Mengembangkan Proyek Serupa?",
    detail_cta_box_desc:
      "Diskusikan kebutuhan ide atau aplikasi Anda bersama {name} untuk mendapatkan estimasi dan pendekatan arsitektur terbaik melalui Gmail.",
    detail_cta_gmail: "Diskusikan via Gmail",
    detail_cta_demo: "Lihat Demo Live",
    detail_cta_repo: "Repositori",
    detail_not_found_title: "Proyek Tidak Ditemukan",
    detail_not_found_desc:
      "Proyek yang Anda cari belum dipublikasikan atau URL tidak sesuai.",
    date_locale: "id-ID",

    // Products Section
    products_eyebrow: "Produk Digital & Template",
    products_badge: "SOFTWARE_VAULT // PRODUK DIGITAL & TEMPLATE",
    products_title: "Karya Siap Pakai & E-Book",
    products_subtitle:
      "Sumber daya pilihan untuk mempercepat alur kerja digital Anda dan mengakselerasi karier di industri kreatif.",
    products_cta_get: "Dapatkan Lisensi",
    products_cta_inquire: "Tanyakan Produk Ini",

    // Testimonials Section
    testi_eyebrow: "Apresiasi & Testimoni",
    testi_badge: "CLIENT_LOGS // ULASAN & TESTIMONI MITRA",
    testi_title: "Apa Kata Klien & Mitra Kerja",
    testi_subtitle:
      "Kepuasan kolaborasi nyata dari berbagai proyek pengembangan website dan solusi digital.",
    testi_verified: "Klien Terverifikasi",

    // Contact Section
    contact_eyebrow: "Hubungi Saya",
    contact_title: "Mari Berdiskusi & Berkolaborasi",
    contact_subtitle:
      "Punya ide proyek, kebutuhan pembuatan website bisnis, atau ingin berkonsultasi mengenai solusi digital? Hubungi saya langsung melalui Gmail/Email di bawah ini.",
    contact_direct_channels_title: "Saluran Komunikasi Langsung",
    contact_direct_channels_desc:
      "Tertarik mengembangkan website bisnis, aplikasi custom, atau konsultasi UI/UX? Kirim pesan langsung ke email atau form berikut.",
    contact_open_gmail: "Buka di Gmail Langsung",
    contact_email_label: "Email Utama (Gmail)",
    contact_location_label: "Domisili",
    contact_form_title: "Kirim Pesan Langsung",
    contact_form_desc:
      "Formulir ini akan mengarahkan pesan langsung ke inbox email.",
    contact_name_label: "Nama Lengkap",
    contact_name_placeholder: "Nama Anda",
    contact_subject_label: "Subjek Pesan",
    contact_subject_placeholder: "Contoh: Kebutuhan Website Portofolio",
    contact_message_label: "Isi Pesan",
    contact_message_placeholder:
      "Ceritakan kebutuhan proyek atau pertanyaan Anda di sini...",
    contact_send_btn: "Kirim Pesan",

    // Terminal CRT
    terminal_title: "CRT TERMINAL MONITOR // TTY-1",
    terminal_help_skills: "Tampilkan daftar keahlian teknologi",
    terminal_help_projects: "Buka katalog proyek unggulan",
    terminal_help_ai: "Showoff keahlian AI Agent & Sistem Otomasi",
    terminal_help_contact: "Kirim pesan ke Sigit",
    terminal_help_clear: "Bersihkan layar terminal",
    terminal_help_about: "Ringkasan profil pengembang",
    terminal_unknown_cmd: "Perintah tidak dikenali: '{cmd}'. Ketik 'help' untuk panduan.",
    terminal_about_text: "{name} adalah Web Developer & Systems Architect yang berfokus pada kecepatan, estetika, dan keandalan sistem.",

    // Footer
    footer_brand_desc:
      "Personal branding & portofolio profesional karya developer.",
    footer_rights: "Hak cipta dilindungi undang-undang.",
    footer_navigation: "Navigasi",
    footer_contact_info: "Kontak & Lokasi",
    footer_legal: "Legal & Hak Cipta",
    footer_back_to_top: "Kembali ke atas",
  },
  en: {
    // Navigation & Header
    nav_home: "Home",
    nav_projects: "Projects",
    nav_services: "Services",
    nav_products: "Products",
    nav_testimonials: "Testimonials",
    nav_contact: "Contact",
    nav_admin_panel: "Admin Panel",
    nav_contact_me: "Contact Me",

    // OS Menubar & Start Menu
    os_start_btn: "Start",
    os_start_title: "Programs & Applications",
    os_start_profile: "Developer Profile",
    os_start_services: "Service Modules",
    os_start_projects: "Project Portfolio",
    os_start_store: "Software Store",
    os_start_testimonials: "Client Review Logs",
    os_start_contact: "Send Message (Mailer)",
    os_start_theme: "Change OS Theme",
    os_start_admin: "Admin Panel",
    os_start_reboot: "Restart SigitOS (Reboot BIOS)",
    os_lang_tooltip: "Change Language (ID/EN)",
    os_theme_tooltip: "Select Theme",

    // Desktop Manager & Apps
    app_profile: "Profile",
    app_services: "Services",
    app_projects: "Projects",
    app_store: "Digital Store",
    app_testimonials: "Testimonials",
    app_contact: "Contact",
    app_terminal: "AI Terminal",
    os_nav_prev: "< Previous",
    os_nav_next: "Next >",
    os_nav_page: "Page",
    os_nav_of: "of",
    os_nav_keys: "[Use ← / → Keys]",
    os_nav_prev_tooltip: "Press Left Arrow (←)",
    os_nav_next_tooltip: "Press Right Arrow (→)",
    os_window_title: "SigitOS Desktop Manager - Interactive Portfolio System",
    os_status_online: "ONLINE",

    // Boot Loader
    boot_skip_btn: "[ESC / Skip Boot]",
    boot_skip_hint: "Press ESC to enter immediately",

    // Hero Section
    hero_available_badge: "Full-time // Freelance // Project Consulting",
    hero_verified_badge: "Professionally Verified",
    hero_cta_projects: "View Projects",
    hero_cta_portfolio: "Portfolio",
    hero_cta_contact: "Contact",
    hero_skills_label: "Core Skills",
    hero_contact_heading: "Contact Me",
    hero_window_title: "Sigit_Profile.exe // Developer Details",
    hero_status_text: "Status: Available for hire & freelance development",
    hero_stat_exp: "Years Experience",
    hero_stat_projects: "Projects Completed",
    hero_stat_rating: "Client Rating",
    hero_stat_partners: "Partners",

    // Services Section
    services_eyebrow: "Services & Capabilities",
    services_badge: "SERVICES_DIRECTORY // TECHNICAL CAPABILITIES",
    services_title: "Digital Solutions I Offer",
    services_subtitle:
      "Helping you build a professional, scalable, and high-impact digital presence for business growth.",
    services_cta: "Inquire About This Service",
    services_discuss_btn: "Discuss This Project",

    // Projects Section
    projects_eyebrow: "Featured Portfolio",
    projects_badge: "PROJECT_SHOWCASE // SELECTED DIGITAL WORKS",
    projects_title: "Latest Featured Projects",
    projects_view_all: "View All Projects",
    projects_featured_badge: "Featured",
    projects_detail_btn: "Details",
    projects_page_badge: "Digital Works Collection",
    projects_page_title: "Projects & Portfolio List",
    projects_page_subtitle:
      "Exploring digital solutions engineered to solve real challenges for businesses, communities, and educational institutions.",
    projects_empty: "No published projects found.",
    projects_live_demo: "Live Demo",
    projects_repo: "Repository",

    // Project Detail Page
    detail_back_all: "Back to All Projects",
    detail_published_on: "Published on",
    detail_about_title: "About This Project",
    detail_overview_title: "Project Background & Solution",
    detail_overview_desc:
      "This project is engineered with an emphasis on system reliability, optimal load speed, and intuitive navigation across both mobile and desktop screens.",
    detail_tech_title: "Technologies Used",
    detail_cta_discuss: "Discuss Similar Project",
    detail_cta_box_title: "Interested in Building a Similar Project?",
    detail_cta_box_desc:
      "Discuss your project ideas or app requirements with {name} to get the best estimation and architectural roadmap via Gmail.",
    detail_cta_gmail: "Discuss via Gmail",
    detail_cta_demo: "View Live Demo",
    detail_cta_repo: "Repository",
    detail_not_found_title: "Project Not Found",
    detail_not_found_desc:
      "The project you are looking for has not been published or the URL is invalid.",
    date_locale: "en-US",

    // Products Section
    products_eyebrow: "Digital Products & Templates",
    products_badge: "SOFTWARE_VAULT // DIGITAL PRODUCTS & TEMPLATES",
    products_title: "Ready-to-Use Assets & E-Books",
    products_subtitle:
      "Curated resources to accelerate your digital workflow and elevate your career in the creative tech industry.",
    products_cta_get: "Get License",
    products_cta_inquire: "Inquire About This Product",

    // Testimonials Section
    testi_eyebrow: "Appreciation & Testimonials",
    testi_badge: "CLIENT_LOGS // REVIEWS & PARTNER TESTIMONIALS",
    testi_title: "What Clients & Partners Say",
    testi_subtitle:
      "Real collaborative satisfaction across various web development and digital transformation initiatives.",
    testi_verified: "Verified Client",

    // Contact Section
    contact_eyebrow: "Contact Me",
    contact_title: "Let's Connect & Collaborate",
    contact_subtitle:
      "Have a project idea, business website needs, or want to consult on digital solutions? Reach out directly via Gmail/Email below.",
    contact_direct_channels_title: "Direct Communication Channels",
    contact_direct_channels_desc:
      "Interested in developing a business website, custom app, or UI/UX consultation? Send a direct message via email or the form below.",
    contact_open_gmail: "Open in Gmail Direct",
    contact_email_label: "Primary Email (Gmail)",
    contact_location_label: "Location",
    contact_form_title: "Send a Direct Message",
    contact_form_desc:
      "This form will compose your message directly to the email inbox.",
    contact_name_label: "Full Name",
    contact_name_placeholder: "Your Name",
    contact_subject_label: "Message Subject",
    contact_subject_placeholder: "e.g., Portfolio Website Project",
    contact_message_label: "Message Content",
    contact_message_placeholder:
      "Describe your project requirements or inquiries here...",
    contact_send_btn: "Send Message",

    // Terminal CRT
    terminal_title: "CRT TERMINAL MONITOR // TTY-1",
    terminal_help_skills: "Display list of technical skills",
    terminal_help_projects: "Open featured projects catalog",
    terminal_help_ai: "Showcase AI Agent & Automation Systems",
    terminal_help_contact: "Send message to Sigit",
    terminal_help_clear: "Clear the terminal screen",
    terminal_help_about: "Developer profile summary",
    terminal_unknown_cmd: "Command not recognized: '{cmd}'. Type 'help' for guide.",
    terminal_about_text: "{name} is a Web Developer & Systems Architect focused on speed, aesthetics, and system reliability.",

    // Footer
    footer_brand_desc:
      "Professional personal branding & digital portfolio showcase.",
    footer_rights: "All rights reserved.",
    footer_navigation: "Navigation",
    footer_contact_info: "Contact & Location",
    footer_legal: "Legal & Copyright",
    footer_back_to_top: "Back to top",
  },
};

const STORAGE_KEY = "sigit_portfolio_lang";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "id",
  setLanguage: () => {},
  t: translations.id,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");

  // Reliable initial detection with localStorage precedence
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "id" || stored === "en") {
        setLanguageState(stored);
        if (typeof document !== "undefined") {
          document.documentElement.lang = stored;
        }
        return;
      }

      // Auto-detect from browser preferences
      if (typeof window !== "undefined" && navigator) {
        const browserLangs = navigator.languages || [navigator.language || "id"];
        for (const lang of browserLangs) {
          const lower = lang.toLowerCase();
          if (lower.startsWith("id") || lower.startsWith("in")) {
            setLanguageState("id");
            document.documentElement.lang = "id";
            return;
          }
          if (lower.startsWith("en")) {
            setLanguageState("en");
            document.documentElement.lang = "en";
            return;
          }
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "id" || e.newValue === "en")) {
        setLanguageState(e.newValue);
        if (typeof document !== "undefined") {
          document.documentElement.lang = e.newValue;
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLang;
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t, language, setLanguage } = useContext(LanguageContext);
  return { t, language, setLanguage };
}
