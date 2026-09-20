# God Mode Fase 5 — Perluasan God Mode Teks (Batch ke-2) — Design Spec

> Melanjutkan roadmap `memory/godmode-admin-roadmap.md`. Fase 1–4 sudah merge
> (PR #33 `os_apps`, PR #34 `ui_strings`, PR #35 `features`, PR #38
> draft/preview/rollback — merge commit `5353e09`). Fase 5 memperluas
> `settings.ui_strings` ke sisa ~330 key teks UI yang masih hardcode di
> `src/lib/translations.ts`. Karena jumlahnya besar, dieksekusi **per batch**.
> Spec ini = **batch ke-2: 55 key baru** (22 → 77 key, 154 → 154+110 slot).

## 1. Tujuan

Menutup seluruh **permukaan teks marketing publik** yang masih bolong setelah Fase
2: halaman detail proyek, pesan empty-state tiap section, eyebrow/subjudul produk,
surface + halaman detail artikel, label/placeholder/status form & window chrome
kontak, dan chrome Start Menu OS. Pola mekanisme Fase 2 **tidak berubah**:
overlay allowlist di atas default kode, nol migrasi schema, nol client fetch.

**Non-tujuan:** teks internal aplikasi Terminal & RetroBot (batch 3), label OS
yang dikonsumsi dinamis (lihat §2), serta fitur baru lain — ada di daftar "Ide
lain" roadmap.

## 2. Riset: key apa saja yang BOLEH diedit

Tiga aturan hard, semuanya sudah ditegakkan testExisting + yang akan diperbarui:

1. **Key harus ada di `translations.id` DAN `translations.en`** (test
   "semua key ada di translations.id dan translations.en") — overlay untuk key
   asli tidak akan pernah terbaca provider.
2. **Key harus dirender sebagai literal `t.<key>` di `src/components/public/**/*.tsx`**
   (guard test "setiap key EDITABLE_KEYS dirender di komponen publik", dibaca
   sebagai teks via fs). **Inilah pencegah bug diam-diam Fase 2** (10 key
   `*_eyebrow` dulu diedit tapi tak pernah tampil).
3. **Tidak boleh mengandung interpolasi `{…}`** di salah satu bahasa — admin
   tidak boleh merusak format string (sama seperti `os_nav_page`/`os_nav_of`
   yang sengaja dikeluarkan di Fase 2).

Hasil pemetaan (riset 2026-09-20):

- `translations` punya **295 key per bahasa** (jumlah id == en).
- **22** sudah editable (Fase 2).
- **210** key terdeteksi dikonsumsi `t.<key>` di komponen publik → **188** kandidat baru.
- **Kandidat TIDAK eligible** (gagal aturan #2, konsumsi via akses dinamis
  `t[var]`/hardcode, di luar `src/components/public/**`): semua `nav_*`, semua
  `app_*`, `hero_verified_badge`/`hero_cta_projects`/`hero_skills_label`/
  `hero_contact_heading`/`hero_window_title`/`hero_status_text`,
  `services_eyebrow`, `projects_eyebrow`, `testi_eyebrow`, `articles_eyebrow`,
  `products_cta_get`, `products_cta_inquire`, `services_discuss_btn`,
  `projects_view_all`, `contact_direct_channels_title`/`_desc`,
  `contact_open_gmail`, `contact_email_label`, `contact_location_label`,
  `contact_form_title`/`_desc`, `article_detail_copy_link`,
  `article_detail_discuss_title`/`_desc`, seluruh `footer_*`.

## 3. Batch ke-2 — 55 key baru

`maxLength` = panduan default (panjang terbesar id/en + headroom, minimum 40,
maksimum 500), konsisten dengan gaya Fase 2. Label & hint memakai kata admin
(Bahasa Indonesia).

### Group "OS & Start Menu" (7) — *group baru*

| key | label | maxLength | hint |
|---|---|---|---|
| `os_start_btn` | Tombol Start (Taskbar) | 20 | |
| `os_start_title` | Judul Start Menu | 40 | |
| `os_start_theme` | Item Start Menu — Ganti Tema | 40 | |
| `os_start_reboot` | Item Start Menu — Restart/Reboot | 60 | |
| `os_lang_tooltip` | Tooltip Tombol Bahasa | 60 | |
| `os_theme_tooltip` | Tooltip Tombol Tema | 60 | |
| `os_status_online` | Badge Status Online (Taskbar) | 20 | |

### Group "Services" (+1 → 5)

| key | label | maxLength | hint |
|---|---|---|---|
| `services_empty` | Pesan Belum Ada Layanan | 80 | Tampil saat section kosong. |

### Group "Projects" (+4 → 8)

| key | label | maxLength | hint |
|---|---|---|---|
| `projects_featured_badge` | Badge Proyek Unggulan | 40 | Badge di kartu proyek pilihan. |
| `projects_page_badge` | Badge Halaman Daftar Proyek | 60 | |
| `projects_page_title` | Judul Halaman Daftar Proyek | 60 | |
| `projects_empty` | Pesan Belum Ada Proyek | 80 | Tampil saat section kosong. |

