"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { translations } from "@/lib/translations";
import type { UIStringsOverlay } from "@/lib/ui-strings-meta";
import { EDITABLE_KEYS } from "@/lib/ui-strings-meta";

export type Language = "id" | "en";

export interface Translations {
  hero_cta_contact: string;
  // Navigation & Header
  nav_home: string;
  nav_projects: string;
  nav_services: string;
  nav_products: string;
  nav_testimonials: string;
  nav_articles: string;
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
  os_start_articles: string;
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
  app_articles: string;
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
  // Continuation signifier (panah ↓ di tepi bawah body window)
  os_swipe_hint: string;

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
  products_empty: string;
  services_empty: string;
  testimonials_empty: string;

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

  // Articles Section
  articles_eyebrow: string;
  articles_badge: string;
  articles_title: string;
  articles_subtitle: string;
  articles_read_more: string;
  articles_read_time: string;
  articles_empty: string;
  articles_view_all: string;
  articles_back: string;
  article_detail_back_desktop: string;
  article_detail_back_articles: string;
  article_detail_share: string;
  article_detail_copied: string;
  article_detail_copy_link: string;
  article_detail_read_time_suffix: string;
  article_detail_author_label: string;
  article_detail_discuss_title: string;
  article_detail_discuss_desc: string;
  article_detail_discuss_cta: string;
  article_detail_related_title: string;

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
  contact_send_btn_loading: string;
  // Status report form pengiriman (sebelumnya hardcoded English)
  contact_status_loading: string;
  contact_status_success: string;
  contact_status_error: string;
  contact_status_network: string;
  // Chrome jendela OS (sebelumnya hardcoded English)
  contact_mailer_window_title: string;
  contact_mailer_window_status: string;
  contact_owner_address_title: string;
  contact_mailer_badge: string;
  contact_email_field_label: string;
  contact_email_field_placeholder: string;
  contact_channels_window_title: string;
  contact_channels_window_status: string;

  // Terminal CRT
  terminal_status_boot: string;
  terminal_status_ready: string;
  terminal_console_cleared: string;
  terminal_help_header: string;
  terminal_help_freeform: string;
  terminal_help_no_entry: string;
  // Bantuan per-perintah (help <cmd>)
  terminal_help_skills: string;
  terminal_help_projects: string;
  terminal_help_services: string;
  terminal_help_contact: string;
  terminal_help_open: string;
  terminal_help_theme: string;
  terminal_help_lang: string;
  terminal_help_cv: string;
  terminal_help_github: string;
  terminal_help_email: string;
  // Daftar perintah di `help`
  terminal_cmd_help: string;
  terminal_cmd_whoami: string;
  terminal_cmd_date: string;
  terminal_cmd_echo: string;
  terminal_cmd_pwd: string;
  terminal_cmd_ls: string;
  terminal_cmd_skills: string;
  terminal_cmd_projects: string;
  terminal_cmd_services: string;
  terminal_cmd_articles: string;
  terminal_cmd_contact: string;
  terminal_cmd_cv: string;
  terminal_cmd_github: string;
  terminal_cmd_email: string;
  terminal_cmd_open: string;
  terminal_cmd_theme: string;
  terminal_cmd_lang: string;
  terminal_cmd_neofetch: string;
  terminal_cmd_history: string;
  terminal_cmd_clear: string;
  terminal_cmd_reboot: string;
  // Header & feedback perintah
  terminal_skills_header: string;
  terminal_skills_manage: string;
  terminal_contact_header: string;
  terminal_contact_none: string;
  terminal_contact_opening: string;
  terminal_projects_header: string;
  terminal_projects_opening: string;
  terminal_services_header: string;
  terminal_services_opening: string;
  terminal_articles_opening: string;
  terminal_opening_app: string; // {app}
  terminal_unknown_app: string; // {app}
  terminal_cv_opening: string; // {url}
  terminal_cv_unavailable: string;
  terminal_github_opening: string; // {url}
  terminal_github_unconfigured: string;
  terminal_email_opening: string;
  terminal_email_unconfigured: string;
  // UI chrome terminal
  terminal_input_placeholder: string;
  terminal_input_label: string;
  terminal_voice_input: string;
  terminal_tts: string;
  terminal_log_label: string;
  terminal_log_busy: string;
  terminal_input_hint: string;
  // Chrome terminal yang dulu hardcoded — kini ikut bahasa (seperti TTS)
  terminal_topbar_title: string;
  terminal_bot_online: string;
  terminal_neural_ready: string;
  terminal_baud: string;
  terminal_copy: string;
  terminal_copied: string;
  terminal_reset: string;
  terminal_reset_title: string;
  terminal_copy_title: string;
  terminal_ask_label: string;
  terminal_enter: string;
  terminal_prompt: string;
  // Gauge sumber daya (NLP / RAM / DB)
  terminal_gauge_nlp: string;
  terminal_gauge_nlp_load: string;
  terminal_gauge_nlp_idle: string;
  terminal_gauge_ram: string;
  terminal_gauge_ram_value: string;
  terminal_gauge_db: string;
  terminal_gauge_db_value: string;
  // Log boot & status mesin
  terminal_log_bios: string;
  terminal_log_cpu: string;
  terminal_log_init: string;
  terminal_log_system: string;
  terminal_log_neural: string;
  terminal_log_stack: string;
  terminal_log_auth: string; // {owner}
  terminal_log_rebooted: string;
  terminal_log_kernel: string;
  terminal_log_engine_online: string;
  terminal_log_inferencing: string;
  terminal_log_cloud: string;
  terminal_cloud_tag: string; // {provider} {intent}
  // Feedback perintah theme/lang (dulu hardcoded EN)
  terminal_theme_applied: string; // {theme}
  terminal_theme_random: string; // {theme}
  terminal_theme_usage: string;
  terminal_lang_same: string; // {lang}
  terminal_lang_applied: string; // {lang}
  // neofetch
  terminal_neofetch_os: string;
  terminal_neofetch_kernel: string;
  terminal_neofetch_uptime: string;
  terminal_neofetch_shell: string;
  terminal_neofetch_skills: string; // {n}
  terminal_neofetch_projects: string; // {n}
  terminal_neofetch_articles: string; // {n}
  terminal_neofetch_theme: string;
  // Saran cepat (chip)
  terminal_sugg_1: string;
  terminal_sugg_2: string;
  terminal_sugg_3: string;
  terminal_sugg_4: string;
  terminal_sugg_5: string;
  terminal_sugg_6: string;

