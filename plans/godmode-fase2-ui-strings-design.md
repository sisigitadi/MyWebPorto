# God Mode Fase 2 — Editor Teks UI (`settings.ui_strings`)

**Status:** desain disetujui 2026-09-19 · branch `feat/godmode-ui-strings`
**Prasyarat:** Fase 1 (`settings.os_apps`, PR #33) — pola meta/config split, pengaman
asimetris, dan plumbing props sudah ada dan teruji.

## Tujuan

Admin dapat mengubah teks marketing UI (judul section, CTA, badge) dari halaman
admin tanpa menyentuh kode atau redeploy. Teks baru langsung tayang di situs
publik setelah Simpan.

## Prinsip (dari Fase 1, tidak berubah)

1. **Blast radius minimum** — tidak mengganggu yang lain kalau tidak terpakai.
2. **Pengaman asimetris** — data DB usang/rusak ditoleransi (situs tetap utuh),
   input admin ditolak keras dengan pesan jelas.
3. **Client-safe meta / server-only config split** — `fs`, drizzle, dan `db`
   tidak boleh masuk bundle browser.
4. **Tidak ada migrasi schema** — memakai tabel `settings` (key/value jsonb)
   yang sudah ada.

## Arsitektur

```
settings.ui_strings (DB/file lokal)
        │  getSetting
        ▼
resolveUIStrings()              ← src/lib/ui-strings-config.ts (SERVER-ONLY)
        │  { id: {…}, en: {…}, source }
        ▼
(public)/layout.tsx             ← server component, 1 fetch + 1 prop
        │  <LanguageProvider overrides={…}>
        ▼
LanguageProvider                ← src/lib/i18n.tsx ("use client")
   t = merge(translations[lang], filterAllowlist(overrides[lang]))
        ▼
useTranslation() × 20 konsumen  ← API t TIDAK berubah
```

Pendekatan **server-resolved overlay via props** dipilih karena:
- sama dengan pola Fase 1 (`resolveOSApps` → props),
- tidak ada flash teks-default→teks-DB saat mount (tidak seperti client fetch),
- tidak ada hydration mismatch: server dan client first-render sama-sama
  memulai dari `language: "id"` + prop `overrides` yang sama,
- tidak butuh endpoint API baru.

## Komponen

### 1. `src/lib/ui-strings-meta.ts` (client-safe, murni data)

**Dilarang** mengimpor `i18n.tsx` (file itu `"use client"`; mengimpornya ke meta
akan menarik seluruh modul React ke server-only `ui-strings-config.ts`). Default
teks diambil langsung dari `translations` di sisi client saja (form & provider).

Isi:
- `type StringKey` — union 22 key (diturunkan dari `EDITABLE_KEYS`).
- `EDITABLE_KEYS: { key, label, group, maxLength }[]` — 22 entry.
- `EDITABLE_KEY_SET: Set<StringKey>` — allowlist untuk O(1) lookup.
- `UI_STRING_LANGS = ["id", "en"] as const`.
- `MAX_KEY_LENGTH` (mis. 200) — batas keras umum sebelum cek per-key.
- `sanitizeStringValue(raw): string` — pure, tanpa side effect, **tidak
  memotong** (penolakan panjang adalah tugas `saveUIStrings`, lihat §2):
  trim → collapse whitespace → buang tag `<…>` → buang char kontrol
  (`\x00`–`\x1f`, `\x7f`).

### 2. `src/lib/ui-strings-config.ts` (server-only)

Isi (mirror `os-apps-config.ts`):
- `SETTING_KEY = "ui_strings"`.
- `interface UIStrings { id: Partial<…>; en: Partial<…>; source: "admin"|"default" }`.
- `resolveUIStrings(): Promise<UIStrings>` — baca setting; normalize: abaikan
  entry yang bukan object, lang yang bukan id/en, key asing (tidak di
  allowlist), value bukan string, value melebihi `MAX_KEY_LENGTH`; value
  whitespace-only dibuang (artinya pakai default). Hasil: overlay murni.
  Gagal apa pun (setting tidak ada / JSON rusak) → `{ id: {}, en: {}, source:
  "default" }`. `source` = `"admin"` hanya bila ada minimal satu key valid.
- `saveUIStrings(input)` — validasi ketat untuk form admin, **melempar**:
  - input bukan object, atau lang bukan `id`/`en` → tolak,
  - key tidak ada di allowlist → tolak dengan pesan jelas (insertion ke key
    sembarang bisa menyentuh area UI di luar maksud editor),
  - value bukan string → tolak,
  - value setelah sanitasi melebihi `maxLength` → tolak (admin lihat counter,
    tidak ada alasan melampauinya; sanitasi sendiri tidak memotong, supaya
    pelanggaran panjang benar-benar ditolak, bukan diam-diam dipendekkan),
  - value whitespace-only → diperlakukan sebagai "hapus override" (tidak
    disimpan untuk key itu),
  - save hanya menulis overlay final (sudah tersanitasi), bukan input mentah.
- `describeUIStrings(strings, lang)` — ringkasan untuk UI admin:
  "N key disunting · M key pakai default".

### 3. `src/lib/i18n.tsx` (modifikasi terbatas)

- `LanguageProvider` mendapat prop opsional `overrides?: UIStrings` (default
  `{ id: {}, en: {} }`) — dirender dari server, serializable.
- `const merged = useMemo(() => ({ id: {…t.id, …ov.id}, en: {…t.en, …ov.en} }),
  [overrides])` — key asing di override **diam-diam diabaikan** (lapis toleransi
  data DB usang; `saveUIStrings` sudah menolak, tapi DB bisa ditulis tangan).
- Context value: `t: merged[language]`. Tipe `t` tetap `Translations`
  (key lengkap) — merge hanya menimpa value, tidak menghilangkan key.
- `useTranslation()` **tidak berubah**. `useLanguage()` tidak berubah.

### 4. `src/app/(public)/layout.tsx` (modifikasi terbatas)

```tsx
const uiStrings = await resolveUIStrings();
// …
<LanguageProvider overrides={uiStrings}>
```

Satu fetch tambahan per render layout (sama pola dengan `getProfile()` yang
sudah ada di file ini). Layout sudah dinamis (memanggil server function);
tidak ada halaman statis yang hilang.

### 5. `src/app/admin/strings/page.tsx` (baru)

Server component, mirror `admin/appearance/page.tsx`:
- `export const dynamic = "force-dynamic"; export const revalidate = 0;`
- Header + deskripsi God Mode.
- Card per grup (Hero, Services, Projects, Products, Testimoni, Artikel,
  Kontak) berisi `UIStringsForm`.
- Card "Yang Bisa & Tidak Bisa Diatur" + catatan teknis (key `settings.ui_strings`,
  sanitasi plain-text, tulis hanya lewat server action + audit log).
- Badge `source`: "sudah disimpan" vs "belum diatur — pakai default".

### 6. `src/components/admin/ui-strings-form.tsx` (baru, client)

Form editor. Per key (dikelompokkan per grup):
- label + deskripsi singkat (misi key, di mana muncul),
- input ID + input EN (textarea `<textarea>` untuk value panjang),
- counter `value.length / maxLength` (berubah warna saat mendekati batas),
- tombol **Terjemahkan ID→EN** → reuse `translateFieldAction(idText, "id", "en")`
  (memenuhi `ENABLE_EXTERNAL_TRANSLATE`; kalau mati, pesan errornya informatif
  dan admin isi manual),
- tombol **Default** per key → mengosongkan kedua input = kembali ke teks kode,
- preview teks default (dari `translations` impor client-side) sebagai
  placeholder, jadi admin tahu baseline sebelum menimpa.

State: satu object `{ id: Record<key,string>, en: Record<key,string> }`.
Dirty = ada perbedaan dengan initial (initial = overlay DB yang sudah
diresolve + default kode untuk key yang belum ditimpa — supaya counter dan
form selalu menampilkan teks *efektif* saat ini).

Submit → `saveUIStringsAction(payload)` → toast + `router.refresh()`
(sama dengan form Fase 1).

### 7. `saveUIStringsAction` di `src/lib/actions.ts` (baru)

```ts
export async function saveUIStringsAction(input): Promise<
  { ok: true; strings: UIStrings } | { ok: false; error: string }
> {
  await verifyAdmin();
  try {
    await saveUIStrings(input);
    const resolved = await resolveUIStrings();
    await logAudit({ action: "update", entity: "settings",
      entityId: "ui_strings", detail: describeUIStrings(resolved, "id") });
    revalidatePath("/", "layout");
    revalidatePath("/admin/strings");
    return { ok: true, strings: resolved };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}
```

`revalidatePath("/", "layout")` wajib karena overlay diresolve di
`(public)/layout.tsx` — tanpa ini teks baru tidak tayang sampai cache
berakhir. Sama dengan save profil yang sudah melakukannya.

### 8. Sidebar admin

Item baru di `src/components/admin/admin-sidebar.tsx`:
`{ title: "Teks & Bahasa", href: "/admin/strings", icon: Languages }`
diletakkan setelah item "Tampilan & App OS".

## 22 Key batch pertama

Semua nilai default sudah diverifikasi: **tidak memakai interpolasi `{n}`**
dan **tidak masuk JSON-LD** (JSON-LD memakai data profil via `safeJsonLd()`,
bukan key i18n — diverifikasi dengan grep `dangerouslySetInnerHTML`).

| Grup | Key | maxLength |
|---|---|---|
| Hero | `hero_available_badge` | 80 |
| Hero | `hero_verified_badge` | 60 |
| Hero | `hero_cta_projects` | 40 |
| Hero | `hero_cta_portfolio` | 40 |
| Hero | `hero_skills_label` | 40 |
| Hero | `hero_contact_heading` | 60 |
| Services | `services_eyebrow` | 60 |
| Services | `services_title` | 80 |
| Services | `services_subtitle` | 160 |
| Services | `services_cta` | 60 |
| Projects | `projects_eyebrow` | 60 |
| Projects | `projects_title` | 80 |
| Projects | `projects_view_all` | 40 |
| Products | `products_eyebrow` | 60 |
| Products | `products_title` | 80 |
| Testimoni | `testi_eyebrow` | 60 |
| Testimoni | `testi_title` | 80 |
| Artikel | `articles_eyebrow` | 100 |
| Artikel | `articles_title` | 100 |
| Kontak | `contact_eyebrow` | 100 |
| Kontak | `contact_title` | 80 |
| Kontak | `contact_subtitle` | 160 |

Key dengan interpolasi (`os_nav_page`, `os_nav_of`, dst) **dikesampingkan** dari
batch ini agar admin tidak bisa merusak format dinamis. Sisanya (~328 key)
menyusul di PR berikutnya setelah pola ini terbukti.

## Keamanan

**Ancaman:** teks admin disimpan lalu dirender ke 20 komponen publik — ini
*stored XSS surface* baru.

**Mitigasi:**
1. Plain-text only (pilihan user): `sanitizeStringValue` membuang semua tag.
   Valid karena **nol** pemakaian `t.*` yang masuk `dangerouslySetInnerHTML`
   (diverifikasi).
2. Allowlist key — admin tidak bisa menulis key sembarang (mencegah jalan
   pintas ke key yang amannya belum dipertimbangkan, mis. label a11y).
3. `maxLength` per key + `MAX_KEY_LENGTH` global — membatasi panjang (mencegah
   abuse DB sekaligus layout pecah).
4. `verifyAdmin()` di action (sudah standar repo) + `logAudit`.
5. Tidak ada `NEXT_PUBLIC_` baru — overlay turun via props server, bukan env.

**Uji:** test akan menulis `<b>x</b>` dan `aaaa…(300)` dan mengharapkan tolakan
pada saat menyimpan (serta pengabaian saat membaca DB usang).

## Testing

### Unit — `tests/ui-strings-config.test.ts` (±12 test)

Mirror `tests/os-apps-config.test.ts` (baca/tulis `data/local-settings.json`):

`resolveUIStrings` (fallback & toleransi):
- belum diatur → `{ id: {}, en: {}, source: "default" }`,
- value bukan object → diabaikan, source tetap default,
- lang asing (`"fr"`) → diabaikan,
- key asing (`"evil_key"`) → diabaikan (tidak masuk overlay),
- value bukan string → diabaikan,
- value whitespace-only → diabaikan (dianggap default),
- value 300 char (di atas MAX) → diabaikan saat baca,
- key valid → masuk overlay persis, source `"admin"`.

`saveUIStrings` (penolakan keras):
- key asing → throw,
- value HTML `<b>x</b>` → throw (belum tersanitasi di sisi admin),
- value 300 char → throw,
- value bukan string → throw,
- input bukan object → throw.

`sanitizeStringValue`:
- tag terbuang, whitespace di-collapse, dipotong ke maxLength,
- char kontrol terbuang.

`describeUIStrings`:
- ringkasan jumlah disunting vs default.

**Wajib:** tambahkan `tests/ui-strings-config.test.ts` ke `SHARED_FS_TESTS` di
`vitest.config.mts` — ini file ke-3 yang menyentuh
`data/local-settings.json`. Tanpa itu, ia jalan paralel dengan dua file lain
dan beforeEach satu menghapus file saat yang lain menulis → flaky race
(pelajaran keras dari Fase 1).

### E2E — `e2e/ui-strings.spec.ts` (3 test)

Konfigurasi: `playwright-godmode.config.ts` `testMatch` diperluas dari
`/os-apps-config\.spec\.ts/` menjadi `/(os-apps-config|ui-strings)\.spec\.ts/`.
Dev server dengan `DATABASE_URL: ""` → fallback file lokal → utas
settings → resolveUIStrings → props → DOM teruji utuh.

1. **override ID tampil di publik** — tulis `ui_strings.id.hero_contact_heading`
   ke file lokal → `/?lang=id&cachebust=…` → heading kontak memuat teks admin.
2. **override EN tampil** — `?lang=en` + override en → teks admin muncul;
   sekalian verifikasi teks default tidak muncul.
3. **key asing & config rusak diabaikan** — tulis key asing + struktur rusak →
   situs tetap memakai teks default utuh (tidak ada teks "undefined").

Catatan: e2e hanya memvalidasi render publik, tidak menyentuh route `/admin`
(tidak butuh session Clerk), sama seperti spec Fase 1.

### CI gate

`quality` (lint + `tsc --noEmit` + vitest + `next build`) harus hijau sebelum
PR dibuka. Lighthouse CI mengaudit produksi (bukan diff) — tidak terpengaruh
PR ini, tapi tetap dipantau setelah merge.

## File yang disentuh

**Baru (7):**
- `src/lib/ui-strings-meta.ts`
- `src/lib/ui-strings-config.ts`
- `src/app/admin/strings/page.tsx`
- `src/components/admin/ui-strings-form.tsx`
- `tests/ui-strings-config.test.ts`
- `e2e/ui-strings.spec.ts`
- spec ini (sudah ada)

**Modifikasi (6):**
- `src/lib/i18n.tsx` — prop `overrides` + merge di provider
- `src/app/(public)/layout.tsx` — 1 fetch + 1 prop
- `src/lib/actions.ts` — 1 action baru
- `src/components/admin/admin-sidebar.tsx` — 1 item menu
- `vitest.config.mts` — 1 entri `SHARED_FS_TESTS`
- `playwright-godmode.config.ts` — 1 regex `testMatch`

## Yang TIDAK disentuh (blast radius minimum)

Fase 1 (`os_apps`, `/admin/appearance`), struktur 350 key i18n lainnya,
komponen OS/desktop/terminal, JSON-LD, SEO/metadata, cart, RetroBot, dan
semua halaman admin lain. Tidak ada migrasi schema, tidak ada env baru, tidak
ada dependency npm baru.

## Risiko & catatan

- **Cache**: overlay diresolve di layout; `revalidatePath("/", "layout")`
  sudah cukup (pretseden: save profil). E2E memakai `cachebust` karena
  dev-server cache 60 detik — kebutuhan test saja, bukan workaround produksi.
- **Bahasa ketiga**: hanya `id`/`en` (bahasa yang ada). Penambahan bahasa
  butuh update `UI_STRING_LANGS` + meta — tidak otomatis.
- **Key baseline panjang**: beberapa eyebrow defaultnya panjang
  ("PUBLICATIONS & ARCHIVES // TECHNICAL WRITING" = 43 char); maxLength 100
  memberi ruang editor tanpa abuse.
- **Terjemahan otomatis**: `translateFieldAction` butuh
  `ENABLE_EXTERNAL_TRANSLATE`; bila mati, admin isi EN manual (sudah ada
  pesan yang menjelaskan ini).
