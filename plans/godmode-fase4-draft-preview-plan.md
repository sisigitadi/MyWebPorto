# God Mode Fase 4 — Draft, Live Preview & Undo/Rollback (Implementation Plan)

> **Goal:** Menyediakan sistem Draft & Publish, Mode Live Preview aman untuk admin, serta Riwayat Versi (History Snapshot) & Rollback 1-klik untuk seluruh konfigurasi God Mode (`features`, `ui_strings`, `os_apps`).

---

## Task 1: Schema & Data Layer Foundation (`settings_history` & `deleteSetting`)

- [ ] **Step 1:** Tambahkan tabel `settingsHistory` di `src/db/schema.ts` beserta export tipe-tipenya (`SettingsHistory`, `NewSettingsHistory`).
- [ ] **Step 2:** Perbarui `src/lib/settings.ts`:
  - Tambah fungsi `deleteSetting(key: string): Promise<void>`.
  - Tambah modul/fungsi helper riwayat `saveSettingHistory`, `getSettingHistory`, `getSettingHistoryById`.
  - Berikan fallback file lokal (`local-store.json`) yang identik agar Vitest & local offline mode tetap bekerja tanpa Neon DB.
- [ ] **Step 3:** Buat unit test di `tests/settings-history.test.ts` untuk memverifikasi penyimpanan riwayat, pembacaan, dan penghapusan draf.

---

## Task 2: Update Resolver Konfigurasi untuk Mendukung Mode Pratinjau

- [ ] **Step 1:** Perbarui `src/lib/features-config.ts` (`resolveFeatures({ preview?: boolean })`): jika `preview === true`, baca draf `features:draft` jika tersedia.
- [ ] **Step 2:** Perbarui `src/lib/ui-strings-config.ts` (`resolveUIStrings({ preview?: boolean })`): jika `preview === true`, baca draf `ui_strings:draft` jika tersedia.
- [ ] **Step 3:** Perbarui `src/lib/os-apps-config.ts` (`resolveOSApps({ preview?: boolean })`): jika `preview === true`, baca draf `os_apps:draft` jika tersedia.
- [ ] **Step 4:** Tambahkan unit test untuk memastikan mode default selalu mengabaikan draf, dan hanya mode preview yang membaca draf.

---

## Task 3: Server Actions Draft, Publish, Rollback, & Preview

- [ ] **Step 1:** Buat server actions untuk Preview di `src/lib/actions.ts`:
  - `enablePreviewModeAction()` (mengaktifkan Next.js `draftMode()`).
  - `disablePreviewModeAction()` (menonaktifkan Next.js `draftMode()`).
- [ ] **Step 2:** Buat generic/spesifik server actions untuk Draft & Publish:
  - `saveGodModeDraftAction(target: "features" | "ui_strings" | "os_apps", data: unknown)`.
  - `publishGodModeDraftAction(target: "features" | "ui_strings" | "os_apps")`.
  - `discardGodModeDraftAction(target: "features" | "ui_strings" | "os_apps")`.
- [ ] **Step 3:** Buat server action untuk Rollback:
  - `rollbackGodModeAction(historyId: string)`.
  - `getGodModeHistoryAction(target: "features" | "ui_strings" | "os_apps")`.
- [ ] **Step 4:** Validasi otentikasi ketat via `verifyAdmin()` dan pencatatan ke `audit_logs`.

---

## Task 4: Layout Publik & Banner Pratinjau (Preview Floating Bar)

- [ ] **Step 1:** Buat komponen client `src/components/public/godmode-preview-bar.tsx` yang menampilkan floating bar indikator saat mode pratinjau aktif + tombol "Keluar Pratinjau".
- [ ] **Step 2:** Sambungkan `(public)/layout.tsx` dengan `await draftMode()` dan teruskan status `isPreview` ke resolver konfigurasi.
- [ ] **Step 3:** Render `GodModePreviewBar` di `(public)/layout.tsx` hanya jika `isPreview === true`.

---

## Task 5: Admin UI Integration (Draft Bar & History Drawer/Tab)

- [ ] **Step 1:** Buat komponen reusable `src/components/admin/godmode-version-bar.tsx` yang menyediakan:
  - Indikator status: "Live" vs "Ada Draf Belum Tayang".
  - Tombol aksi: "Simpan Draf", "Pratinjau Langsung", "Publikasikan", "Buang Draf", dan "Riwayat Versi".
- [ ] **Step 2:** Integrasikan ke halaman `/admin/features` (`features-form.tsx`).
- [ ] **Step 3:** Integrasikan ke halaman `/admin/appearance` (`os-apps-config-form.tsx`).
- [ ] **Step 4:** Integrasikan ke halaman `/admin/strings` (`ui-strings-form.tsx`).
- [ ] **Step 5:** Buat dialog modal / drawer riwayat versi dengan tombol "Kembalikan ke Versi Ini" (Rollback).

---

## Task 6: Verifikasi, Typecheck, Test Suite, & E2E

- [ ] **Step 1:** Jalankan unit test (`npm test`) — pastikan semua suite hijau.
- [ ] **Step 2:** Tambahkan E2E test `e2e/godmode-draft-preview.spec.ts` untuk memverifikasi isolasi pengunjung biasa vs admin mode pratinjau.
- [ ] **Step 3:** Jalankan `npx tsc --noEmit` & `npm run lint`.
- [ ] **Step 4:** Jalankan `npm run build` untuk memverifikasi kompatibilitas SSR & Turbopack.
