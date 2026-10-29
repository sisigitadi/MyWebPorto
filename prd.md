# PRD MyWebPorto

## 1. Ringkasan Produk

### Nama Produk

MyWebPorto / KaryaProfilKu

### Deskripsi Singkat

MyWebPorto adalah website portofolio pribadi berbasis Next.js 15 yang menggabungkan personal branding, katalog proyek, layanan profesional, produk, testimoni, artikel teknis, dan panel admin CMS. Area publik memakai pengalaman retro desktop "SigitOS" agar identitas visual terasa kuat, sementara konten tetap dibuat crawlable melalui SSR fallback, metadata SEO, dan structured data.

### Tujuan Produk

- Menampilkan profil profesional pemilik secara kredibel.
- Menjadi etalase proyek, layanan, produk, testimoni, dan artikel teknis.
- Memudahkan calon klien melihat karya lalu menghubungi pemilik.
- Memungkinkan pemilik mengelola konten sendiri melalui `/admin`.
- Tetap berjalan pada mode development/offline melalui local fallback store.

### Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Pengunjung publik | Melihat profil, karya, layanan, produk, testimoni, artikel, dan kontak. |
| Calon klien | Menilai kredibilitas pemilik dan menghubungi untuk diskusi proyek/layanan. |
| Pemilik/admin | Login dan mengelola seluruh konten website dari panel admin. |

## 2. Scope Produk

### Termasuk dalam Scope

- Beranda interaktif `/` dengan pengalaman SigitOS.
- Katalog proyek `/proyek`.
- Detail proyek `/proyek/[slug]`.
- Katalog produk pada section `#produk` di Store.zip.
- Detail produk shareable `/toko/[slug]`.
- Katalog artikel `/artikel`.
- Detail artikel `/artikel/[slug]`.
- Panel admin `/admin`.
- CRUD profil, proyek, layanan, produk, testimoni, dan artikel.
- Sistem Order WhatsApp terpadu: keranjang belanja, checkout modal, transfer bank multi-rekening/QRIS, unggah bukti bayar, format invoice `INV-DDMMYYYY-XXXX`, dan pelacakan pesanan publik `/order`.
- Universal Bot Engine & TTS Audio Sanitizer: penyatuan knowledge base antara WhatsApp Bot, RetroBot, dan Terminal CRT dengan pembersihan ucapan audio dari simbol/emoji.
- Konten bilingual untuk beberapa field Indonesia/Inggris.
- Terjemahan ID -> EN opt-in per field melalui tombol di form admin (bukan otomatis saat menyimpan).
- Penyimpanan gambar biner langsung di database PostgreSQL (tabel `media`, bytea) dengan validasi magic bytes dan cache immutable via `/api/media/[id]`.
- SEO metadata, Open Graph, Twitter Card, sitemap, robots.txt, JSON-LD.
- Fallback data lokal saat database tidak tersedia.

### Di Luar Scope Saat Ini

- **Payment gateway online pihak ketiga**: checkout diakhiri melalui pesan WhatsApp dan verifikasi transfer manual; tidak ada gateway otomatis seperti Midtrans/Xendit.
- Marketplace multi-penjual.
- Akun publik untuk pengunjung.
- Role-based access control kompleks.
- Komentar artikel.
- Newsletter.

## 3. Halaman dan Routing

### Area Publik

| Rute | Nama | Fungsi |
| --- | --- | --- |
| `/` | Beranda | Desktop interaktif berisi profil, layanan, proyek, produk, testimoni, artikel, dan kontak. |
| `/proyek` | Katalog Proyek | Menampilkan semua proyek yang `published = true`. |
| `/proyek/[slug]` | Detail Proyek | Menampilkan studi kasus proyek, tech stack, demo, repo, dan CTA. |
| `/toko/[slug]` | Detail Produk | Menampilkan detail produk digital, harga, metadata, dan CTA checkout/download. |
| `/order` | Lacak Pesanan | Halaman publik pelacakan status pesanan berdasarkan nomor invoice atau nomor WhatsApp. |
| `/artikel` | Katalog Artikel | Menampilkan semua artikel yang `published = true` dan `publishAt` sudah lewat (atau null). |
| `/artikel/[slug]` | Detail Artikel | Menampilkan artikel teknis lengkap, metadata, tag, dan profil penulis. |
| `/feed.xml` | RSS | Feed artikel dengan autodiscovery. |
| `/llms.txt` | llms.txt | Ringkasan situs dinamis untuk AI crawler. |
| `/offline` | Offline PWA | Halaman fallback service worker. |
| `/sign-in` | Login | Login pemilik melalui Clerk. |
| `/sign-up` | Sign Up | Halaman sign up Clerk bila dibutuhkan oleh konfigurasi auth. |

