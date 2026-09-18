# God Mode Fase 2 — Editor Teks UI: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat mengubah 22 teks marketing UI dari `/admin/strings` tanpa kode/redeploy; situs tetap utuh pakai teks default bila DB kosong/rusak.

**Architecture:** Overlay DB (`settings.ui_strings`) di-resolve server-side di `(public)/layout.tsx`, dilewatkan sebagai prop ke `LanguageProvider`, yang me-merge dengan `translations` default (client-side, filter allowlist). Pola identik Fase 1: meta client-safe + config server-only + pengaman asimetris (baca DB ditoleransi, input admin ditolak keras).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod, Drizzle (tabel `settings`), Vitest, Playwright, shadcn/ui, sonner, lucide-react.

**Spec:** `plans/godmode-fase2-ui-strings-design.md` (baca spec + plan bersamaan; plan berargumen dari spec).

**Branch:** `feat/godmode-ui-strings` — **sementara berdiri di atas `feat/godmode-os-apps-config`** karena infrastruktur vitest `shared-fs` + pola Fase 1 belum ada di `main`. Setelah PR #33 merge, jalankan:

```bash
git fetch origin main
git rebase --onto origin/main feat/godmode-os-apps-config feat/godmode-ui-strings
```

Ini melepas commit Fase 1 dari atas branch dan meletakkan ulang commit Fase 2 di atas `main` yang baru.

## Global Constraints

- Bahasa: Indonesia untuk semua pesan error, label admin, komentar kode, dan commit (aturan repo).
- **Tidak ada migrasi schema**, tidak ada env baru, tidak ada dependency npm baru.
- Modul yang diimpor oleh komponen client **dilarang** mengimpor `fs`/`drizzle`/`@/db` — pola meta/config split wajib.
- `ui-strings-meta.ts` **dilarang** mengimpor `@/lib/i18n` (file itu `"use client"`; meta diimpor oleh modul server).
- `i18n.tsx` hanya boleh mengimpor **type** dari `ui-strings-meta.ts` (erased at compile time, tidak menarik server code).
- `verifyAdmin()` wajib di setiap mutation; `logAudit` + `revalidatePath` setelah simpan.
- Commit message diawali `@ ` (konvensi repo, lihat `git log --oneline`).

---

## Task 1: Modul meta client-safe + sanitasi + registrasi vitest

**Files:**
- Create: `src/lib/ui-strings-meta.ts`
- Create: `tests/ui-strings-config.test.ts`
- Modify: `vitest.config.mts` (array `SHARED_FS_TESTS`)

**Interfaces:**
- Produces: `StringKey` (union 22 key), `EDITABLE_KEYS`, `EDITABLE_KEY_SET`, `UI_STRING_LANGS`, `MAX_KEY_LENGTH`, `UIStringsOverlay`, `sanitizeStringValue`, `maxLengthForKey`.

- [ ] **Step 1: Tulis `src/lib/ui-strings-meta.ts`**

```ts
/**
 * Metadata teks UI yang bisa diedit admin — murni data, TANPA import server.
 *
 * Dilarang mengimpor @/lib/i18n di sini: file itu "use client", sementara file
 * ini diimpor oleh ui-strings-config.ts (server-only, bawaan drizzle/fs/db).
 * Default teks diambil dari translations hanya di sisi client (form & provider).
 *
 * Sumber kebenaran tunggal untuk: key apa saja yang boleh ditimpa, label
 * manusiawi di form admin, batas panjang per key, dan sanitasi plain-text.
 * Key dengan interpolasi dinamis (os_nav_page, os_nav_of, …) sengaja
 * DIKELUARKAN dari daftar ini — admin tidak boleh merusak format string.
 */

export type UIStringLang = "id" | "en";
export const UI_STRING_LANGS = ["id", "en"] as const;

/** Batas panjang kancing untuk data DB usang (baca-jalan). */
export const MAX_KEY_LENGTH = 500;

interface EditableKeyDef {
  key: string;
  /** Label di form admin. */
  label: string;
  /** Kelompok di form (Hero, Services, …). */
  group: string;
  /** Batas panjang nilai yang disimpan. */
  maxLength: number;
  /** Di mana teks ini muncul — bantuan admin, bukan teknis. */
  hint?: string;
}

export const EDITABLE_KEYS = [
  { key: "hero_available_badge", label: "Badge Ketersediaan", group: "Hero", maxLength: 80, hint: "Pita status di hero section." },
  { key: "hero_verified_badge", label: "Badge Terverifikasi", group: "Hero", maxLength: 60, hint: "Pita verifikasi di hero section." },
  { key: "hero_cta_projects", label: "Tombol CTA — Proyek", group: "Hero", maxLength: 40 },
  { key: "hero_cta_portfolio", label: "Tombol CTA — Portofolio", group: "Hero", maxLength: 40 },
  { key: "hero_skills_label", label: "Label Keahlian Utama", group: "Hero", maxLength: 40 },
  { key: "hero_contact_heading", label: "Heading Hubungi Saya", group: "Hero", maxLength: 60 },
  { key: "services_eyebrow", label: "Eyebrow Section Layanan", group: "Services", maxLength: 60 },
  { key: "services_title", label: "Judul Section Layanan", group: "Services", maxLength: 80 },
  { key: "services_subtitle", label: "Subjudul Section Layanan", group: "Services", maxLength: 160 },
  { key: "services_cta", label: "Tombol CTA Layanan", group: "Services", maxLength: 60 },
  { key: "projects_eyebrow", label: "Eyebrow Section Proyek", group: "Projects", maxLength: 60 },
  { key: "projects_title", label: "Judul Section Proyek", group: "Projects", maxLength: 80 },
  { key: "projects_view_all", label: "Tombol Lihat Semua Proyek", group: "Projects", maxLength: 40 },
  { key: "products_eyebrow", label: "Eyebrow Section Produk", group: "Products", maxLength: 60 },
  { key: "products_title", label: "Judul Section Produk", group: "Products", maxLength: 80 },
  { key: "testi_eyebrow", label: "Eyebrow Section Testimoni", group: "Testimoni", maxLength: 60 },
  { key: "testi_title", label: "Judul Section Testimoni", group: "Testimoni", maxLength: 80 },
  { key: "articles_eyebrow", label: "Eyebrow Section Artikel", group: "Artikel", maxLength: 100 },
  { key: "articles_title", label: "Judul Section Artikel", group: "Artikel", maxLength: 100 },
  { key: "contact_eyebrow", label: "Eyebrow Section Kontak", group: "Kontak", maxLength: 100 },
  { key: "contact_title", label: "Judul Section Kontak", group: "Kontak", maxLength: 80 },
  { key: "contact_subtitle", label: "Subjudul Section Kontak", group: "Kontak", maxLength: 160 },
] as const satisfies readonly EditableKeyDef[];

export type StringKey = (typeof EDITABLE_KEYS)[number]["key"];

export const EDITABLE_KEY_SET: Set<string> = new Set(EDITABLE_KEYS.map((k) => k.key));

/** Overlay per bahasa: hanya key terdaftar, hanya string. */
export interface UIStringsOverlay {
  id: Partial<Record<StringKey, string>>;
  en: Partial<Record<StringKey, string>>;
}

/** Batas panjang untuk sebuah key (default aman bila key tak dikenal). */
export function maxLengthForKey(key: string): number {
  return EDITABLE_KEYS.find((k) => k.key === key)?.maxLength ?? 0;
}

/**
 * Sanitasi plain-text: trim → collapse whitespace → buang tag HTML → buang
 * char kontrol. Sengaja TIDAK memotong ke maxLength — penolakan panjang adalah
 * tugas saveUIStrings() supaya pelanggaran ditolak keras, bukan diam-diam
 * dipendekkan. Pemanggil read-path (resolveUIStrings) membuang value terlalu
 * panjang, bukan memotongnya.
 */
export function sanitizeStringValue(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, "") // buang tag HTML apa pun
    .replace(/[\u0000-\u001f\u007f]/g, "") // buang char kontrol
    .replace(/\s+/g, " ") // collapse whitespace (termasuk newline jadi spasi)
    .trim();
}
```

