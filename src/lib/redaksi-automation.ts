/**
 * Resolusi & eksekusi Otomasi Redaksi — SERVER-ONLY.
 *
 * Sama filosofinya dengan features-config.ts: pengaturan admin (tabel settings,
 * key "redaksi_auto") mengubah perilaku tanpa migrasi & tanpa redeploy.
 *
 * Pengaman asimetris (sama seperti Fase 1-4 yang lain):
 *  - data DB usang/korup ditoleransi per-field (key asing diabaikan, tipe salah
 *    diabaikan, shape hancur jatuh ke DEFAULT) — situs tidak pernah mengarang
 *    konten karena masalah infra;
 *  - input form admin ditolak keras (key tak terdaftar / tipe salah / melebihi
 *    batas → pesan Indonesia ditampilkan ke admin).
 *
 * JANGAN impor file ini ke komponen client — ia membawa drizzle/fs/db & modul
 * AI ke bundle browser. Form memakai redaksi-automation-meta.ts (client-safe).
 */
import { getSetting, setSetting } from "@/lib/settings";
import {
  AUTOMATION_SECTIONS,
  DEFAULT_REDAKSI_AUTOMATION,
  MAX_PER_RUN_HARD_CAP,
  type AutomationSection,
  type RedaksiAutomationConfig,
} from "@/lib/redaksi-automation-meta";
import type { RedaksiContentType } from "@/lib/redaksi-meta";

const SETTING_KEY = "redaksi_auto";

/** True bila string termasuk section otomasi yang dikenal. */
function isAutomationSection(key: string): key is AutomationSection {
  return (AUTOMATION_SECTIONS as readonly string[]).includes(key);
}

function clampMaxPerRun(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_REDAKSI_AUTOMATION.maxPerRun;
  return Math.min(Math.floor(n), MAX_PER_RUN_HARD_CAP);
}

/**
 * Baca config efektif untuk form & runner. Tidak pernah melempar — data DB
 * yang rusak jatuh ke DEFAULT (otomasi mati = kondisi aman).
 */
export async function resolveRedaksiAutomation(): Promise<RedaksiAutomationConfig> {
  try {
    const stored = await getSetting<unknown>(SETTING_KEY);
    if (!stored || typeof stored !== "object") {
      return { ...DEFAULT_REDAKSI_AUTOMATION };
    }
    const src = stored as Record<string, unknown>;
    const out: RedaksiAutomationConfig = {
      ...DEFAULT_REDAKSI_AUTOMATION,
      enabled: typeof src.enabled === "boolean" ? src.enabled : false,
      autoUpload: typeof src.autoUpload === "boolean" ? src.autoUpload : false,
      scheduleMode: src.scheduleMode === "scheduled" ? "scheduled" : "manual",
      publishAt: typeof src.publishAt === "string" ? src.publishAt : null,
      maxPerRun: clampMaxPerRun(src.maxPerRun),
      lastRunAt: typeof src.lastRunAt === "string" ? src.lastRunAt : null,
      updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : null,
    };
    // Hanya section terdaftar; value wajib boolean.
    if (src.sections && typeof src.sections === "object") {
      const s = src.sections as Record<string, unknown>;
      for (const key of AUTOMATION_SECTIONS) {
        if (typeof s[key] === "boolean") out.sections[key] = s[key];
      }
    }
    // Topik: array string dibatasi panjang; key asing diabaikan.
    if (src.topics && typeof src.topics === "object") {
      const t = src.topics as Record<string, unknown>;
      for (const key of AUTOMATION_SECTIONS) {
        if (Array.isArray(t[key])) {
          out.topics[key] = (t[key] as unknown[])
            .map((v) => (typeof v === "string" ? v.trim() : ""))
            .filter((v) => v.length >= 4)
            .slice(0, 20);
        }
      }
    }
    return out;
  } catch (err) {
    console.warn(`Gagal membaca setting "${SETTING_KEY}":`, err);
    return { ...DEFAULT_REDAKSI_AUTOMATION };
  }
}

/** Versi untuk UI admin (config tidak mengandung rahasia). */
export async function getRedaksiAutomationForAdmin(): Promise<RedaksiAutomationConfig> {
  return resolveRedaksiAutomation();
}

/**
 * Simpan config dari form /admin/redaksi/otomasi. Melempar Error bila input
 * invalid (server action pemanggil menangkap & menampilkan pesannya). Verifikasi
 * identitas admin tetap tanggung jawab server action (verifyAdmin).
 */
