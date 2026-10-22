/**
 * Resolusi konfigurasi kartu detail profil — SERVER-ONLY.
 *
 * Mengikuti filosofi God Mode (seperti os-apps-config.ts & ui-strings-config.ts):
 * disimpan di tabel `settings` dengan key "profile_cards".
 * Tanpa migrasi SQL Drizzle, tahan banting, dan aman dengan fallback default.
 */
import { getSetting, setSetting } from "@/lib/settings";
import {
  DEFAULT_PROFILE_CARDS,
  ProfileCardsConfig,
  sanitizeProfileCards,
} from "@/lib/profile-cards-meta";

const SETTING_KEY = "profile_cards";

/**
 * Baca konfigurasi kartu profil efektif untuk pengunjung.
 * Tidak pernah melempar error — bila data kosong/korup, otomatis fallback
 * ke DEFAULT_PROFILE_CARDS.
 */
export async function resolveProfileCards(options?: { preview?: boolean }): Promise<ProfileCardsConfig> {
  try {
    let stored: unknown = null;
    if (options?.preview) {
      stored = await getSetting<unknown>(`${SETTING_KEY}:draft`);
    }
    if (!stored) {
      stored = await getSetting<unknown>(SETTING_KEY);
    }
    if (!stored || typeof stored !== "object") {
      return { ...DEFAULT_PROFILE_CARDS };
    }
    return sanitizeProfileCards(stored);
  } catch (err) {
    console.warn(`Gagal membaca setting "${SETTING_KEY}":`, err);
    return { ...DEFAULT_PROFILE_CARDS };
  }
}

/**
 * Simpan konfigurasi kartu profil dari form panel admin.
 * Memvalidasi dan mensanitasi input sebelum disimpan ke tabel settings.
 */
export async function saveProfileCards(input: unknown): Promise<ProfileCardsConfig> {
  if (!input || typeof input !== "object") {
    throw new Error("Input kartu profil tidak valid: bukan object.");
  }

  const sanitized = sanitizeProfileCards(input);
  await setSetting(SETTING_KEY, sanitized);
  return sanitized;
}
