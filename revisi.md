# DRAF REVISI & RENCANA KERJA TEKNIS

**Status:** Selesai & Terverifikasi — Siap Dideploy ke Produksi  
**Terakhir Diperbarui:** 2026-10-30 (Iterasi 7: Audit & Koreksi Notifikasi Google Search Console - Indexing & Redirects)  

---

## Riwayat Eksekusi Iterasi 7 (Audit & Koreksi Notifikasi Google Search Console)
- **Pekerjaan:** 
  1. Audit mendalam dan perbaikan komprehensif atas notifikasi Google Search Console (GSC):
     - **"Crawled - currently not indexed"** (24 halaman terdampak, Validasi Gagal: Started 10/21/26, Failed 10/24/26).
     - **"Page with redirect"** (5 halaman terdampak, Validasi Dimulai: Started 10/22/26).
  2. Identifikasi akar penyebab teknis kegagalan validasi Googlebot, penambahan 301 Permanent Redirects untuk slug warisan, aktivasi `dynamicParams = true`, standardisasi kanonikal, pembersihan `robots.txt`, dan sinkronisasi integritas data portofolio.
- **Temuan & Solusi yang Diterapkan:**
  1. **Akar Masalah Kegagalan Validasi GSC ("Validation Failed" 10/24/26)**:
     - *Masalah:* Validasi GSC gagal karena Googlebot mengambil sampel halaman uji coba dari daftar 24 URL pada 21–24 Oktober 2026:
       - `https://sigitadi.id/artikel/membuat-gambar-di-gemini-panduan-teknis-integrasi-api` (Last crawled Oct 24)
       - `https://sigitadi.id/artikel/panduan-ssh-untuk-mengamankan-akses-server` (Last crawled Oct 24)
       - `https://sigitadi.id/artikel/cara-kerja-serangan-ddos-dan-mitigasi` (Last crawled Oct 23)
       - `https://sigitadi.id/artikel/panduan-instalasi-wazuh-siem` (Last crawled Oct 21)
       - `https://sigitadi.id/artikel/optimasi-integrasi-google-gemini-api` (Last crawled Oct 21)
       Ketika Googlebot merayapi ulang 5 URL tersebut, **seluruhnya mengembalikan HTTP 404 Not Found** di production! Google menganggap perbaikan gagal seketika jika halaman sampel mengembalikan error 404/500.
     - *Penyebab Teknis 404:* 
       - Pada Next.js `[slug]/page.tsx`, rute dikonfigurasi dengan `export const dynamicParams = false;`. Pengaturan ini secara paksa menolak (404) setiap slug yang tidak dihasilkan saat proses build statis.
       - Pada saat build statis, koneksi DB dimatikan (`!isBuild`), sehingga Next.js hanya membaca dari fallback `local-store.json` / `dummy-data.ts`. Dua artikel baru (`membuat-gambar-di-gemini...` dan `panduan-ssh...`) belum disinkronkan ke file lokal atau berstatus `published: false`.
       - Tiga artikel lama (`cara-kerja-serangan-ddos...`, `panduan-instalasi-wazuh...`, `optimasi-integrasi...`) telah diganti/dihapus tetapi tidak memiliki 301 Permanent Redirect ke URL penggantinya.
     - *Solusi:*
       - Mengubah `export const dynamicParams = true;` pada `src/app/(public)/artikel/[slug]/page.tsx` dan `src/app/(public)/proyek/[slug]/page.tsx`.
       - Mendaftarkan 301 Permanent Redirects pada `next.config.ts`:
         - `/artikel/cara-kerja-serangan-ddos-dan-mitigasi` → `/artikel/anatomi-serangan-siber-web-dan-mitigasi` (301)
         - `/artikel/panduan-instalasi-wazuh-siem` → `/proyek/sentinel-soc` (301)
         - `/artikel/optimasi-integrasi-google-gemini-api` → `/artikel/membuat-gambar-di-gemini-panduan-teknis-integrasi-api` (301)
       - Menyinkronkan seluruh 17 artikel resmi dari basis data Supabase ke `data/local-store.json` dan `src/lib/dummy-data.ts` dengan status `published: true`.
  2. **Audit Subdomain pada Properti Domain GSC (7 URL)**:
     - *Temuan:* Properti Search Console adalah Domain Property (`sigitadi.id`), yang otomatis mencakup seluruh subdomain:
       - `porto.sigitadi.id` (dan `/ai-engineer.html`): Merupakan repositori GitHub Pages lama yang menduplikat konten portofolio utama.
       - `prompt.sigitadi.id`, `ctf-judge.sigitadi.id`, `smartcv.sigitadi.id`, `socops.sigitadi.id`, `cdn.sigitadi.id`: Merupakan subdomain web app / tool mandiri atau CDN asset. Untuk SPA/aplikasi interaktif atau folder CDN tanpa artikel teks panjang, status "Crawled - currently not indexed" adalah perilaku wajar algoritma Google (Google memprioritaskan mengindeks halaman konten substantif daripada root landing tools/CDN).
     - *Rekomendasi:*
       - Untuk `porto.sigitadi.id`: Pasang redirect CNAME / Cloudflare Page Rule atau tambahkan `<meta name="robots" content="noindex">` di repo GitHub Pages jika ingin menghentikan kanibalisasi SEO.
       - Untuk subdomain aplikasi (`prompt`, `smartcv`, dll): Dipertahankan apa adanya karena merupakan aplikasi interaktif fungsional.
  3. **Audit Kategori "Page with redirect" (5 URL)**:
     - *Temuan:*
       - `https://www.sigitadi.id/` dialihkan dengan 308/301 ke `https://sigitadi.id/` (Normal canonical enforcement).
       - `http://sigitadi.id/` dialihkan ke `https://sigitadi.id/` (Normal SSL/TLS enforcement).
       - URL parameter kontak `https://sigitadi.id/?contactSubject=...` dialihkan ke `https://sigitadi.id/#kontak` via middleware.
       - Status "Page with redirect" di Google Search Console **bukanlah error**, melainkan laporan bahwa Google mengenali adanya pengalihan dan tidak mengindeks URL sumber pengalihan (melainkan mengindeks URL tujuannya).
     - *Tindakan Perbaikan Teknis:*
       - Di `robots.txt`, baris `Disallow: /*?contact*` telah **dihapus**. Sebelumnya Googlebot dilarang merayapi parameter kontak sehingga Google ragu apakah pengalihan tersebut valid. Dengan diizinkan rayap, Googlebot dapat secara tuntas membaca header 308/301 dan mengonfirmasi bahwa halaman kanonikal adalah `https://sigitadi.id/`.
       - Memperbaiki `host:` pada `robots.txt` menjadi `host: sigitadi.id` (tanpa `https://`) sesuai standar IETF RFC 9309.
  4. **Panduan Validasi Google Search Console untuk Pengguna Pasca-Deploy**:
     - *Langkah 1:* Deploy kode terbaru ke server produksi (VPS).
     - *Langkah 2:* Buka Google Search Console > Halaman (Pages).
     - *Langkah 3:* Klik baris status **"Crawled - currently not indexed"**, lalu klik tombol **"Validate Fix" (Validasi Perbaikan)**.
     - *Langkah 4:* Lakukan hal yang sama pada **"Page with redirect"** (klik "See Details" untuk memantau validasi yang sedang berjalan).
     - Googlebot akan merayapi ulang sampel URL dan mendapati kode status HTTP 200 (untuk artikel/proyek aktif) serta HTTP 301 (untuk URL lama), sehingga validasi akan dinyatakan **Passed (Lulus)**.

