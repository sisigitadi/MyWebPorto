# God Mode Fase 3 — Feature Flag Global (Design Spec)

> Spec ini melanjutkan roadmap `memory/godmode-admin-roadmap.md`. Fase 1 (settings.os_apps, PR #33) dan Fase 2 (settings.ui_strings, PR #34) sudah merge. Fase 3 menambahkan feature flag global: matikan/menyalakan fitur besar situs dari admin tanpa redeploy.

## 1. Tujuan

Admin dapat menyalakan/mematikan fitur-fitur besar situs publik dari panel admin, tanpa perubahan kode atau redeploy. Saat dokumen ini ditulis, tidak ada infra feature flag sama sekali — gating yang ada hanyalah env var (`AI_PROVIDER`, `ENABLE_EXTERNAL_TRANSLATE`) yang butuh redeploy untuk berubah.

**Scope Fase 3 (4 flag):**

| Flag | Default | Yang dikendalikan |
|---|---|---|
| `enable_terminal` | `true` | App Terminal OS + widget RetroBot + endpoint `/api/retrobot` + server action `askSigitBot` |
| `enable_store_cart` | `true` | CartDialog, tombol cart, tombol "Tambah ke Keranjang" di products-section & product-detail |
| `enable_articles` | `true` | App Artikel OS + route `/artikel` dan `/artikel/[slug]` |
| `maintenance_mode` | `false` | Seluruh situs publik diganti halaman maintenance; `/admin` tetap jalan |

**Dikeluarkan dari scope (YAGNI):** `enable_scheduled_publish` (bukan toggle UI; perilaku `publishAt`, lebih cocok Fase 4). Konfigurasi AI (`AI_PROVIDER`, `ENABLE_EXTERNAL_TRANSLATE`, `settings.cloud_ai`) tetap dikelola env + halaman yang sudah ada — Fase 3 tidak menyentuhnya.

## 2. Arsitektur

### 2.1 Data model

```
settings.features (JSON di kolom settings.value yang sudah ada — NOL migrasi schema)

{
  "enable_terminal": true,
  "enable_store_cart": true,
  "enable_articles": true,
  "maintenance_mode": false
}
```

Key baru: `features`. Struktur flat `{ [flag: string]: boolean }`. Disimpan via `setSetting("features", value)`, dibaca via `getSetting<Features>("features")` — infra `src/lib/settings.ts` yang sama dengan Fase 1/2.

### 2.2 Tiga lapisan (pola Fase 1/2 diulang)

| File | Peran | Import server? |
|---|---|---|
| `src/lib/features-meta.ts` | **Baru, client-safe.** `FEATURE_KEYS` tuple `as const`; `type FeatureKey`; `interface FeatureDef { key; label; description; group; dangerous? }`; `FEATURE_DEFS` (label/deskripsi ID+EN untuk form); `DEFAULT_FEATURES` (semua fitur ON, maintenance OFF); `FEATURE_GROUPS`. Murni data, nol import server — boleh masuk client bundle. | tidak |
| `src/lib/features-config.ts` | **Baru, server-only** (mirror `os-apps-config.ts` / `ui-strings-config.ts`). `resolveFeatures(): Promise<Features>` — baca `getSetting`, validasi lenient per-key; `saveFeatures(input): Promise<Features>` — validasi ketat; `describeFeatures(features, lang): string` untuk audit log. | ya |
| `src/lib/features-context.tsx` | **Baru, client.** `FeaturesProvider` (terima prop `features`), `useFeatures(): Features`, `useFeature(key): boolean`. Membungus tree publik. | tidak |

**Invariant (hukum Fase 1/2 yang diulang):** DB hilang, kosong, korup, atau berisi key asing → `resolveFeatures()` KEMBALI ke `DEFAULT_FEATURES` (fitur ON, maintenance OFF). Situs tidak pernah kehilangan fitur karena masalah infra. Baca-jalan, tulis-ketat.

### 2.3 Data flow

`src/app/(public)/layout.tsx`:

```ts
const profile = await getProfile();
const uiStrings = await resolveUIStrings();
const features = await resolveFeatures();

if (features.maintenance_mode) {
  // Halaman pengganti ringan: i18n + profile, tanpa OS shell.
  // /admin/* tak terdampak: route group (admin) punya layout sendiri.
  return <MaintenanceNotice profile={profile} />;
}

return (
  <FeaturesProvider features={features}>
    <LanguageProvider overrides={uiStrings}>
      {/* ...struktur yang sekarang... */}
    </LanguageProvider>
  </FeaturesProvider>
);
```

Server component (`artikel/page.tsx` dst.) memanggil `resolveFeatures()` langsung — tak perlu context. Client component memakai `useFeature(key)`.

`FeaturesProvider` adalah lapisan tipis: `useMemo` object stabil, context value `{ features }`. Tak ada fetch client, tak ada hydration mismatch (server memutuskan, client menerima nilai final).

## 3. Gating per flag

### 3.1 `enable_terminal`

Satu flag mengikat empat titik (keputusan desain: Terminal + RetroBot adalah satu kesatuan "asisten AI retro"):

1. **`os-desktop-manager.tsx`** — app `terminal` di-exclude dari list app yang dirender saat OFF. Filter diletakkan di merge `appsConfig` (sekitar :165-175) sehingga taskbar (:1147), start menu (:987), command palette (:765), dan mobile tab (:716) otomatis ikut karena semuanya membaca list yang sama. Hash-routing (:359) + guard switch-app (:508) sudah mengabaikan app yang tak terdaftar — tidak perlu perubahan di sana.
2. **`retro-bot.tsx`** — `const enableTerminal = useFeature("enable_terminal");` → `if (!enableTerminal) return null;` (client component di dalam provider).
3. **`/api/retrobot/route.ts`** — cek `resolveFeatures()` server-side; OFF → `NextResponse.json({error: ...}, {status: 404})`. Satu-satunya gate server-side murni di luar actions.
4. **`actions.ts` `askSigitBot`** — cek flag di awal; OFF → tolak dengan pesan Indonesia ("Fitur terminal sedang dinonaktifkan").

### 3.2 `enable_store_cart`

Saat OFF:

1. **`products-section.tsx`** (:39,:137) & **`product-detail-content.tsx`** (:36,:106) — tombol "Beli"/"Tambah ke Keranjang" disembunyikan; `addItem` dan `setIsOpen(true)` tak dipanggil. Inilah **satu-satunya pemicu** CartDialog — tak ada tombol cart terpisah di Header/OSMenubar (diverifikasi: `useCart()` hanya dipakai di 3 file: cart-dialog, products-section, product-detail-content).
2. **`cart-dialog.tsx`** — `if (!useFeature("enable_store_cart")) return null;` (modal global di layout). Pertahanan kedua: bila flag berubah antara render section dan render dialog, modal tetap tak muncul.

`CartProvider` **tetap dipasang** di layout (mount ringan, localStorage tak diubah). Keputusan blast-radius minimum: komponen konsumen yang memutuskan render, bukan layout yang membuka-cabang provider. Stok/cart logic (`cart-stock.ts`, `whatsapp-order.ts`) tak tersentuh. `header.tsx`/`os-menubar.tsx` tak tersentuh (tak ada UI cart di sana).

### 3.3 `enable_articles`

Saat OFF:

1. **`os-desktop-manager.tsx`** — app `articles` di-exclude, pola yang sama dengan terminal.
2. **`src/app/(public)/artikel/page.tsx`** — `const features = await resolveFeatures(); if (!features.enable_articles) notFound();`
3. **`src/app/(public)/artikel/[slug]/page.tsx`** — sama, `notFound()`.

Pemilihan `notFound()` (halaman not-found — lihat catatan status HTTP di bawah) atas soft-hide: "off" harus benar-benar off. SEO: halaman ter-index memang hilang saat flag dimatikan — itu maksudnya. Karena flag default ON dan `saveFeaturesAction` memanggil `revalidatePath("/", "layout")`, SSG tidak akan meng-cache versi OFF lama.

**Catatan implementasi (status HTTP):** `notFound()` di route ini menghasilkan **status 200 + body not-found**, bukan 404. Sebabnya: `src/app/(public)/loading.tsx` menciptakan Suspense boundary di seluruh route group `(public)`, dan gate wajib `await resolveFeatures()` (baca DB) sebelum melempar `notFound()` — shell skeleton sudah di-flush dengan status 200 lebih dulu. Ini perilaku pre-existing yang juga menimpa slug tak dikenal (`/artikel/slug-tidak-ada` sudah 200 + not-found sebelum Fase 3). Intent SEO tetap tercapai karena body memuat teks not-found (soft-404 yang dikenali mesin pencari → deindex). Hard-404 sejati sengaja tidak dikejar: gate middleware dilarang §3.4 (edge runtime vs `fs`/drizzle), dan restrukturisasi pohon route publik ke loading per-route melanggar prinsip blast-radius minimum sekaligus menghapus skeleton UX. Konsekuensi: `generateMetadata` route `[slug]` **wajib** juga digate (Next menjalankan `generateMetadata` meskipun page melempar `notFound()` di dalam Suspense) — jika tidak, judul/deskripsi/potongan konten artikel bocor ke `<head>` saat OFF.

### 3.4 `maintenance_mode`

Layout-level gate (lihat 2.3). Halaman pengganti:

- **`src/components/public/maintenance-notice.tsx`** (baru) — membaca `profile` (nama pemilik) + `useTranslation()`; teks per bahasa; desain sederhana tanpa OS shell (boot loader, sound layer, visitor tracker, RetroBot tidak dirender).
- `error.tsx` / `global-error.tsx` / middleware **tidak** diubah. Fase 3 sengaja tidak menambahkan gate edge — keep simple; pengunjung dengan cache halaman lama tetap lihat versi cache sampai habis.
- Admin tetap jalan: `src/app/(admin)/` punya layout sendiri, tidak memakai `(public)/layout.tsx`, dan middleware Clerk hanya memproteksi `/admin`.

## 4. Admin UI

`/admin/features` (struktur mirror `/admin/strings`):

- **`src/app/admin/features/page.tsx`** (server) — fetch `resolveFeatures()`, render form client.
- **`src/components/admin/features-form.tsx`** (client) — toggle switch per flag, dikelompokkan per `FEATURE_GROUPS`; label + deskripsi dari `features-meta.ts`; `useUnsavedChanges` guard (pola Fase 2).
- **Konfirmasi berbahaya:** toggle `maintenance_mode` ON memunculkan dialog konfirmasi (situs publik langsung terganti saat simpan).
- **`src/components/admin/admin-sidebar.tsx`** — item "Fitur" baru.
- **`saveFeaturesAction`** di `src/lib/actions.ts` — `verifyAdmin()` + `saveFeatures()` (validasi ketat) + `logAudit({action:"update", entity:"settings", entityId:"features", detail: describeFeatures(features,"id")})` + `revalidatePath("/", "layout")` + `revalidatePath("/admin/features")`. Return shape `{ ok: true; features: Features } | { ok: false; error: string }` (identik action Fase 1/2 agar form seragam).

Halaman admin ini sendiri tidak pernah tergate maintenance (layout admin terpisah — sudah pasti, bukan asumsi).

## 5. Keamanan

- **Asimetris, seperti Fase 1/2:** baca toleran per-key (key asing di-skip, value non-boolean → default key itu, shape hancur → `DEFAULT_FEATURES`); tulis menolak keras (key tak terdaftar, value bukan boolean — pesan Indonesia).
- **Validasi 100% server-side** di `saveFeatures`. Form client hanya pengalaman; bypass form tidak lolos.
- **Gate server-side untuk endpoint & action:** `/api/retrobot` dan `askSigitBot` mengecek flag di server — client `return null` saja tidak cukup (permintaan langsung ke endpoint tetap harus ditolak).
- **maintenance_mode bukan sekatan keamanan** — ini fitur operasional. `/admin` dan API admin tetap berfungsi saat maintenance (middleware Clerk tak diubah); visitor tracker tidak sengaja dimatikan oleh hal lain.
- `verifyAdmin()` + `logAudit` di setiap mutasi, sama Fase 1/2.
- **Boundary client/server:** `features-config.ts` (drizzle/fs/db) hanya diimpor di server component layout + `(admin)` page + `actions.ts` (yang `"use server"`) + `/api/retrobot/route.ts` (route handler server). `features-meta.ts` + `features-context.tsx` satu-satunya yang masuk client bundle. Diverifikasi via build.

## 6. Testing

- **`tests/features-config.test.ts`** (mirror `tests/ui-strings-config.test.ts`): resolve default saat DB kosong; toleransi (key asing diabaikan, value `"yes"`/`1`/`null` → default key, shape hancur → fallback penuh); save ketat (key asing ditolak, non-boolean ditolak, panjang berlebih ditolak); guard "semua FEATURE_KEYS punya label"; guard jumlah flag = 4.
- **`e2e/features.spec.ts`** (4 test, viewport mobile 375×740 — wajib, lihat pelajaran Fase 2): (1) `enable_articles` OFF → app Artikel tak ada di OS + `/artikel` → **status 200 + UI not-found + konten artikel absen** (bukan 404 — lihat catatan status HTTP §3.3; test juga meng-pin status 200 sebagai regression guard untuk keputusan itu); (2) `maintenance_mode` ON → halaman publik terganti teks maintenance; (3) `enable_store_cart` OFF → tombol cart tak ada; (4) default (DB kosong) → seluruh fitur utuh. Bersih-bersih `data/local-settings.json` di afterEach; daftar ke `playwright-godmode.config.ts` `testMatch`; `workers: 1` (berbagi file settings).
- Registrasi `tests/features-config.test.ts` ke project serial `SHARED_FS_TESTS` di `vitest.config.mts` (file ini menyentuh `data/local-settings.json` — pelajaran Fase 1).
- **Gate CI:** `npm run lint && npx tsc --noEmit && npm run test && npm run test:e2e:godmode && npm run build` — semua hijau.

## 7. File yang tersentuh

Baru (8):
- `src/lib/features-meta.ts`
- `src/lib/features-config.ts`
- `src/lib/features-context.tsx`
- `src/components/public/maintenance-notice.tsx`
- `src/app/admin/features/page.tsx`
- `src/components/admin/features-form.tsx`
- `tests/features-config.test.ts`
- `e2e/features.spec.ts`

Modifikasi (13):
- `src/app/(public)/layout.tsx` — fetch + provider + cabang maintenance
- `src/components/public/os/os-desktop-manager.tsx` — exclude app terminal/articles
- `src/components/public/retro-bot.tsx` — gate widget
- `src/app/api/retrobot/route.ts` — gate endpoint
- `src/lib/actions.ts` — `saveFeaturesAction` + gate `askSigitBot`
- `src/components/public/cart-dialog.tsx` — gate modal
- `src/components/public/products-section.tsx` — gate tombol beli
- `src/components/public/product-detail-content.tsx` — gate tombol beli
- `src/app/(public)/artikel/page.tsx` + `src/app/(public)/artikel/[slug]/page.tsx` — gate notFound (status 200, lihat §3.3)
- `src/components/admin/admin-sidebar.tsx` — item menu
- `vitest.config.mts` — registrasi test serial
- `playwright-godmode.config.ts` — `testMatch`

Tak diubah: schema DB, `middleware.ts`, `os-apps-config.ts`, `ui-strings-config.ts`, `cart-context.tsx`, konfigurasi AI, behavior halaman admin lain.

## 8. Catatan implementasi

- Urutan task logis: meta+config → context+maintenance → layout wiring → gating per flag (terminal → cart → articles) → admin UI → e2e → final review + PR.
- `saveFeatures` melakukan **full-replace** overlay (bukan merge per-key) — sederhana dan benar untuk boolean flag: nilai final adalah input valid, tak ada partial-stale.
- `describeFeatures(features, lang)` format: `"{n}/{total} fitur aktif"` + "`maintenance_mode` aktif/nonaktif" untuk audit log + badge admin.
- Translasi label/deskripsi flag (ID/EN) hidup di `features-meta.ts` — bukan di `translations.ts` — karena meta adalah sumber kebenaran label form, dan ia harus client-safe.
