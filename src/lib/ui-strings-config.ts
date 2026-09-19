/**
 * Resolusi overlay teks UI — SERVER-ONLY.
 *
 * Sama filosofinya dengan os-apps-config.ts: pengaturan admin (tabel settings,
 * key "ui_strings") menimpa default di src/lib/i18n.tsx, tanpa migrasi schema
 * dan tanpa redeploy. Yang disimpan hanya overlay per bahasa {id, en} —
 * default teks tetap di kode (tidak perlu diduplikasi ke DB).
 *
 * Kegagalan apa pun (setting tidak ada, format salah, key asing, value terlalu
 * panjang) JATUH ke overlay kosong — situs tetap dirender dengan teks default.
 *
 * Pengaman asimetris (sama seperti Fase 1):
 *  - data DB usang ditoleransi per-entry (dilewati),
 *  - input form admin ditolak keras (pesan error ditampilkan ke admin).
 */
import { getSetting, setSetting } from "@/lib/settings";
import {
  EDITABLE_KEYS,
  EDITABLE_KEY_SET,
  MAX_KEY_LENGTH,
  UI_STRING_LANGS,
  maxLengthForKey,
  sanitizeStringValue,
  type StringKey,
  type UIStringsOverlay,
} from "@/lib/ui-strings-meta";

const SETTING_KEY = "ui_strings";

// Karakter terlarang di input form admin: U+0000-U+001F dan U+007F. Ditulis
// lewat RegExp constructor dengan string ASCII printable murni agar sumber
// file tetap text biasa (escape \uXXXX langsung di sumber pernah bikin git
// menganggap file ini binary).
const CONTROL_CHARS = new RegExp("[\\x00-\\x1f\\x7f]");

export interface UIStrings extends UIStringsOverlay {
  /** Asal overlay: "admin" (sudah disimpan) | "default" (belum diatur). */
  source: "admin" | "default";
}

const EMPTY: UIStrings = { id: {}, en: {}, source: "default" };

type LangOverlay = Record<string, string>;

/**
 * Normalisasi satu bahasa dari data mentah DB:
 *  - hanya key yang ada di allowlist,
 *  - hanya value string,
 *  - value disanitasi (read-path juga bersih, pertahanan dalam terhadap
 *    penulisan langsung ke DB),
 *  - value whitespace-only / terlalu panjang dibuang.
 *
 * Tidak pernah melempar.
 */
function normalizeLang(input: unknown): LangOverlay {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: LangOverlay = {};

  for (const key of Object.keys(src)) {
    if (!EDITABLE_KEY_SET.has(key)) continue;
    const cleaned = sanitizeStringValue(src[key]);
    if (!cleaned) continue;
    if (cleaned.length > MAX_KEY_LENGTH) continue;
    out[key] = cleaned;
  }

  return out;
}

export async function resolveUIStrings(options?: { preview?: boolean }): Promise<UIStrings> {
  try {
    let stored: unknown = null;
    if (options?.preview) {
      stored = await getSetting<unknown>(`${SETTING_KEY}:draft`);
    }
    if (!stored) {
      stored = await getSetting<unknown>(SETTING_KEY);
    }
    const id = normalizeLang(
      stored && typeof stored === "object" ? (stored as Record<string, unknown>).id : undefined
    );
    const en = normalizeLang(
      stored && typeof stored === "object" ? (stored as Record<string, unknown>).en : undefined
    );
    const hasAny = Object.keys(id).length > 0 || Object.keys(en).length > 0;
    return { id, en, source: hasAny ? "admin" : "default" };
  } catch (err) {
    console.warn(`Gagal membaca setting "${SETTING_KEY}":`, err);
    return { ...EMPTY, id: {}, en: {} };
  }
}

/**
 * Simpan overlay dari form /admin/strings. Melempar bila input invalid
 * (server action pemanggil menangkap & menampilkan pesannya). Verifikasi
 * identitas admin tetap tanggung jawab server action (verifyAdmin).
 */
export async function saveUIStrings(input: unknown): Promise<void> {
  if (!input || typeof input !== "object") {
    throw new Error("Input teks UI tidak valid: bukan object.");
  }

  const out: UIStringsOverlay = { id: {}, en: {} };
  const src = input as Record<string, unknown>;

  for (const lang of UI_STRING_LANGS) {
    const raw = src[lang];
    if (raw === undefined) continue; // bahasa tidak dikirim = tidak diubah
    if (!raw || typeof raw !== "object") {
      throw new Error(`Input teks UI tidak valid: bahasa "${lang}" bukan object.`);
    }

    for (const key of Object.keys(raw as Record<string, unknown>)) {
      if (!EDITABLE_KEY_SET.has(key)) {
        throw new Error(`Teks UI tidak valid: key "${key}" tidak dikenal.`);
      }
      const value = (raw as Record<string, unknown>)[key];
      if (typeof value !== "string") {
        throw new Error(`Teks UI tidak valid: nilai key "${key}" bukan teks.`);
      }
      // Tag HTML / char kontrol ditolak keras (admin harus melihat sendiri
      // teksnya bersih di form). Pemeriksaan dilakukan eksplisit pada karakter,
      // BUKAN dengan membandingkan value vs hasil sanitasi — perbandingan itu
      // juga menolak whitespace yang justru BOLEH dirapikan (lihat test
      // "whitespace dirapikan").
      if (/[<>]/.test(value) || CONTROL_CHARS.test(value)) {
        throw new Error(
          `Teks UI tidak valid: nilai key "${key}" mengandung tag HTML atau karakter terlarang.`
        );
      }
      const cleaned = sanitizeStringValue(value);
      const max = maxLengthForKey(key);
      if (cleaned.length > max) {
        throw new Error(`Teks UI tidak valid: nilai key "${key}" terlalu panjang (maks. ${max} karakter).`);
      }
      if (!cleaned) continue; // whitespace-only = kembali ke default
      out[lang][key as StringKey] = cleaned;
    }
  }

  await setSetting(SETTING_KEY, out);
}

/** Ringkasan untuk UI admin: jumlah key disunting vs total. */
export function describeUIStrings(strings: UIStrings): string {
  const edited = Object.keys(strings.id).length + Object.keys(strings.en).length;
  return `${edited}/${EDITABLE_KEYS.length} key disunting (${EDITABLE_KEYS.length * 2} slot)`;
}