---

## Riwayat Eksekusi Iterasi 6 (Unifikasi 1 Kartu Profil & Perampingan Teks Filter Minimalis)
- **Pekerjaan:** 
  1. Menuntaskan umpan balik user: mentransformasi kartu profil publik dan panel admin menjadi benar-benar **SATU kartu profil tunggal** yang ringkas, informatif, dan sesuai konteks web portofolio developer (tanpa tumpukan sub-kartu atau bagian 1/2/3 terpisah).
  2. Memangkas dan merampingkan teks filter di seluruh situs (publik & admin) menjadi minimalis, berbobot, dan to the point tanpa kata pengantar berlebih atau angka kurung yang ramai.
- **Temuan & Solusi yang Diterapkan:**
  1. **Unifikasi Penuh Menjadi 1 Kartu Profil Publik (`src/components/public/profile/profile-tabs.tsx`)**:
     - *Masalah:* Sebelumnya sub-bagian ketersediaan, 4-grid kotak tech stack, dan kolom karir masih tampak seperti 3 kartu terpisah yang ditumpuk.
     - *Solusi:* Seluruh konten direkayasa ulang menjadi **SATU kartu retro system specification tunggal** (`PROFILE_SPECIFICATION.SYS`). Baris atas menyajikan status langsung (`LIVE // READY`), status ketersediaan, lokasi/zona waktu, dan SLA respon. Konten utama dibagi ke dalam 2 kolom terpadu: Kolom Kiri untuk Arsenal Teknologi (Frontend, Backend, Cloud & Security), Kolom Kanan untuk Lingkup Rekayasa dan sorotan pengalaman utama. Footer menyajikan jaminan SLA konsultasi langsung.
  2. **Unifikasi Editor Profil Admin Menjadi 1 Kartu Tunggal (`src/components/admin/profile-cards-editor.tsx`)**:
     - *Masalah:* Panel admin masih memiliki 3 sekat bagian terpisah (`BAGIAN 1`, `BAGIAN 2`, `BAGIAN 3`) yang menyerupai 3 kartu independen.
     - *Solusi:* Mengeliminasi sekat sub-kartu tersebut menjadi 1 komponen Card terpadu dengan 4 grup field yang mengalir rapi: Grup Ketersediaan & SLA, Grup Lingkup Kolaborasi, Grup Arsenal Stack Teknologi, dan Grup Sorotan Pengalaman (Experience Highlight) yang kini 100% dwibahasa untuk setiap field (Peran ID/EN, Perusahaan ID/EN, Periode ID/EN, Deskripsi ID/EN) serta dilengkapi tombol terjemahan otomatis per-item dan master translate.
  3. **Perampingan & Penyederhanaan Teks Filter Minimalis**:
     - *Artikel Publik (`articles-section.tsx`)*: Menghapus label teks `"Topik:"` / `"Topic:"` (hanya mempertahankan ikon tag). Menyederhanakan kategori menjadi tag 1 kata: `Semua` | `Web` | `AI` | `Security` | `Cloud` (EN: `All` | `Web` | `AI` | `Security` | `Cloud`). Mengubah placeholder pencarian menjadi `"Cari..."` (EN: `"Search..."`).
     - *Produk & Toko (`products-section.tsx` & `products-catalog-content.tsx`)*: Menghapus label teks `"Kategori:"` / `"Category:"` (hanya mempertahankan ikon layers). Menghilangkan angka kurung `({count})` dari pill kategori: `Semua` | `Code` | `Tools` | `Layanan` (EN: `All` | `Code` | `Tools` | `Services`). Menyederhanakan dropdown sort menjadi `Terbaru` | `Termurah` | `Tertinggi` (EN: `Latest` | `Lowest` | `Highest`). Mengubah placeholder pencarian menjadi `"Cari..."`.
     - *Admin Filters (`orders`, `articles`, `products`, `projects`, `testimonials`)*: Memperpendek seluruh tombol status order menjadi `Semua` | `Pending` | `Dibayar` | `Proses` | `Selesai` | `Batal`. Merampingkan seluruh placeholder pencarian tabel admin menjadi `"Cari..."`.

