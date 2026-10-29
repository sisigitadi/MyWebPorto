# DRAF REVISI & RENCANA KERJA TEKNIS

**Status:** Selesai & Terverifikasi — Siap Dideploy ke Produksi  
**Terakhir Diperbarui:** 2026-10-30 (Optimasi Komprehensif Iterasi 2: Eliminasi False LCP Desktop, Stabilisasi Mobile Speed Index, Code-Splitting Clerk, Pure CSS Ambient Wallpaper, Lazy External Media & A11y Link Labels)

---

## Riwayat Eksekusi Iterasi 2 (Pasca Audit Lighthouse 13.5)
- **Pekerjaan:** Investigasi & Perbaikan Menyeluruh Penurunan Skor Mobile (61) dan Peningkatan Skor Desktop (83 → 95+) Berdasarkan Laporan PageSpeed Insights.
- **Temuan & Solusi yang Diterapkan:**
  1. **Eliminasi False Desktop LCP (`src/components/public/os/os-desktop-manager.tsx`)**:
     - *Masalah:* Tag `<img>` ambient wallpaper avatar yang diperbesar full-screen dideteksi Lighthouse sebagai LCP candidate dengan resource load delay 1,390 ms dan duration 2,500 ms, serta filter `blur-xl` membebani thread GPU compositing.
     - *Solusi:* Tag `<img>` ambient dihapus dan diganti murni CSS background radial-gradient & retro scanlines. Zero network request, zero delay, dan zero interferensi terhadap metrik LCP.
  2. **Eliminasi Mobile Element Render Delay 2,670 ms (`src/components/public/hero-section.tsx`)**:
     - *Masalah:* Animasi `gsap.from(".sigit-hero-window", { opacity: 0, ... })` menyembunyikan konten teks bio dan avatar di atas fold saat JavaScript hydrate, menahan elemen LCP hingga detik ke-9.4.
     - *Solusi:* Menghapus manipulasi `opacity: 0` pada hero section (hanya transisi posisi lembut `y: 20`). Konten teks dan avatar tetap 100% terlihat sejak FCP (~2.4s). Avatar disempurnakan ke `?w=160&q=75&fmt=webp` (~6 KB vs 17.3 KB).
  3. **Code-Splitting Clerk SDK (`src/components/public/os/os-menubar-user.tsx` & `os-menubar.tsx`)**:
     - *Masalah:* `@clerk/nextjs` menginjeksikan chunk JavaScript berukuran ~210 KiB ke bundle kritis publik hanya untuk hook `useUser` di menubar.
     - *Solusi:* Ekstraksi `MenubarUser` ke modul mandiri yang dimuat secara dinamis via `next/dynamic(..., { ssr: false })`. Kode Clerk kini terisolasi di chunk terpisah dan tidak membebani initial critical path publik.
  4. **Optimasi Ikon Header & Boot Loader (`public/icons/icon-48.webp`)**:
     - *Masalah:* Menubar dan BIOS boot loader memuat file PNG 192x192 berukuran 22.7 KiB untuk tampilan 20x20 / 28x28.
     - *Solusi:* Menghasilkan aset WebP teroptimasi `public/icons/icon-48.webp` (370 B) dan menggunakannya di `os-menubar.tsx` serta `os-boot-loader.tsx`, menghemat 98.4% transfer data ikon.
  5. **Lazy Loading 12 Gambar Eksternal Unsplash (`456 KiB`)**:
     - *Masalah:* Gambar di section bawah fold (`featured-projects-section.tsx`, `articles-section.tsx`, `products-section.tsx`, `testimonials-section.tsx`) diunduh serentak saat awal inisialisasi halaman tanpa atribut lazy loading.
     - *Solusi:* Menambahkan `loading="lazy"`, `decoding="async"`, dimensi width/height eksplisit, dan parameter kompresi otomatis (`w=600&q=75&auto=format&fit=crop`) untuk tautan Unsplash.
  6. **Eliminasi Forced Reflow 284 ms (`src/components/public/os/os-desktop-manager.tsx`)**:
     - *Masalah:* Fungsi scroll-spy `update()` membaca `root.getBoundingClientRect()` berulang kali di dalam loop section dan dipanggil secara sinkron saat komponen mount.
     - *Solusi:* Eksekusi awal ditunda via `setTimeout` pasca-paint dan nilai `root.getBoundingClientRect().top` di-cache di luar loop iterasi.
  7. **Perbaikan Aksesibilitas "Identical links have the same purpose"**:
     - *Masalah:* Tautan kartu proyek dan artikel hanya memiliki teks generik ("Detail" / "Baca Selengkapnya").
     - *Solusi:* Menambahkan atribut `aria-label` spesifik mencantumkan judul entitas terkait (misal: `aria-label="Detail Proyek Sentinel SOC"`).
  8. **Pencegahan Timeout `llms.txt` (`src/app/llms.txt/route.ts`)**:
     - *Masalah:* Rute dinamis tanpa caching mengalami timeout saat diuji crawler concurrent PageSpeed.
     - *Solusi:* Menambahkan `export const revalidate = 86400;` agar ter-cache di CDN Edge Vercel.

---

## Verifikasi & Status
- Seluruh kode telah diuji secara lokal, bebas dari error TypeScript/ESLint, dan siap dipush via Pull Request untuk deployment ke Vercel production.
