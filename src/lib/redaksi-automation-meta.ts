/**
 * Metadata pengaturan Otomasi Redaksi — MURNI DATA, TANPA import server.
 *
 * Sama filosofinya dengan features-meta.ts: dipisah dari redaksi-automation.ts
 * (yang membaca tabel settings & mengimpor modul server-only) supaya AMAN
 * diimpor ke komponen client (redaksi-automation-form.tsx).
 *
 * Sumber kebenaran tunggal untuk: daftar section yang bisa diotomasi, label &
 * deskripsi form admin, nilai default, dan batas keamanan.
 */
import {
  REDAKSI_TYPES,
  type RedaksiContentType,
} from "@/lib/redaksi-meta";

/** Section yang dapat diotomasi = sama dengan tipe konten Redaksi. */
export type AutomationSection = RedaksiContentType;

export const AUTOMATION_SECTIONS: readonly AutomationSection[] = REDAKSI_TYPES.map(
  (t) => t.key
);

/** Bentuk config yang disimpan di tabel settings (key "redaksi_auto"). */
export interface RedaksiAutomationConfig {
  /** Master switch. Default OFF — otomasi tidak pernah jalan tanpa opt-in. */
  enabled: boolean;
  /** On/off per section (semua bagian bisa disetting terpisah). */
  sections: Record<AutomationSection, boolean>;
  /** Daftar topik/brief per section; diambil bergantian saat run. */
  topics: Record<AutomationSection, string[]>;
  /**
   * "Perlu izin": publish LANGSUNG (published=true) tanpa review. Default false
   * — hasil run disimpan sebagai draft. Menyalakan memerlukan dialog konfirmasi
   * eksplisit (pola `dangerous` di features-meta.ts).
   */
  autoUpload: boolean;
  /** "Waktu upload": manual = langsung saat run; scheduled = ditahan via publishAt. */
  scheduleMode: "manual" | "scheduled";
  /** ISO datetime saat scheduleMode="scheduled" (dipakai ulang infra publishAt). */
  publishAt: string | null;
  /** Batas jumlah draf per run — menahan biaya AI & spam konten. */
  maxPerRun: number;
  /** Timestamp run terakhir (diperbarui runner, bukan oleh form). */
  lastRunAt: string | null;
  updatedAt: string | null;
}

function emptySections<T>(value: T): Record<AutomationSection, T> {
  const out = {} as Record<AutomationSection, T>;
  for (const s of AUTOMATION_SECTIONS) out[s] = value;
  return out;
}

/**
 * Default = kondisi sekarang: otomasi MATI total, tidak ada topik, autoUpload
 * mati, manual. Dipakai saat settings.redaksi_auto belum ada/kosong/rusak —
 * SITUS TIDAK PERNAH menulis konten otomatis karena masalah infra.
 */
export const DEFAULT_REDAKSI_AUTOMATION: RedaksiAutomationConfig = {
  enabled: false,
  sections: emptySections(false),
  topics: emptySections([]),
  autoUpload: false,
  scheduleMode: "manual",
  publishAt: null,
  maxPerRun: 3,
  lastRunAt: null,
  updatedAt: null,
};

/** Batas keras maxPerRun (berapapun yang disimpan admin, tidak melebihi ini). */
export const MAX_PER_RUN_HARD_CAP = 10;

/** Label & deskripsi per section untuk form /admin/redaksi/otomasi. */
export const AUTOMATION_SECTION_LABELS: Record<
  AutomationSection,
  { label: string; description: string }
> = {
  article: {
    label: "Artikel",
    description: "Membuat draf artikel teknis/esai dari topik yang diisi.",
  },
  project: {
    label: "Proyek",
    description: "Membuat draf deskripsi proyek portofolio dari topik.",
  },
  service: {
    label: "Layanan",
    description: "Membuat draf deskripsi layanan dari topik.",
  },
  product: {
    label: "Produk",
    description: "Membuat draf deskripsi produk digital dari topik.",
  },
  testimonial: {
    label: "Testimoni",
    description: "Membuat draf testimoni — WAJIB diverifikasi keasliannya sebelum publish.",
  },
  profile: {
    label: "Profil Pribadi",
    description: "Menulis ulang bio profil — menimpa draft bio (bukan batch).",
  },
};