Catatan: `as const satisfies readonly EditableKeyDef[]` memberi literal union tipis untuk `StringKey` sekaligus memvalidasi shape. Bila `satisfies` menolak karena tipenya terlalu sempit, hapus `satisfies`-nya dan andalkan test Step 3.

- [ ] **Step 2: Tulis test gagal untuk sanitasi + keandalan daftar key**

Buat `tests/ui-strings-config.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  EDITABLE_KEYS,
  EDITABLE_KEY_SET,
  MAX_KEY_LENGTH,
  sanitizeStringValue,
} from "@/lib/ui-strings-meta";

/**
 * resolveUIStrings/saveUIStrings membaca settings.ui_strings; di lingkungan test
 * tidak ada DB terhubung sehingga getSetting memakai file
 * data/local-settings.json. File itu harus bersih di awal dan di akhir test,
 * jika tidak nilai yang tertulis akan menimpa default pada test berikutnya
 * (persis seperti produksi: admin menimpa kode).
 *
 * File ini menulis/membaca berkas bersama dengan tests/os-apps-config.test.ts
 * dan tests/cloud-ai-config.test.ts — karenanya WAJIB terdaftar di
 * SHARED_FS_TESTS (project serial) di vitest.config.mts. Bila lupa, beforeEach
 * satu file menghapus file persis saat file lain menulis → flaky race.
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

describe("sanitizeStringValue (plain-text)", () => {
  it("membuang tag HTML", () => {
    expect(sanitizeStringValue("<b>Halo</b> <i>dunia</i>")).toBe("Halo dunia");
  });

  it("membuang char kontrol", () => {
    expect(sanitizeStringValue("a\u0000b\u0007c\u001fd")).toBe("abcd");
  });

  it("collapse whitespace + trim", () => {
    expect(sanitizeStringValue("  Halo   \n\n dunia\t ")).toBe("Halo dunia");
  });

  it("input bukan string → string kosong", () => {
    expect(sanitizeStringValue(null)).toBe("");
    expect(sanitizeStringValue(42)).toBe("");
    expect(sanitizeStringValue({ x: 1 })).toBe("");
  });

  it("tidak memotong — value panjang dikembalikan utuh (penolakan adalah tugas saveUIStrings)", () => {
    const long = "a".repeat(300);
    expect(sanitizeStringValue(long).length).toBe(300);
  });
});

describe("EDITABLE_KEYS (keandalan daftar)", () => {
  it("22 key, semua unik", () => {
    const keys = EDITABLE_KEYS.map((k) => k.key);
    expect(keys.length).toBe(22);
    expect(new Set(keys).size).toBe(22);
  });

  it("set allowlist cocok dengan daftar", () => {
    for (const k of EDITABLE_KEYS) expect(EDITABLE_KEY_SET.has(k.key)).toBe(true);
    expect(EDITABLE_KEY_SET.has("evil_key")).toBe(false);
  });

  it("semua key punya maxLength di antara 1 dan MAX_KEY_LENGTH", () => {
    for (const k of EDITABLE_KEYS) {
      expect(k.maxLength).toBeGreaterThan(0);
      expect(k.maxLength).toBeLessThanOrEqual(MAX_KEY_LENGTH);
    }
  });
});
```

