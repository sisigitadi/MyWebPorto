# God Mode Fase 3 — Feature Flag Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyalakan/mematikan empat fitur besar situs publik (`enable_terminal`, `enable_store_cart`, `enable_articles`, `maintenance_mode`) dari panel admin tanpa kode atau redeploy, disimpan di `settings.features` (NOL migrasi schema).

**Architecture:** Tiga lapisan seperti Fase 1/2 — `features-meta.ts` (client-safe, sumber kebenaran daftar flag + label + default), `features-config.ts` (server-only: resolve toleran / save ketat), `features-context.tsx` (delivery ke client via props dari server layout, bukan fetch client, bukan `NEXT_PUBLIC_`). Satu flag mengikat beberapa titik sekaligus (terminal = app + widget + endpoint + action; articles = app + 2 route). `maintenance_mode` mengganti seluruh tree publik di layout; route group `(admin)` punya layout sendiri sehingga panel admin tetap jalan.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.9.3, Drizzle/Neon (tabel `settings` jsonb), Vitest, Playwright, shadcn/ui (card/badge/button/alert-dialog), sonner, lucide-react.

**Spec:** `plans/godmode-fase3-feature-flags-design.md` — plan ini berargumen dari spec tersebut; executor membaca keduanya.

## Global Constraints

(Spec §1, §5, §6 + pelajaran Fase 1/2 dari `memory/godmode-admin-roadmap.md` — berlaku untuk SETIAP task.)

- **Semua dalam Bahasa Indonesia:** komentar kode, pesan error `throw`, copy UI publik & admin, commit message, PR description.
- **Commit message** diawali `@ ` dan diakhiri baris `Co-Authored-By: Claude Code <noreply@anthropic.com>`; PR description diakhiri `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Blast radius minimum** ("jangan mengganggu yg lain apabila tidak terpaksa"): TIDAK menyentuh schema DB, `middleware.ts`, `os-apps-config.ts`, `ui-strings-config.ts`, `cart-context.tsx`, `header.tsx`/`os-menubar.tsx`, konfigurasi AI, behavior halaman admin lain. Tidak ada refactor tidak terkait.
- **Boundary client/server:** `features-config.ts` (mengimpor `@/lib/settings` → drizzle/fs/db) HANYA boleh diimpor di server component `(public)/layout.tsx`, `(public)/artikel/*page.tsx`, `(admin)/features/page.tsx`, `actions.ts` (`"use server"`), dan `app/api/retrobot/route.ts`. Yang masuk client bundle HANYA `features-meta.ts` + `features-context.tsx`. Diverifikasi via `npm run build` (Task 11).
- **Keamanan asimetris:** read-path (`resolveFeatures`) tidak pernah melempar — DB hilang/kosong/korup/key asing/value non-boolean → kembali ke `DEFAULT_FEATURES` (fitur ON, maintenance OFF); write-path (`saveFeatures`) menolak keras dengan pesan Indonesia.
- **Setiap mutasi:** `verifyAdmin()` + `logAudit({action:"update", entity:"settings", entityId:"features"})` + `revalidatePath("/", "layout")`.
- **`.tsx` tidak bisa diimpor di vitest** (`tsconfig.json` `jsx:"preserve"` → `vite:import-analysis` menolak, seluruh suite 0 test run). Karena itu meta harus modul `.ts` murni; context provider `.tsx` TIDAK boleh diimpor test.
- **Test file yang menyentuh `data/local-settings.json` WAJIB terdaftar di `SHARED_FS_TESTS`** (project serial) di `vitest.config.mts` — bila lupa, `beforeEach` satu file menghapus file persis saat file lain menulis → flaky race.
- **e2e OS desktop WAJIB viewport mobile 375×740**: mode desktop hanya merender section app AKTIF; mode mobile merender SELURUH section dalam satu dokumen scroll.
- **Write tool mendekode escape `\uXXXX`/`\x..` jadi byte kontrol mentah** → git melihat file binary. Tulis regex char kontrol via `new RegExp("[\\x00-\\x1f\\x7f]")` (tidak dipakai di Fase 3, tapi jangan coba-coba inline escape lain).
- **Dispatch subagent di sesi ini: parameter model `sonnet`/`haiku`/`opus` ditolak API 400** — omit param, mewarisi model sesi.
- **Gate CI akhir:** `npm run lint && npx tsc --noEmit && npm run test && npm run test:e2e:godmode && npm run build` — semua hijau sebelum PR.

---

## Task 1: `features-meta.ts` — metadata flag (client-safe, murni data)

**Files:**
- Create: `src/lib/features-meta.ts`

**Interfaces:**
- Produces: `FEATURE_KEYS` (tuple `as const`), `type FeatureKey`, `type Features = Record<FeatureKey, boolean>`, `interface FeatureDef`, `FEATURE_DEFS`, `FEATURE_GROUPS`, `DEFAULT_FEATURES`, `isFeatureKey()`. Task 2, 3, 5–10 semuanya mengkonsumsi ini.

- [ ] **Step 1: Tulis `src/lib/features-meta.ts` persis seperti ini**

```ts
/**
 * Metadata feature flag global — murni data, TANPA import server.
 *
 * Sama filosofinya dengan os-apps-meta.ts / ui-strings-meta.ts: file ini
 * dipisah dari features-config.ts (yang membaca tabel settings dan mengimpor
 * modul server-only) supaya AMAN diimpor ke komponen client
 * (features-context.tsx, os-desktop-manager.tsx, retro-bot.tsx, dst.). Kalau
 * label ditarik dari features-config.ts, seluruh dependensinya (drizzle, fs,
 * db) ikut masuk bundle browser.
 *
 * Sumber kebenaran tunggal untuk: daftar flag, label & deskripsi form admin,
 * nilai default, dan pengelompokan UI.
 */