  // RetroBot — widget asisten retro mengambang (standby)
  retrobot_tooltip: string;
  retrobot_window_title: string;
  retrobot_window_status: string;
  retrobot_greeting: string;
  retrobot_placeholder: string;
  retrobot_send: string;
  retrobot_thinking: string;
  retrobot_quick_1: string;
  retrobot_quick_2: string;
  retrobot_quick_3: string;
  retrobot_quick_4: string;
  retrobot_offline: string;
  retrobot_rate_limited: string;
  retrobot_disclaimer: string;
  retrobot_clear: string;
  retrobot_close: string;
  retrobot_source_local: string;
  retrobot_source_cloud: string;
  retrobot_context_profil: string;
  retrobot_context_layanan: string;
  retrobot_context_proyek: string;
  retrobot_context_toko: string;
  retrobot_context_testimoni: string;
  retrobot_context_artikel: string;
  retrobot_context_kontak: string;
  retrobot_context_terminal: string;
  retrobot_hint_label: string;

  // Footer
  footer_brand_desc: string;
  footer_rights: string;
  footer_navigation: string;
  footer_contact_info: string;
  footer_legal: string;
  footer_back_to_top: string;
}

const STORAGE_KEY = "sigit_portfolio_lang";
// Locale dibawa di URL supaya link bisa dibagikan dalam bahasa yang dipilih
// dan Google bisa menemukan varian EN (lihat alternates.languages di metadata).
const URL_PARAM = "lang";

function readUrlLang(): Language | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get(URL_PARAM);
  return param === "id" || param === "en" ? param : null;
}

function writeUrlLang(lang: Language) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(URL_PARAM) === lang) return; // tidak ada perubahan
  // Pertahankan param & hash lain; replaceState (bukan pushState) agar toggle
  // bahasa tidak mengisi history — tombol Kembali tetap ke halaman sebelumnya.
  url.searchParams.set(URL_PARAM, lang);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

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

/**
 * Overlay teks admin di atas default kode. Hanya key terdaftar yang dipakai
 * (allowlist) — data DB usang yang menyebut key lain diam-diam diabaikan,
 * situs tetap memakai default. Value kosong juga diabaikan.
 */
function applyOverrides(
  base: Translations,
  overrides: UIStringsOverlay[keyof UIStringsOverlay] | undefined
): Translations {
  if (!overrides || typeof overrides !== "object") return base;
  const out = { ...base };
  for (const def of EDITABLE_KEYS) {
    const v = (overrides as Record<string, unknown>)[def.key];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, unknown>)[def.key] = v;
    }
  }
  return out;
}

export function LanguageProvider({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: UIStringsOverlay;
}) {
  const [language, setLanguageState] = useState<Language>("id");

  // Detection precedence: ?lang= di URL > localStorage > preferensi browser.
  // URL menang karena link yang dibagikan harus mendarat di bahasa yang sama.
  useEffect(() => {
    try {
      const urlLang = readUrlLang();
      if (urlLang) {
        setLanguageState(urlLang);
        if (typeof document !== "undefined") {
          document.documentElement.lang = urlLang;
        }
        // Persist supaya navigasi ke halaman tanpa ?lang= tetap konsisten.
        try {
          localStorage.setItem(STORAGE_KEY, urlLang);
        } catch {}
        return;
      }

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
    writeUrlLang(newLang);
  }, []);

  const t = useMemo(
    () => ({
      id: applyOverrides(translations.id, overrides?.id),
      en: applyOverrides(translations.en, overrides?.en),
    }),
    [overrides]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: t[language] }}>
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
