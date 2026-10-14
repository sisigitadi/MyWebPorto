/**
 * Metadata app SigitOS — murni data, TANPA import server.
 *
 * File ini sengaja dipisah dari os-apps-config.ts (yang membaca tabel settings
 * dan mengimpor modul server-only) supaya AMAN diimpor ke komponen client
 * (os-desktop-manager.tsx). Kalau label ditarik dari os-apps-config.ts, seluruh
 * dependensinya (drizzle, fs, db) ikut masuk bundle browser.
 *
 * Sumber kebenaran tunggal untuk: daftar id app, urutan default, label
 * manusiawi (tab taskbar mobile), dan "nama file" retro (Profil.exe dst.).
 * Sebelum penambalan ini, ketiganya duplikat di tiga tempat berbeda
 * (appHumanLabel, getAppFilename, getAppFilenameById).
 */

/** Id app yang dikenal. Tuple `as const` agar bisa dipakai zod enum & tipe. */
export const APP_IDS = [
  "profil",
  "layanan",
  "proyek",
  "toko",
  "artikel",
  "terminal",
  "testimoni",
  "kontak",
] as const;

export type AppId = (typeof APP_IDS)[number];

/** Satu entry konfigurasi app (bentuk yang disimpan di tabel settings). */
export interface OSAppConfig {
  id: AppId;
  enabled: boolean;
  /** Posisi 0..N-1 dalam daftar app aktif. */
  order: number;
}

/**
 * Konfigurasi default = kondisi sekarang (semua aktif, urutan apa adanya).
 * Dipakai saat tabel settings belum diisi, rusak, atau validasinya gagal —
 * situs tetap utuh 8 app seperti sebelum fitur ini ada.
 */
export const DEFAULT_OS_APPS: OSAppConfig[] = APP_IDS.map((id, i) => ({
  id,
  enabled: true,
  order: i,
}));

/** Label manusiawi (bukan "Profil.exe") untuk tab navigasi mobile. */
export function appHumanLabel(id: AppId, lang: "id" | "en"): string {
  switch (id) {
    case "profil":
      return lang === "en" ? "Profile" : "Profil";
    case "layanan":
      return lang === "en" ? "Services" : "Layanan";
    case "proyek":
      return lang === "en" ? "Projects" : "Proyek";
    case "toko":
      return lang === "en" ? "Store" : "Toko";
    case "artikel":
      return lang === "en" ? "Articles" : "Artikel";
    case "terminal":
      return lang === "en" ? "Terminal" : "Terminal";
    case "testimoni":
      return lang === "en" ? "Reviews" : "Testimoni";
    case "kontak":
      return lang === "en" ? "Contact" : "Kontak";
    default:
      return id;
  }
}

/** Nama "file" retro di taskbar/start menu (Profil.exe, Toko.zip, …). */
export function appFilename(id: AppId, lang: "id" | "en"): string {
  switch (id) {
    case "profil":
      return lang === "en" ? "Profile.exe" : "Profil.exe";
    case "layanan":
      return lang === "en" ? "Services.exe" : "Layanan.exe";
    case "proyek":
      return lang === "en" ? "Projects.exe" : "Proyek.exe";
    case "toko":
      return lang === "en" ? "Store.zip" : "Toko.zip";
    case "testimoni":
      return lang === "en" ? "Reviews.txt" : "Testimoni.txt";
    case "artikel":
      return lang === "en" ? "Articles.doc" : "Artikel.doc";
    case "kontak":
      return lang === "en" ? "Contact.exe" : "Kontak.exe";
    case "terminal":
      return "Terminal.bat";
    default:
      return `${id}.exe`;
  }
}

export interface AppShareMeta {
  title: string;
  url: string;
  summary: string;
  badge: string;
}

/**
 * Metadata bagikan tautan & konten untuk setiap app/halaman SigitOS:
 * profil, layanan, proyek, toko, artikel, terminal, testimoni, kontak.
 * Deskripsi singkat dibuat komplit tanpa terpotong (tanpa slice).
 */
