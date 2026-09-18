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
- Konten bilingual untuk beberapa field Indonesia/Inggris.
- Terjemahan ID → EN opt-in per field melalui tombol di form admin (bukan otomatis saat menyimpan).
- Upload gambar lokal ke `public/uploads`.
- SEO metadata, Open Graph, Twitter Card, sitemap, robots.txt, JSON-LD.
- Fallback data lokal saat database tidak tersedia.

### Di Luar Scope Saat Ini

- **Payment gateway** — checkout diakhiri di pesan WhatsApp; tidak ada pembayaran online.
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
| `/admin/testimonials` | Kelola Testimoni | Tambah, ubah, hapus, publish, rating, avatar, dan identitas klien. |
| `/admin/media` | Media Library | Daftar gambar di Bunny Storage (bila terkonfigurasi) dengan hapus. |
| `/admin/system` | Sistem & Logs | Kelayakan deploy (validasi env), tracing `x-request-id`, audit log mutasi, dan konfigurasi Cloud AI. |

## 4. Fitur Utama

### 4.1 Beranda SigitOS

Beranda bukan landing page konvensional, melainkan desktop UI interaktif yang mengelola beberapa jendela konten. Komponen utama berada di `src/components/public/os`.

Kebutuhan:

- Menampilkan profil, kontak, layanan, proyek, produk, testimoni, dan artikel.
- Menyediakan terminal/CRT interaction sebagai elemen identitas.
- Menyediakan asisten AI Sigit_Bot yang menjalankan mesin NLP/ML lokal (`src/lib/ai-engine.ts`), dengan fallback cloud opt-in (`src/lib/ai-provider.ts`, `src/lib/ai-openai.ts`) bila provider dikonfigurasi dan confidence lokal rendah.
- Menyediakan RetroBot — asisten melayang yang sadar halaman (tahu app SigitOS mana yang sedang dibuka) dan memandu navigasi lewat nav chip di percakapan.
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
- Halaman detail artikel menampilkan estimasi waktu baca.
- Artikel memiliki metadata SEO dan JSON-LD yang sesuai.

### 4.4 Layanan

Kebutuhan:

- Layanan ditampilkan berdasarkan `order`.
- Hanya layanan published yang tampil di area publik.
- CTA diarahkan ke kontak manual.
- Tidak ada transaksi otomatis.

### 4.5 Produk

Kebutuhan:

- Produk berfungsi sebagai katalog + checkout WhatsApp (bukan payment gateway).
- Produk dapat memiliki `priceLabel` (label tampilan), `comparePriceLabel` (harga coret), `priceAmount` (nominal Rupiah untuk keranjang; null = tanya/hubungi), `badge`, `category`, `stock` (null = digital/tanpa batas), dan `gallery`.
- Keranjang belanja (`cart-context.tsx`) persisten di `localStorage`; checkout merakit pesan WhatsApp via `whatsapp-order.ts` dengan data pelanggan dan total.
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

## 14. Rekomendasi Lanjutan (Post-Final)

Prioritas berikutnya:

- Storage persisten Bunny/R2/S3 untuk prod (sudah ada env `BUNNY_*`, tinggal wiring).
- Test: Vitest unit (validations, actions) + Playwright E2E admin CRUD.
- Monitoring: Sentry / Log Drains untuk `sanitizeError` + `x-request-id` tracing.
- Batasi `images.remotePatterns` wildcard `**` ke allowlist (`images.unsplash.com`, `cdn.sigitadi.id`).
- Cron revalidate sitemap harian + auto-ping IndexNow saat `saveProject/saveArticle` (saat ini manual via `/api/indexnow`).
