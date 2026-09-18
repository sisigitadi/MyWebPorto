/**
 * Resolusi konfigurasi app SigitOS — SERVER-ONLY.
 *
 * Sama filosofinya dengan cloud-ai-config.ts: pengaturan admin (tabel settings,
 * key "os_apps") menimpa default di kode, tanpa migrasi schema dan tanpa
 * redeploy. Yang disimpan hanya {id, enabled, order} — ikon, warna, dan label
 * tetap di kode (tidak bisa direpresentasikan sebagai JSON).
 *
 * Kegagalan apa pun (setting tidak ada, format salah, id asing) JATUH ke
 * DEFAULT_OS_APPS — situs tidak pernah menjadi kosong. Satu aturan keras:
 * minimal satu app harus aktif, kalau tidak, pengunjung tidak bisa pindah
 * jendela sama sekali.
 */
import { z } from "zod";
import { getSetting, setSetting } from "@/lib/settings";
import {
  APP_IDS,
  appHumanLabel,
  DEFAULT_OS_APPS,
  type AppId,
  type OSAppConfig,
} from "@/lib/os-apps-meta";

const SETTING_KEY = "os_apps";

const osAppSchema = z.object({
  id: z.enum(APP_IDS),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(APP_IDS.length - 1),
});

export interface ResolvedOSApps {
  /** Daftar SEMUA app (termasuk yang dimatikan), terurut. */
  apps: OSAppConfig[];
  /** Hanya yang aktif — inilah yang dirender ke pengunjung. */
  enabled: OSAppConfig[];
  /** Asal konfigurasi: "admin" (sudah disimpan) | "default" (belum diatur). */
  source: "admin" | "default";
}

/**
 * Normalisasi input mentah dari DB menjadi konfigurasi yang valid:
 *  - entry rusak (bukan object, id asing, field tidak sesuai) dilewati,
 *  - duplikat dibuang (yang pertama menang),
 *  - app yang tidak disebut diisi default (enabled = true),
 *  - urutan disusun ulang berdasarkan `order`, seri mengikuti urutan input,
 *  - urutan akhir di-rapikan jadi 0..N-1.
 *
 * Tidak pernah melempar — data di tabel settings bisa ditulis tangan/usiang,
 * dan situs harus tetap dirender. Berbeda dengan saveOSApps() yang menolak
 * keras input dari form admin (di sana pesan error ditampilkan ke admin).
 */
function normalize(input: unknown): OSAppConfig[] {
  const raw = Array.isArray(input) ? input : [];
  const seen = new Set<AppId>();
  const valid: OSAppConfig[] = [];

  for (const entry of raw) {
    const parsed = osAppSchema.safeParse(entry);
    if (!parsed.success) continue; // entry rusak/asing dilewati, bukan seluruh config.
    if (seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    valid.push(parsed.data);
  }

  // App yang tidak disebut dapat default aktif di urutan terakhir.
  for (const id of APP_IDS) {
    if (!seen.has(id)) valid.push({ id, enabled: true, order: valid.length });
  }

  // Stable sort: seri mempertahankan urutan kedatangan.
  const ordered = [...valid].sort((a, b) => a.order - b.order);
  return ordered.map((a, i) => ({ id: a.id, enabled: a.enabled, order: i }));
}

export async function resolveOSApps(): Promise<ResolvedOSApps> {
  const stored = await getSetting<unknown>(SETTING_KEY);
  const apps = normalize(stored);

  // Jaminan keras: minimal satu app aktif. Tanpa ini admin bisa mengunci
  // dirinya sendiri keluar dari semua jendela (tidak ada cara bawaan untuk
  // navigasi). Pengaman ini juga mengembalikan kondisi bila satu-satunya app
  // aktif dimatikan.
  if (!apps.some((a) => a.enabled)) {
    return {
      apps: DEFAULT_OS_APPS.map((a) => ({ ...a })),
      enabled: DEFAULT_OS_APPS.map((a) => ({ ...a })),
      source: "default",
    };
  }

  return {
    apps,
    enabled: apps.filter((a) => a.enabled),
    source: stored ? "admin" : "default",
  };
}

/**
 * Simpan konfigurasi dari form /admin/appearance. Melempar bila input invalid
 * (server action pemanggil menangkap & menampilkan pesannya). Verifikasi
 * identitas admin tetap tanggung jawab server action (verifyAdmin).
 */
export async function saveOSApps(input: OSAppConfig[]): Promise<void> {
  const raw = Array.isArray(input) ? input : [];

  // Id asing ditolak dulu dengan pesan jelas (beda dari normalize() yang
  // memaafkannya — data dari admin harus eksplisit, data DB mungkin usang).
  for (const entry of raw) {
    const id = entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined;
    if (typeof id !== "string" || !(APP_IDS as readonly string[]).includes(id)) {
      throw new Error(`Konfigurasi app tidak valid: id "${String(id)}" tidak dikenal.`);
    }
  }

  const parsed = z.array(osAppSchema).safeParse(raw);
  if (!parsed.success) {
    throw new Error("Konfigurasi app tidak valid: format enabled/order tidak sesuai (boolean & angka 0–7).");
  }

  const ids = parsed.data.map((a) => a.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Konfigurasi app tidak valid: ada id app yang ditulis lebih dari sekali.");
  }

  // Lengkapi app yang tidak disebut (form hanya mengirim baris yang terlihat).
  const complete = [...parsed.data];
  for (const id of APP_IDS) {
    if (!complete.some((a) => a.id === id)) {
      complete.push({ id, enabled: true, order: complete.length });
    }
  }

  const normalized = [...complete]
    .sort((a, b) => a.order - b.order)
    .map((a, i) => ({ id: a.id, enabled: a.enabled, order: i }));

  if (!normalized.some((a) => a.enabled)) {
    throw new Error("Minimal satu app harus aktif — pengunjung butuh satu jendela untuk bernavigasi.");
  }

  await setSetting(SETTING_KEY, normalized);
}

/** Ringkasan untuk UI admin: jumlah aktif + label, tanpa perlu akses DB lain. */
export function describeOSApps(apps: OSAppConfig[], lang: "id" | "en"): string {
  const active = apps.filter((a) => a.enabled);
  return `${active.length}/${apps.length} aktif · ${active
    .map((a) => appHumanLabel(a.id, lang))
    .join(", ")}`;
}
