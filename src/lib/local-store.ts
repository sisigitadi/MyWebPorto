import fs from "fs";
import path from "path";
import {
  DUMMY_PROFILE,
  DUMMY_PROJECTS,
  DUMMY_SERVICES,
  DUMMY_PRODUCTS,
  DUMMY_TESTIMONIALS,
  DUMMY_ARTICLES,
  type ProjectData,
  type ServiceData,
  type ProductData,
  type TestimonialData,
  type ArticleData,
  type ProfileData,
} from "@/lib/dummy-data";

export interface LocalStoreData {
  profile: ProfileData;
  projects: ProjectData[];
  services: ServiceData[];
  products: ProductData[];
  testimonials: TestimonialData[];
  articles: ArticleData[];
  auditLogs?: unknown[];
}

const isVercel = Boolean(process.env.VERCEL);
export const LOCAL_STORE_DIR = isVercel
  ? path.join("/tmp", "my-web-porto-data")
  : path.join(process.cwd(), "data");
export const LOCAL_STORE_FILE = path.join(LOCAL_STORE_DIR, "local-store.json");

function buildDefaultStore(): LocalStoreData {
  return {
    profile: DUMMY_PROFILE,
    projects: DUMMY_PROJECTS,
    services: DUMMY_SERVICES,
    products: DUMMY_PRODUCTS,
    testimonials: DUMMY_TESTIMONIALS,
    articles: DUMMY_ARTICLES,
  };
}

export function ensureLocalStoreExists(): void {
  try {
    if (!fs.existsSync(LOCAL_STORE_DIR)) {
      fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(buildDefaultStore(), null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Inisialisasi local store dilewati (lingkungan read-only):", err);
  }
}

let localStoreMemoryCache: { data: LocalStoreData; mtime: number } | null = null;

export function invalidateLocalStoreCache(): void {
  localStoreMemoryCache = null;
}

export function getLocalStore(): LocalStoreData | null {
  try {
    ensureLocalStoreExists();
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const stats = fs.statSync(LOCAL_STORE_FILE);
      if (localStoreMemoryCache && localStoreMemoryCache.mtime === stats.mtimeMs) {
        return localStoreMemoryCache.data;
      }
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as LocalStoreData;
      localStoreMemoryCache = { data: parsed, mtime: stats.mtimeMs };
      return parsed;
    }
  } catch (err) {
    console.warn("Gagal membaca local store:", err);
  }
  return null;
}

export function updateLocalStore<K extends keyof LocalStoreData>(key: K, data: LocalStoreData[K]): void {
  try {
    ensureLocalStoreExists();
    const store = getLocalStore() || buildDefaultStore();
    const nextStore: LocalStoreData = { ...store, [key]: data };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(nextStore, null, 2), "utf-8");
    try {
      const stats = fs.statSync(LOCAL_STORE_FILE);
      localStoreMemoryCache = { data: nextStore, mtime: stats.mtimeMs };
    } catch {
      localStoreMemoryCache = null;
    }
  } catch (err) {
    console.warn("Gagal menulis ke local store:", err);
  }
}