/** Id flag yang dikenal. Tuple `as const` agar tipenya menyempit jadi union. */
export const FEATURE_KEYS = [
  "enable_terminal",
  "enable_store_cart",
  "enable_articles",
  "maintenance_mode",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Bentuk data yang disimpan di settings.features: flat boolean per flag. */
export type Features = Record<FeatureKey, boolean>;

/** Satu definisi flag untuk form /admin/features. */
export interface FeatureDef {
  key: FeatureKey;
  /** Label pendek (ID) di samping toggle. */
  label: string;
  /** Penjelasan apa yang dikendalikan, dwibahasa. */
  description: { id: string; en: string };
  /** Nama kelompok (heading) di form admin. */
  group: string;
  /**
   * Toggle yang langsung mengubah seluruh situs publik saat disimpan —
   * memerlukan dialog konfirmasi di form.
   */
  dangerous?: true;
}

/**
 * Definisi flag untuk /admin/features. Label & deskripsi dwibahasa hidup di
 * sini (bukan di translations.ts) karena meta adalah sumber kebenaran form
 * admin dan harus client-safe — translations.ts dipakai untuk teks marketing
 * situs publik, bukan label panel admin.
 */
export const FEATURE_DEFS: readonly FeatureDef[] = [
  {
    key: "enable_terminal",
    label: "Terminal & RetroBot",
    description: {
      id: "Menampilkan app Terminal OS, widget asisten AI RetroBot, endpoint /api/retrobot, dan server action askSigitBot.",
      en: "Shows the OS Terminal app, the RetroBot AI assistant widget, the /api/retrobot endpoint, and the askSigitBot server action.",
    },
    group: "Aplikasi OS",
  },
  {
    key: "enable_store_cart",
    label: "Keranjang Belanja",
    description: {
      id: "Menampilkan tombol keranjang dan tombol tambah-ke-keranjang di katalog serta halaman detail produk. Logika stok & WhatsApp tidak berubah.",
      en: "Shows the cart button and add-to-cart buttons in the product catalog and product detail pages. Stock & WhatsApp logic is unchanged.",
    },
    group: "Toko",
  },
  {
    key: "enable_articles",
    label: "Artikel",
    description: {
      id: "Menampilkan app Artikel OS serta route /artikel dan /artikel/[slug]. Saat dimatikan, halaman artikel mengembalikan 404.",
      en: "Shows the OS Articles app plus the /artikel and /artikel/[slug] routes. When off, article pages return 404.",
    },
    group: "Aplikasi OS",
  },
  {
    key: "maintenance_mode",
    label: "Mode Pemeliharaan",
    description: {
      id: "Mengganti seluruh situs publik dengan halaman pemeliharaan. Panel admin tetap dapat diakses dan tetap berfungsi normal.",
      en: "Replaces the entire public site with a maintenance page. The admin panel stays accessible and fully functional.",
    },
    group: "Operasional",
    dangerous: true,
  },
];

/** Kelompok unik sesuai urutan kemunculan di FEATURE_DEFS. */
export const FEATURE_GROUPS: readonly string[] = [
  ...new Set(FEATURE_DEFS.map((d) => d.group)),
];

/**
 * Default = kondisi sekarang: SEMUA fitur ON, maintenance OFF. Dipakai saat
 * settings.features belum diisi, kosong, rusak, atau validasinya gagal —
 * situs tetap utuh seperti sebelum fitur ini ada. Jaminan ini adalah inti
 * spec §2.2: situs tidak pernah kehilangan fitur karena masalah infra.
 */
export const DEFAULT_FEATURES: Features = {
  enable_terminal: true,
  enable_store_cart: true,
  enable_articles: true,
  maintenance_mode: false,
};

/** Cepat: apakah string termasuk flag yang dikenal? */
export function isFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key);
}
```

- [ ] **Step 2: Verifikasi compile**

Run: `npx tsc --noEmit`
Expected: 0 error (file baru tidak punya konsumen belum, jadi hanya cek sintaks/tipe internal).

- [ ] **Step 3: Commit**

```bash
git add src/lib/features-meta.ts
git commit -m "@ feat(godmode): Fase 3 task 1 — metadata feature flag (client-safe)"
```

---

## Task 2: `features-config.ts` (server-only) + unit test lengkap

**Files:**
- Create: `src/lib/features-config.ts`
- Create: `tests/features-config.test.ts`
- Modify: `vitest.config.mts` (tambah `tests/features-config.test.ts` ke `SHARED_FS_TESTS`)

**Interfaces:**
- Consumes (Task 1): `FEATURE_KEYS`, `DEFAULT_FEATURES`, `isFeatureKey`, `type Features`.
- Consumes (sudah ada): `getSetting`/`setSetting` dari `src/lib/settings.ts`.
- Produces: `resolveFeatures(): Promise<Features>`, `saveFeatures(input: unknown): Promise<Features>`, `describeFeatures(features, lang): string`. Task 3 (layout), Task 6 (endpoint + action), Task 8 (artikel routes), Task 9 (`saveFeaturesAction`) mengkonsumsi ketiganya.

- [ ] **Step 1: Tulis unit test `tests/features-config.test.ts` dulu (TDD — pastikan gagal karena modul belum ada)**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  FEATURE_KEYS,
  FEATURE_DEFS,
  FEATURE_GROUPS,
  DEFAULT_FEATURES,
  isFeatureKey,
  type Features,
} from "@/lib/features-meta";
import {
  resolveFeatures,
  saveFeatures,
  describeFeatures,
} from "@/lib/features-config";

/**
 * resolveFeatures/saveFeatures membaca settings.features; di lingkungan test
 * tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test,
 * jika tidak nilai yang tertulis akan menimpa default pada test berikutnya
 * (persis seperti produksi: admin menimpa kode).
 *
 * File ini menulis/membaca berkas bersama dengan cloud-ai-config.test.ts,
 * os-apps-config.test.ts, dan ui-strings-config.test.ts — karenanya WAJIB
 * terdaftar di SHARED_FS_TESTS (project serial) di vitest.config.mts. Bila
 * lupa, beforeEach satu file menghapus file persis saat file lain menulis
 * → flaky race.
 */

const LOCAL_SETTINGS = path.join(process.cwd(), "data", "local-settings.json");

function clearLocalSettings(): void {
  try {
    if (fs.existsSync(LOCAL_SETTINGS)) fs.unlinkSync(LOCAL_SETTINGS);
  } catch {
    // Ignore: mungkin sedang ditulis worker lain.
  }
}

beforeEach(clearLocalSettings);
afterEach(clearLocalSettings);

async function writeSettings(payload: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
  const existing = fs.existsSync(LOCAL_SETTINGS)
    ? JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"))
    : {};
  await fs.promises.writeFile(
    LOCAL_SETTINGS,
    JSON.stringify({ ...existing, features: payload })
  );
}

describe("resolveFeatures (toleran — data DB usang tidak pernah meruntuhkan situs)", () => {
  it("DB kosong → DEFAULT_FEATURES: semua fitur ON, maintenance OFF", async () => {
    const f = await resolveFeatures();
    expect(f).toEqual(DEFAULT_FEATURES);
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_store_cart).toBe(true);
    expect(f.enable_articles).toBe(true);
    expect(f.maintenance_mode).toBe(false);
  });

  it("shape hancur (array, string, null) → DEFAULT_FEATURES, tidak melempar", async () => {
    await writeSettings([1, 2, 3]);
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
    await writeSettings("on");
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
    await writeSettings(null);
    expect(await resolveFeatures()).toEqual(DEFAULT_FEATURES);
  });

  it("key asing diabaikan", async () => {
    await writeSettings({ evil_flag: true, enable_articles: false });
    const f = await resolveFeatures();
    expect(f.enable_articles).toBe(false);
    expect((f as Record<string, unknown>).evil_flag).toBeUndefined();
  });

  it("value non-boolean per key diabaikan → default key itu; key lain tetap dibaca", async () => {
    await writeSettings({
      enable_terminal: "yes", // non-boolean → diabaikan
      enable_articles: 1, // non-boolean → diabaikan
      maintenance_mode: null, // non-boolean → diabaikan
      enable_store_cart: false, // boolean valid → dipakai
    });
    const f = await resolveFeatures();
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_articles).toBe(true);
    expect(f.maintenance_mode).toBe(false);
    expect(f.enable_store_cart).toBe(false);
  });

  it("key yang tidak disebut tetap default (DB boleh sparse)", async () => {
    await writeSettings({ maintenance_mode: true });
    const f = await resolveFeatures();
    expect(f.maintenance_mode).toBe(true);
    expect(f.enable_terminal).toBe(true);
    expect(f.enable_store_cart).toBe(true);
    expect(f.enable_articles).toBe(true);
  });
});

describe("saveFeatures (ketat — input admin harus eksplisit)", () => {
  it("input valid dipakai penuh dan bisa dibaca ulang resolveFeatures", async () => {
    const saved = await saveFeatures({ enable_terminal: false, maintenance_mode: true });
    expect(saved).toEqual({
      enable_terminal: false,
      enable_store_cart: true,
      enable_articles: true,
      maintenance_mode: true,
    });
    expect(await resolveFeatures()).toEqual(saved);
  });

  it("key tidak dikirim tetap diisi default (overlay, bukan partial-stale)", async () => {
    const saved = await saveFeatures({ enable_articles: false });
    expect(saved.enable_articles).toBe(false);
    expect(saved.enable_terminal).toBe(true);
  });

  it("key asing ditolak keras", async () => {
    await expect(
      saveFeatures({ enable_terminal: false, evil_flag: true })
    ).rejects.toThrow(/tidak dikenal/);
  });

  it("value bukan boolean ditolak keras", async () => {
    await expect(saveFeatures({ maintenance_mode: "yes" })).rejects.toThrow(/bukan true\/false/);
    await expect(saveFeatures({ enable_terminal: 1 })).rejects.toThrow(/bukan true\/false/);
  });

  it("input bukan object ditolak keras", async () => {
    await expect(saveFeatures(null)).rejects.toThrow(/bukan object/);
    await expect(saveFeatures("on")).rejects.toThrow(/bukan object/);
  });

  it("penyimpanan tidak meninggalkan key asing di file", async () => {
    await saveFeatures({ enable_terminal: false });
    const raw = JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"));
    expect(Object.keys(raw.features).sort()).toEqual([...FEATURE_KEYS].sort());
  });
});

describe("describeFeatures (ringkasan audit log + badge admin)", () => {
  it("format 'N/total fitur aktif' dalam Bahasa Indonesia", () => {
    expect(describeFeatures(DEFAULT_FEATURES, "id")).toBe("3/3 fitur aktif");
  });

  it("fitur yang dimatikan dihitung", () => {
    expect(
      describeFeatures(
        { ...DEFAULT_FEATURES, enable_terminal: false, enable_articles: false },
        "id"
      )
    ).toBe("1/3 fitur aktif");
  });

  it("mode pemeliharaan disebut eksplisit saat aktif", () => {
    expect(describeFeatures({ ...DEFAULT_FEATURES, maintenance_mode: true }, "id")).toContain(
      "mode pemeliharaan AKTIF"
    );
    expect(describeFeatures(DEFAULT_FEATURES, "id")).not.toContain("pemeliharaan");
  });

  it("varian EN", () => {
    expect(describeFeatures(DEFAULT_FEATURES, "en")).toBe("3/3 features enabled");
    expect(
      describeFeatures({ ...DEFAULT_FEATURES, maintenance_mode: true }, "en")
    ).toContain("maintenance mode ON");
  });
});

describe("FEATURE_DEFS / FEATURE_KEYS (keandalan daftar — guard)", () => {
  it("tepat 4 flag, semua unik", () => {
    expect(FEATURE_KEYS.length).toBe(4);
    expect(new Set(FEATURE_KEYS).size).toBe(4);
  });

  it("setiap FEATURE_KEYS punya def lengkap (label + deskripsi ID/EN + group)", () => {
    for (const key of FEATURE_KEYS) {
      const def = FEATURE_DEFS.find((d) => d.key === key);
      expect(def, `def untuk "${key}" hilang`).toBeDefined();
      expect(def!.label.trim().length).toBeGreaterThan(0);
      expect(def!.description.id.trim().length).toBeGreaterThan(0);
      expect(def!.description.en.trim().length).toBeGreaterThan(0);
      expect(def!.group.trim().length).toBeGreaterThan(0);
    }
  });

  it("tidak ada def untuk key asing", () => {
    expect(FEATURE_DEFS.find((d) => d.key === "evil_flag")).toBeUndefined();
  });

  it("FEATURE_GROUPS = kelompok unik sesuai urutan def", () => {
    expect(FEATURE_GROUPS).toEqual(["Aplikasi OS", "Toko", "Operasional"]);
  });

  it("maintenance_mode ditandai dangerous (butuh konfirmasi)", () => {
    const def = FEATURE_DEFS.find((d) => d.key === "maintenance_mode");
    expect(def?.dangerous).toBe(true);
  });

  it("isFeatureKey membenarkan hanya flag terdaftar", () => {
    for (const key of FEATURE_KEYS) expect(isFeatureKey(key)).toBe(true);
    expect(isFeatureKey("evil_flag")).toBe(false);
  });
});
```