### Area Admin

| Rute | Nama | Fungsi |
| --- | --- | --- |
| `/admin` | Dashboard | Ringkasan jumlah konten, status publikasi, dan Visitor Analytics. |
| `/admin/profile` | Kelola Profil | Edit nama, headline, bio, avatar, kontak, skill, statistik, sosial media, CV, dan status available for hire. |
| `/admin/projects` | Kelola Proyek | Tambah, ubah, hapus, publish, featured, urutkan, jadwal tayang, dan kelola data proyek. |
| `/admin/articles` | Kelola Artikel | Tambah, ubah, hapus, publish, featured, jadwal tayang, tag, cover, dan konten artikel bilingual. |
| `/admin/services` | Kelola Layanan | Tambah, ubah, hapus, publish, dan urutkan layanan. |
| `/admin/products` | Kelola Produk | Tambah, ubah, hapus, publish, harga coret + nominal, stok, badge, kategori, galeri, dan CTA produk. |
| `/admin/orders` | Kelola Pesanan | Manajemen pesanan toko: pantau pesanan masuk, filter status, update nomor resi, catatan pengiriman, konfirmasi bayar, dan aksi WhatsApp. |
| `/admin/whatsapp-bot` | WhatsApp Bot | Konfigurasi bot toko Baileys: pairing QR code, nomor toko tujuan, template pesan, dan status sesi. |
| `/admin/testimonials` | Kelola Testimoni | Tambah, ubah, hapus, publish, rating, avatar, dan identitas klien. |
| `/admin/media` | Media Library | Daftar gambar di database PostgreSQL (tabel `media`, bytea) dengan fitur hapus. |
| `/admin/analytics` | Visitor Analytics | Analitik kunjungan mandiri ramah privasi UU PDP (salted SHA-256) berbasis zona waktu WIB. |
| `/admin/cloud-ai` | Konfigurasi Cloud AI | Pemilihan provider AI (Gemini, OpenAI, Anthropic, dll.), model realtime, dan preferensi gaya jawaban. |
| `/admin/redaksi` | Redaksi AI & SEO | Composer draf AI untuk 6 tipe konten dengan sinkronisasi SEO otomatis tanpa boilerplate. |
| `/admin/seo` | SEO & SEM | Konfigurasi token GSC, Bing Webmaster, key IndexNow, dan Open Graph override. |
| `/admin/appearance` | God Mode Tampilan | Pengaturan aplikasi SigitOS yang aktif dan urutan tampilan ikon/taskbar. |
| `/admin/strings` | God Mode Teks UI | Kustomisasi teks judul dan tombol CTA tanpa redeploy. |
| `/admin/features` | God Mode Feature Flags | Sakelar fitur global (terminal, cart toko, artikel, maintenance mode). |
| `/admin/system` | Sistem & Logs | Kelayakan deploy (validasi env), tracing `x-request-id`, audit log mutasi. |

## 4. Fitur Utama

### 4.1 Beranda SigitOS

Beranda bukan landing page konvensional, melainkan desktop UI interaktif yang mengelola beberapa jendela konten. Komponen utama berada di `src/components/public/os`.

Kebutuhan:

- Menampilkan profil, kontak, layanan, proyek, produk, testimoni, dan artikel.
- Menyediakan terminal/CRT interaction sebagai elemen identitas.
- Menyediakan asisten AI yang menjalankan Universal Bot Engine: RetroBot melayang, Terminal CRT, dan WhatsApp Bot berbagi knowledge base katalog dan tanya-jawab yang sama.
- Modul TTS Sanitizer (`src/lib/tts-sanitizer.ts`) membersihkan emoji, simbol format markdown, kode, dan URL dari ucapan audio Web Speech API sehingga suara terdengar alami tanpa mengeja karakter teknis.
- Mendukung 4 tema (Retro 90s default, Dark, Tokyo Night, VS Code) yang dipertahankan di `localStorage`.
- Tetap menyediakan konten SSR tersembunyi untuk SEO dan aksesibilitas.
- Memakai data yang sama dengan halaman katalog dan admin.

