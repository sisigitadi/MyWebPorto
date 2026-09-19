# God Mode Fase 4 — Draft, Live Preview & Undo/Rollback (Design Spec)

> Melanjutkan roadmap `memory/godmode-admin-roadmap.md`. Fase 1 (`settings.os_apps`), Fase 2 (`settings.ui_strings`), dan Fase 3 (`settings.features`) telah selesai & beroperasi. Fase 4 menambahkan sistem keselamatan & alur staging: simpan sebagai Draft, Mode Pratinjau (Live Preview) untuk admin terotentikasi tanpa mempengaruhi pengunjung live, serta Riwayat Versi & Undo / Rollback konfigurasi.

---

## 1. Tujuan & Latar Belakang

Pada Fase 1–3, setiap aksi `Simpan` dari admin langsung memutasi nilai aktif di tabel `settings` (`os_apps`, `ui_strings`, `features`) dan memanggil `revalidatePath("/", "layout")`. Dampaknya langsung dirasakan oleh seluruh pengunjung live.

**Masalah:**
1. Admin tidak dapat meninjau bagaimana tampilan baru terlihat (misal: menyembunyikan app tertentu, mengganti teks marketing, menyalakan maintenance mode) sebelum benar-benar dipublikasikan ke publik.
2. Tidak ada riwayat snapshot konfigurasi sebelumnya yang dapat di-restore secara instan jika admin melakukan kesalahan konfigurasi (misal salah edit string teks atau salah mengatur toggle fitur).

**Solusi Fase 4:**
1. **Sistem Draft & Publish:** Admin dapat memilih "Simpan sebagai Draf" (hanya tersimpan di internal draft) atau "Publikasikan" (mempromosikan draf/form ke versi live).
2. **Live Preview (Mode Pratinjau Aman):** Admin dapat mengaktifkan mode pratinjau melalui Next.js `draftMode()` sehingga saat membuka situs publik, server meresolve nilai draf khusus untuk admin tersebut, sementara pengunjung publik tetap melihat konfigurasi published.
3. **Riwayat Snapshot & Undo / Rollback:** Setiap kali admin mempublikasikan konfigurasi baru, versi sebelumnya dicatat ke dalam riwayat (`settings_history`). Admin dapat melihat daftar riwayat dan melakukan Rollback 1-klik ke versi mana pun sebelumnya.

---

## 2. Arsitektur & Model Data

### 2.1 Model Data: Tabel `settings_history` (Drizzle Schema)

Untuk mendukung snapshot riwayat yang bersih tanpa mencemari `audit_logs`:

```ts
// src/db/schema.ts
export const settingsHistory = pgTable(
  "settings_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(), // "os_apps" | "ui_strings" | "features"
    value: jsonb("value").notNull(), // Snapshot nilai jsonb
    label: text("label"), // Ringkasan versi (cth: "3/3 fitur aktif")
    actor: text("actor"), // User ID Clerk admin
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("settings_history_key_idx").on(table.key),
    index("settings_history_created_idx").on(table.createdAt),
  ]
);
```
*Catatan:* Fallback offline (`local-store.json`) juga akan menyimpan array `settingsHistory` agar pengujian lokal / Vitest tanpa DB tetap 100% berjalan konsisten.

### 2.2 Model Draf di Tabel `settings`

Alih-alih membuat tabel terpisah untuk draf, kita menggunakan konvensi suffix key di tabel `settings`:
- Live: `key` (cth: `features`, `ui_strings`, `os_apps`)
- Draft: `${key}:draft` (cth: `features:draft`, `ui_strings:draft`, `os_apps:draft`)

**Keuntungan:**
- Nol risiko bentrok dengan kode publik yang hanya membaca key utama.
### 2.3 Mekanisme Live Preview (Pratinjau)

Bagaimana admin melihat pratinjau tanpa mengganggu pengunjung publik?
1. Menggunakan **Next.js `draftMode()`**:
   - `enablePreviewAction()`: Mengaktifkan `draftMode().enable()` (hanya jika lolos `verifyAdmin()`).
   - `disablePreviewAction()`: Mematikan `draftMode().disable()`.
2. Di resolver konfigurasi (`resolveFeatures`, `resolveUIStrings`, `resolveOSApps`):
   - Menerima opsi: `{ preview?: boolean }`.
   - `(public)/layout.tsx` memeriksa status pratinjau:
     ```ts
     const { isEnabled: isPreview } = await draftMode();
     const features = await resolveFeatures({ preview: isPreview });
     const uiStrings = await resolveUIStrings({ preview: isPreview });
     ```
   - Jika `preview === true` dan ada `${key}:draft`, gunakan nilai draf. Jika tidak ada draf, gunakan nilai live.
3. **Banner Melayang Pratinjau (Preview Floating Bar):**
   - Saat `isPreview === true`, di atas situs publik dirender komponen banner kecil:
     `[Mode Pratinjau God Mode Aktif] — [Keluar Pratinjau]`

---

## 3. Server Actions & Validasi

### 3.1 Server Actions Baru / Diperbarui:
- `saveDraftAction(key, value)`: Menyimpan draf konfigurasi (divalidasi dengan validator yang sama persis seperti Fase 1-3).
- `publishDraftAction(key)`: Mengambil draf saat ini, mempromosikannya ke live, membuat snapshot di `settings_history`, dan membersihkan draf.
- `rollbackConfigAction(historyId)`: Mengembalikan konfigurasi live ke snapshot pada `historyId`.
- `discardDraftAction(key)`: Menghapus draf dari DB dan kembali ke konfigurasi live.
- `getSettingsHistoryAction(key)`: Mengambil riwayat snapshot terbaru untuk key tersebut.

### 3.2 Keamanan & Proteksi
- Seluruh mutasi draf, publish, rollback, preview wajib memanggil `verifyAdmin()`.
- Non-admin tidak dapat memicu pratinjau atau membaca `settings:draft`.
- Sanitasi data dan validasi schema Zod tetap berlaku penuh pada data draf sebelum disimpan ke DB.

---

## 4. Rencana Kerja (Task Breakdown)

1. **Schema & Penyimpanan:**
   - Tambah tabel `settings_history` di `src/db/schema.ts`.
   - Dukungan `settings_history` dan `deleteSetting` di `src/lib/settings.ts` / fallback offline `local-store.json`.
2. **Lapisan Resolver Config:**
   - Update `resolveFeatures`, `resolveUIStrings`, `resolveOSApps` agar mendukung opsi `{ preview?: boolean }`.
3. **Server Actions Draft & Rollback:**
   - Implementasikan fungsi draft, publish, rollback, dan history di `src/lib/actions.ts`.
4. **Live Preview Banner & Layout Integration:**
   - Integrasi `draftMode()` di `src/app/(public)/layout.tsx` + Banner status pratinjau.
5. **UI Admin Integration:**
   - Tambah tab / kontrol Draft & History di `/admin/features`, `/admin/appearance`, dan `/admin/strings`.
6. **Testing & QA:**
   - Unit tests untuk draft & rollback flow.
   - E2E tests untuk memastikan pengunjung publik tidak melihat draft sebelum dipublish.

- Menghapus draf = `deleteSetting("${key}:draft")`.
- Mempublikasikan draf = `setSetting(key, draftValue)` + snapshot ke `settings_history` + `deleteSetting("${key}:draft")`.
