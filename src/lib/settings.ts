/**
 * Penyimpanan pengaturan aplikasi (key/value) — SERVER-ONLY.
 *
 * Sama filosofinya dengan actions.ts: Neon Postgres bila DATABASE_URL terisi,
 * fallback ke file JSON lokal bila tidak (dev/offline). Perbedaan: tabelnya
 * terpisah (`settings`) dan valuenya JSON, karena yang disimpan adalah
 * konfigurasi terstruktur (mis. {provider, apiKey, model} untuk Cloud AI).
 *
 * Keamanan: value bisa berisi rahasia. Pengakses wajib mem-mask sebelum
 * mengembalikan ke client; penulisan hanya lewat server action + verifyAdmin.
 */
import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import { settings, settingsHistory } from "@/db/schema";

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join("/tmp", "my-web-porto-data") : path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(DATA_DIR, "local-settings.json");

/** Baca satu pengaturan (ter-parse), atau null bila tidak ada / gagal. */
export async function getSetting<T>(key: string): Promise<T | null> {
  try {
    if (isDbConnected) {
      const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (rows.length) return (rows[0].value as T) ?? null;
      return null;
    }
    const parsed = readLocal();
    return (parsed?.[key] as T) ?? null;
  } catch (err) {
    console.warn(`Gagal membaca setting "${key}":`, err);
    return null;
  }
}

/** Tulis satu pengaturan (upsert). Tidak pernah throw — panggilan menangani. */
export async function setSetting(key: string, value: unknown): Promise<void> {
  try {
    if (isDbConnected) {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      return;
    }
    const parsed = readLocal() || {};
    parsed[key] = value;
    ensureDir();
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(parsed, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Gagal menulis setting "${key}":`, err);
    throw err;
  }
}

/** Hapus satu pengaturan. Berguna untuk membuang draf saat publish / discard. */
export async function deleteSetting(key: string): Promise<void> {
  try {
    if (isDbConnected) {
      await db.delete(settings).where(eq(settings.key, key));
      return;
    }
    const parsed = readLocal();
    if (parsed && key in parsed) {
      delete parsed[key];
      ensureDir();
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn(`Gagal menghapus setting "${key}":`, err);
  }
}

export interface SettingHistoryRecord {
  id: string;
  key: string;
  value: unknown;
  label?: string | null;
  actor?: string | null;
  createdAt: string;
}

const HISTORY_LOCAL_FILE = path.join(DATA_DIR, "local-settings-history.json");

function readLocalHistory(): SettingHistoryRecord[] {
  try {
    if (!fs.existsSync(HISTORY_LOCAL_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_LOCAL_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Simpan snapshot konfigurasi ke tabel / file riwayat settings_history */
export async function recordSettingHistory(input: {
  key: string;
  value: unknown;
  label?: string;
  actor?: string | null;
}): Promise<SettingHistoryRecord> {
  const record: SettingHistoryRecord = {
    id: crypto.randomUUID(),
    key: input.key,
    value: input.value,
    label: input.label ?? null,
    actor: input.actor ?? null,
    createdAt: new Date().toISOString(),
  };

  try {
    if (isDbConnected) {
      await db.insert(settingsHistory).values({
        id: record.id,
        key: record.key,
        value: record.value,
        label: record.label,
        actor: record.actor,
        createdAt: new Date(record.createdAt),
      });
      return record;
    }

    const list = readLocalHistory();
    list.unshift(record);
    // Batasi retensi lokal hingga 100 snapshot terbaru
    const trimmed = list.slice(0, 100);
    ensureDir();
    fs.writeFileSync(HISTORY_LOCAL_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
    return record;
  } catch (err) {
    console.warn(`Gagal mencatat history setting "${input.key}":`, err);
    return record;
  }
}

/** Ambil daftar riwayat untuk key tertentu (diurutkan dari yang paling baru) */
export async function getSettingHistory(key: string, limit = 20): Promise<SettingHistoryRecord[]> {
  try {
    if (isDbConnected) {
      const rows = await db
        .select()
        .from(settingsHistory)
        .where(eq(settingsHistory.key, key))
        .orderBy(desc(settingsHistory.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        id: r.id,
        key: r.key,
        value: r.value,
        label: r.label,
        actor: r.actor,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    const list = readLocalHistory();
    return list.filter((item) => item.key === key).slice(0, limit);
  } catch (err) {
    console.warn(`Gagal mengambil history setting "${key}":`, err);
    return [];
  }
}

/** Ambil snapshot riwayat spesifik berdasarkan ID */
export async function getSettingHistoryById(id: string): Promise<SettingHistoryRecord | null> {
  try {
    if (isDbConnected) {
      const rows = await db
        .select()
        .from(settingsHistory)
        .where(eq(settingsHistory.id, id))
        .limit(1);

      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        key: r.key,
        value: r.value,
        label: r.label,
        actor: r.actor,
        createdAt: r.createdAt.toISOString(),
      };
    }

    const list = readLocalHistory();
    return list.find((item) => item.id === id) ?? null;
  } catch (err) {
    console.warn(`Gagal mengambil history setting by id "${id}":`, err);
    return null;
  }
}


function ensureDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Direktori read-only (serverless) — ditangani pemanggil.
  }
}

function readLocal(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return null;
    const raw = fs.readFileSync(LOCAL_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