### 4.2 Proyek

Kebutuhan:

- Proyek publik hanya yang `published = true`.
- Proyek unggulan memakai `featured = true`.
- Slug harus unik.
- Tech stack disimpan sebagai array.
- Detail proyek menampilkan deskripsi, summary, gambar, demo link, repo link, dan CTA.

### 4.3 Artikel

Kebutuhan:

- Artikel publik hanya yang `published = true`.
- Artikel unggulan memakai `featured = true`.
- Slug harus unik.
- Artikel mendukung title, summary, content, cover image, tags, dan field Inggris.
- Konten artikel wajib bebas dari promosi berlebih/AI-slop dan tidak mencantumkan nama pemilik di dalam badan tulisan teknis.
- Halaman detail artikel menampilkan estimasi waktu baca.
- Artikel memiliki metadata SEO dan JSON-LD yang sesuai.

### 4.4 Layanan

Kebutuhan:

- Layanan ditampilkan berdasarkan `order`.
- Hanya layanan published yang tampil di area publik.
- CTA diarahkan ke kontak manual.
- Tidak ada transaksi otomatis.

### 4.5 Produk dan Sistem Order

Kebutuhan:

- Produk berfungsi sebagai etalase katalog toko digital dan fisik.
- Produk dapat memiliki `priceLabel` (label tampilan), `comparePriceLabel` (harga coret), `priceAmount` (nominal Rupiah untuk keranjang; null = hubungi kami), `badge`, `category`, `stock` (null = digital/tanpa batas), dan `gallery`.
- Keranjang belanja (`cart-context.tsx`) persisten di `localStorage`.
- Dialog checkout interaktif dengan opsi Transfer Bank multi-rekening, QRIS, atau pesan WhatsApp langsung, serta formulir data pemesan dan unggah bukti transfer.
- Pembuatan nomor invoice terstandarisasi dengan pola `INV-DDMMYYYY-XXXX` untuk ketepatan waktu transaksi.
- Pelacakan pesanan mandiri melalui rute publik `/order` dan modal Lacak Pesanan pada header toko & cart dialog berdasarkan nomor invoice atau nomor WhatsApp.
- Panel admin `/admin/orders` mengelola status pesanan (pending, paid, processed, completed, cancelled), input nomor resi pengiriman, catatan admin, konfirmasi bukti transfer, dan integrasi chat WhatsApp.
- Produk unpublished tidak tampil di publik.
- Gambar produk wajib tersedia untuk item yang dibuat melalui form.
- Produk memiliki slug stabil yang dapat dikelola dari admin dan dinormalisasi lewat `src/lib/product-link.ts`.
- Detail produk memiliki canonical URL, Open Graph, Twitter Card, dan CTA eksternal.

### 4.6 Testimoni

Kebutuhan:

- Testimoni menampilkan nama klien, role, isi testimoni, avatar opsional, dan rating.
- Hanya testimoni published yang tampil di publik.
- Urutan tampilan mengikuti `order`.

### 4.7 Panel Admin

Kebutuhan:

- Semua mutasi data harus melewati Server Actions.
- Mutasi harus memanggil `verifyAdmin()`.
- Input divalidasi dengan Zod.
- Setelah mutasi, path terkait direvalidasi dengan `revalidatePath`.
- Admin dapat menambah, mengubah, menghapus, mem-publish, dan mengatur urutan konten.

### 4.8 SEO dan Topical Authority

Cluster konten wajib mencakup:

- Studi kasus untuk setiap project publik.
- Artificial Intelligence dan generative AI.
- Cybersecurity, OWASP, threat modeling, dan DevSecOps.
- Linux server hardening.
- Windows security dan endpoint security.
- macOS security, privacy, FileVault, dan Keychain.

Setiap artikel memiliki slug unik, judul bilingual, summary bilingual, konten terstruktur, tags/skills, cover image, canonical URL, Open Graph, Twitter metadata, dan JSON-LD `BlogPosting`.

