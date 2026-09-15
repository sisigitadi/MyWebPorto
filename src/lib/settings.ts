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
import { eq } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import { settings } from "@/db/schema";

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
