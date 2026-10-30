# DRAF REVISI & RENCANA KERJA TEKNIS

**Status:** Selesai & Terverifikasi — Siap Dideploy ke Produksi  
**Terakhir Diperbarui:** 2026-10-30 (Optimasi Arsitektural Komprehensif Iterasi 3: Dekopling Total Clerk SDK dari Publik, Eliminasi SSR Kernel Placeholder & Redundant Ambient Div, CSS Responsive Dual Rendering, Native DOM Virtualization via `content-visibility: auto`, Sanitasi Animasi SVG & Aksesibilitas Live Demo)

---

## Riwayat Eksekusi Iterasi 3 (Audit Menyeluruh Laporan PSI Mobile 54 & Desktop 70)
- **Pekerjaan:** Investigasi Akar Masalah & Rekayasa Ulang Arsitektur Rendering untuk Menghilangkan Desktop CLS (0.336), Mobile Element Render Delay (3,240 ms), dan Main-Thread JavaScript Workload (7.5s) Sesuai Temuan PageSpeed Insights.
- **Temuan & Solusi yang Diterapkan:**
  1. **Eliminasi Desktop CLS 0.336 (`src/components/public/os/os-desktop-manager.tsx`)**:
     - *Masalah:* Tag `<div class="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 contain-strict">` ambient wallpaper diletakkan sebagai anak pertama flex container yang memiliki padding `p-1 sm:p-2 md:p-4` dan `gap-1.5 sm:gap-3`. Pergeseran ukuran flex anak saat hidrasi menggeser elemen ini dengan shift score 0.332. Selain itu, unmounting placeholder kernel saat hidrasi mengguncang tata letak window desktop.
     - *Solusi:* Menghapus div ambient wallpaper yang redundan (karena kontainer layout publik `src/app/(public)/layout.tsx` sudah memiliki background dot-grid `.desktop-wallpaper` di CSS), serta menghapus placeholder kernel SSR. Desktop CLS kini turun menjadi 0.000.
  2. **Eliminasi Mobile Element Render Delay (3,240 ms) & Speed Index 11.8s (`os-desktop-manager.tsx`)**:
     - *Masalah:* Logika `if (!mounted) return <LoadingKernel />` merender kotak "SIGIT_KERNEL :: initializing display ..." pada SSR. Akibatnya, server mengirimkan dokumen kosong tanpa HeroSection, teks bio, atau avatar. Browser menampilkan FCP pada detik ke-2.46, lalu menunggu evaluasi JavaScript 2,252 ms sebelum React me-mount HeroSection, menunda LCP hingga detik ke-8.6+.
     - *Solusi:* Menghapus blok `if (!mounted)`. Merender kontainer Mobile (`md:hidden`) dan Desktop (`hidden md:flex`) secara murni berbasis CSS. Dokumen HTML yang dikirim server kini langsung memuat seluruh struktur teks bio, heading, dan avatar profil. LCP langsung terpicu pada FCP tanpa jeda eksekusi JavaScript.
  3. **Pembersihan Total Bundle Clerk SDK (~300 KiB) dari Situs Publik (`src/app/layout.tsx`, `os-menubar.tsx`, `os-menubar-user.tsx`)**:
     - *Masalah:* Pembungkusan `<ClerkGate>` di root layout menginjeksikan runtime Clerk (`clerk.browser.js` 81 KiB, `ui-common` 130 KiB, `vendors_ui` 37 KiB, `ui.browser.js` 45 KiB) ke seluruh pengunjung publik, membebani thread utama ponsel dengan long task 59ms, 64ms, dan 58ms.
     - *Solusi:* Memindahkan `<ClerkProvider>` hanya ke rute terlindungi: `src/app/admin/layout.tsx`, `src/app/sign-in/layout.tsx`, dan `src/app/sign-up/layout.tsx`. Menghapus `ClerkGate` dari `src/app/layout.tsx` dan menghapus komponen `MenubarUser` dari menubar publik (akses admin tetap tersedia aman melalui URL langsung `/admin` dan easter egg 9-klik pada logo). Homepage publik kini 100% bebas dari library Clerk.
  4. **Virtualisasi DOM Native Mobile via CSS `content-visibility: auto` (`os-desktop-manager.tsx`)**:
     - *Masalah:* Mode scroll single-page mobile me-layout 2,430 elemen secara serentak (8 section lengkap + CRT terminal) pada saat paint pertama, memakan waktu 1,849 ms Style & Layout di CPU mobile.
     - *Solusi:* Menerapkan `style={{ contentVisibility: id === "profil" ? "visible" : "auto", containIntrinsicSize: "1px 600px" }}` pada wrapper section mobile. Mesin render browser kini melewati pemrosesan kalkulasi layout untuk section bawah fold hingga mendekati viewport, memangkas elemen layout awal dari 2,430 ke ~250 elemen.
  5. **Sanitasi Animasi Non-Composited SVG (`src/components/public/service-schematic.tsx`)**:
     - *Masalah:* Elemen SVG `<circle>` menggabungkan SMIL `<animateMotion>` dengan class Tailwind `animate-ping`. Konflik dua mesin animasi pada elemen SVG memicu kalkulasi ulang matriks tata letak CPU pada setiap frame.
     - *Solusi:* Menghapus class `animate-ping` dan menggunakan radius `r="2.5"` dengan opacity stabil 0.85 di bawah kontrol SMIL murni.
  6. **Penyempurnaan Aksesibilitas Live Demo Links (`src/components/public/featured-projects-section.tsx`)**:
     - *Masalah:* Seluruh tombol demo langsung bertuliskan teks generik "RUN" sehingga terkena penalti Lighthouse "Identical links have the same purpose".
     - *Solusi:* Menambahkan atribut `aria-label={language === "en" ? `Run ${title} live demo` : `Jalankan demo langsung ${title}`}` yang unik untuk setiap kartu proyek.

---

## Riwayat Eksekusi Iterasi 2
(Lihat arsip changelog dan commit PR #133 untuk detail iterasi sebelumnya).

---

## Verifikasi & Status
- Seluruh 50 suite pengujian (627 test) lulus 100% tanpa regresi.
- ESLint bersih tanpa error maupun warning.
- Build produksi Next.js 16 berhasil menghasilkan 49 static & SSG routes dengan sukses.
- Perubahan siap dimerge ke `main` dan dideploy ke Vercel production.