### 4.9 Deployment

- Build production memakai Next.js standalone.
- Paket deployment dibuat dengan `npm run package`.
- Runtime paket menggunakan `node server.js` atau PM2 melalui `ecosystem.config.cjs`.
- Database production harus menerapkan seluruh migration Drizzle sebelum runtime dijalankan.
- Post-deploy wajib menguji halaman publik, admin, sitemap, robots, form kontak, CRUD, upload, dan route slug.

## 5. Hak Akses

| Aktivitas | Publik | Admin |
| --- | :---: | :---: |
| Membuka beranda | Ya | Ya |
| Membuka katalog proyek | Ya | Ya |
| Membuka detail proyek | Ya | Ya |
| Membuka katalog artikel | Ya | Ya |
| Membuka detail artikel | Ya | Ya |
| Membuka dashboard admin | Tidak | Ya |
| Mengubah konten | Tidak | Ya |
| Upload gambar | Tidak | Ya |
| Menghapus konten | Tidak | Ya |

Catatan implementasi:

- Jika Clerk key belum tersedia atau masih placeholder, middleware mengizinkan akses admin untuk development **di luar produksi** — di produksi tanpa kredensial asli, admin 404 (fail-closed, lihat `src/middleware.ts`).
- Jika Clerk aktif, rute `/admin/*` wajib login.
- Jika `ADMIN_CLERK_ID` diset dan user login tidak cocok, sistem mengembalikan 404.

## 6. Arsitektur Teknis

### Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui dan Radix UI
- Drizzle ORM
- Neon PostgreSQL
- Clerk Authentication
- Zod
- Sonner
- GSAP
- Lucide React

### Data Source dan Fallback

Urutan sumber data:

1. Neon PostgreSQL melalui Drizzle jika `DATABASE_URL` tersedia.
2. Local store `data/local-store.json` jika database tidak aktif/gagal.
3. Dummy data dari `src/lib/dummy-data.ts` jika local store belum ada.

Tujuan fallback:

- Development tetap mudah tanpa database.
- Website tidak langsung rusak saat database belum disiapkan.
- Admin lokal dapat menyimpan perubahan dasar ke file local store.

### Server Actions

File utama: `src/lib/actions.ts`.

Tanggung jawab:

- Query profil, proyek, layanan, produk, testimoni, dan artikel.
- Save/delete konten.
- Validasi admin.
- Validasi input.
- Memvalidasi admin, memvalidasi input, menjaga keunikan slug, dan menangani penerjemahan hanya saat diminta eksplisit oleh admin.
- Menulis local store.
- Sinkronisasi ke database saat tersedia.
- Revalidasi halaman publik dan admin.

### Upload Gambar

File utama: `src/lib/local-upload.ts`.

Kondisi saat ini:

- **Bunny Storage bila terkonfigurasi** (`BUNNY_STORAGE_ZONE_NAME` + `BUNNY_STORAGE_API_KEY`) — persisten, wajib di Vercel/serverless. Media Library `/admin/media` menampilkan dan menghapus gambar di storage ini.
- Jika Bunny tidak terkonfigurasi, upload disimpan ke `public/uploads` (lokal — filesystem ephemeral di serverless).
- Nama file dibuat unik dengan timestamp dan random bytes.
- Tipe gambar yang diterima: JPG, PNG, WEBP, GIF, AVIF, BMP. **SVG tidak diizinkan** karena dapat memuat `<script>`/event handler (XSS saat disajikan dari origin sendiri).
- Isi berkas diverifikasi lewat magic bytes, bukan hanya `Content-Type` kiriman klien.
- Ekstensi berkas ditentukan dari MIME yang lolos whitelist, bukan dari nama file kiriman — mencegah berkas `.html`/`.js` tersimpan dan disajikan sebagai dokumen dari origin kita.
- Maksimum ukuran file: 20 MB.

Catatan produksi:

- Upload lokal tidak ideal untuk serverless karena filesystem tidak persisten.
- Untuk deployment produksi, disarankan migrasi upload ke object storage/CDN seperti Bunny, Cloudflare R2, S3, atau layanan sejenis.

## 7. Skema Database

