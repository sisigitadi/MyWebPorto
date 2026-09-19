/**
 * Metadata feature flag global — murni data, TANPA import server.
 *
 * Sama filosofinya dengan os-apps-meta.ts / ui-strings-meta.ts: file ini
 * dipisah dari features-config.ts (yang membaca tabel settings dan mengimpor
 * modul server-only) supaya AMAN diimpor ke komponen client
 * (features-context.tsx, os-desktop-manager.tsx, retro-bot.tsx, dst.). Kalau
 * label ditarik dari features-config.ts, seluruh dependensinya (drizzle, fs,
 * db) ikut masuk bundle browser.
 *
 * Sumber kebenaran tunggal untuk: daftar flag, label & deskripsi form admin,
 * nilai default, dan pengelompokan UI.
 */

/** Id flag yang dikenal. Tuple `as const` agar tipenya menyempit jadi union. */
export const FEATURE_KEYS = [
  "enable_terminal",
  "enable_store_cart",
  "enable_articles",
  "maintenance_mode",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Bentuk data yang disimpan di settings.features: flat boolean per flag. */
export type Features = Record<FeatureKey, boolean>;

/** Satu definisi flag untuk form /admin/features. */
export interface FeatureDef {
  key: FeatureKey;
  /** Label pendek (ID) di samping toggle. */
  label: string;
  /** Penjelasan apa yang dikendalikan, dwibahasa. */
  description: { id: string; en: string };
  /** Nama kelompok (heading) di form admin. */
  group: string;
  /**
   * Toggle yang langsung mengubah seluruh situs publik saat disimpan —
   * memerlukan dialog konfirmasi di form.
   */
  dangerous?: true;
}

/**
 * Definisi flag untuk /admin/features. Label & deskripsi dwibahasa hidup di
 * sini (bukan di translations.ts) karena meta adalah sumber kebenaran form
 * admin dan harus client-safe — translations.ts dipakai untuk teks marketing
 * situs publik, bukan label panel admin.
 */
export const FEATURE_DEFS: readonly FeatureDef[] = [
  {
    key: "enable_terminal",
    label: "Terminal & RetroBot",
    description: {
      id: "Menampilkan app Terminal OS, widget asisten AI RetroBot, endpoint /api/retrobot, dan server action askSigitBot.",
      en: "Shows the OS Terminal app, the RetroBot AI assistant widget, the /api/retrobot endpoint, and the askSigitBot server action.",
    },
    group: "Aplikasi OS",
  },
  {
    key: "enable_store_cart",
    label: "Keranjang Belanja",
    description: {
      id: "Menampilkan tombol keranjang dan tombol tambah-ke-keranjang di katalog serta halaman detail produk. Logika stok & WhatsApp tidak berubah.",
      en: "Shows the cart button and add-to-cart buttons in the product catalog and product detail pages. Stock & WhatsApp logic is unchanged.",
    },
    group: "Toko",
  },
  {
    key: "enable_articles",
    label: "Artikel",
    description: {
      id: "Menampilkan app Artikel OS serta route /artikel dan /artikel/[slug]. Saat dimatikan, halaman artikel mengembalikan 404.",
      en: "Shows the OS Articles app plus the /artikel and /artikel/[slug] routes. When off, article pages return 404.",
    },
    group: "Aplikasi OS",
  },
  {
    key: "maintenance_mode",
    label: "Mode Pemeliharaan",
    description: {
      id: "Mengganti seluruh situs publik dengan halaman pemeliharaan. Panel admin tetap dapat diakses dan tetap berfungsi normal.",
      en: "Replaces the entire public site with a maintenance page. The admin panel stays accessible and fully functional.",
    },
    group: "Operasional",
    dangerous: true,
  },
];

/** Kelompok unik sesuai urutan kemunculan di FEATURE_DEFS. */
export const FEATURE_GROUPS: readonly string[] = [
  ...new Set(FEATURE_DEFS.map((d) => d.group)),
];

/**
 * Default = kondisi sekarang: SEMUA fitur ON, maintenance OFF. Dipakai saat
 * settings.features belum diisi, kosong, rusak, atau validasinya gagal —
 * situs tetap utuh seperti sebelum fitur ini ada. Jaminan ini adalah inti
 * spec §2.2: situs tidak pernah kehilangan fitur karena masalah infra.
 */
export const DEFAULT_FEATURES: Features = {
  enable_terminal: true,
  enable_store_cart: true,
  enable_articles: true,
  maintenance_mode: false,
};

/** Cepat: apakah string termasuk flag yang dikenal? */
export function isFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key);
}
