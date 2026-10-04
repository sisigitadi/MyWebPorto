/**
 * Estimasi sisa quota free-tier Gemini — SERVER-ONLY, in-memory per-instance.
 *
 * Gemini API TIDAK punya endpoint "sisa quota". Satu-satunya cara
 * memperkirakannya adalah dengan mencatat sendiri permintaan yang kita kirim
 * (rolling window) dan mempelajari batas asli dari tubuh error 429 yang
 * dikembalikan Google — biasanya berisi pesan "Requests per minute: N" /
 * "Requests per day: N" (nilai `quotaValue` di `error.details`) serta header
 * `Retry-After`.
 *
 * Penyimpanan bersifat in-memory: angka dihitung per-instance (proses `next
 * dev` ini atau satu serverless function Vercel). Semua route dalam satu proses
 * berbagi store yang sama lewat `globalThis` (lihat di bawah), jadi catatan
 * dari route handler API langsung terlihat di halaman admin. Restart/cold-start menghapus
 * hitungan → ini ESTIMASI, bukan angka resmi Google. UI harus selalu
 * menyandangnya sebagai "estimasi".
 *
 * Prioritas batas efektif: DIPELAJARI (dari 429 asli) > env (`GEMINI_FREE_RPM` /
 * `GEMINI_FREE_RPD`) > tabel default. Tabel default di bawah HANYA pendekatan
 * konservatif untuk model flash/pro populer per Oktober 2026 — angka resmi
 * Google bisa berubah; bila nilai default keliru, error 429 pertama akan
 * mengoreksinya secara otomatis (learned limits menimpa default).
 */

/** Batas default free-tier (per menit / per hari) per keluarga model. */
const DEFAULT_GEMINI_FREE_LIMITS: Record<string, { rpm: number; rpd: number }> = {
  "gemini-3.5-flash": { rpm: 10, rpd: 250 },
  "gemini-2.5-flash": { rpm: 10, rpd: 250 },
  "gemini-2.5-pro": { rpm: 5, rpd: 50 },
  "gemini-2.0-flash": { rpm: 15, rpd: 1500 },
  "gemini-1.5-flash": { rpm: 15, rpd: 1500 },
  "gemini-1.5-pro": { rpm: 2, rpd: 50 },
  "gemini-flash-latest": { rpm: 15, rpd: 1500 },
};

/** Bila model tidak cocok tabel manapun (mis. varian preview/fresh). */
const GLOBAL_DEFAULT = { rpm: 10, rpd: 250 };

const RPM_WINDOW_MS = 60_000;
const RPD_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Jaga memori: tetap simpan maksimal cap timestamp per model per window. */
const MAX_ENTRIES = 5000;