File skema: `src/db/schema.ts`.

### profiles

Menyimpan satu profil pemilik.

Field utama:

- `id`
- `name`
- `headline`
- `headlineEn`
- `bio`
- `bioEn`
- `avatarUrl`
- `email`
- `phone`
- `location`
- `cvUrl`
- `availableForHire`
- `skills`
- `stats`
- `socialLinks`
- `updatedAt`

### projects

Field utama:

- `id`
- `slug`
- `title`
- `titleEn`
- `summary`
- `summaryEn`
- `description`
- `descriptionEn`
- `imageUrl`
- `demoUrl`
- `repoUrl`
- `techStacks`
- `featured`
- `published`
- `order`
- `createdAt`
- `updatedAt`

### services

Field utama:

- `id`
- `title`
- `titleEn`
- `description`
- `descriptionEn`
- `published`
- `order`
- `createdAt`
- `updatedAt`

### products

Field utama:

- `id`
- `slug`
- `title`
- `titleEn`
- `description`
- `descriptionEn`
- `imageUrl`
- `gallery` (array)
- `priceLabel`
- `comparePriceLabel` (harga coret)
- `priceAmount` (nominal Rupiah untuk keranjang; null = tanya/hubungi)
- `badge`
- `category`
- `stock` (null = digital/tanpa batas)
- `ctaUrl`
- `purchaseType` (`whatsapp` default)
- `customWhatsapp`
- `customButtonLabel`
- `published`
- `order`
- `createdAt`
- `updatedAt`

### testimonials

Field utama:

- `id`
- `clientName`
- `clientRole`
- `clientRoleEn`
- `content`
- `contentEn`
- `avatarUrl`
- `rating`
- `published`
- `order`
- `createdAt`
- `updatedAt`

### articles

Field utama:

- `id`
- `slug`
- `title`
- `titleEn`
- `summary`
- `summaryEn`
- `content`
- `contentEn`
- `imageUrl`
- `tags`
- `featured`
- `published`
- `publishAt` (jadwal tayang; null = langsung tayang bila published; masa depan = tersembunyi publik)
- `order`
- `createdAt`
- `updatedAt`

### audit_logs

- `id`
- `action`
- `entity`
- `entityId`
- `actor`
- `detail`
- `createdAt`

### settings

Key/value JSON untuk konfigurasi tanpa redeploy. Saat ini menampung konfigurasi Cloud AI di key `cloud_ai` (provider, apiKey, baseUrl, model, systemPrompt, answerStyle).

- `key` (PK)
- `value` (jsonb — **boleh berisi rahasia**, wajib di-mask saat dikembalikan ke client)
- `updatedAt`
- `updatedAt`

## 8. SEO dan Aksesibilitas

Kebutuhan SEO:

- Setiap halaman publik memiliki title dan description.
- Halaman katalog dan detail memiliki canonical URL.
- Open Graph dan Twitter Card tersedia.
- `sitemap.ts` dan `robots.ts` tersedia.
- JSON-LD digunakan untuk Person, CollectionPage, BlogPosting, BreadcrumbList, atau schema lain yang relevan.
- Slug proyek dan artikel harus ramah URL.
- Jika `NEXT_PUBLIC_APP_URL` kosong, canonical URL fallback ke `https://sigitadi.id`.

Kebutuhan aksesibilitas:

- Konten penting tetap tersedia sebagai HTML server-rendered.
- Struktur heading harus logis.
- Link internal harus jelas.
- Gambar memakai alt text bermakna.
- UI interaktif tidak boleh menghilangkan akses ke konten utama.

## 9. Keamanan (Hardening v2 — 2026-09-12)

Kebutuhan (OWASP Top 10):