- [ ] **Step 3: Daftarkan file test ke project serial `shared-fs`**

Modifikasi `vitest.config.mts`:

```ts
const SHARED_FS_TESTS = [
  "tests/cloud-ai-config.test.ts",
  "tests/os-apps-config.test.ts",
  "tests/ui-strings-config.test.ts",
];
```

Juga perbarui komentar di atas array: tambahkan `tests/ui-strings-config.test.ts` ke kalimat "Bila nanti ada test file ke-3 yang menyentuh local-settings.json, tambahkan ke daftar ini" → kini jadi "ke-4" sesuai urutan.

- [ ] **Step 4: Jalankan test — harus lulus**

Run: `npm run test -- ui-strings-config`
Expected: PASS (semua test di `shared-fs` project serial).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ui-strings-meta.ts tests/ui-strings-config.test.ts vitest.config.mts
git commit -m "@ feat(godmode): Fase 2 — meta teks UI + sanitasi plain-text

Daftar 22 key marketing yang bisa ditimpa admin, allowlist, dan
sanitasi (trim/collapse/strip tag & char kontrol). File test
didaftarkan ke project vitest serial karena menyentuh
data/local-settings.json bersama dua file lain.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 2: Resolver + save server-only (`ui-strings-config.ts`)

**Files:**
- Create: `src/lib/ui-strings-config.ts`
- Modify: `tests/ui-strings-config.test.ts` (tambah describe block)

**Interfaces:**
- Consumes: `getSetting`/`setSetting` dari `@/lib/settings`; `EDITABLE_KEYS`, `EDITABLE_KEY_SET`, `UI_STRING_LANGS`, `MAX_KEY_LENGTH`, `UIStringsOverlay`, `sanitizeStringValue`, `maxLengthForKey` dari Task 1.
- Produces: `UIStrings` (`UIStringsOverlay` + `source: "admin"|"default"`), `resolveUIStrings(): Promise<UIStrings>`, `saveUIStrings(input): Promise<void>`, `describeUIStrings(strings, lang): string`.

- [ ] **Step 1: Tulis test gagal untuk resolver & save**

Tambah ke `tests/ui-strings-config.test.ts` (impor baru di atas):

```ts
import {
  resolveUIStrings,
  saveUIStrings,
  describeUIStrings,
} from "@/lib/ui-strings-config";
import type { UIStrings } from "@/lib/ui-strings-config";
import { translations } from "@/lib/i18n";
```

> Catatan: `@/lib/i18n` berbentuk `.tsx` dan `"use client"`, tapi isinya bisa
> diimpor di lingkungan node vitest (esbuild menangani JSX; directive "use
> client" hanyalah string). Yang dipakai hanya konstanta `translations`.

```ts
async function writeSettings(payload: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
  const existing = fs.existsSync(LOCAL_SETTINGS)
    ? JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"))
    : {};
  await fs.promises.writeFile(
    LOCAL_SETTINGS,
    JSON.stringify({ ...existing, ui_strings: payload })
  );
}

describe("resolveUIStrings (fallback & toleransi data usang)", () => {
  it("belum diatur → overlay kosong, source default", async () => {
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
    expect(r.id).toEqual({});
    expect(r.en).toEqual({});
  });

  it("key valid masuk overlay persis, source admin", async () => {
    await writeSettings({ id: { contact_title: "Mari Ngobrol" }, en: { contact_title: "Let's Talk" } });
    const r = await resolveUIStrings();
    expect(r.source).toBe("admin");
    expect(r.id.contact_title).toBe("Mari Ngobrol");
    expect(r.en.contact_title).toBe("Let's Talk");
  });

  it("value bukan object → diabaikan, tetap default", async () => {
    await writeSettings("corrupt");
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
    expect(r.id).toEqual({});
  });

  it("lang asing diabaikan", async () => {
    await writeSettings({ fr: { contact_title: "Bonjour" } });
    const r = await resolveUIStrings();
    expect(r.source).toBe("default");
  });

  it("key asing diabaikan, key valid di sebelahnya tetap masuk", async () => {
    await writeSettings({ id: { evil_key: "HACK", contact_title: "Valid" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("Valid");
    expect(r.id).not.toHaveProperty("evil_key");
  });

  it("value bukan string diabaikan", async () => {
    await writeSettings({ id: { contact_title: null, contact_subtitle: 42 } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("value whitespace-only diabaikan (artinya pakai default)", async () => {
    await writeSettings({ id: { contact_title: "   \t " } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("value lebih panjang dari MAX_KEY_LENGTH diabaikan", async () => {
    await writeSettings({ id: { contact_title: "a".repeat(MAX_KEY_LENGTH + 1) } });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });
});

describe("saveUIStrings (penolakan keras input admin)", () => {
  it("key asing ditolak", async () => {
    await expect(
      saveUIStrings({ id: { evil_key: "x" }, en: {} })
    ).rejects.toThrow(/tidak dikenal/);
  });

  it("value HTML ditolak sebelum disimpan", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: "<b>Halo</b>" }, en: {} })
    ).rejects.toThrow(/tidak valid|HTML|tag/i);
  });

  it("value melebihi maxLength ditolak", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: "a".repeat(81) }, en: {} })
    ).rejects.toThrow(/terlalu panjang/i);
  });

  it("value bukan string ditolak", async () => {
    await expect(
      saveUIStrings({ id: { contact_title: 42 }, en: {} })
    ).rejects.toThrow(/tidak valid|teks/i);
  });

  it("input bukan object ditolak", async () => {
    await expect(saveUIStrings(null)).rejects.toThrow();
    await expect(saveUIStrings("nope")).rejects.toThrow();
  });

  it("value valid disimpan + dibaca kembali, whitespace dirapikan", async () => {
    await saveUIStrings({ id: { contact_title: "  Mari   Ngobrol  " }, en: { contact_title: "Let's Talk" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("Mari Ngobrol");
    expect(r.en.contact_title).toBe("Let's Talk");
  });

  it("value whitespace-only menyimpan overlay kosong (kembali ke default)", async () => {
    await saveUIStrings({ id: { contact_title: "   " }, en: {} });
    const r = await resolveUIStrings();
    expect(r.id).toEqual({});
  });

  it("tag HTML dibuang saat simpan bila lolos validasi (pertahanan dalam)", async () => {
    // saveUIStrings menolak value HTML; tapi bila ditulis langsung ke DB,
    // resolveUIStrings harus tetap membuangnya di read-path.
    await writeSettings({ id: { contact_title: "<script>x</script>Bersih" } });
    const r = await resolveUIStrings();
    expect(r.id.contact_title).toBe("Bersih");
  });
});

describe("describeUIStrings", () => {
  it("ringkasan jumlah key disunting", () => {
    const s: UIStrings = { id: { contact_title: "A" }, en: {}, source: "admin" };
    expect(describeUIStrings(s, "id")).toContain("1");
    expect(describeUIStrings(s, "id")).toContain(String(EDITABLE_KEYS.length));
  });
});
```

- [ ] **Step 2: Jalankan test — harus gagal**

Run: `npm run test -- ui-strings-config`
Expected: FAIL — `resolveUIStrings is not a function` / modul tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/ui-strings-config.ts`**

```ts
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
  EDITABLE_KEY_SET,
  MAX_KEY_LENGTH,
  UI_STRING_LANGS,
  maxLengthForKey,
  sanitizeStringValue,
  type UIStringsOverlay,
} from "@/lib/ui-strings-meta";