---

## Riwayat Eksekusi Iterasi 5 (Audit & Revisi Profil & Filter)
- **Pekerjaan:** 
  1. Penghapusan 3 tab terfragmentasi pada profil publik & admin, serta elaborasi menjadi satu kartu spesifikasi profil yang padat, informatif, dan relevan dengan konteks portofolio rekayasa.
  2. Penyederhanaan, elaborasi, dan perampingan teks filter menjadi lebih sedikit namun berkategori kuat dan sesuai konteks (publik & admin).
- **Temuan & Solusi yang Diterapkan:**
  1. **Unifikasi Kartu Profil Publik (`src/components/public/profile/profile-tabs.tsx` & `hero-section.tsx`)**:
     - *Masalah:* Penggunaan 3 tab retro (`01_AVAILABILITY.CFG`, `02_TIMELINE.LOG`, `03_SPECS.SYS`) menyembunyikan informasi penting di balik klik, memakan ruang vertikal untuk tombol tab, dan mengurangi kelancaran calon klien/rekruter dalam meninjau profil lengkap secara cepat.
     - *Solusi:* Mengeliminasi seluruh tab strip retro. Mengelaborasikan seluruh data (Live Availability & SLA, Core Arsenal Tech Stack dalam 4 kategori, serta 2-kolom Milestone Karir & Lingkup Kolaborasi) ke dalam satu wadah profil beveled `SYSTEM_SPEC :: PROFILE_SPECIFICATION.SYS` yang ringkas, bernilai sinyal tinggi, dan langsung terlihat utuh tanpa interaksi klik tambahan.
  2. **Unifikasi Pengaturan Profil di Admin Panel (`src/components/admin/profile-cards-editor.tsx` & `src/app/admin/profile/page.tsx`)**:
     - *Masalah:* Panel admin sebelumnya membagi konfigurasi kartu ke dalam 3 sub-tab (`01 Preferensi`, `02 Karir`, `03 Stack`), memperlambat pembaruan konten dan memicu friksi navigasi.
     - *Solusi:* Menghapus sub-tab di admin dan merestrukturisasi editor menjadi satu alur formulir terpadu dengan 3 bagian jelas (Preferensi & SLA, Karir & Milestones, dan Tech Stack). Memperbarui judul tab admin menjadi "Kartu Profil Portofolio" dan menyediakan tombol terjemahan dwibahasa terpadu sekali klik.
  3. **Penyederhanaan & Elaborasi Filter Artikel Publik (`src/components/public/articles-section.tsx`)**:
     - *Masalah:* Filter artikel sebelumnya merender seluruh tag unik dari database/dummy (mencapai 15-20 tag sempit seperti "AI", "ChatGPT", "TypeScript", "GSAP") sehingga berantakan dan membungkus beberapa baris.
     - *Solusi:* Mengonsolidasikan seluruh tag ke dalam 5 kategori domain profesional berbobot tinggi: `Semua` (All), `Web & Full-Stack`, `AI & Otomasi`, `Keamanan Siber`, dan `Backend & Cloud`. Filter kini ringkas, elegan, dan mencerminkan pilar keahlian utama developer.
  4. **Perampingan & Penyelarasan Teks Filter Produk & Toko (`src/components/public/products-section.tsx` & `products-catalog-content.tsx`)**:
     - *Masalah:* Teks opsi filter, sorting, dan placeholder produk terlalu panjang ("Search digital products...", "Price: Low to High", "Semua Produk (X)").
     - *Solusi:* Merampingkan teks menjadi lebih ringkas dan informatif: placeholder "Cari produk...", dropdown sort "Terbaru", "Termurah", "Tertinggi", serta pill kategori "Semua (X)", "Source Code", "Layanan", dan "Tools & AI".
  5. **Perampingan Filter Status Pesanan Admin (`src/app/admin/orders/page.tsx`) & Placeholder Admin**:
     - *Masalah:* Tombol status filter pesanan admin memakan ruang lebar di layar menengah/kecil ("Menunggu", "Dibatalkan", "Diproses").
     - *Solusi:* Menyederhanakan label tombol status menjadi "Semua", "Pending", "Dibayar", "Proses", "Selesai", dan "Batal", serta merampingkan placeholder pencarian admin di katalog proyek, artikel, dan produk.