- Admin: Clerk middleware + `verifyAdmin()` di semua Server Actions mutasi; non-admin 404 + `x-request-id`.
- Header: HSTS 2 th, `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP/CORP same-origin`, `Cache-Control no-store` untuk `/admin` & `/api`, `poweredByHeader false` (`next.config.ts`).
- CSP v2: `default-src 'self'` tanpa `unsafe-eval`, `worker-src blob:` untuk Clerk, `object-src none`.
- Validasi: Zod `safeUrlSchema` + max-length + slug regex `^[a-z0-9]+(-[a-z0-9]+)*$`; SVG blacklist, magic-bytes, ekstensi dari MIME, `bodySizeLimit 25MB`.
- Upload: `public/uploads` 20MB max, Vercel FS warning, rekomendasi Bunny/R2/S3 untuk prod.
- Rate-limit: `POST /api/indexnow` admin-only 5/60s/IP, 100 URLs, 10KB payload, host allowlist; `GET` 405.
- Sanitise: `sanitizeError()` allowlist + `safeJsonLd()` escape `</script>`; secret di env, tidak di frontend.
- Privasi: translate opt-in per field, `ENABLE_EXTERNAL_TRANSLATE=false` mematikan egress.

Catatan:

- `dangerouslySetInnerHTML` hanya untuk JSON-LD ter-serialize via `safeJsonLd()` — aman.

## 10. Performa

Kebutuhan:

- Halaman publik harus responsif.
- Data publik yang jarang berubah dapat memakai revalidation.
- Bundle admin tidak boleh membebani pengalaman publik secara tidak perlu.
- Gambar perlu dioptimalkan sesuai konteks penggunaan.
- UI SigitOS harus tetap ringan di mobile.

## 11. Copywriting dan Konten

Prinsip bahasa:

- Bahasa Indonesia profesional, ramah, dan percaya diri.
- Gunakan "Saya" untuk narasi pemilik.
- Gunakan "Anda" untuk calon klien.
- Hindari Lorem Ipsum.
- CTA harus jelas, misalnya `Lihat Proyek`, `Hubungi Saya`, `Baca Lengkap`, atau `Tanyakan Produk Ini`.

Prinsip konten:

- Proyek sebaiknya menjelaskan masalah, solusi, stack, dan hasil.
- Artikel harus teknis, berguna, dan relevan dengan positioning pemilik.
- Testimoni harus singkat, konkret, dan kredibel.
- Produk harus jelas sebagai katalog/penawaran, bukan checkout.

## 12. Environment

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id
NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/admin
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin

ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx

DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require

# Bunny CDN (opsional — upload masih lokal jika kosong)
BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
BUNNY_STORAGE_API_KEY=xxxx-xxxx-xxxx
BUNNY_CDN_HOSTNAME=namazone.b-cdn.net

# IndexNow (jangan commit key asli)
INDEXNOW_KEY=e5b871c984924b179571fcfdca565780