const SETTING_KEY = "ui_strings";

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

export async function resolveUIStrings(): Promise<UIStrings> {
  try {
    const stored = await getSetting<unknown>(SETTING_KEY);
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
      const cleaned = sanitizeStringValue(value);
      if (cleaned !== value) {
        // Admin harus melihat hasil bersih di form, bukan disimpan diam-diam.
        throw new Error(
          `Teks UI tidak valid: nilai key "${key}" mengandung tag HTML atau karakter terlarang.`
        );
      }
      const max = maxLengthForKey(key);
      if (cleaned.length > max) {
        throw new Error(`Teks UI tidak valid: nilai key "${key}" terlalu panjang (maks. ${max} karakter).`);
      }
      if (!cleaned) continue; // whitespace-only = kembali ke default
      out[lang][key] = cleaned;
    }
  }

  await setSetting(SETTING_KEY, out);
}

/** Ringkasan untuk UI admin: jumlah key disunting vs total. */
export function describeUIStrings(strings: UIStrings, _lang: "id" | "en"): string {
  const edited = Object.keys(strings.id).length + Object.keys(strings.en).length;
  return `${edited}/${EDITABLE_KEYS.length * 2} slot disunting`;
}
```

> Import `EDITABLE_KEYS` belum dipakai di file ini selain melalui
> `describeUIStrings` — tambahkan ke daftar import di atas (Task 1 mengeksport
>nya).

- [ ] **Step 4: Jalankan test — harus lulus**

Run: `npm run test -- ui-strings-config`
Expected: PASS (semua test `shared-fs` + `sanitizeStringValue` + `EDITABLE_KEYS`).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tidak ada error.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ui-strings-config.ts tests/ui-strings-config.test.ts
git commit -m "@ feat(godmode): Fase 2 — resolver + save overlay teks UI

settings.ui_strings dibaca dengan toleransi per-entry (key asing,
value non-string, terlalu panjang — semua dilewati) dan ditolak
keras saat simpan dari form admin. Sanitasi read-path juga
membuang HTML dari penulisan DB langsung.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 3: Overlay sampai client (`i18n.tsx` + `(public)/layout.tsx`)

**Files:**
- Modify: `src/lib/i18n.tsx` (prop `LanguageProvider`, merge allowlist-filtered)
- Modify: `src/app/(public)/layout.tsx` (1 fetch + 1 prop)

**Interfaces:**
- Consumes: `resolveUIStrings` dari Task 2; `EDITABLE_KEYS`, `UIStringsOverlay` dari Task 1.
- Produces: `LanguageProvider` menerima `overrides?: UIStringsOverlay`; `useTranslation()` tidak berubah.

> Tidak ada unit test di task ini (lingkungan vitest = node, tanpa DOM).
> Perilaku diverifikasi oleh e2e Task 6.

- [ ] **Step 1: Ubah `LanguageProvider` di `src/lib/i18n.tsx`**

Tambah import type di atas (setelah import React):

```ts
import type { UIStringsOverlay } from "@/lib/ui-strings-meta";
import { EDITABLE_KEYS } from "@/lib/ui-strings-meta";
```

Tambah helper pure di atas `LanguageProvider` (sekitar baris 1085):

```ts
/**
 * Overlay teks admin di atas default kode. Hanya key terdaftar yang dipakai
 * (allowlist) — data DB usang yang menyebut key lain diam-diam diabaikan,
 * situs tetap memakai default. Value kosong juga diabaikan.
 */