export function getAppShareMeta(
  id: AppId,
  lang: "id" | "en",
  ownerName: string = "Sigit Adi Irianto"
): AppShareMeta {
  const isEn = lang === "en";
  switch (id) {
    case "profil":
      return {
        title: `${ownerName} - Portofolio Software Engineer`,
        url: "https://sigitadi.id",
        summary: isEn
          ? "Professional portfolio of Sigit Adi Irianto, showcasing modern web applications, full-stack systems, and AI engineering."
          : "Portofolio profesional Sigit Adi Irianto, menampilkan karya rekayasa web modern, sistem full-stack, dan integrasi kecerdasan buatan.",
        badge: isEn ? "PROFILE" : "PROFIL",
      };
    case "layanan":
      return {
        title: isEn
          ? `Web Development & AI Services - ${ownerName}`
          : `Layanan Pengembangan Web & Solusi AI - ${ownerName}`,
        url: "/#layanan",
        summary: isEn
          ? "Professional software engineering services including modern web apps, full-stack Next.js, AI integrations, intelligent automation, and high-performance cloud architecture."
          : "Layanan rekayasa software profesional meliputi pembuatan aplikasi web modern, full-stack Next.js, integrasi sistem AI, otomasi cerdas, dan arsitektur cloud berkinerja tinggi.",
        badge: isEn ? "SERVICES" : "LAYANAN",
      };
    case "proyek":
      return {
        title: isEn
          ? `Project Portfolio & Case Studies - ${ownerName}`
          : `Katalog Proyek & Portofolio - ${ownerName}`,
        url: "/proyek",
        summary: isEn
          ? "Explore full-stack web applications, AI system integrations, and modern software engineering case studies developed by Sigit Adi Irianto."
          : "Jelajahi kumpulan karya, studi kasus aplikasi web full-stack, integrasi model AI, dan solusi rekayasa perangkat lunak modern karya Sigit Adi Irianto.",
        badge: isEn ? "PROJECTS" : "PROYEK",
      };
    case "toko":
      return {
        title: isEn
          ? `Digital Store & Developer Tools - ${ownerName}`
          : `Toko Digital & Tools Developer - ${ownerName}`,
        url: "/#produk",
        summary: isEn
          ? "Browse high-quality digital products, Next.js boilerplates, ready-to-use source code, SaaS templates, and developer tools curated by Sigit Adi Irianto."
          : "Dapatkan produk digital berkualitas, boilerplates Next.js, source code siap pakai, template SaaS, dan tools developer praktis untuk mempercepat pengembangan aplikasi.",
        badge: isEn ? "STORE" : "TOKO",
      };
    case "artikel":
      return {
        title: isEn
          ? `Tech Articles & Architecture Insights - ${ownerName}`
          : `Artikel & Wawasan Teknologi - ${ownerName}`,
        url: "/artikel",
        summary: isEn
          ? "In-depth technical articles, software architecture guides, Next.js tips, AI systems integration, and modern engineering insights by Sigit Adi Irianto."
          : "Kumpulan artikel mendalam, panduan arsitektur software engineering, tips Next.js, integrasi sistem AI, dan wawasan rekayasa teknologi modern.",
        badge: isEn ? "ARTICLES" : "ARTIKEL",
      };
    case "terminal":
      return {
        title: isEn
          ? `Interactive CRT Terminal SigitOS - ${ownerName}`
          : `Terminal Interaktif SigitOS CRT - ${ownerName}`,
        url: "/#terminal",
        summary: isEn
          ? "Access an interactive retro CRT web terminal with integrated AI assistant to explore portfolio, tech stack, and systems directly in your browser."
          : "Akses terminal retro interaktif berbasis web dengan asisten AI terintegrasi untuk eksplorasi sistem, teknologi, dan portofolio langsung via browser.",
        badge: "TERMINAL",
      };
    case "testimoni":
      return {
        title: isEn
          ? `Client Testimonials & Reviews - ${ownerName}`
          : `Testimoni & Ulasan Klien - ${ownerName}`,
        url: "/#testimoni",
        summary: isEn
          ? "Authentic reviews and testimonials from clients and collaborators regarding satisfaction with web development, code quality, and professional communication."
          : "Ulasan autentik dan umpan balik dari klien serta kolaborator mengenai kepuasan kerja sama pengembangan sistem web, kualitas kode, dan komunikasi profesional.",
        badge: isEn ? "REVIEWS" : "TESTIMONI",
      };
    case "kontak":
      return {
        title: isEn
          ? `Contact ${ownerName} - Collaboration & Consultation`
          : `Hubungi ${ownerName} - Kolaborasi & Konsultasi`,
        url: "/#kontak",
        summary: isEn
          ? "Get in touch to discuss web applications, system architecture, AI integrations, or professional collaboration opportunities. Send a message directly via email or contact form."
          : "Siap mendiskusikan kebutuhan proyek aplikasi web, arsitektur sistem, integrasi AI, atau peluang kolaborasi profesional. Kirim pesan langsung melalui formulir kontak atau email.",
        badge: isEn ? "CONTACT" : "KONTAK",
      };
    default:
      return {
        title: `${ownerName} - ${String(id)}`,
        url: `/#${String(id)}`,
        summary: "",
        badge: String(id).toUpperCase(),
      };
  }
}