# Translate opt-in (false = matikan egress)
ENABLE_EXTERNAL_TRANSLATE=true
NEXT_PUBLIC_GOOGLE_VERIFICATION=nO80...
NEXT_PUBLIC_BING_VERIFICATION=e5b87...
```

## 13. Status Implementasi (Final v2026-09-12)

Status saat dokumen ini direvisi:

- Setup Next.js 15, TypeScript strict, Tailwind v4, shadcn/ui: selesai.
- Public pages + SigitOS desktop + boot loader anti-flash: selesai.
- Admin layout/dashboard + CRUD profil/proyek/layanan/produk/testimoni/artikel: selesai.
- **Sosial dinamis** 13 platform (conditional display, DB-only merge fix): selesai.
- **Chip editor** tag/tech stack + **Terminal AI** (history, Sigit_Bot NLP): selesai.
- **OG preview dinamis** per route/slug via `next/og`: selesai.
- Drizzle schema + Neon + local-store fallback (`data/local-store.json` → dummy): tersedia.
- Clerk middleware + `verifyAdmin()` + `x-request-id`: tersedia.
- Upload `public/uploads` (magic-bytes, SVG block, 20MB, Vercel warning): tersedia.
- SEO: metadata, sitemap (`sigitadi.id`), robots, JSON-LD 4 schema + BlogPosting/SoftwareApplication, ISR `revalidate 60`: tersedia.
- Hardening v2: CSP tanpa `unsafe-eval`, COOP/CORP, Cache-Control no-store, max-length+slug regex, IndexNow admin-only, sanitise: tersedia.
- UI fix: Start icon mobile 20px, proyek detail sticky nav + bottom back: selesai.
- **Standarisasi Universal Open Graph (OG) Preview (v2026-10-26)**:
  - Objek metadata `openGraph.images` seluruh rute katalog (`/proyek`, `/toko`, `/artikel`) dan order terstandarisasi dengan dimensi kaya eksplisit (`width: 1200, height: 630, type: "image/png", alt`).
  - Halaman `/order/[invoice]` memiliki metadata Open Graph & Twitter mandiri dengan generator visual dinamis `/api/og?section=order&badge=INVOICE`.
  - Generator visual Satori `src/lib/og-section-renderer.tsx` memiliki layout khas untuk 9 section (termasuk section `order` / tanda terima verifikasi pembayaran).
  - Modal share publik (`ContentShareModal` & `ProductShareModal`) mengadopsi format kartu pratinjau sosial proporsional berasio 1.91:1 (`aspect-[1200/630]`) bebas pemotongan visual.
  - Bebas em dash (`\u2014`) pada seluruh judul dan tag Open Graph sesuai aturan antislop R-02.
  - Helper `shareImage()` di `src/lib/seo.ts` otomatis memetakan seluruh kartu dinamis (`/opengraph-image` dan `/api/og`).
- **Optimasi Performa & Aksesibilitas Berbasis PageSpeed Insights Riil (v2026-10-30)**:
  - Endpoint internal `/api/media/[id]` mendukung dynamic WebP/AVIF resizing via `sharp` (`?w=...&q=...`) untuk mengeliminasi pemborosan bandwidth mobile (5.3 MB payload diet).
  - Avatar profil di-cache optimal pada `w=192` dengan dimensi eksplisit `96x96`, mengikis LCP mobile dari 19.7s.
  - Desktop visual layout shift (CLS 0.333) dihilangkan dengan isolasi CSS container `contain: strict; content-visibility: auto;` pada background ambient wallpaper desktop.
  - Animasi progress bar bootloader beralih ke GPU-accelerated `transform: scaleX(...)` (mengatasi forced reflow 263ms).
  - Pengecekan `navigator.userActivation?.hasBeenActive` dipasang pada haptic sound untuk menghilangkan console error browser (Best Practices 100).
  - Kontras status `ONLINE` ditingkatkan ke `emerald-900`/`emerald-300` (lulus rasio WCAG AA 4.5:1 terhadap kertas retro `vt-paper`), logo `alt` deskriptif berdimensi `20x20`, dan `aria-label` pembeda untuk link eksternal portofolio.
  - **Optimasi Performa Komprehensif Iterasi 2 (v2026-10-30 - Speed Index & LCP Stabilizer)**:
  - Eliminasi False Desktop LCP: Ambient wallpaper `<img>` digantikan murni CSS radial-gradient, menghapus delay LCP 1.39s & beban GPU `blur-xl`.
  - Eliminasi Render Delay Mobile 2.67s: Manipulasi `opacity: 0` dihapus dari animasi GSAP hero section, sehingga FCP = LCP (~2.4s).
  - Code-splitting Clerk SDK via dynamic import `os-menubar-user.tsx` memangkas ~210 KiB chunk dari initial public bundle.
  - Ikon menubar & BIOS diganti ke WebP 48x48 (`icon-48.webp`, 370 B vs 22.7 KB PNG).
  - Seluruh 12 gambar eksternal Unsplash (456 KiB) di bawah fold kini menggunakan `loading="lazy"`, `decoding="async"`, dan auto-compression query params.
  - Forced reflow 284 ms di scroll-spy dihilangkan dengan caching bounding box dan defer layout update.
  - Aksesibilitas tautan kartu proyek & artikel dilengkapi `aria-label` pembeda; rute `llms.txt` dicache statis 24 jam.

## 14. Rekomendasi Lanjutan (Post-Final)

Prioritas berikutnya:

- Storage persisten Bunny/R2/S3 untuk prod (sudah ada env `BUNNY_*`, tinggal wiring).
- Test: Vitest unit (validations, actions) + Playwright E2E admin CRUD.
- Monitoring: Sentry / Log Drains untuk `sanitizeError` + `x-request-id` tracing.
- Batasi `images.remotePatterns` wildcard `**` ke allowlist (`images.unsplash.com`, `cdn.sigitadi.id`).
- Cron revalidate sitemap harian + auto-ping IndexNow saat `saveProject/saveArticle` (saat ini manual via `/api/indexnow`).