function applyOverrides(
  base: Translations,
  overrides: UIStringsOverlay[keyof UIStringsOverlay] | undefined
): Translations {
  if (!overrides || typeof overrides !== "object") return base;
  const out = { ...base };
  for (const def of EDITABLE_KEYS) {
    const v = (overrides as Record<string, unknown>)[def.key];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, unknown>)[def.key] = v;
    }
  }
  return out;
}
```

Ubah signature + isi `LanguageProvider`:

```ts
export function LanguageProvider({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: UIStringsOverlay;
}) {
  const [language, setLanguageState] = useState<Language>("id");

  const t = useMemo(
    () => ({
      id: applyOverrides(translations.id, overrides?.id),
      en: applyOverrides(translations.en, overrides?.en),
    }),
    [overrides]
  );

  // … seluruh body tetap (useEffect deteksi bahasa, storage sync, setLanguage),
  // hanya nilai context di return yang berubah:
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: t[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

`useMemo` perlu diimpor dari React (sudah ada `useEffect, useState, useCallback` — tambah `useMemo`).

- [ ] **Step 2: Umpankan overlay dari layout**

`src/app/(public)/layout.tsx`:

```ts
import { resolveUIStrings } from "@/lib/ui-strings-config";
// …
export default async function RootPublicLayout({ children }) {
  const profile = await getProfile();
  const uiStrings = await resolveUIStrings();
  // …
  <LanguageProvider overrides={uiStrings}>
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tidak ada error. Build penting di sini: memastikan tidak ada modul server (`fs`/drizzle) yang terbawa ke client bundle — `resolveUIStrings` hanya dipanggil di server component, dan i18n.tsx hanya mengimpor type + `EDITABLE_KEYS` (murni data).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.tsx src/app/\(public\)/layout.tsx
git commit -m "@ feat(godmode): Fase 2 — overlay teks UI sampai client

LanguageProvider menerima prop overrides (resolveUIStrings dari
layout publik) dan me-merge-nya ke translations default dengan
filter allowlist. useTranslation() tidak berubah — 20 konsumen
tetap dapat nilai default bila overlay kosong.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 4: Server action `saveUIStringsAction`

**Files:**
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: `saveUIStrings`, `resolveUIStrings`, `describeUIStrings` dari Task 2; `verifyAdmin`, `logAudit`, `sanitizeError`, `revalidatePath` (semua sudah di actions.ts).
- Produces: `saveUIStringsAction(input): Promise<{ok:true; strings: UIStrings} | {ok:false; error: string}>`.

- [ ] **Step 1: Tambah import di atas `src/lib/actions.ts`**

```ts
import {
  resolveUIStrings,
  saveUIStrings,
  describeUIStrings,
  type UIStrings,
} from "@/lib/ui-strings-config";
```

- [ ] **Step 2: Tambah action** (di sebelah `saveOSAppsAction`, sekitar baris 1920)

```ts
export async function saveUIStringsAction(
  input: unknown
): Promise<{ ok: true; strings: UIStrings } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await saveUIStrings(input);
    const resolved = await resolveUIStrings();
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "ui_strings",
      detail: describeUIStrings(resolved, "id"),
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/strings");
    return { ok: true, strings: resolved };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions.ts
git commit -m "@ feat(godmode): Fase 2 — server action simpan teks UI

verifyAdmin + validasi ketat + audit log + revalidate layout
(public) dan halaman admin. Return shape sama dengan
saveOSAppsAction supaya form seragam.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 5: Halaman admin `/admin/strings` + form + menu sidebar

**Files:**
- Create: `src/app/admin/strings/page.tsx`
- Create: `src/components/admin/ui-strings-form.tsx`
- Modify: `src/components/admin/admin-sidebar.tsx` (import ikon + 1 item)

**Interfaces:**
- Consumes: `resolveUIStrings` (page server), `saveUIStringsAction` + `translateFieldAction` (form client), `EDITABLE_KEYS`/`StringKey`/`UIStringsOverlay` (meta), `translations` (i18n, default untuk placeholder), shadcn `Card`/`Textarea`/`Button`/`Badge`, `sonner` toast.
- Produces: route `/admin/strings` (admin-only via layout admin yang sudah ada).

- [ ] **Step 1: Tulis `src/app/admin/strings/page.tsx`**

```tsx
import { Languages, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveUIStrings } from "@/lib/ui-strings-config";
import { EDITABLE_KEYS } from "@/lib/ui-strings-meta";
import { UIStringsForm } from "@/components/admin/ui-strings-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Halaman "God Mode" Fase 2: ubah teks marketing UI tanpa kode/redeploy.
 *
 * Yang disimpan hanya overlay (key terdaftar) di settings.ui_strings; teks
 * default tetap di src/lib/i18n.tsx dan dipakai bila key belum ditimpa atau
 * data rusak. Perubahan langsung tayang di situs publik setelah Simpan
 * (revalidatePath("/", "layout") di saveUIStringsAction).
 */
export default async function AdminStringsPage() {
  const strings = await resolveUIStrings();
  const editedSlots = Object.keys(strings.id).length + Object.keys(strings.en).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" /> Teks &amp; Bahasa
        </h1>
        <p className="text-sm text-muted-foreground">
          God Mode — ubah teks marketing situs tanpa menyentuh kode atau
          redeploy. Mendukung Indonesia &amp; English.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Editor Teks UI
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {EDITABLE_KEYS.length} teks bisa diubah, masing-masing untuk dua
            bahasa.
            <Badge variant={strings.source === "admin" ? "secondary" : "outline"}>
              {strings.source === "admin"
                ? `${editedSlots} slot disunting · sudah disimpan`
                : "belum diatur — pakai default"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UIStringsForm initial={strings} />
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
            <span className="font-semibold text-foreground">Bisa:</span> teks
            marketing (judul section, subjudul, badge, tombol CTA) untuk kedua
            bahasa. Kosongkan kolom untuk kembali ke teks default.
          </p>
          <p>
            <span className="font-semibold text-foreground">Belum bisa:</span>{" "}
            teks dalam tiap aplikasi (proyek, layanan, testimoni), label OS,
            dan pesan terminal — menyusul di fase berikutnya.
          </p>
          <p>
            <span className="font-semibold text-foreground">Pengaman:</span>{" "}
            hanya teks polos (tidak ada HTML), panjang dibatasi per kolom, dan
            hanya key terdaftar yang disimpan. Data rusak diabaikan, situs
            tetap memakai teks default.
          </p>
          <p>
            <span className="font-semibold text-foreground">Catatan teknis:</span>{" "}
            disimpan di tabel <code className="font-mono text-xs">settings</code>{" "}
            key <code className="font-mono text-xs">ui_strings</code>; akses
            tulis hanya lewat server action yang memverifikasi admin, tercatat
            di audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Tulis `src/components/admin/ui-strings-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Loader2, Save, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveUIStringsAction, translateFieldAction } from "@/lib/actions";
import {
  EDITABLE_KEYS,
  UI_STRING_LANGS,
  type StringKey,
  type UIStringsOverlay,
} from "@/lib/ui-strings-meta";
import { translations, type Language } from "@/lib/i18n";

interface UIStringsFormProps {
  /** Overlay dari DB (sudah diresolve server-side). */
  initial: UIStringsOverlay;
}

type Rows = Record<StringKey, { id: string; en: string }>;

/** Teks efektif saat ini: overlay DB bila ada, kalau tidak default kode. */
function buildRows(overlay: UIStringsOverlay): Rows {
  const rows = {} as Rows;
  for (const def of EDITABLE_KEYS) {
    const defk = def.key as StringKey;
    rows[defk] = {
      id: overlay.id[defk] ?? defaultFor(def.key, "id"),
      en: overlay.en[defk] ?? defaultFor(def.key, "en"),
    };
  }
  return rows;
}

function defaultFor(key: string, lang: Language): string {
  return (translations[lang] as Record<string, string>)[key] ?? "";
}

/**
 * Form untuk /admin/strings: edit 22 teks marketing × 2 bahasa.
 *
 * State selalu menampilkan teks EFEKTIF (DB atau default), jadi admin melihat
 * kondisi sebenarnya. Kembali ke default = kosongkan kolom (value kosong tidak
 * disimpan → overlay hilang → default kode dipakai). Submit menyalin state ke
 * server action, yang memvalidasi ulang (verifyAdmin + allowlist + panjang +
 * sanitasi) — manipulasi client tidak pernah menerobos.
 */
export function UIStringsForm({ initial }: UIStringsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Rows>(() => buildRows(initial));
  const [error, setError] = useState("");

  const baseline = buildRows(initial);
  const isDirty = JSON.stringify(rows) !== JSON.stringify(baseline);

  const handleChange = (key: StringKey, lang: "id" | "en", value: string): void => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [lang]: value } }));
  };

  const resetAll = (): void => {
    setRows(baseline);
    setError("");
  };

  const resetKey = (key: StringKey): void => {
    setRows((prev) => ({
      ...prev,
      [key]: { id: defaultFor(key, "id"), en: defaultFor(key, "en") },
    }));
  };

  const translateKey = async (key: StringKey): Promise<void> => {
    const idText = rows[key].id;
    if (!idText.trim()) {
      toast.error("Isi teks Indonesian dulu sebelum menerjemahkan.");
      return;
    }
    const res = await translateFieldAction(idText, "id", "en");
    if (res.success) {
      handleChange(key, "en", res.text);
      toast.success("Terjemahan English diisi.", { description: res.text.slice(0, 80) });
    } else {
      toast.error("Gagal menerjemahkan.", { description: res.error });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const payload: UIStringsOverlay = { id: {}, en: {} };
      for (const def of EDITABLE_KEYS) {
        const k = def.key as StringKey;
        payload.id[k] = rows[k].id;
        payload.en[k] = rows[k].en;
      }
      const res = await saveUIStringsAction(payload);
      if (res.ok) {
        setRows(buildRows(res.strings));
        toast.success("Teks UI disimpan.", {
          description: "Tampilan publik langsung diperbarui untuk kedua bahasa.",
        });
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan teks UI.", { description: res.error });
      }
    });
  };

  const groups = [...new Set(EDITABLE_KEYS.map((k) => k.group))];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {group}
          </h3>
          {EDITABLE_KEYS.filter((k) => k.group === group).map((def) => {
            const k = def.key as StringKey;
            const row = rows[k];
            const overridden =
              baseline[k].id !== row.id || baseline[k].en !== row.en;
            return (
              <div
                key={k}
                className="grid grid-cols-1 md:grid-cols-2 gap-2 border-2 rounded-md p-3 transition-colors"
                style={{ borderColor: overridden ? "var(--primary)" : "var(--border)" }}
              >
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold">{def.label}</span>
                    {def.hint && (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {def.hint}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => resetKey(k)}
                    disabled={pending}
                    className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    title="Kedua kolom kembali ke teks default"
                  >
                    <RotateCcw className="h-3 w-3" /> Default
                  </button>
                </div>
                {UI_STRING_LANGS.map((lang) => (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">
                        {lang === "id" ? "Indonesia" : "English"}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          row[lang].length > def.maxLength
                            ? "text-destructive"
                            : row[lang].length > def.maxLength * 0.8
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {row[lang].length}/{def.maxLength}
                      </span>
                    </div>
                    <Textarea
                      value={row[lang]}
                      onChange={(e) => handleChange(k, lang, e.target.value)}
                      disabled={pending}
                      rows={def.maxLength > 100 ? 3 : 2}
                      className="text-sm resize-y"
                      aria-label={`${def.label} — ${lang === "id" ? "Indonesia" : "English"}`}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => translateKey(k)}
                    disabled={pending}
                    className="h-7 text-[11px]"
                  >
                    <Sparkles className="h-3 w-3" /> Terjemahkan ID → EN
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Teks
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={resetAll}
          disabled={pending || !isDirty}
          className="h-9"
        >
          Batal Perubahan
        </Button>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Languages className="h-3 w-3" />
          {isDirty
            ? "Ada perubahan yang belum disimpan."
            : `${EDITABLE_KEYS.length} teks · 2 bahasa.`}
        </span>
      </div>
    </form>
  );
}
```

> **Bug yang harus dibuang saat implementasi:** sketch di atas mengandung
> `{lang === "id" /* placeholder */}` yang sengaja menunjukkan kesalahan
> penempatan — tombol "Terjemahkan ID → EN" harus dirender **satu kali per
> key**, di luar `.map(UITRING_LANGS)`. Hapus baris `{lang === "id" …}` beserta
> `<div>` pembungkusnya, dan letakkan blok tombol terjemah sebagai sibling
> setelah `UI_STRING_LANGS.map(…)` selesai.

- [ ] **Step 3: Tambah menu sidebar**

`src/components/admin/admin-sidebar.tsx` — tambah `Languages` ke import lucide:

```ts
import {
  // … import yang ada …
  Palette,
  Sparkles,
  Languages,
} from "lucide-react";
```

Tambah item setelah "Tampilan & App OS" (sekitar baris 87-90):

```ts
  {
    title: "Tampilan & App OS",
    href: "/admin/appearance",
    icon: Palette,
  },
  {
    title: "Teks & Bahasa",
    href: "/admin/strings",
    icon: Languages,
  },
```

> Catatan: item aktif memakai `pathname.startsWith(item.href)` — `/admin/strings`
> tidak tabrakan dengan route lain.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: tidak ada error.

- [ ] **Step 5: Smoke manual (opsional, kalau ada dev server)**

`npm run dev` → login admin → `/admin/strings` → ubah "Judul Section Kontak" → Simpan → buka `/` → verifikasi teks berubah. Skip bila tidak memungkinkan; e2e Task 6 menguji untasnya.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/strings/page.tsx src/components/admin/ui-strings-form.tsx src/components/admin/admin-sidebar.tsx
git commit -m "@ feat(godmode): Fase 2 — halaman /admin/strings + editor teks

Form 22 teks × 2 bahasa dengan counter panjang, tombol kembali
ke default per teks, terjemahan ID→EN (reuse translateFieldAction),
dan info cara kerja. Item sidebar Teks & Bahasa.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 6: E2E — utas penuh settings → render publik

**Files:**
- Create: `e2e/ui-strings.spec.ts`
- Modify: `playwright-godmode.config.ts` (`testMatch`)

**Interfaces:**
- Consumes: dev server dengan `DATABASE_URL: ""` (fallback file lokal) dari config godmode; `data/local-settings.json` sebagai backend.

- [ ] **Step 1: Perluas `testMatch` di `playwright-godmode.config.ts`**

```ts
  testMatch: /(os-apps-config|ui-strings)\.spec\.ts/,
```

- [ ] **Step 2: Tulis `e2e/ui-strings.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Integrasi God Mode Fase 2: settings.ui_strings harus benar-benar mengendalikan
 * teks yang dirender pengunjung, untuk kedua bahasa.
 *
 * Unit test di tests/ui-strings-config.test.ts menguji lapisan datanya; test ini
 * memverifikasi utas penuh: (public)/layout.tsx → resolveUIStrings → prop
 * LanguageProvider → merge → useTranslation → DOM. Tanpa ini, overlay bisa saja
 * valid tapi tidak terbaca komponen (mis. prop lupa dilewatkan).
 *
 * File data/local-settings.json dipakai sebagai backend (tidak ada DB di dev);
 * selalu dibersihkan di afterEach agar tidak menempel di test lain.
 */

const SETTINGS_FILE = path.join(process.cwd(), "data", "local-settings.json");

function writeUIStrings(strings: unknown): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const existing = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    : {};
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...existing, ui_strings: strings }), "utf-8");
}

function clearSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
  } catch {
    // abaikan race dengan worker lain
  }
}