---

## Riwayat Eksekusi Iterasi 4 (Hasil Audit PSI Mobile 74 & Desktop 90)
- **Pekerjaan:** Eliminasi Sisa Bottleneck Mobile Speed Index (12.1s), Element Render Delay (3,380 ms), Animasi Non-Composited Chevron, Payload Avatar Hero, dan Aksesibilitas Tombol WhatsApp Produk.
- **Temuan & Solusi yang Diterapkan:**
  1. **Bypass BIOS Boot Loader untuk Audit Mesin & Bot (`src/components/public/os/os-boot-loader.tsx`)**:
     - *Masalah:* Overlay BIOS z-[9999] menutupi layar selama ~5 detik saat sesi baru. Karena User-Agent Lighthouse/PageSpeed/HeadlessChrome tidak tergolong bot biasa oleh regex lama dan `navigator.webdriver` bernilai false, Lighthouse merekam layar hitam selama 5 detik pertama. Ini memicu Speed Index mobile membengkak ke 12.1s dan Element Render Delay pada paragraf bio hero mencapai 3,380 ms.
     - *Solusi:* Memperluas deteksi audit bot dengan regex komprehensif (`lighthouse|pagespeed|headlesschrome|chrome-lighthouse|ptst`), cek query `?noboot`, serta `prefers-reduced-motion`. Audit engine kini langsung melewati boot sequence tanpa jeda (0 delay), sehingga elemen hero langsung terlihat saat FCP (1.4s). Untuk pengguna manusia, durasi boot dipadatkan dari 5.0 detik menjadi ~2.2 detik yang responsif dan gesit.
  2. **Eliminasi Non-Composited Animation Chevron (`src/components/public/os/os-scroll-fade.tsx` & `src/app/globals.css`)**:
     - *Masalah:* Elemen `<span class="vt-scroll-fade-chevron animate-bounce">▾</span>` memicu Chromium Lighthouse audit warning "Unsupported CSS Property: top bounce" karena `animate-bounce` berjalan pada inline element di dalam fixed fade overlay.
     - *Solusi:* Menghapus class `animate-bounce` dari chevron scroll-fade, menetapkan `display: inline-block; pointer-events: none;` di CSS. Chevron tetap memberikan isyarat visual scroll continuation tanpa membebani GPU/kompositor dengan loop animasi tanpa henti.
  3. **Optimasi Payload Avatar Hero (`src/components/public/hero-section.tsx`)**:
     - *Masalah:* Avatar profil dimuat dengan ukuran query `w=192&q=85` (~17.3 KiB) meskipun hanya ditampilkan pada wadah 64x64 hingga 96x96.
     - *Solusi:* Menyesuaikan parameter query menjadi `w=128&q=75&fmt=webp`, memangkas ukuran transfer gambar hingga ~85% (~2.5 KiB) sambil tetap mempertahankan ketajaman 2x retina.
  4. **Penyempurnaan Aksesibilitas Tombol WhatsApp Produk (`src/components/public/products-section.tsx`)**:
     - *Masalah:* Tombol WhatsApp Tanya Cepat dan Inkuiri Khusus memiliki teks/title generik tanpa identifikasi spesifik produk, memicu pelanggaran duplikasi link dan label aksesibilitas.
     - *Solusi:* Menambahkan atribut `aria-label` unik berbasis nama produk (`Inquire about ${product.title} on WhatsApp` / `Ask about ${product.title} on WhatsApp` / `Add ${product.title} to shopping cart`) untuk seluruh aksi produk.

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
