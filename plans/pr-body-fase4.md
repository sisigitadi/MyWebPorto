## God Mode Fase 4 — Draft Staging, Live Preview, & Snapshot Rollback

Lanjutan roadmap God Mode (Fase 1 `settings.os_apps` PR #33, Fase 2 `settings.ui_strings` PR #34, Fase 3 `settings.features` PR #35). Fase 4 menambahkan sistem draf staging, pratinjau langsung terisolasi via Next.js `draftMode()`, serta riwayat versi snapshot dan undo/rollback 1-klik untuk seluruh konfigurasi God Mode (`features`, `ui_strings`, `os_apps`).

### Yang Baru

1. **Model Snapshot & History (`settings_history`):**
   - Ditambahkan tabel `settings_history` (`id`, `key`, `value`, `label`, `actor`, `createdAt`) pada Drizzle schema (`src/db/schema.ts`).
   - Fallback offline/file lokal di `data/local-settings-history.json` via `src/lib/settings.ts`.
   - Setiap aksi Publish atau Rollback otomatis merekam snapshot konfigurasi live sebelumnya ke riwayat versi.

2. **Draf Staging System (`${key}:draft`):**
   - Konvensi key terpisah `${key}:draft` di tabel `settings` untuk mengisolasi perubahan yang belum dipublikasikan.
   - Admin dapat menyimpan draft tanpa mempengaruhi pengunjung publik live.
   - Tersedia opsi untuk membuang draft (*discard draft*) kembali ke konfigurasi live.

3. **Live Preview Terisolasi (Next.js Native `draftMode()`):**
   - Resolvers (`resolveFeatures`, `resolveUIStrings`, `resolveOSApps`) menerima opsi `{ preview?: boolean }`.
   - `enableGodModePreviewAction` mengaktifkan `draftMode()` cookie khusus admin.
   - Pengunjung publik biasa selalu melihat versi published live. Admin dalam mode preview melihat draf staging.
   - Komponen floating live preview bar (`GodModePreviewBar`) di sisi bawah halaman publik dengan tombol status pratinjau dan "Keluar Pratinjau".

4. **Komponen Bar Versi Terpadu (`GodModeVersionBar`):**
   - Terpasang di `/admin/features`, `/admin/appearance`, dan `/admin/strings`.
   - Fitur:
     - Badge status (Versi Live Sinkron vs Ada Draf Staging).
     - Tombol **Simpan Draf** (draft tanpa ganggu live).
     - Tombol **Pratinjau Live** (buka tab preview dengan draftMode aktif).
     - Tombol **Publikasikan Live** (promosikan draft ke publik + otomatis buat snapshot history).
     - Tombol **Buang Draf** (hapus draft staging).
     - Tombol & Dialog **Riwayat & Undo** (daftar snapshot versi sebelumnya dengan perbandingan waktu & tombol **Rollback** 1-klik).

### Keamanan & Proteksi

- Semua mutasi draft, publish, preview, dan rollback divalidasi dengan `verifyAdmin()`.
- Mutasi mencatat audit trail melalui `logAudit()`.
- Resolver draft hanya diaktifkan jika cookie Next.js `draftMode().isEnabled` bernilai `true`.

### Testing & Verifikasi

- `tests/settings-history.test.ts` (3 test unit riwayat & rollback).
- Seluruh unit test suites (17 file / 164 test) lolos hijau (`npm test`).
- Type check `npx tsc --noEmit` bersih tanpa error.
- Lint `npm run lint` bersih tanpa error.
- Next.js production build (`npm run build`) berhasil.