/**
 * Section kontak (id="kontak") selalu ada di DOM — textContent bisa dibaca
 * terlepas dari visibility jendela OS. ?lang= menentukan bahasa render;
 * cachebust mem-bypass route cache 60 detik (di produksi cache dimurnikan
 * oleh revalidatePath("/", "layout") di saveUIStringsAction).
 */
let urlSeq = 0;
function freshUrl(lang: "id" | "en"): string {
  return `/?lang=${lang}&cachebust=${Date.now()}-${urlSeq++}`;
}

async function contactText(page: import("@playwright/test").Page): Promise<string> {
  const section = page.locator("#kontak");
  await section.waitFor({ state: "attached" });
  return (await section.textContent()) ?? "";
}

test.describe("God Mode: settings.ui_strings mengendalikan teks publik", () => {
  test.afterEach(() => {
    clearSettings();
  });

  test("override ID tampil di section kontak", async ({ page }) => {
    clearSettings();
    writeUIStrings({ id: { contact_title: "Mari Ngobrol God Mode" }, en: {} });
    await page.goto(freshUrl("id"));
    expect(await contactText(page)).toContain("Mari Ngobrol God Mode");
  });

  test("override EN tampil dengan ?lang=en, default tidak dipakai", async ({ page }) => {
    writeUIStrings({ id: {}, en: { contact_title: "God Mode Contact Title" } });
    await page.goto(freshUrl("en"));
    const text = await contactText(page);
    expect(text).toContain("God Mode Contact Title");
    expect(text).not.toContain("Let's Connect & Collaborate"); // default EN
  });

  test("config rusak (key asing, value null, lang asing) diabaikan — default utuh", async ({ page }) => {
    writeUIStrings({
      id: { evil_key: "HACK", contact_title: null },
      fr: { contact_title: "Bonjour" },
    });
    await page.goto(freshUrl("id"));
    // Teks default ID untuk judul kontak adalah "Mari Berdiskusi & Berkolaborasi".
    expect(await contactText(page)).toContain("Mari Berdiskusi & Berkolaborasi");
    expect(await contactText(page)).not.toContain("HACK");
  });
});
```

- [ ] **Step 3: Jalankan e2e**

Run: `npm run test:e2e:godmode`
Expected: PASS 3 test (plus 4 test Fase 1 yang ikut berjalan — konfigurasi yang sama).

Bila `#kontak` tidak ditemukan dalam DOM (mis. section hanya dirender saat app aktif), ganti selector ke elemen yang selalu ada: taskbar mengandung label `aria-label`; bila perlu, targetkan `page.locator("text=…")` pada teks yang dipakai di menubar (mis. `os_start_contact`). Catat selector pengganti yang dipakai di komentar spec.

