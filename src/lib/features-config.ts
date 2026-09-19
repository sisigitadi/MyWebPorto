/**
 * Resolusi feature flag global — SERVER-ONLY.
 *
 * Sama filosofinya dengan os-apps-config.ts / ui-strings-config.ts:
 * pengaturan admin (tabel settings, key "features") mengubah fitur situs
 * tanpa migrasi schema dan tanpa redeploy. Yang disimpan adalah flat object
 * boolean per flag — default tetap di features-meta.ts.
 *
 * Pengaman asimetris (sama seperti Fase 1/2):
 *  - data DB usang/korup ditoleransi per-key (key asing diabaikan, value
 *    non-boolean diabaikan, shape hancur jatuh ke DEFAULT_FEATURES) —
 *    situs tidak pernah kehilangan fitur karena masalah infra;
 *  - input form admin ditolak keras (key tak terdaftar / value bukan boolean
 *    → pesan Indonesia ditampilkan ke admin).
 *
 * JANGAN impor file ini ke komponen client — ia membawa drizzle/fs/db ke
 * bundle browser. Komponen client membaca flag lewat features-context.tsx.
 */
import { getSetting, setSetting } from "@/lib/settings";
import {
  DEFAULT_FEATURES,
  FEATURE_KEYS,
  isFeatureKey,
  type Features,
} from "@/lib/features-meta";

const SETTING_KEY = "features";

/**
 * Baca flag efektif untuk pengunjung. Tidak pernah melempar — dipanggil di
 * hot path render (layout publik + route artikel + endpoint RetroBot).
 *
 * Bila options?.preview === true, periksa apakah ada draf `features:draft`
 * terlebih dahulu (God Mode Fase 4).
 */
export async function resolveFeatures(options?: { preview?: boolean }): Promise<Features> {
  try {
    let stored: unknown = null;
    if (options?.preview) {
      stored = await getSetting<unknown>(`${SETTING_KEY}:draft`);
    }
    if (!stored) {
      stored = await getSetting<unknown>(SETTING_KEY);
    }
    if (!stored || typeof stored !== "object") {
      return { ...DEFAULT_FEATURES };
    }

    // Copy default, lalu timpa HANYA key terdaftar dengan boolean eksplisit.
    // Key asing tidak diiterasi (otomatis dibuang); value "yes"/1/null/objek
    // gagal cek typeof boolean → default key itu dipertahankan.
    const src = stored as Record<string, unknown>;
    const out: Features = { ...DEFAULT_FEATURES };
    for (const key of FEATURE_KEYS) {
      const raw = src[key];
      if (typeof raw === "boolean") out[key] = raw;
    }
    return out;
  } catch (err) {
    console.warn(`Gagal membaca setting "${SETTING_KEY}":`, err);
    return { ...DEFAULT_FEATURES };
  }
}

/**
 * Simpan flag dari form /admin/features. Melempar bila input invalid (server
 * action pemanggil menangkap & menampilkan pesannya). Verifikasi identitas
 * admin tetap tanggung jawab server action (verifyAdmin).
 *
 * Full-replace overlay: nilai final adalah input valid + default untuk key
 * yang tidak dikirim. Untuk boolean flag ini sederhana dan benar — tidak ada
 * partial-stale (berbeda dari merge per-key string di Fase 2).
 */
export async function saveFeatures(input: unknown): Promise<Features> {
  if (!input || typeof input !== "object") {
    throw new Error("Input feature flag tidak valid: bukan object.");
  }

  const src = input as Record<string, unknown>;

  // Key asing ditolak dulu dengan pesan jelas (berbeda dari resolveFeatures
  // yang memaafkannya — data dari admin harus eksplisit, data DB mungkin
  // usang/ditulis tangan).
  for (const key of Object.keys(src)) {
    if (!isFeatureKey(key)) {
      throw new Error(`Feature flag tidak valid: key "${key}" tidak dikenal.`);
    }
  }

  const out: Features = { ...DEFAULT_FEATURES };
  for (const key of FEATURE_KEYS) {
    if (!(key in src)) continue; // tidak dikirim = tidak diubah
    const raw = src[key];
    if (typeof raw !== "boolean") {
      throw new Error(`Feature flag tidak valid: nilai key "${key}" bukan true/false.`);
    }
    out[key] = raw;
  }

  await setSetting(SETTING_KEY, out);
  return out;
}

/**
 * Ringkasan untuk audit log + badge admin. Jumlah "fitur aktif" TIDAK
 * menghitung maintenance_mode (ia bukan fitur, tapi mode operasional) —
 * itulah kenapa totalnya FEATURE_KEYS.length - 1.
 */
export function describeFeatures(features: Features, lang: "id" | "en"): string {
  const total = FEATURE_KEYS.length - 1;
  const active = FEATURE_KEYS.filter(
    (k) => k !== "maintenance_mode" && features[k]
  ).length;
  const maint = features.maintenance_mode
    ? lang === "en"
      ? " · maintenance mode ON"
      : " · mode pemeliharaan AKTIF"
    : "";
  return lang === "en"
    ? `${active}/${total} features enabled${maint}`
    : `${active}/${total} fitur aktif${maint}`;
}