### Group "Projects — Detail" (8) — *group baru*

| key | label | maxLength | hint |
|---|---|---|---|
| `detail_back_all` | Tombol Kembali ke Semua Proyek | 60 | |
| `detail_overview_title` | Judul Ringkasan Proyek | 60 | |
| `detail_overview_desc` | Deskripsi Ringkasan Proyek | 200 | Default terpanjang ~154 char. |
| `detail_tech_title` | Judul Tech Stack | 60 | |
| `detail_cta_box_title` | Judul Kotak CTA Detail | 80 | |
| `detail_cta_gmail` | Tombol CTA Detail — Kontak | 60 | |
| `detail_cta_demo` | Tombol CTA Detail — Live Demo | 60 | |
| `detail_cta_repo` | Tombol CTA Detail — Repositori | 40 | |

### Group "Products" (+3 → 5)

| key | label | maxLength | hint |
|---|---|---|---|
| `products_eyebrow` | Eyebrow Section Produk | 60 | Pita kecil di atas judul section. |
| `products_subtitle` | Subjudul Section Produk | 160 | |
| `products_empty` | Pesan Belum Ada Produk | 80 | Tampil saat section kosong. |

### Group "Testimoni" (+1 → 4)

| key | label | maxLength | hint |
|---|---|---|---|
| `testimonials_empty` | Pesan Belum Ada Testimoni | 80 | Tampil saat section kosong. |

### Group "Artikel" (+12 → 15)

| key | label | maxLength | hint |
|---|---|---|---|
| `articles_read_more` | Tombol Buka Artikel (Kartu) | 60 | |
| `articles_read_time` | Satuan Waktu Baca (Kartu) | 40 | Digabung dengan angka, mis. "5 mnt baca". |
| `articles_empty` | Pesan Belum Ada Artikel | 80 | Tampil saat section kosong. |
| `articles_back` | Tombol Kembali (OS Desktop) | 60 | |
| `article_detail_back_desktop` | Tombol Kembali ke Desktop (Detail) | 60 | |
| `article_detail_back_articles` | Tombol Kembali ke Daftar Artikel | 60 | |
| `article_detail_share` | Tombol Bagikan Artikel | 60 | |
| `article_detail_copied` | Toast Tautan Disalin | 60 | Muncul setelah "Salin Tautan". |
| `article_detail_read_time_suffix` | Satuan Waktu Baca (Detail) | 40 | |
| `article_detail_author_label` | Label Penulis | 40 | |
| `article_detail_discuss_cta` | Tombol Diskusi via Email (Artikel) | 60 | |
| `article_detail_related_title` | Judul Artikel Terkait | 60 | |

### Group "Kontak" (+19 → 22)

| key | label | maxLength | hint |
|---|---|---|---|
| `contact_name_label` | Label Nama (Form) | 40 | |
| `contact_name_placeholder` | Placeholder Nama | 40 | |
| `contact_subject_label` | Label Subjek (Form) | 40 | |
| `contact_subject_placeholder` | Placeholder Subjek | 80 | |
| `contact_message_label` | Label Pesan (Form) | 40 | |
| `contact_message_placeholder` | Placeholder Pesan | 100 | |
| `contact_send_btn` | Tombol Kirim Pesan | 40 | |
| `contact_send_btn_loading` | Tombol Kirim (State Loading) | 40 | |
| `contact_status_loading` | Status Mengirim (Loading) | 80 | |
| `contact_status_success` | Pesan Sukses Kirim | 160 | Default terpanjang ~132 char. |
| `contact_status_error` | Pesan Gagal Kirim | 120 | |
| `contact_status_network` | Pesan Error Jaringan | 80 | |
| `contact_mailer_window_title` | Judul Jendela Mailer | 60 | Chrome jendela app OS. |
| `contact_mailer_window_status` | Status Jendela Mailer | 60 | Chrome jendela app OS. |
| `contact_owner_address_title` | Judul Alamat Pemilik | 60 | |
| `contact_mailer_badge` | Badge Mailer Langsung | 40 | |
| `contact_email_field_label` | Label Email (Form) | 40 | |
| `contact_email_field_placeholder` | Placeholder Email | 40 | |
| `contact_channels_window_title` | Judul Jendela Saluran Sosial | 60 | Chrome jendela app OS. |

## 4. Perubahan implementasi (blast radius minimum)

1. **`src/lib/ui-strings-meta.ts`** — tambah 55 entri `EDITABLE_KEYS` dengan
   enam tambahan group ("OS & Start Menu", "Projects — Detail" baru;
   "Services"/"Projects"/"Products"/"Testimoni"/"Artikel"/"Kontak" diperluas).
   `EDITABLE_KEY_SET`, `StringKey`, `maxLengthForKey` turut otomatis.
2. **`tests/ui-strings-config.test.ts`** — perbarui angka di test
   `"22 key, semua unik"`: `22` → `77` (dua asersi). Test keandalan lain
   (uniqueness, maxLength, ada-di-translations, konsumen DOM) berlaku otomatis
   untuk key baru tanpa perubahan.