- [ ] **Step 4: Commit**

```bash
git add e2e/ui-strings.spec.ts playwright-godmode.config.ts
git commit -m "@ test(godmode): Fase 2 — e2e utas ui_strings sampai DOM publik

Tiga test: override ID dan EN benar-benar dirender, config rusak
(key asing, value null, lang asing) diabaikan dan teks default
tetap utuh.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 7: Verifikasi final + PR

**Files:**
- Modify (bila ada konflik rebase): `vitest.config.mts`, file Fase 1
- Modify: `plans/godmode-fase2-ui-strings-design.md` (hapus status "desain disetujui" → "terimplementasi"? tidak — spec tetap, jangan diubah)

- [ ] **Step 1: Rebase ke main setelah PR #33 merge** (bila belum, skip dan catat)

```bash
git fetch origin main
git rebase --onto origin/main feat/godmode-os-apps-config feat/godmode-ui-strings
git log --oneline  # pastikan tidak ada commit Fase 1 (0e62634, 4c1b3b5) di branch
```

Bila konflik di `vitest.config.mts`: Fase 1 menambahkan `tests/os-apps-config.test.ts` ke `SHARED_FS_TESTS` — di branch ini sudah ada; ambil versi yang berisi ketiga file. Konflik lain tidak diharapkan (file Fase 2 semuanya baru).

- [ ] **Step 2: Semua gate CI lokal**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run test:e2e:godmode && npm run build`
Expected: semua hijau.