/** Ambil batas default untuk sebuah model (cocok persis → prefix keluarga). */
function defaultLimitsFor(model: string): { rpm: number; rpd: number } {
  const name = (model || "").trim().toLowerCase();
  if (!name) return { ...GLOBAL_DEFAULT };
  if (DEFAULT_GEMINI_FREE_LIMITS[name]) return { ...DEFAULT_GEMINI_FREE_LIMITS[name] };
  // Varian seperti "gemini-2.5-flash-preview-05-20" → ambul tabel keluarga
  // dengan key yang menjadi awalan nama model (paling panjang dulu).
  const families = Object.keys(DEFAULT_GEMINI_FREE_LIMITS).sort(
    (a, b) => b.length - a.length
  );
  for (const f of families) {
    if (name.startsWith(f)) return { ...DEFAULT_GEMINI_FREE_LIMITS[f] };
  }
  return { ...GLOBAL_DEFAULT };
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface ModelState {
  /** Timestamp (ms) permintaan dalam rolling window 60 detik. */
  rpm: number[];
  /** Timestamp (ms) permintaan dalam rolling window 24 jam. */
  rpd: number[];
  /** Batas asli yang dipelajari dari error 429 Google (menimpa env/default). */
  learnedRpm: number | null;
  learnedRpd: number | null;
  /** Timestamp (ms) hingga model ini dianggap masih dibatasi (Retry-After). */
  limitedUntil: number | null;
}

/**
 * Store disimpan di `globalThis`, BUKAN variabel module-level. Alasannya:
 * mode `next dev` me-bundle setiap route ke module registry terpisah, jadi
 * `const store = new Map()` akan menjadi instance BERBEDA di route handler
 * `/api/retrobot` (yang mencatat permintaan) vs Server Component halaman
 * admin (yang membaca snapshot) → angka di admin selalu 0 meski sudah ada
 * permintaan nyata. `globalThis` bersifat per-proses (satu proses `next dev`
 * menjalankan semua route node), sehingga semua route berbagi instance yang
 * sama; ini sekaligus membuat hitungan tahan terhadap Fast Refresh/HMR.
 */
const globalForQuota = globalThis as unknown as {
  __geminiQuotaStore?: Map<string, ModelState>;
};
const store: Map<string, ModelState> =
  globalForQuota.__geminiQuotaStore ?? new Map();
if (!globalForQuota.__geminiQuotaStore) {
  globalForQuota.__geminiQuotaStore = store;
}

function key(model: string): string {
  return (model || "").trim().toLowerCase();
}

function stateFor(model: string): ModelState {
  const k = key(model);
  let s = store.get(k);
  if (!s) {
    s = { rpm: [], rpd: [], learnedRpm: null, learnedRpd: null, limitedUntil: null };
    store.set(k, s);
  }
  return s;
}

/** Buang timestamp kedaluwarsa di luar rolling window. */
function prune(s: ModelState, now: number): void {
  while (s.rpm.length && now - s.rpm[0] >= RPM_WINDOW_MS) s.rpm.shift();
  while (s.rpd.length && now - s.rpd[0] >= RPD_WINDOW_MS) s.rpd.shift();
}

/**
 * Catat satu permintaan keluar ke `model` (dipanggil SEBELUM fetch, baik saat
 * permintaan itu akan sukses maupun ditolak — permintaan yang ditolak 429 tetap
 * dihitung sebagai konsumsi quota oleh Google). Tidak pernah throw.
 */
export function recordGeminiRequest(model: string): void {
  try {
    const s = stateFor(model);
    const now = Date.now();
    prune(s, now);
    s.rpm.push(now);
    s.rpd.push(now);
    // Jaga agar array tidak tumbuh tak terbatas bila traffic tinggi.
    if (s.rpm.length > MAX_ENTRIES) s.rpm.splice(0, s.rpm.length - MAX_ENTRIES);
    if (s.rpd.length > MAX_ENTRIES) s.rpd.splice(0, s.rpd.length - MAX_ENTRIES);
  } catch {
    // Pelacakan quota tidak boleh memengaruhi jalur utama.
  }
}

/** Header `Retry-After` (detik) atau tanggal HTTP → jangka waktu dalam ms. */
function parseRetryAfter(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const seconds = Number.parseFloat(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value.trim());
  if (Number.isFinite(date) && date > now) return date - now;
  return null;
}

/**
 * Bentuk tubuh error Gemini yang relevan untuk parsing (hanya bagian yang
 * kita baca; sisanya diabaikan secara aman).
 */
interface GeminiErrorBody {
  error?: {
    message?: string;
    details?: {
      metadata?: Record<string, string>;
      reason?: string;
    }[];
  };
}

/**
 * Pelajari batas quota asli dari tubuh error 429 Google. Pesan standarnya
 * memuat "Requests per minute: N" (RPM) atau "Requests per day: N" (RPD);
 * cadangan: `metadata.quotaValue` + `quotaId` di `error.details`.
 */
function parseQuotaLimits(body: string | null | undefined): {
  rpm: number | null;
  rpd: number | null;
} {
  if (!body) return { rpm: null, rpd: null };
  const result = { rpm: null as number | null, rpd: null as number | null };
  try {
    const parsed = JSON.parse(body) as GeminiErrorBody;
    const message = parsed.error?.message || "";

    const minuteMatch = /Requests per minute(?:\s+per\s+\w+)?:\s*(\d+)/i.exec(message);
    if (minuteMatch) result.rpm = Number.parseInt(minuteMatch[1], 10) || null;
    const dayMatch = /Requests per day(?:\s+per\s+\w+)?:\s*(\d+)/i.exec(message);
    if (dayMatch) result.rpd = Number.parseInt(dayMatch[1], 10) || null;

    // Cadangan terstruktur: quotaValue hanya bermakna bila quotaId memberi
    // tahu kita metric-nya (per menit vs per hari).
    for (const d of parsed.error?.details || []) {
      const meta = d?.metadata || {};
      const qv = parsePositiveInt(meta.quotaValue);
      if (!qv) continue;
      const metric = `${meta.quotaId || ""} ${d?.reason || ""}`.toLowerCase();
      if (metric.includes("day")) result.rpd ??= qv;
      else if (metric.includes("minute") || metric.includes("rate")) result.rpm ??= qv;
    }
  } catch {
    // Bukan JSON (mis. halaman error HTML) → tidak ada yang bisa dipelajari.
  }
  return result;
}

/**
 * Catat bahwa `model` mengembalikan response non-ok (biasanya 429). Pelajari
 * batas asli + catat masa pembatasan dari `Retry-After`. Tidak pernah throw.
 */
export function recordGeminiRateLimit(
  model: string,
  opts: { status?: number; body?: string | null; retryAfter?: string | null } = {}
): void {
  try {
    const s = stateFor(model);
    const now = Date.now();
    const wait = parseRetryAfter(opts.retryAfter, now);
    if (wait !== null) s.limitedUntil = now + wait;
    const learned = parseQuotaLimits(opts.body);
    if (learned.rpm) s.learnedRpm = learned.rpm;
    if (learned.rpd) s.learnedRpd = learned.rpd;
  } catch {
    // Penanganan quota tidak boleh memengaruhi jalur utama.
  }
}

export interface GeminiModelQuota {
  model: string;
  rpmUsed: number;
  rpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  lastRequestAt: number | null;
  /** Timestamp (ms) sampai kapan model masih dianggap dibatasi Google. */
  limitedUntil: number | null;
  /** Asal batas efektif: learned (dari 429 asli) > env > default. */
  limitSource: "learned" | "env" | "default";
  /** status ringkas untuk badge UI. */
  status: "ok" | "near" | "limited";
}

export interface GeminiQuotaSnapshot {
  /** Angka estimasi per model (urutan sesuai input, aktif pertama). */
  models: GeminiModelQuota[];
  generatedAt: number;
  rollingWindowRpmMs: number;
  rollingWindowRpdMs: number;
}

const NEAR_RATIO = 0.8;

/**
 * Snapshot estimasi quota untuk daftar model (biasanya model aktif + model
 * cadangan dari getGeminiFallbackModels). Angka diambil dari instance yang
 * sedang berjalan — bersifat estimasi, lihat catatan di atas file.
 */
export function getGeminiQuotaSnapshot(models: string[]): GeminiQuotaSnapshot {
  const now = Date.now();
  const envRpm = parsePositiveInt(process.env.GEMINI_FREE_RPM);
  const envRpd = parsePositiveInt(process.env.GEMINI_FREE_RPD);
  const seen = new Set<string>();
  const list: GeminiModelQuota[] = [];

  for (const m of models) {
    const k = key(m);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const s = stateFor(m);
    prune(s, now);

    const def = defaultLimitsFor(m);
    const learned = s.learnedRpm !== null || s.learnedRpd !== null;
    const rpmLimit = s.learnedRpm ?? envRpm ?? def.rpm;
    const rpdLimit = s.learnedRpd ?? envRpd ?? def.rpd;
    const rpmUsed = s.rpm.length;
    const rpdUsed = s.rpd.length;

    const limited = s.limitedUntil !== null && s.limitedUntil > now;
    const near =
      !limited && (rpmUsed / rpmLimit >= NEAR_RATIO || rpdUsed / rpdLimit >= NEAR_RATIO);

    list.push({
      model: m,
      rpmUsed,
      rpmLimit,
      rpdUsed,
      rpdLimit,
      lastRequestAt: s.rpm.length ? s.rpm[s.rpm.length - 1] : null,
      limitedUntil: s.limitedUntil,
      limitSource: learned ? "learned" : envRpm !== null || envRpd !== null ? "env" : "default",
      status: limited ? "limited" : near ? "near" : "ok",
    });
  }

  return {
    models: list,
    generatedAt: now,
    rollingWindowRpmMs: RPM_WINDOW_MS,
    rollingWindowRpdMs: RPD_WINDOW_MS,
  };
}