- [ ] **Step 2: Daftarkan ke project serial `SHARED_FS_TESTS` di `vitest.config.mts`**

Ganti array `SHARED_FS_TESTS` (dan perbarui komentar "ketiga"/"ketiganya" jadi "keempat"/"keempatnya" — komentar di file itu menyebut "Tiga test file ini"):

```ts
const SHARED_FS_TESTS = [
  "tests/cloud-ai-config.test.ts",
  "tests/os-apps-config.test.ts",
  "tests/ui-strings-config.test.ts",
  "tests/features-config.test.ts",
];
```

Juga perbarui komentar di atasnya: `Tiga test file ini (dan hanya ini)` → `Empat test file ini (dan hanya ini)`, dan kalimat `Bila nanti ada test file ke-4 yang menyentuh local-settings.json` → `ke-5`.

- [ ] **Step 3: Jalankan test untuk verifikasi gagal**

Run: `npx vitest run tests/features-config.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/features-config"` (modul belum dibuat).

- [ ] **Step 4: Tulis `src/lib/features-config.ts`**

```ts
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
 */
export async function resolveFeatures(): Promise<Features> {
  try {
    const stored = await getSetting<unknown>(SETTING_KEY);
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
```

- [ ] **Step 5: Jalankan test untuk verifikasi lolos**

Run: `npx vitest run tests/features-config.test.ts`
Expected: PASS — semua test (resolve toleran 5, save ketat 6, describe 4, guard daftar 5 = 20 test).

- [ ] **Step 6: Verifikasi suite penuh tidak rusak + tsc**

Run: `npx vitest run`
Expected: semua project (`shared-fs` + `default`) hijau; tidak ada test lain yang gagal.

Run: `npx tsc --noEmit`
Expected: 0 error.

- [ ] **Step 7: Commit**

```bash
git add src/lib/features-config.ts tests/features-config.test.ts vitest.config.mts
git commit -m "@ feat(godmode): Fase 3 task 2 — resolver/save feature flag + unit test"
```

---

## Task 3: `features-context.tsx` + `MaintenanceNotice` + wiring layout publik

**Files:**
- Create: `src/lib/features-context.tsx`
- Create: `src/components/public/maintenance-notice.tsx`
- Modify: `src/app/(public)/layout.tsx`

**Interfaces:**
- Consumes (Task 1): `type Features`, `type FeatureKey`. Consumes (Task 2): `resolveFeatures()`. Consumes (sudah ada): `getProfile()`, `resolveUIStrings()`, `LanguageProvider`, `ProfileData`.
- Produces: `FeaturesProvider({features, children})`, `useFeatures(): Features`, `useFeature(key): boolean` — dikonsumsi Task 5, 6, 7. Produces `<MaintenanceNotice profile={profile} />`.

**Catatan desain (penegasan spec §2.3 + §3.4):** cabang maintenance tetap membungkus `MaintenanceNotice` dengan `LanguageProvider` karena komponen itu memakai `useTranslation()`. `FeaturesProvider` membungkus `LanguageProvider` ke bawah (semua konsumen `useFeature` berada di dalamnya).

- [ ] **Step 1: Tulis `src/lib/features-context.tsx`**

```tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { FeatureKey, Features } from "@/lib/features-meta";

const FeaturesContext = createContext<Features | null>(null);

/**
 * Menyebarkan feature flag (settings.features) ke seluruh tree publik.
 *
 * Flag diresolve di server component (public)/layout.tsx lalu dilewatkan
 * sebagai prop — TIDAK ada fetch client, TIDAK ada NEXT_PUBLIC_, sehingga
 * nilainya bisa diubah admin tanpa redeploy (berbeda dari env var yang butuh
 * build ulang). Server memutuskan, client hanya menerima nilai final: nol
 * hydration mismatch.
 */
export function FeaturesProvider({
  features,
  children,
}: {
  features: Features;
  children: React.ReactNode;
}) {
  // Object stabil selama prop tidak berubah — consumer tidak re-render
  // sia-sia saat layout membangun ulang tree.
  const value = useMemo(() => features, [features]);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

/**
 * Semua flag. Lempar bila dipakai di luar FeaturesProvider: diam-diam jatuh
 * ke default berarti fitur "OFF" bisa kelihatan "ON" tanpa pesan — bug diam
 * yang persis seperti key-tak-terkonsumsi di Fase 2.
 */
export function useFeatures(): Features {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures harus dipakai di dalam <FeaturesProvider>.");
  return ctx;
}

/** Ambil satu flag (komponen client di dalam FeaturesProvider). */
export function useFeature(key: FeatureKey): boolean {
  return useFeatures()[key];
}
```

- [ ] **Step 2: Tulis `src/components/public/maintenance-notice.tsx`**