- [ ] **Step 3: Update memori roadmap**

Perbarui `C:\Users\sisig\.claude\projects\D--Projects-My-Web-Porto\memory\godmode-admin-roadmap.md`:
- Fase 2 SELESAI (branch/PR #), pindahkan "Yang masih HARDCODE" item 1 (teks UI) menjadi "sebagian DB-driven (22 key)".
- Catat pelajaran baru bila ada (mis. selector e2e, `satisfies` TypeScript, fallout `import type`).

- [ ] **Step 4: Push + buka PR**

```bash
git push -u origin feat/godmode-ui-strings
gh pr create --base main --title "feat(godmode): Fase 2 — editor teks UI dari admin tanpa redeploy" \
  --body "…ringkasan: 22 key × 2 bahasa, /admin/strings, overlay DB di atas default i18n, sanitasi plain-text…"
```

Isi body PR (Indonesia): ringkasan perubahan, daftar file, cara test (`/admin/strings` + `npm run test:e2e:godmode`), catatan pengaman, dan tautan ke `plans/godmode-fase2-ui-strings-design.md`. Tutup dengan:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 5: Poll check `quality` sebelum merge** (ingat [[git-workflow-dev-pr-manual-merge]] dan [[main-ruleset-quality-check]])

`quality` re-run di setiap push; Lighthouse/GitGuardian adalah check first-commit. Setelah semua hijau dan branch up-to-date dengan main, merge manual (`gh pr merge --merge --delete-branch`).

---

## Self-Review

**1. Spec coverage:**
- §1 data model → Task 2 (`SETTING_KEY`, shape).
- §2 file split → Task 1 (meta) + Task 2 (config) + Task 3 (i18n import type only).
- §3 keamanan asimetris + sanitasi → Task 1 (sanitize) + Task 2 (toleransi baca / tolak keras simpan) + test.
- §4 plumbing props → Task 3.
- §5 admin UI → Task 5.
- §6 server action → Task 4.
- §7 testing → Task 1/2 (unit), Task 6 (e2e), Task 7 (CI gates).
- §8 files touched → dipetakan 1:1 di setiap task.
- 22 key → Task 1 `EDITABLE_KEYS` (test memastikan jumlahnya 22).

**2. Placeholder scan:** tidak ada "TODO/TBD"; setiap step berisi kode lengkap dan benar.

**3. Type consistency:** `UIStringsOverlay` (Task 1) → dipakai di Task 2 (`UIStrings extends UIStringsOverlay`), Task 3 (prop provider), Task 5 (form). `StringKey` konsisten. `saveUIStringsAction` return shape identik `saveOSAppsAction`. `describeUIStrings(strings, lang)` konsisten.
