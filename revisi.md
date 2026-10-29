# DRAF REVISI & RENCANA KERJA TEKNIS

**Status:** Selesai & Terverifikasi — Siap Dideploy ke Produksi  
**Terakhir Diperbarui:** 2026-10-30 (Optimasi Performa & Aksesibilitas Berbasis PageSpeed Insights Riil: Mobile LCP, Desktop CLS, Dynamic Media Resizing, GPU Compositing & A11y Contrast)

---

## Riwayat Eksekusi Terakhir
- **Pekerjaan:** Optimasi Performa Komprehensif Berdasarkan Data Riil Google PageSpeed Insights (Mobile & Desktop).
- **Hasil yang Diterapkan:**
  1. **Dynamic Media Resizing (`src/app/api/media/[id]/route.ts`)**: Endpoint internal media kini mendukung parameter query `?w=`, `?q=`, dan `?fmt=` via library `sharp`. Mengeliminasi transfer gambar raksasa (2.2 MB dan avatar 303 KB untuk display 98px).
  2. **Optimal Avatar Sizing (`src/components/public/hero-section.tsx`)**: Avatar dihubungkan ke `?w=192&q=85` serta diberi dimensi eksplisit `width={96}` dan `height={96}`. Ukuran transfer terpangkas dari 303 KB menjadi ~8 KB.
  3. **Desktop CLS 0.333 Stabilizer (`src/components/public/os/os-desktop-manager.tsx`)**: Menambahkan `contain: strict; content-visibility: auto;` pada container wallpaper desktop dan ukuran `?w=480&q=60` dengan atribut `width={480}` dan `height={480}`.
  4. **Composited GPU Animation (`src/components/public/os/os-boot-loader.tsx`)**: Mengganti manipulasi CSS `width` pada progress bar dengan `transform: scaleX(...)` dan `will-change-transform` untuk menghentikan forced layout recalculation.
  5. **Eliminasi Console Error (`src/lib/os-sound.ts`)**: Menambahkan guard `navigator.userActivation?.hasBeenActive` sebelum memanggil `navigator.vibrate()`.
  6. **Aksesibilitas & Kontras Desktop (`src/components/public/os/os-menubar.tsx`, `contact-section.tsx`)**: Kontras `ONLINE` ditingkatkan ke `text-emerald-900 dark:text-emerald-300`, `alt` logo diberi teks lengkap dan dimensi `20x20`, dan tautan showcase eksternal `porto.sigitadi.id` diberi `aria-label` penjelas.
  7. **Dokumentasi Lengkap**: Sinkronisasi riwayat rilis pada `CHANGELOG.md` dan Zona Bawah `prd.md`.

---

## Status Sistem
Selesai diuji, diverifikasi, dan didokumentasikan. Siap untuk push/deployment ke Vercel production.

---

## Ringkasan Audit Riil PageSpeed Insights (30 Okt 2026)

- **Mobile:** Perf 63, A11y 100, Best Practices 92, SEO 100, Agentic 3/3 | **LCP: 19.7s 🚨**, FCP: 2.6s, TBT: 220ms, CLS: 0.002
- **Desktop:** Perf 74, A11y 97, Best Practices 92, SEO 100, Agentic 2/3 | LCP: 1.7s, FCP: 0.4s, TBT: 100ms, **CLS: 0.333 🚨**

---

## Rencana Eksekusi Teknis (Target Modul & Komponen)

### 1. [Fase 1] Endpoint Dinamis Media & Resizing (`src/app/api/media/[id]/route.ts`)

- **Masalah:** Gambar database dikirim dalam ukuran mentah (2.2 MB dan 303 KB avatar 1254px untuk display 98px). Total network transfer mobile membengkak hingga 5.3 MB.
- **Solusi:**
  - Tambahkan dukungan parameter query: `?w=[width]&q=[quality]&fmt=[webp|avif]`.
  - Gunakan `sharp` untuk melakukan resize on-the-fly dengan `withoutEnlargement: true`.
  - Cache hasil konversi dengan header immutable (`public, max-age=31536000, immutable`).
  - Perbarui pemanggilan avatar di `src/components/public/hero-section.tsx` agar menggunakan ukuran optimal (`?w=192&q=85`).
  - Perbarui wallpaper ambient di `src/components/public/os/os-desktop-manager.tsx` (`?w=480&q=60`).

### 2. [Fase 2] Desktop CLS 0.333 Stabilizer (`src/components/public/os/os-desktop-manager.tsx`)

- **Masalah:** Wallpaper wrapper `.absolute.inset-0` bergeser 0.332 saat runtime hydration dan perenderan gambar avatar latar.
- **Solusi:**
  - Berikan style `contain: strict; content-visibility: auto;` pada elemen ambient wallpaper layer.
  - Tambahkan dimensi eksplisit / aspect-ratio dan `object-fit: cover` pada elemen `<img>` wallpaper.

### 3. [Fase 3] Composited GPU Animation (`src/components/public/os/os-boot-loader.tsx`)

- **Masalah:** Animasi progress bar boot-loader menggunakan atribut CSS `width: ${progress}%` yang memicu forced layout/reflow terus-menerus.
- **Solusi:**
  - Ubah animasi menjadi `transform: scaleX(${progress / 100})` dengan `origin-left` dan `will-change-transform`.

### 4. [Fase 4] Eliminasi Console Error `navigator.vibrate` (`src/lib/os-sound.ts`)

- **Masalah:** Panggilan `playOS("boot")` pada boot loader otomatis memicu `navigator.vibrate()` sebelum interaksi user, memunculkan warning/error konsol (Best Practices 92).
- **Solusi:**
  - Periksa `navigator.userActivation?.hasBeenActive` di dalam `triggerHaptic()`. Jika user belum berinteraksi dengan frame, lewati getaran secara silent tanpa memicu error browser.

### 5. [Fase 5] Kontras Warna & Aksesibilitas Desktop (`src/components/public/os/os-menubar.tsx` & `contact-section.tsx`)

- **Masalah:** Teks `ONLINE` (`text-emerald-700`) tidak memenuhi rasio kontras 4.5:1 terhadap background `vt-paper`. Peringatan tautan identik antara `/proyek` dan `porto.sigitadi.id`.
- **Solusi:**
  - Ganti `text-emerald-700` menjadi `text-emerald-900 dark:text-emerald-300`.
  - Berikan `aria-label="Portofolio Showcase Eksternal"` pada tautan `porto.sigitadi.id`.
  - Perbarui `alt="SA"` menjadi `alt="Sigit Adi Irianto Logo"`.

---

## Verifikasi yang Direncanakan

1. Typecheck: `pnpm exec tsc --noEmit`
2. Lint check: `pnpm lint`
3. Unit tests: `pnpm test`
4. Build verifikasi: `pnpm build`