```tsx
"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { ProfileData } from "@/lib/dummy-data";

interface MaintenanceNoticeProps {
  profile?: ProfileData;
}

/**
 * Halaman pengganti saat maintenance_mode aktif (settings.features).
 *
 * Sengaja ringan: TANPA OS shell — (public)/layout.tsx langsung mengembalikan
 * komponen ini, jadi boot loader 5 detik, sound layer, visitor tracker, dan
 * RetroBot TIDAK dirender. Teks dwibahasa inline (bukan key translations.ts)
 * karena ini halaman operasional baru, bukan teks marketing yang diedit admin.
 *
 * /admin/* tidak terdampak: route group (admin) punya layout sendiri, tidak
 * memakai (public)/layout.tsx — panel admin tetap bisa diakses untuk
 * mematikan mode ini. Clerk middleware juga tidak diubah (spec §3.4).
 */
export function MaintenanceNotice({ profile }: MaintenanceNoticeProps) {
  const { language } = useTranslation();
  const isEn = language === "en";
  const name = profile?.name?.trim() || (isEn ? "the site owner" : "pemilik situs");

  // Palet HARUS di-hardcode, bukan var(--vt-*): cabang maintenance sengaja
  // melewati ThemeProvider (ringan, di luar OS shell), dan data-theme hanya
  // pernah ditulis oleh ThemeProvider — tanpanya :root memakai token LIGHT
  // retro90s, jadi --vt-ink ≈ #0d0d14 di atas bg gelap = kontras ~1.1:1.
  // Selain itu --vt-bg bukan token nyata. Verifikasi kontras reviewer:
  // h1 #e8e4f0/#1a1726 = 14.05:1 (AAA), p #9a93b0/#1a1726 = 6.01:1 (AA).
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#1a1726] px-6 py-10">
      <div className="max-w-md w-full text-center space-y-5 font-mono">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-md border-2 border-[#3a3450] flex items-center justify-center motion-safe:animate-pulse">
            <Wrench className="h-8 w-8 text-[#fbbf24]" aria-hidden />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#e8e4f0]">
          {isEn ? "Under Maintenance" : "Sedang Pemeliharaan"}
        </h1>
        <p className="text-sm text-[#9a93b0] leading-relaxed">
          {isEn
            ? `${name}'s portfolio is temporarily offline for maintenance. Please come back in a moment.`
            : `Portofolio ${name} sementara tidak bisa diakses karena sedang pemeliharaan. Silakan kembali lagi sebentar.`}
        </p>
        <p className="text-[11px] text-[#9a93b0] opacity-70">— SigitOS —</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire `src/app/(public)/layout.tsx`**

Tambah import:

```ts
import { resolveFeatures } from "@/lib/features-config";
import { FeaturesProvider } from "@/lib/features-context";
import { MaintenanceNotice } from "@/components/public/maintenance-notice";
```

Ganti body fungsi `RootPublicLayout` (fetch + cabang maintenance + pembungkus provider):

```ts
  const profile = await getProfile();
  const uiStrings = await resolveUIStrings();
  const features = await resolveFeatures();

  // Mode pemeliharaan: seluruh situs publik diganti halaman ringan. Language
  // Provider tetap dipasang (MaintenanceNotice memakai useTranslation).
  // /admin/* tidak terdampak: route group (admin) punya layout sendiri.
  if (features.maintenance_mode) {
    return (
      <LanguageProvider overrides={uiStrings}>
        <MaintenanceNotice profile={profile} />
      </LanguageProvider>
    );
  }

  return (
    <FeaturesProvider features={features}>
      <LanguageProvider overrides={uiStrings}>
        <ThemeProvider>
          <CartProvider>
            <div className="h-screen max-h-screen w-screen max-w-full desktop-viewport flex flex-col desktop-wallpaper text-foreground overflow-hidden relative">
              {/* 1. Authentic 5s Retro BIOS Boot Loader (Session Persistent) */}
              <OSBootLoader />

              {/* Suara retro global: ketukan tombol + nada pindah halaman */}
              <OSSoundLayer />

              {/* Anonymous visit beacon → self-hosted Cloudflare Worker (no cookies) */}
              <VisitorTracker />

              {/* Asisten AI retro standby (SSE, hybrid local-first + cloud opt-in) */}
              <RetroBot />

              {/* 2. Top OS Menubar */}
              <Header />

              {/* 3. Main Desktop Viewport (Locked to 100vh, Never Scrolls Entire Page) */}
              <main className="flex-1 flex flex-col overflow-hidden w-full relative min-h-0">
                {children}
              </main>

              {/* Global Shopping Cart Modal */}
              <CartDialog profile={profile} />
            </div>
          </CartProvider>
        </ThemeProvider>
      </LanguageProvider>
    </FeaturesProvider>
  );
```

Jangan tambah `export const dynamic` — layout sudah async + membaca DB (`getProfile`, `resolveUIStrings` di Fase 2) dan build hijau; `resolveFeatures` identif sifatnya.

- [ ] **Step 4: Verifikasi tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 error. (Perhatian: lint baru saja membaca 2 file baru + perubahan layout.)

- [ ] **Step 5: Smoke test manual render publik (dev server)**

Run (background, lalu curl): `npx next dev --turbopack -p 3458` lalu `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3458/`
Expected: 200. Lalu tulis sementara `data/local-settings.json` berisi `{"features":{"maintenance_mode":true}}` dan curl lagi: Expected body mengandung "Sedang Pemeliharaan". Hapus file itu setelahnya (`git clean` tidak menyentuh `data/` bila ter-ignore; hapus manual).

- [ ] **Step 6: Commit**

```bash
git add src/lib/features-context.tsx src/components/public/maintenance-notice.tsx "src/app/(public)/layout.tsx"
git commit -m "@ feat(godmode): Fase 3 task 3 — FeaturesProvider + halaman pemeliharaan + wiring layout"
```

---

## Task 4: Gate app OS — exclude terminal & articles di `os-desktop-manager.tsx`

**Files:**
- Modify: `src/components/public/os/os-desktop-manager.tsx` (area import + hook + `apps` useMemo di ~165)

**Interfaces:**
- Consumes (Task 3): `useFeature`. Consumes (Task 1): `type AppId` lewat `OSAppConfig` (sudah diimpor).
- Catatan: satu task menggabungkan exclude terminal DAN articles karena keduanya di tempat yang sama (filter merge `appsConfig`); artikel route di-gate terpisah di Task 6.

**Kenapa filter di sini (spec §3.1.1, §3.3.1):** taskbar (~:1147), start menu (~:987), command palette (~:765), dan tab mobile (~:716) semua membaca daftar `apps` hasil useMemo ini — satu filter mengendalikan keempatnya. Hash-routing (~:359) + guard switch-app (~:508) sudah mengabaikan app tak terdaftar.

- [ ] **Step 1: Tambah import**

Di blok import yang sudah ada (baris ~31 mengimpor dari `@/lib/os-apps-meta`), tambah:

```ts
import { useFeature } from "@/lib/features-context";
```

- [ ] **Step 2: Baca flag di komponen**

Tambahkan tepat setelah baris `const { theme, setTheme } = useOSTheme();` (atau setelah deklarasi state lainnya, tapi SEBELUM `useMemo apps`):

```ts
  // Feature flag (settings.features): matikan app Terminal/Artikel tanpa
  // menyentuh /admin/appearance. Satu flag "asisten AI retro" mengikat app
  // Terminal + widget RetroBot + endpoint /api/retrobot + askSigitBot
  // (titik-titik lain digate di task masing-masing).
  const enableTerminal = useFeature("enable_terminal");
  const enableArticles = useFeature("enable_articles");
```

- [ ] **Step 3: Filter di merge `apps`**

Ganti `apps` useMemo (~:165-175) menjadi:

```ts
  // App yang BENAR-BENAR ditampilkan: filter feature flag + filter enabled +
  // urut dari appsConfig, digabung dengan metadata visual (ikon/warna) dari
  // APPS. `number` diisi ulang dari posisi agar titlebar "[n/total]" selalu
  // konsisten dengan urutan yang diatur admin — angka statis di APPS hanya
  // untuk bacaan kode.
  const apps = React.useMemo<AppItem[]>(() => {
    const meta = new Map(APPS.map((a) => [a.id, a]));
    // Feature flag diletakkan SEBELUM filter enabled sehingga taskbar, start
    // menu, command palette, dan tab mobile (semuanya membaca daftar ini)
    // otomatis ikut mati.
    const gated = appsConfig.filter((c) => {
      if (c.id === "terminal" && !enableTerminal) return false;
      if (c.id === "artikel" && !enableArticles) return false;
      return true;
    });
    const list = gated
      .filter((c) => c.enabled && meta.has(c.id))
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...meta.get(c.id)!, number: i + 1 }));
    // Pengaman terakhir: resolveOSApps() di server menjamin daftar tidak pernah
    // kosong, tapi komponen ini tidak boleh runtuh walau menerima props aneh —
    // kembali ke daftar lengkap (yang sudah digate flag) daripada merender
    // tanpa app sama sekali, atau merender app yang seharusnya dimatikan.
    if (list.length) return list;
    return APPS.filter(
      (a) =>
        (a.id !== "terminal" || enableTerminal) &&
        (a.id !== "artikel" || enableArticles)
    );
  }, [appsConfig, enableTerminal, enableArticles]);
```