3. **`src/app/admin/strings/page.tsx`** — perbarui paragraf "Belum bisa:" di
   card "Cara Kerja & Batasan": teks form kontak, detail proyek/artikel, dan
   chrome Start Menu sekarang SUDAH bisa; sisanya jadi "teks internal Terminal
   & RetroBot, label navigasi" (menyusul batch 3).
4. **`src/components/admin/ui-strings-form.tsx`** — tanpa perubahan logika:
   group & baris diturunkan dari `EDITABLE_DEFS` (`group` diiterasi dinamis,
   `rows` di-generate dari meta). Hanya perbarui komentar JSDoc "edit 22 teks
   marketing" jadi angka dinamis/hapus angka.
5. **`describeUIStrings`** & badge halaman sudah memakai `EDITABLE_KEYS.length`
   — otomatis.

Tidak ada perubahan: `ui-strings-config.ts` (resolver/save), `actions.ts`
(`saveUIStringsAction`), `(public)/layout.tsx` (provider overlay), `i18n.tsx`.

## 5. Test plan

- **Unit** (`tests/ui-strings-config.test.ts`): angka baru hijau; guard test
  konsumen-DOM adalah jaminan utama — setiap key baru harus lulus, artinya
  timbal balik teks↔DOM terbukti sebelum merge.
- **E2E** (`e2e/ui-strings.spec.ts`): tidak perlu diubah (sudah memakai
  `contact_title`). Sebelum eksekusi, pertimbangkan +1 case opsional: override
  `articles_read_more` terlihat di section artikel mobile — tapi section
  artikel di-gate `enable_articles`; bisa lewat `/artikel` route saja. Opsional,
  tidak wajib.
- **Manual**: ubah 1 key per group baru di `/admin/strings`, cek tampil di
  publik (ID + `?lang=en`), lalu kosongkan kembali (kembali ke default).

## 6. Validasi & definisi selesai

`npx tsc --noEmit` → 0 error · `npx eslint src tests e2e` → 0 error (warnings
pre-existing boleh) · `npx vitest run` → semua hijau (termasuk angka baru) ·
`npm run build` → sukses, halaman `/admin/strings` hadir tanpa peringatan
client-bundle. Cabang `feat/godmode-strings-batch2` di-rebase ke `origin/main`
terbaru sebelum PR (lihat pelajaran merge PR #33 di roadmap); PR butuh check
`quality` hijau; merge manual (tidak auto-merge).

## 7. Yang ditangguhkan (batch 3+)

- **Terminal & RetroBot** (~160 key): secara teknis eligible, tapi banyak
  interpolasi (16 key `terminal_*` dikecualikan), banyak teks feedback internal
  app, dan beberapa key bernilai identik di kedua bahasa (`terminal_sugg_1..5`,
  `terminal_neofetch_*`, `retrobot_source_*`). Curve value/blast-radius tidak
  sepadan dalam batch ini.
- **Key non-eligible (§2)**: `nav_*`, `app_*`, `footer_*`, `contact_form_title`,
  dll. — baru bisa masuk setelah konsumsinya diubah ke literal `t.<key>` atau
  guard test diperluas (baca juga akses `t[\`...\`]` — rapuh, ditolak saat ini).
- **Sisa "Ide lain" roadmap**: import/export JSON, global search & replace,
  perluas command palette, e2e non-owner, sitemap/robots baca flag.

## 8. Risiko & catatan

- **Form memanjang** (77 key × 2 bahasa = 154 textarea). Mitigasi: tetap
  dikelompokkan per section; jika tak terkelola, pertimbangkan collapse per
  group atau pagination di follow-up (bukan di scope batch ini).
- **Value default panjang** (`detail_overview_desc`, `contact_status_success`)
  sudah diberi maxLength headroom; admin mengisi lebih panjang ditolak keras
  dengan pesan yang menyebut batasnya.
- **`os_start_*` selain 4 yang eligible** (profile/services/projects/store/
  testimonials/articles/contact/admin) TIDAK dimasukkan — konsumsinya dinamis
  (`t[\`os_start_${id}\`]`), bukan literal. Sama untuk `app_*`.
- **Branching**: `feat/godmode-draft-preview` lokal sudah berada di merge commit
  `5353e09` (sama dengan `origin/main`) dan aman dihapus; branch remote
  `origin/feat/godmode-draft-preview` sudah usang (PR #38 merged) — delete
  remote sebagai chore terpisah bila diinginkan.

  **Jangan ditambahkan sebelum konsumennya diubah jadi literal `t.<key>`**
  (blast radius — cabang ini sengaja menunda).
- **Kandidat interpolasi (gagal aturan #3):** `detail_cta_box_desc`,
  `contact_channels_window_status`, `terminal_help_no_entry`,
  `terminal_opening_app`, `terminal_unknown_app`, `terminal_cv_opening`,
  `terminal_github_opening`, `terminal_log_auth`, `terminal_cloud_tag`,
  `terminal_theme_applied`, `terminal_theme_random`, `terminal_lang_same`,
  `terminal_lang_applied`, `terminal_neofetch_skills`, `terminal_neofetch_projects`,
  `terminal_neofetch_articles`.
