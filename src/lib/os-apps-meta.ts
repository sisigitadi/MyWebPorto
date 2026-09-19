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