- [ ] **Step 4: tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 error. (Hook baru di komponen client — pastikan tidak melanggar aturan hook: panggilan tepat setelah hook lain, sebelum return awal apa pun.)

- [ ] **Step 5: Smoke test manual**

Dengan dev server Task 3 (port 3458), tulis sementara `data/local-settings.json` `{"features":{"enable_articles":false}}` lalu curl `http://127.0.0.1:3458/?cachebust=1` — expected body TIDAK mengandung `id="artikel"`. Hapus file setelahnya.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/os/os-desktop-manager.tsx
git commit -m "@ feat(godmode): Fase 3 task 4 — gate app terminal & artikel dari daftar OS"
```

---

## Task 5: Gate terminal — widget RetroBot, endpoint `/api/retrobot`, action `askSigitBot`

**Files:**
- Modify: `src/components/public/retro-bot.tsx`
- Modify: `src/app/api/retrobot/route.ts`
- Modify: `src/lib/actions.ts` (gate di `askSigitBot` + import)

**Interfaces:**
- Consumes (Task 2): `resolveFeatures`. Consumes (Task 3): `useFeature`.
- Catatan: app Terminal OS di-exclude di Task 4; `os-crt-terminal.tsx` TIDAK diubah — ia memanggil `askSigitBot` yang sekarang menolak saat flag OFF.

- [ ] **Step 1: Gate widget `retro-bot.tsx`**

Tambah import (sesudah `import { useTranslation } from "@/lib/i18n";`):

```ts
import { useFeature } from "@/lib/features-context";
```

Di dalam komponen `RetroBot`, tambahkan bersama hook lainnya di bagian atas (sebelum effect/effect-return pertama):

```ts
  // Gate feature flag (settings.features): widget adalah bagian "asisten AI
  // retro" bersama app Terminal — satu flag mengikat keduanya.
  const enableTerminal = useFeature("enable_terminal");
```

Lalu segera setelah seluruh deklarasi hook `useRef`/`useState` (pastikan tidak ada hook setelahnya yang ter-skip), tambahkan:

```ts
  if (!enableTerminal) return null;
```

- [ ] **Step 2: Gate endpoint `src/app/api/retrobot/route.ts`**

Tambah import:

```ts
import { resolveFeatures } from "@/lib/features-config";
```

Di awal handler `POST` (paling atas, sebelum parsing body dan rate-limit — murah & cepat menolak):

```ts
  // Gate feature flag (settings.features): "asisten AI retro" adalah satu
  // kesatuan — permintaan langsung ke endpoint tetap harus ditolak walau
  // widget client sudah di-return null (spec §5: client gate saja tidak
  // cukup).
  const features = await resolveFeatures();
  if (!features.enable_terminal) {
    return NextResponse.json(
      { error: "Fitur terminal sedang dinonaktifkan." },
      { status: 404 }
    );
  }
```

- [ ] **Step 3: Gate server action `askSigitBot` di `src/lib/actions.ts`**

Tambah import (sejajar dengan import `saveOSApps`/`resolveOSApps` dari os-apps-config):

```ts
import { resolveFeatures } from "@/lib/features-config";
```

Di `askSigitBot` (~:1754), sisipkan SETELAH blok cek `cleanInput` kosong (agar input kosong tetap dapat jawaban ramahnya) dan SEBELUM `const ip = await aibotIp();`:

```ts
  // Gate feature flag (settings.features): app Terminal (os-desktop-manager)
  // dan widget RetroBot di-gate di client; aksi server ini adalah jalur lain
  // yang dipakai os-crt-terminal.tsx — wajib ditolak di server juga.
  const features = await resolveFeatures();
  if (!features.enable_terminal) {
    return {
      text:
        lang === "en"
          ? "The terminal feature is currently disabled."
          : "Fitur terminal sedang dinonaktifkan.",
      intent: "disabled",
      confidence: 1,
      source: "local",
    };
  }
```

- [ ] **Step 4: tsc + lint + unit test**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 error, semua unit test hijau.

- [ ] **Step 5: Smoke test manual endpoint**

Dev server port 3458, tulis sementara `data/local-settings.json` `{"features":{"enable_terminal":false}}` lalu:

```bash
curl -s -X POST http://127.0.0.1:3458/api/retrobot -H "Content-Type: application/json" -d '{"text":"halo"}' -o /dev/null -w "%{http_code}"
```

Expected: `404`. Hapus file setelahnya.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/retro-bot.tsx src/app/api/retrobot/route.ts src/lib/actions.ts
git commit -m "@ feat(godmode): Fase 3 task 5 — gate terminal: RetroBot, endpoint, askSigitBot"
```

---

## Task 6: Gate keranjang — `cart-dialog`, `products-section`, `product-detail-content`

**Files:**
- Modify: `src/components/public/cart-dialog.tsx`
- Modify: `src/components/public/products-section.tsx`
- Modify: `src/components/public/product-detail-content.tsx`

**Interfaces:**
- Consumes (Task 3): `useFeature("enable_store_cart")`.

**Blast radius (spec §3.2):** `CartProvider` TETAP dipasang di layout (mount ringan, localStorage tak diubah). `cart-stock.ts` / `whatsapp-order.ts` / `header.tsx` / `os-menubar.tsx` TIDAK tersentuh — tombol di sections adalah satu-satunya pemicu `CartDialog` (diverifikasi: `useCart()` hanya dipakai di 3 file ini).

- [ ] **Step 1: Gate modal global `cart-dialog.tsx`**

Tambah import:

```ts
import { useFeature } from "@/lib/features-context";
```

Di dalam `CartDialog`, setelah deklarasi hook yang ada (`useCart`, `useTranslation`, `useState`…), tambahkan:

```ts
  // Gate feature flag (settings.features). Pertahanan kedua: pemicu tombol
  // juga di-gate di products-section & product-detail; modal global ini tetap
  // tak muncul walau flag berubah antara render section dan render dialog.
  const enableStoreCart = useFeature("enable_store_cart");
  if (!enableStoreCart) return null;
```

Taruh `useFeature` bersama hook lain di atas (sebelum `return null` apapun) — pastikan SEMUA hook lain yang ada sudah dipanggil sebelum baris `return null` ini.

- [ ] **Step 2: Gate tombol di `products-section.tsx`**

Tambah import:

```ts
import { useFeature } from "@/lib/features-context";
```

Di komponen, tambahkan hook:

```ts
  // Gate feature flag (settings.features): saat OFF, tombol keranjang dan
  // tombol "Tambah ke Keranjang" per produk disembunyikan; addItem dan
  // setIsOpen(true) tak pernah dipanggil.
  const enableStoreCart = useFeature("enable_store_cart");
```

Bungkus ELEMEN button yang sudah ada (Quick Cart Trigger, ~:135-145) dengan conditional — JANGAN menulis ulang atribut/isi tombolnya, hanya tambahkan `{enableStoreCart && ( …button yang sekarang… )}` di sekelilingnya:

```tsx
          {/* Quick Cart Trigger — disembunyikan saat enable_store_cart OFF */}
          {enableStoreCart && (
            <button type="button" onClick={() => setIsOpen(true)} {/* …atribut & anak yang sekarang… */}>
              {/* …isi tombol yang sekarang — JANGAN diubah… */}
            </button>
          )}
```

