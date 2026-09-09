"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "id" | "en";

export interface Translations {
  // Navigation & Header
  nav_home: string;
  nav_projects: string;
  nav_services: string;
  nav_products: string;
  nav_testimonials: string;
  nav_contact: string;
  nav_admin_panel: string;
  nav_contact_me: string;

  // Hero Section
  hero_available_badge: string;
  hero_verified_badge: string;
  hero_cta_projects: string;
  hero_cta_portfolio: string;
  hero_skills_label: string;
  hero_contact_heading: string;

  // Services Section
  services_eyebrow: string;
  services_title: string;
  services_subtitle: string;
  services_cta: string;

  // Projects Section
  projects_eyebrow: string;
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
  products_title: string;
  products_subtitle: string;
  products_cta_get: string;
  products_cta_inquire: string;

  // Testimonials Section
  testi_eyebrow: string;
  testi_title: string;
  testi_subtitle: string;

  // Contact Section
  contact_eyebrow: string;
  contact_title: string;
  contact_subtitle: string;
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

    // Hero Section
    hero_available_badge: "Tersedia untuk proyek freelance & konsultasi",
    hero_verified_badge: "Diverifikasi Profesional",
    hero_cta_projects: "Lihat Proyek",
    hero_cta_portfolio: "Portofolio",
    hero_skills_label: "Keahlian Utama",
    hero_contact_heading: "Hubungi Saya",

    // Services Section
    services_eyebrow: "Layanan & Keahlian",
    services_title: "Solusi Digital yang Saya Tawarkan",
    services_subtitle:
      "Membantu Anda mewujudkan kehadiran digital yang profesional, terukur, dan berdampak nyata bagi pertumbuhan bisnis.",
    services_cta: "Tanyakan Layanan Ini",

    // Projects Section
    projects_eyebrow: "Portofolio Pilihan",
    projects_title: "Proyek Unggulan Terkini",
    projects_view_all: "Lihat Semua Proyek",
    projects_featured_badge: "Unggulan",
    projects_detail_btn: "Detail",
    projects_page_badge: "Koleksi Karya Digital",
    projects_page_title: "Daftar Proyek & Portofolio",
    projects_page_subtitle:
      "Eksplorasi solusi digital yang saya kembangkan untuk menjawab tantangan nyata bisnis, komunitas, dan institusi pendidikan.",
    projects_empty: "Belum ada proyek yang dipublikasikan.",
    projects_live_demo: "Live Demo",
    projects_repo: "Repository",

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
    products_title: "Karya Siap Pakai & E-Book",
    products_subtitle:
      "Sumber daya pilihan untuk mempercepat alur kerja digital Anda dan mengakselerasi karier di industri kreatif.",
    products_cta_get: "Dapatkan Produk",
    products_cta_inquire: "Tanyakan Produk Ini",

    // Testimonials Section
    testi_eyebrow: "Apresiasi & Testimoni",
    testi_title: "Apa Kata Klien & Mitra Kerja",
    testi_subtitle:
      "Kepuasan kolaborasi nyata dari berbagai proyek pengembangan website dan solusi digital.",

    // Contact Section
    contact_eyebrow: "Hubungi Saya",
    contact_title: "Mari Berdiskusi & Berkolaborasi",
    contact_subtitle:
      "Punya ide proyek, kebutuhan pembuatan website bisnis, atau ingin berkonsultasi mengenai solusi digital? Hubungi saya langsung melalui Gmail/Email di bawah ini.",
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
    contact_send_btn: "Buka di Email / Kirim Pesan",

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

    // Hero Section
    hero_available_badge: "Available for freelance & consulting projects",
    hero_verified_badge: "Professionally Verified",
    hero_cta_projects: "View Projects",
    hero_cta_portfolio: "Portfolio",
    hero_skills_label: "Core Skills",
    hero_contact_heading: "Contact Me",

    // Services Section
    services_eyebrow: "Services & Expertise",
    services_title: "Digital Solutions I Offer",
    services_subtitle:
      "Helping you build a professional, scalable, and high-impact digital presence for business growth.",
    services_cta: "Inquire About This Service",

    // Projects Section
    projects_eyebrow: "Featured Portfolio",
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
    products_title: "Ready-to-Use Assets & E-Books",
    products_subtitle:
      "Curated resources to accelerate your digital workflow and elevate your career in the creative tech industry.",
    products_cta_get: "Get Product",
    products_cta_inquire: "Inquire About This Product",

    // Testimonials Section
    testi_eyebrow: "Appreciation & Testimonials",
    testi_title: "What Clients & Partners Say",
    testi_subtitle:
      "Real collaborative satisfaction across various web development and digital transformation initiatives.",

    // Contact Section
    contact_eyebrow: "Contact Me",
    contact_title: "Let's Connect & Collaborate",
    contact_subtitle:
      "Have a project idea, business website needs, or want to consult on digital solutions? Reach out directly via Gmail/Email below.",
    contact_email_label: "Primary Email (Gmail)",
    contact_location_label: "Location",
    contact_form_title: "Send a Direct Message",
    contact_form_desc:
      "This form will compose your message directly to the email inbox.",
    contact_name_label: "Full Name",
    contact_name_placeholder: "Your Name",
    contact_subject_label: "Message Subject",
    contact_subject_placeholder: "e.g., Portfolio Website Requirement",
    contact_message_label: "Message Content",
    contact_message_placeholder:
      "Describe your project requirements or inquiries here...",
    contact_send_btn: "Open in Email / Send Message",

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
  // Default to Indonesian, then auto-detect user browser/system language
  const [language, setLanguage] = useState<Language>("id");

  useEffect(() => {
    function detectLanguage(): Language {
      if (typeof window === "undefined" || !navigator) return "id";
      const browserLangs = navigator.languages || [navigator.language || "id"];
      
      for (const lang of browserLangs) {
        const lower = lang.toLowerCase();
        if (lower.startsWith("id") || lower.startsWith("in")) {
          return "id";
        }
        if (lower.startsWith("en")) {
          return "en";
        }
      }
      return "en"; // Default international visitors to English
    }

    const detected = detectLanguage();
    setLanguage(detected);
    if (typeof document !== "undefined") {
      document.documentElement.lang = detected;
    }

    // Auto-listen to language change event if user changes system/browser preferences
    const handleLanguageChange = () => {
      const newLang = detectLanguage();
      setLanguage(newLang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLang;
      }
    };

    window.addEventListener("languagechange", handleLanguageChange);
    return () => {
      window.removeEventListener("languagechange", handleLanguageChange);
    };
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