export async function saveRedaksiAutomation(input: unknown): Promise<RedaksiAutomationConfig> {
  if (!input || typeof input !== "object") {
    throw new Error("Input otomasi redaksi tidak valid: bukan object.");
  }
  const src = input as Record<string, unknown>;

  // Key asing ditolak dulu dengan pesan jelas (sama seperti saveFeatures).
  const allowed = new Set<string>([
    "enabled",
    "sections",
    "topics",
    "autoUpload",
    "scheduleMode",
    "publishAt",
    "maxPerRun",
  ]);
  for (const key of Object.keys(src)) {
    if (!allowed.has(key)) {
      throw new Error(`Pengaturan otomasi tidak valid: key "${key}" tidak dikenal.`);
    }
  }

  const enabled = typeof src.enabled === "boolean" ? src.enabled : false;
  const autoUpload = typeof src.autoUpload === "boolean" ? src.autoUpload : false;
  const scheduleMode = src.scheduleMode === "scheduled" ? "scheduled" : "manual";

  // publishAt wajib valid bila diisi; scheduleMode=scheduled mewajibkannya.
  let publishAt: string | null = null;
  if (src.publishAt !== null && src.publishAt !== undefined && src.publishAt !== "") {
    const raw = String(src.publishAt);
    if (Number.isNaN(new Date(raw).getTime())) {
      throw new Error("Waktu upload tidak valid — pilih tanggal & jam yang valid.");
    }
    publishAt = raw;
  }
  if (scheduleMode === "scheduled" && !publishAt) {
    throw new Error("Mode terjadwal wajib mengisi waktu upload.");
  }

  const sections = { ...DEFAULT_REDAKSI_AUTOMATION.sections };
  if (src.sections && typeof src.sections === "object") {
    const s = src.sections as Record<string, unknown>;
    for (const key of Object.keys(s)) {
      if (!isAutomationSection(key)) {
        throw new Error(`Section otomasi tidak valid: "${key}" tidak dikenal.`);
      }
      if (typeof s[key] !== "boolean") {
        throw new Error(`Section otomasi tidak valid: nilai "${key}" bukan true/false.`);
      }
      sections[key] = s[key];
    }
  }

  const topics = { ...DEFAULT_REDAKSI_AUTOMATION.topics };
  if (src.topics && typeof src.topics === "object") {
    const t = src.topics as Record<string, unknown>;
    for (const key of Object.keys(t)) {
      if (!isAutomationSection(key)) {
        throw new Error(`Topik otomasi tidak valid: section "${key}" tidak dikenal.`);
      }
      if (!Array.isArray(t[key])) {
        throw new Error(`Topik tidak valid: section "${key}" bukan daftar topik.`);
      }
      topics[key] = (t[key] as unknown[])
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length >= 4)
        .slice(0, 20);
    }
  }

  // lastRunAt TIDAK pernah ditimpa form — pertahankan nilai yang ada.
  const existing = await resolveRedaksiAutomation();

  const out: RedaksiAutomationConfig = {
    enabled,
    sections,
    topics,
    autoUpload,
    scheduleMode,
    publishAt,
    maxPerRun: clampMaxPerRun(src.maxPerRun),
    lastRunAt: existing.lastRunAt,
    updatedAt: new Date().toISOString(),
  };

  await setSetting(SETTING_KEY, out);
  return out;
}

/** Catat waktu run terakhir (best-effort, dipanggil runner). */
export async function markAutomationRun(): Promise<void> {
  try {
    const cfg = await resolveRedaksiAutomation();
    await setSetting(SETTING_KEY, { ...cfg, lastRunAt: new Date().toISOString() });
  } catch (err) {
    console.warn("Gagal mencatat lastRunAt otomasi redaksi:", err);
  }
}

// ============================================================
// STAGING DRAF — hasil auto-tulis sebelum di-review admin
// ============================================================

const STAGING_KEY = "redaksi_staging";
const MAX_STAGED = 50;

/** Satu draf hasil otomasi yang menunggu review admin. */
export interface StagedDraft {
  id: string;
  type: RedaksiContentType;
  topic: string;
  /** Field draf sesuai schema (sudah divalidasi oleh redaksi-draft.ts). */
  data: Record<string, unknown>;
  /**
   * Niat publish dari pengaturan: published & publishAt yang akan diterapkan
   * saat admin menekan "Terima & Simpan". Dengan staging, TIDAK ADA konten yang
   * tayang tanpa satu kali review manusia — bentuk "perlu izin" terkuat sekaligus
   * menjaga field wajib (mis. imageUrl proyek/produk) tetap diisi admin.
   */
  intendedPublished: boolean;
  intendedPublishAt: string | null;
  createdAt: string;
}

function isStagedDraft(v: unknown): v is StagedDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.type === "string" &&
    typeof d.topic === "string" &&
    d.data !== null &&
    typeof d.data === "object" &&
    typeof d.createdAt === "string"
  );
}

/** Baca draf tertahan (terbaru di depan). Tidak pernah throw. */
export async function listStagedDrafts(): Promise<StagedDraft[]> {
  try {
    const stored = await getSetting<unknown>(STAGING_KEY);
    if (!Array.isArray(stored)) return [];
    return stored.filter(isStagedDraft).slice(0, MAX_STAGED);
  } catch {
    return [];
  }
}

/** Tambah draf ke staging; potong yang tertua bila melebihi MAX_STAGED. */
export async function stageDraft(input: Omit<StagedDraft, "id" | "createdAt">): Promise<StagedDraft> {
  const draft: StagedDraft = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const list = await listStagedDrafts();
  list.unshift(draft);
  await setSetting(STAGING_KEY, list.slice(0, MAX_STAGED));
  return draft;
}

/** Hapus satu draf tertahan berdasarkan id. */
export async function deleteStagedDraft(id: string): Promise<void> {
  const list = await listStagedDrafts();
  await setSetting(
    STAGING_KEY,
    list.filter((d) => d.id !== id)
  );
}

/** Ambil satu draf tertahan (untuk load ke composer). */
export async function getStagedDraft(id: string): Promise<StagedDraft | null> {
  const list = await listStagedDrafts();
  return list.find((d) => d.id === id) ?? null;
}

/**
 * Hitung niat publish dari config: autoUpload=true → published langsung;
 * scheduled → published dengan publishAt di masa depan (infra publishAt yang
 * sudah ada akan menampilkannya saat waktunya tiba); selain itu → draft manual.
 */
export function computePublishIntent(cfg: RedaksiAutomationConfig): {
  intendedPublished: boolean;
  intendedPublishAt: string | null;
} {
  if (cfg.scheduleMode === "scheduled" && cfg.publishAt) {
    return { intendedPublished: true, intendedPublishAt: cfg.publishAt };
  }
  if (cfg.autoUpload) return { intendedPublished: true, intendedPublishAt: null };
  return { intendedPublished: false, intendedPublishAt: null };
}