Lakukan hal sama untuk tombol "Tambah ke Keranjang" per produk: cari pemanggilan `handleAddToCart` di file ini (`grep -n "handleAddToCart" src/components/public/products-section.tsx`), lalu bungkus elemen tombol pemanggilnya dengan `{enableStoreCart && (…)}`. Jangan memindahkan/mengubah `handleAddToCart` — hanya render-nya yang di-gate.

- [ ] **Step 3: Gate tombol di `product-detail-content.tsx`**

Pola identik: import `useFeature`, hook `const enableStoreCart = useFeature("enable_store_cart");`, lalu bungkus tombol "Cart" (~:104-113) DAN tombol yang memanggil `handleAddToCart` (Tambah ke Keranjang) dengan `{enableStoreCart && (…)}`.

- [ ] **Step 4: tsc + lint + build kecil**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 error.

- [ ] **Step 5: Smoke test manual**

Dev server 3458, tulis sementara `data/local-settings.json` `{"features":{"enable_store_cart":false}}`, curl homepage → body TIDAK mengandung "Keranjang" di dalam section `id="produk"` (cek `grep -o 'id="produk"'` lalu potongan teksnya). Hapus file setelahnya.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/cart-dialog.tsx src/components/public/products-section.tsx src/components/public/product-detail-content.tsx
git commit -m "@ feat(godmode): Fase 3 task 6 — gate keranjang belanja (modal + tombol)"
```

---

## Task 7: Gate artikel — route `/artikel` dan `/artikel/[slug]` `notFound()`

**Files:**
- Modify: `src/app/(public)/artikel/page.tsx`
- Modify: `src/app/(public)/artikel/[slug]/page.tsx`

**Interfaces:**
- Consumes (Task 2): `resolveFeatures`.

**Kenapa `notFound()` (spec §3.3):** "off" harus benar-benar off — halaman ter-index memang hilang saat flag dimatikan, itulah maksudnya. Flag default ON dan `saveFeaturesAction` memanggil `revalidatePath("/", "layout")` (Task 8), jadi SSG tidak akan meng-cache versi OFF lama. Jangan tambah `force-dynamic`.

- [ ] **Step 1: Gate `src/app/(public)/artikel/page.tsx`**

Tambah import:

```ts
import { notFound } from "next/navigation";
import { resolveFeatures } from "@/lib/features-config";
```

Di awal `ArticlesPage` (sebelum `const articles = await getArticles();`):

```ts
  // Gate feature flag (settings.features): app Artikel OS di-exclude dari
  // daftar OS (os-desktop-manager); route artikel sendiri mengembalikan 404
  // supaya "off" benar-benar off — termasuk untuk mesin pencari.
  const features = await resolveFeatures();
  if (!features.enable_articles) notFound();
```

- [ ] **Step 2: Gate `src/app/(public)/artikel/[slug]/page.tsx`**

Pola identik: import `notFound` + `resolveFeatures`, lalu di awal fungsi page (sebelum fetch artikel):

```ts
  const features = await resolveFeatures();
  if (!features.enable_articles) notFound();
```

- [ ] **Step 3: tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 error.

- [ ] **Step 4: Smoke test manual**

Dev server 3458, tulis sementara `data/local-settings.json` `{"features":{"enable_articles":false}}`:

```bash
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3458/artikel"
```

Expected: `404`. Lalu hapus file, curl lagi → Expected `200`. (`notFound()` merender 404 bawaan Next; di dev dev-server menambahkan overlay 404 di HTML tetapi status tetap 404.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/artikel/page.tsx" "src/app/(public)/artikel/[slug]/page.tsx"
git commit -m "@ feat(godmode): Fase 3 task 7 — gate route artikel (404 saat nonaktif)"
```

---

## Task 8: Admin UI — `saveFeaturesAction` + halaman `/admin/features` + form + item sidebar

**Files:**
- Modify: `src/lib/actions.ts` (action baru + import)
- Create: `src/app/admin/features/page.tsx`
- Create: `src/components/admin/features-form.tsx`
- Modify: `src/components/admin/admin-sidebar.tsx`

**Interfaces:**
- Consumes (Task 1): `FEATURE_KEYS`, `FEATURE_DEFS`, `FEATURE_GROUPS`, `type Features`, `type FeatureDef`. Consumes (Task 2): `resolveFeatures`, `saveFeatures`, `describeFeatures`.
- Produces: `saveFeaturesAction(input): Promise<{ok:true; features} | {ok:false; error}>` — shape identik Fase 1/2 (`saveUIStringsAction`) agar form seragam.

**Catatan desain:** tidak ada komponen `Switch` shadcn di repo ini (`src/components/ui/` hanya badge/card/input/textarea/label/tabs/separator/skeleton/sonner/alert-dialog/button/dialog/dropdown-menu/select/table). Blast radius minimum = JANGAN tambah dependency/component ui baru; pakai `<button role="switch">` inline di form dengan styling Tailwind. Konfirmasi berbahaya memakai `AlertDialog` yang sudah ada (sama dengan pola AdminSidebar).

- [ ] **Step 1: Tulis `saveFeaturesAction` di `src/lib/actions.ts`**

Tambah import (sejajar import `resolveUIStrings` dst.):

```ts
import {
  resolveFeatures,
  saveFeatures,
  describeFeatures,
  type Features,
} from "@/lib/features-config";
```

Tambah action di akhir file (setelah `saveUIStringsAction`):

```ts
export async function saveFeaturesAction(
  input: unknown
): Promise<{ ok: true; features: Features } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const features = await saveFeatures(input);
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "features",
      detail: describeFeatures(features, "id"),
    });
    // Layout-level: maintenance_mode & gate app mengubah seluruh tree publik.
    revalidatePath("/", "layout");
    revalidatePath("/admin/features");
    return { ok: true, features };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}
```

- [ ] **Step 2: Tulis `src/app/admin/features/page.tsx`** (mirror `admin/strings/page.tsx`)

```tsx
import { ToggleLeft, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveFeatures } from "@/lib/features-config";
import { FEATURE_KEYS, FEATURE_GROUPS } from "@/lib/features-meta";
import { FeaturesForm } from "@/components/admin/features-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman "God Mode" Fase 3: hidupkan/matikan fitur besar situs tanpa kode
 * atau redeploy.
 *
 * Disimpan di settings.features (flat boolean); default (semua ON, maintenance
 * OFF) dipakai bila belum diatur atau data rusak. Perubahan langsung tayang
 * di situs publik setelah Simpan (revalidatePath("/", "layout") di
 * saveFeaturesAction). Halaman admin ini sendiri tidak pernah tergate
 * maintenance — route group (admin) punya layout sendiri.
 */
export default async function AdminFeaturesPage() {
  const features = await resolveFeatures();
  const activeCount = FEATURE_KEYS.filter(
    (k) => k !== "maintenance_mode" && features[k]
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-primary" /> Fitur &amp; Mode
        </h1>
        <p className="text-sm text-muted-foreground">
          God Mode — hidupkan/matikan fitur besar situs publik tanpa menyentuh
          kode atau redeploy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Saklar Fitur Global
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {FEATURE_KEYS.length - 1} fitur + mode pemeliharaan.
            <Badge variant={features.maintenance_mode ? "destructive" : "secondary"}>
              {features.maintenance_mode
                ? "mode pemeliharaan AKTIF"
                : `${activeCount}/${FEATURE_KEYS.length - 1} fitur aktif`}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeaturesForm initial={features} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" /> Cara Kerja &amp; Batasan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Sekarang:</span>{" "}
            hidupkan/matikan Terminal &amp; RetroBot, keranjang belanja, artikel,
            dan mode pemeliharaan dari halaman ini.
          </p>
          <p>
            <span className="font-semibold text-foreground">Mode pemeliharaan:</span>{" "}
            seluruh situs publik diganti halaman "Sedang Pemeliharaan". Panel
            admin (termasuk halaman ini) tetap berfungsi normal — matikan kembali
            dari sini.
          </p>
          <p>
            <span className="font-semibold text-foreground">Pengaman:</span>{" "}
            data rusak diabaikan, situs tetap memakai default (semua fitur
            aktif, maintenance mati). Hanya key terdaftar &amp; boolean yang
            disimpan; bypass form tidak lolos (validasi 100% server-side).
          </p>
          <p>
            <span className="font-semibold text-foreground">Catatan teknis:</span>{" "}
            disimpan di tabel <code className="font-mono text-xs">settings</code>{" "}
            key <code className="font-mono text-xs">features</code>; akses tulis
            hanya lewat server action yang memverifikasi admin, tercatat di
            audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Tulis `src/components/admin/features-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveFeaturesAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  FEATURE_DEFS,
  FEATURE_GROUPS,
  type Features,
  type FeatureKey,
} from "@/lib/features-meta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface FeaturesFormProps {
  /** Flag efektif dari DB (sudah diresolve server-side). */
  initial: Features;
}

/** Toggle switch inline — tidak ada komponen Switch shadcn di repo ini. */
function FeatureToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-[var(--vt-edge-lo-2)] transition-colors",
        checked ? "bg-[var(--vt-blue)]" : "bg-[var(--vt-edge-lo-2)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/**
 * Form untuk /admin/features: toggle per flag, dikelompokkan per
 * FEATURE_GROUPS. State selalu menampilkan kondisi EFEKTIF (DB). Submit
 * mengirim seluruh state; server memvalidasi ulang (verifyAdmin + key
 * terdaftar + boolean) — manipulasi client tidak pernah menerobos.
 */
export function FeaturesForm({ initial }: FeaturesFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Features>(() => ({ ...initial }));
  const [error, setError] = useState("");
  // Konfirmasi bila maintenance_mode akan dinyalakan (situs langsung terganti).
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  const baseline = { ...initial };
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);

  useUnsavedChanges(JSON.stringify(initial), values);

  const handleChange = (key: FeatureKey, next: boolean): void => {
    setValues((prev) => ({ ...prev, [key]: next }));
    setError("");
  };

  const persist = (payload: Features): void => {
    startTransition(async () => {
      const res = await saveFeaturesAction(payload);
      if (res.ok) {
        setValues({ ...res.features });
        toast.success("Fitur disimpan.", {
          description: "Tampilan situs publik langsung diperbarui.",
        });
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan fitur.", { description: res.error });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    // Konfirmasi berbahaya: menyalakan mode pemeliharaan langsung mengganti
    // seluruh situs publik saat tombol Simpan diklik.
    if (values.maintenance_mode && !initial.maintenance_mode) {
      setPendingMaintenance(true);
      return;
    }
    persist(values);
  };

  const confirmMaintenance = (): void => {
    setPendingMaintenance(false);
    persist(values);
  };

  const resetAll = (): void => {
    setValues(baseline);
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {FEATURE_GROUPS.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {group}
          </h3>
          {FEATURE_DEFS.filter((d) => d.group === group).map((def) => {
            const k = def.key;
            const changed = baseline[k] !== values[k];
            return (
              <div
                key={k}
                className="flex items-start justify-between gap-4 border-2 rounded-md p-3 transition-colors"
                style={{ borderColor: changed ? "var(--primary)" : "var(--border)" }}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{def.label}</span>
                    <code className="font-mono text-[10px] text-muted-foreground">
                      {k}
                    </code>
                    {def.dangerous && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        BERBAHAYA
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {def.description.id}
                  </p>
                </div>
                <FeatureToggle
                  checked={values[k]}
                  onChange={(next) => handleChange(k, next)}
                  disabled={pending}
                />
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Fitur
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={resetAll}
          disabled={pending || !isDirty}
          className="h-9"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Batal Perubahan
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {isDirty ? "Ada perubahan yang belum disimpan." : `${FEATURE_KEYS.length} saklar.`}
        </span>
      </div>

      <AlertDialog open={pendingMaintenance} onOpenChange={(open) => !open && setPendingMaintenance(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nyalakan mode pemeliharaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh situs publik langsung diganti halaman &ldquo;Sedang
              Pemeliharaan&rdquo; begitu Anda menekan Simpan. Panel admin (termasuk
              halaman ini) tetap dapat diakses untuk mematikannya kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMaintenance}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ya, nyalakan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
```

- [ ] **Step 4: Tambah item sidebar `src/components/admin/admin-sidebar.tsx`**

Tambah import ikon (di blok lucide-react): `ToggleLeft`. Lalu tambah entri di `ADMIN_NAV_ITEMS` SETELAH "Teks & Bahasa" (sebelum "Sistem & Logs"):

```ts
  {
    title: "Fitur & Mode",
    href: "/admin/features",
    icon: ToggleLeft,
  },
```

- [ ] **Step 5: tsc + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 error.

- [ ] **Step 6: Smoke test halaman admin**

Dev server 3458: buka `http://127.0.0.1:3458/admin/features` di browser. Expected: halaman render (Clerk redirect ke sign-in bila belum login — itu OK, yang penting TIDAK error 500). Setelah login: toggle `maintenance_mode` → dialog konfirmasi muncul; tekan Simpan → toast sukses; homepage publik terganti. Matikan lagi dari halaman yang sama.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions.ts src/app/admin/features/page.tsx src/components/admin/features-form.tsx src/components/admin/admin-sidebar.tsx
git commit -m "@ feat(godmode): Fase 3 task 8 — halaman admin /admin/features + saveFeaturesAction"
```

---

## Task 9: e2e God Mode Fase 3 + registrasi config Playwright

**Files:**
- Create: `e2e/features.spec.ts`
- Modify: `playwright-godmode.config.ts`

**Interfaces:**
- Mengkonsumsi seluruh gate Task 3–8. Helper menulis langsung `data/local-settings.json` (backend fallback saat `DATABASE_URL: ""`).

**Catatan:** viewport MOBILE 375×740 wajib (mode desktop hanya merender section app AKTIF; mobile merender seluruh section). `afterEach` membersihkan file settings. Config sudah `workers: 1` (spec berbagi file settings).

- [ ] **Step 1: Tulis `e2e/features.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Integrasi God Mode Fase 3: settings.features harus benar-benar mengendalikan
 * apa yang dirender pengunjung.
 *
 * Unit test di tests/features-config.test.ts menguji lapisan datanya; test ini
 * memverifikasi utas penuh: (public)/layout.tsx → resolveFeatures → prop
 * FeaturesProvider → useFeature → DOM, serta gate server-side route artikel.
 * Tanpa ini, flag bisa saja valid tapi tidak terbaca komponen (mis. prop lupa
 * dilewatkan atau gate ditaruh di tempat yang salah).
 *
 * File data/local-settings.json dipakai sebagai backend (tidak ada DB di dev);
 * selalu dibersihkan di afterEach agar tidak menempel di test lain.
 */

const SETTINGS_FILE = path.join(process.cwd(), "data", "local-settings.json");

function writeFeatures(features: unknown): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const existing = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    : {};
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...existing, features }), "utf-8");
}

function clearSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
  } catch {
    // abaikan race dengan worker lain
  }
}

/**
 * Viewport MOBILE wajib: di mode desktop, os-desktop-manager hanya merender
 * section app AKTIF (`activeApp === "x" && …`), jadi #artikel/#produk tidak
 * ada di DOM kecuali jendela itu sedang terbuka. Di mode mobile (<768px)
 * SELURUH section dirender dalam satu dokumen scroll — #artikel/#produk selalu
 * ada (selama app-nya tidak di-gate flag).
 */
test.use({ viewport: { width: 375, height: 740 } });

/** cachebust mem-bypass route cache (di produksi cache dimurnikan oleh
 * revalidatePath("/", "layout") di saveFeaturesAction). */
let urlSeq = 0;
function freshUrl(pathname = "/"): string {
  return `${pathname}?cachebust=${Date.now()}-${urlSeq++}`;
}

/** Semua flag ON kecuali satu yang sedang diuji. */
function flags(override: Record<string, boolean>): Record<string, boolean> {
  return {
    enable_terminal: true,
    enable_store_cart: true,
    enable_articles: true,
    maintenance_mode: false,
    ...override,
  };
}

test.describe("God Mode: settings.features mengendalikan situs publik", () => {
  test.afterEach(() => {
    clearSettings();
  });

  test("enable_articles OFF → app Artikel hilang dari OS + /artikel 404", async ({ page }) => {
    clearSettings();
    writeFeatures(flags({ enable_articles: false }));
    await page.goto(freshUrl());
    // Mode mobile: seluruh section ada di satu dokumen. Saat flag OFF, app
    // artikel di-exclude dari daftar OS (os-desktop-manager) → section hilang.
    await expect(page.locator("#artikel")).toHaveCount(0);
    // Gate server-side route: "off" harus benar-benar off.
    const res = await page.goto(freshUrl("/artikel"));
    expect(res?.status()).toBe(404);
  });

  test("maintenance_mode ON → situs publik diganti halaman pemeliharaan", async ({ page }) => {
    writeFeatures(flags({ maintenance_mode: true }));
    await page.goto(freshUrl());
    await expect(
      page.getByRole("heading", { name: /Sedang Pemeliharaan|Under Maintenance/ })
    ).toBeVisible();
    // OS shell tidak ikut dirender (halaman pengganti ringan).
    await expect(page.locator("#artikel")).toHaveCount(0);
  });

  test("enable_store_cart OFF → tombol keranjang hilang dari katalog", async ({ page }) => {
    writeFeatures(flags({ enable_store_cart: false }));
    await page.goto(freshUrl());
    const produk = page.locator("#produk");
    await produk.waitFor({ state: "attached" });
    await expect(produk.getByRole("button", { name: /Keranjang|Cart/ })).toHaveCount(0);
  });

  test("default (flag ON) → app artikel & tombol keranjang ada", async ({ page }) => {
    clearSettings();
    await page.goto(freshUrl());
    await expect(page.locator("#artikel")).toBeAttached();
    const produk = page.locator("#produk");
    await produk.waitFor({ state: "attached" });
    // minimal 1 (quick trigger + tombol per produk); jumlah pastinya tak
    // penting — yang penting gate OFF membuang SEMUA, dan ON menyisakan ≥1.
    await expect(produk.getByRole("button", { name: /Keranjang|Cart/ })).not.toHaveCount(0);
  });
});
```

- [ ] **Step 2: Daftarkan spec di `playwright-godmode.config.ts`**

Ganti `testMatch`:

```ts
  testMatch: /(os-apps-config|ui-strings|features)\.spec\.ts/,
```

Perbarui juga komentar di atas `workers: 1` — saat ini menyebut "os-apps-config dan ui-strings berbagi backend file yang sama" → tambahkan "features" ("…os-apps-config, ui-strings, dan features berbagi backend file yang sama…").

- [ ] **Step 3: Jalankan e2e**

Run: `npm run test:e2e:godmode`
Expected: PASS — 4 test `features.spec.ts` + 7 test Fase 1/2 lulus (total 11 di config godmode).

Bila test "tombol keranjang hilang" gagal (count > 0 saat OFF): berarti ada tombol pemicu cart yang terlewat dari gate — itu bug nyata, jangan longgarkan assertion. Telusuri `setIsOpen(true)` dan `handleAddToCart` di kedua file section.

- [ ] **Step 4: Commit**

```bash
git add e2e/features.spec.ts playwright-godmode.config.ts
git commit -m "@ test(godmode): Fase 3 — e2e utas settings.features sampai DOM publik"
```

---

## Task 10: Verifikasi penuh + boundary client/server + PR

**Files:**
- Hanya verifikasi + dokumen (tidak ada kode baru). Bila boundary gagal, perbaiki import di file pelanggar.

- [ ] **Step 1: Gate CI lengkap**

Run (berurutan, semua harus hijau):

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run test:e2e:godmode
npm run build
```

Expected: lint 0 error, tsc 0 error, semua unit test (project `shared-fs` + `default`) lulus, semua e2e godmode lulus, build sukses.

- [ ] **Step 2: Verifikasi boundary client/server (spec §5)**

Pastikan `features-config.ts` (yang mengimpor `@/lib/settings` → drizzle/fs/db) TIDAK diimpor di komponen client. Cek:

```bash
grep -rn "features-config" src --include=*.tsx --include=*.ts | grep -v "features-config.ts:"
```

Expected: hanya di `src/app/(public)/layout.tsx`, `src/app/(public)/artikel/page.tsx`, `src/app/(public)/artikel/[slug]/page.tsx`, `src/app/admin/features/page.tsx`, `src/lib/actions.ts`, `src/app/api/retrobot/route.ts`. Tidak ada `.tsx` client (`"use client"`). Lalu konfirmasi via output build: `npm run build` log tidak boleh memperingatkan `features-config` masuk client bundle.

- [ ] **Step 3: Update `memory/godmode-admin-roadmap.md`**

Tandai **FASE 3 SELESAI** (tanggal hari ini, nama branch `feat/godmode-feature-flags`, nama PR diisi setelah Step 6). Pindah item "Tidak ada feature flag sejati" dari daftar HARDCODE ke bagian "Yang SUDAH DB-driven". Tambahkan pelajaran baru bila ada (terutama: pola 1-flag-banyak-titik, dan keputusan toggle-switch inline vs komponen shadcn baru). **Catatan: memory ini adalah `.claude/projects/.../memory/` (di luar repo) — jangan `git add`.**

- [ ] **Step 4: Rebase ke main terbaru**

```bash
git fetch origin
git log --oneline HEAD..origin/main   # bila kosong, lewati merge
```

Bila ada komit baru di main: `git merge origin/main --no-edit` (atau rebase `git rebase origin/main`), resolve bila ada, lalu lanjut.

- [ ] **Step 5: Push + buka PR**

```bash
git push -u origin feat/godmode-feature-flags
gh pr create --base main --title "God Mode Fase 3 — Feature Flag Global" --body-file .superpowers/pr-body-fase3.md
```

Isi PR body (Bahasa Indonesia): ringkasan 4 flag + 3 lapisan + daftar file baru/modifikasi + catatan "nol migrasi schema" + banner **PERHATIAN: JANGAN MERGE OTOMATIS — merge manual setelah semua check hijau**. Akhiri dengan `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 6: Poll check `quality` sampai hijau, lalu serahkan merge ke user**

```bash
gh pr view --json mergeStateStatus,statusCheckRollup
```

Poll check bernama `quality` (ruleset `main-protection` memakainya; Lighthouse/GitGuardian adalah check first-commit yang tidak re-run). Bila `mergeStateStatus: BEHIND` walau semua check hijau: merge `origin/main` → push → poll `quality` lagi dari SHA baru. Merge ke main adalah **manual** (repo-level auto-merge dimatikan) — serahkan perintah merge ke user via prefix `! ` bila klasifier Bash timeout:

```
! gh pr merge <N> --merge --delete-branch
```

- [ ] **Step 7: Commit dokumen plan (bila ada perubahan saat eksekusi)**

```bash
git add plans/godmode-fase3-feature-flags-plan.md
git commit -m "@ docs(godmode): Fase 3 — implementation plan"
```

---

## Catatan untuk reviewer task (bukan task)

- **Pola berulang yang sengaja identik** (bukan duplikasi salah): `features-meta.ts` ↔ `os-apps-meta.ts`/`ui-strings-meta.ts`; `features-config.ts` ↔ kedua config di atas; `saveFeaturesAction` ↔ `saveUIStringsAction`; `features-form.tsx` ↔ `ui-strings-form.tsx`; halaman admin ↔ `admin/strings/page.tsx`. Blast-radius minimum berarti "tiru pola yang sudah terbukti", bukan "refactor".
- **Asumsi yang diverifikasi sebelum plan ditulis:** `useCart()` hanya dipakai di 3 file (cart-dialog, products-section, product-detail-content) — tidak ada tombol cart di Header/OSMenubar; `(admin)` route group punya layout sendiri (tidak memakai `(public)/layout.tsx`); tidak ada komponen Switch shadcn; `middleware.ts` Clerk-only; `notFound()` tersedia di App Router.
- **Yang TIDAK boleh muncul di diff:** perubahan schema `src/db/schema.ts`, `middleware.ts`, `os-apps-config.ts`, `ui-strings-config.ts`, `cart-context.tsx`, `header.tsx`, `os-menubar.tsx`, `translations.ts`, konfigurasi AI, `os-crt-terminal.tsx`.
