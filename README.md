# MyWebPorto

MyWebPorto adalah website portofolio pribadi berbasis Next.js 15 untuk personal branding, katalog proyek, layanan profesional, produk, testimoni, dan artikel teknis. Project ini juga menyediakan panel admin sederhana agar pemilik dapat mengelola konten tanpa mengubah kode langsung.

Tampilan publik memakai konsep retro desktop "SigitOS" dengan window manager interaktif, namun tetap menyimpan konten server-rendered untuk SEO dan aksesibilitas.

## Fitur Utama

### Area Publik

- Beranda interaktif di `/` dengan profil, layanan, proyek, produk, testimoni, artikel, kontak, terminal CRT, dan asisten AI lokal Sigit_Bot.
- Katalog proyek di `/proyek`.
- Detail proyek di `/proyek/[slug]`.
- Katalog Store.zip pada section `#produk`.
- Detail produk shareable di `/toko/[slug]`.
- Katalog artikel di `/artikel`.
- Detail artikel di `/artikel/[slug]`.
- Metadata SEO, Open Graph, Twitter Card, sitemap, robots.txt, dan JSON-LD.
- Fallback konten SSR tersembunyi untuk mesin pencari dan assistive technology.

### Panel Admin

- Login admin melalui Clerk di `/sign-in`.
- Proteksi rute `/admin/*` memakai Clerk middleware dan `ADMIN_CLERK_ID`.
- Dashboard ringkasan konten.
- CRUD profil, proyek, layanan, produk, testimoni, dan artikel.
- **Manajemen tautan sosial**: isi Telegram, Instagram, TikTok, YouTube, Facebook, Discord, Slack, Reddit, Medium, GitHub, LinkedIn, X, Portofolio — tampil otomatis di Kontak.exe, footer & menubar hanya jika terisi.
- **Editor chip** untuk tag artikel & tech stack proyek (tambah/hapus per item, bukan hardcode).
- **Terminal AI** dengan perintah: `help`, `whoami`, `skills`, `projects`, `services`, `articles`, `contact`, `open <app>`, `theme`, `lang`, `neofetch`, `history`, `clear`, `reboot` + navigasi riwayat panah atas/bawah dan natural-language chat ke Sigit_Bot.
- Input konten Indonesia dan Inggris untuk beberapa field.
- Terjemahan ID → EN **opt-in per field** lewat tombol Terjemahkan di form admin (tidak ada terjemahan otomatis saat menyimpan); kolom English yang dikosongkan memakai teks Indonesia sebagai fallback di mode EN.
- Upload gambar lokal ke `public/uploads`.
- Slug produk dapat dikelola dari admin dan masuk ke sitemap.
- **OG preview dinamis** per route/slug: halaman utama, list, detail proyek, artikel & produk masing-masing mempunyai Open Graph image composited (judul + branding + thumbnail).
- Artikel studi kasus project dan topical authority AI, cybersecurity, Linux, Windows, dan macOS.

## Tech Stack

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
- next/og (dynamic Open Graph images)

## Struktur Folder

```text
src/
|-- app/
|   |-- (public)/          # Rute publik: beranda, proyek, artikel
|   |-- admin/             # Panel admin terproteksi
|   |-- sign-in/           # Login Clerk
|   |-- sign-up/           # Sign up Clerk
|   |-- api/               # API routes
|   |-- globals.css        # Styling global dan token tema
|   |-- layout.tsx         # Root layout
|   |-- sitemap.ts         # Generator sitemap.xml
|   `-- robots.ts          # Generator robots.txt
|-- components/
|   |-- admin/             # Komponen admin
|   |-- public/            # Komponen halaman publik
|   |   `-- os/            # Komponen SigitOS / retro desktop
|   `-- ui/                # Komponen UI berbasis shadcn
|-- db/
|   |-- index.ts           # Koneksi Drizzle ke Neon
|   `-- schema.ts          # Skema tabel database
`-- lib/
    |-- actions.ts         # Server Actions CRUD dan query data
    |-- ai-engine.ts       # Mesin NLP/ML lokal untuk terminal & AI bot
    |-- contact-link.ts    # Helper URL kontak prefill
    |-- dummy-data.ts      # Data fallback
    |-- i18n.tsx           # State dan teks bilingual
    |-- local-upload.ts    # Upload gambar lokal
    |-- product-link.ts    # Helper slug & link produk
    |-- seo.ts             # Helper SEO
    |-- translate.ts       # Penerjemahan ID/EN opt-in (peringatan privasi ada di berkas ini)
    |-- utils.ts           # Utility umum
    `-- validations.ts     # Skema validasi Zod
```

## Model Data

Skema database utama berada di `src/db/schema.ts`.

- `profiles`: data pemilik website, kontak, avatar, skill, statistik, sosial media (GitHub, LinkedIn, Instagram, X, Medium, YouTube, TikTok, Telegram, Facebook, Discord, Slack, Reddit, Portofolio), serta status available for hire. Sosial media tampil hanya jika URL terisi.
- `projects`: portofolio proyek, slug, summary, deskripsi, gambar, demo, repo, tech stack (array, dikelola via editor chip), featured, published, dan urutan.
- `services`: layanan atau keahlian yang ditawarkan.
- `products`: katalog produk dengan slug, label harga, gambar, CTA checkout/download.
- `testimonials`: testimoni klien, role, avatar, rating, status publikasi.
- `articles`: artikel teknis dengan slug, summary, konten, gambar, tag (array, dikelola via editor chip), featured, published, dan urutan.

Sebagian tabel mendukung field bilingual seperti `titleEn`, `descriptionEn`, `contentEn`, `summaryEn`, dan sejenisnya.

## Alur Data

Project ini tetap bisa berjalan walaupun database belum aktif.

1. Jika `DATABASE_URL` tersedia, data dibaca dan disimpan ke Neon PostgreSQL melalui Drizzle.
2. Jika database belum tersedia atau query gagal, aplikasi memakai local store di `data/local-store.json`.
3. Jika local store belum ada, aplikasi memakai data awal dari `src/lib/dummy-data.ts`.

Server Actions di `src/lib/actions.ts` menangani validasi admin, CRUD, auto-seed awal, local persistence, sinkronisasi database, penjagaan keunikan slug, dan `revalidatePath`.

## Environment Variables

Buat file `.env.local` di root project.

```env
# URL aplikasi
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/admin
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin

# ID Clerk user yang berhak masuk admin
ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require

# Formspree contact form
NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id
NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id

# Terjemahan ID -> EN (Google Translate / MyMemory)
# Set "false" untuk mematikan tombol terjemahan di panel admin sepenuhnya.
ENABLE_EXTERNAL_TRANSLATE=true
```

### Terjemahan dan Privasi

Penerjemahan **tidak berjalan otomatis** saat konten disimpan. Tombol *Terjemahkan (ID → EN)* di form admin memanggil `translateFieldAction` (dilindungi `verifyAdmin()`) dan bersifat opt-in per field, karena teks yang diterjemahkan dikirim ke layanan pihak ketiga: `translate.googleapis.com` lalu `api.mymemory.translated.net` sebagai fallback (lihat peringatan di `src/lib/translate.ts`).

Set `ENABLE_EXTERNAL_TRANSLATE=false` bila deployment Anda tidak boleh melakukan egress data. Fungsi terjemahan lalu menolak berjalan dan admin diminta mengisi kolom English secara manual.

Catatan:

- Jika Clerk key belum diset atau masih placeholder, middleware mengizinkan navigasi admin untuk kebutuhan development.
- Jika `DATABASE_URL` kosong, aplikasi tetap berjalan memakai data lokal/fallback.
- Jika `NEXT_PUBLIC_APP_URL` kosong, fallback canonical URL memakai `https://sigitadi.id`.
- Upload gambar saat ini disimpan lokal ke `public/uploads`, bukan ke storage eksternal.
- **SVG tidak diizinkan diunggah** (risiko XSS via inline script); hanya JPEG, PNG, WEBP, GIF, AVIF, BMP.
- Isi gambar diverifikasi lewat magic bytes dan ekstensi diturunkan dari MIME tervalidasi, bukan dari nama file kiriman klien.
- Variabel `BUNNY_STORAGE_*` tersedia di `.env.example` tetapi belum terhubung ke kode; upload gambar masih lokal.
- Pastikan form Formspree pada dashboard/workflow diarahkan ke `x@sigitadi.id`.

## Keamanan (Hardening v2 — 2026-09-12)

MyWebPorto menerapkan hardening sesuai **OWASP Top 10**. Lihat **[SECURITY.md](./SECURITY.md)** untuk threat model, header lengkap, dan checklist pra-deploy. Ringkasan:

- **Akses**: Clerk middleware + `verifyAdmin()` di semua Server Actions mutasi; non-admin dapat 404 (bukan 403) + `x-request-id` untuk audit.
- **Header ketat** (`next.config.ts`): HSTS 2 tahun, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/payment/usb), `COOP/CORP: same-origin`, `Cache-Control: no-store` untuk `/admin` & `/api`, `poweredByHeader: false`.
- **CSP v2**: `default-src 'self'`; `script-src` tanpa `unsafe-eval`; `worker-src blob:` untuk Clerk; `img-src https: data: blob:`; `object-src 'none'`.
- **Validasi**: Zod `safeUrlSchema` + **max-length** (headline 200, bio 5000, slug 100) + **slug regex** `^[a-z0-9]+(-[a-z0-9]+)*$`; SVG blacklist, magic-bytes, ekstensi dari MIME, random filename, `bodySizeLimit 25MB`.
- **Rate limiting**: `POST /api/indexnow` **admin-only** + 5 req/60s/IP, max 100 URLs, payload 10KB, host allowlist; `GET` 405.
- **Error sanitasi**: allowlist pesan aman + `slice(0,500)` + masking internal di `sanitizeError()`; `safeJsonLd()` escape `</script>`.
- **Privasi**: translate opt-in per field, `ENABLE_EXTERNAL_TRANSLATE=false` mematikan egress sepenuhnya.

Pastikan `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ADMIN_CLERK_ID`, `DATABASE_URL`, dan `INDEXNOW_KEY` sudah diisi value **produksi** (bukan placeholder) sebelum deploy. Jalankan `npm audit` bulanan.

## Instalasi

```bash
npm install
```

## Menjalankan Development Server

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Database

Generate migration:

```bash
npm run db:generate
```

Push schema ke database:

```bash
npm run db:push
```

Seed data awal:

```bash
npm run db:seed
```

Buka Drizzle Studio:

```bash
npm run db:studio
```

## Build Produksi

```bash
npm run build
```

Jalankan build produksi:

```bash
npm run start
```

Catatan: `next.config.ts` memakai `output: "standalone"` hanya di luar Vercel. Untuk deployment standalone langsung, gunakan `node .next/standalone/server.js`, bukan `next start`. Di Vercel, build memakai output default Next.js.

## Paket Deployment Standalone

Buat paket siap upload ke VPS, cPanel Node.js, atau server PM2:

```bash
npm run package
```

Paket dibuat di `deploy_package/` dan berisi server standalone, aset statis, `public`, local store `data`, serta konfigurasi PM2. Edit `deploy_package/.env`, lalu jalankan:

```bash
node server.js
# atau
pm2 start ecosystem.config.cjs
pm2 save
```

## Checklist Sebelum Push atau Deploy

```bash
npm run lint
npm run build
npm run package
```

Pastikan `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, Clerk production keys, `ADMIN_CLERK_ID`, dan Formspree sudah benar. Terapkan migration database termasuk `drizzle/0003_product_slugs.sql`. Jangan commit `.env`, credential, atau token.

## Verifikasi Setelah Deploy

Uji `/`, `/proyek`, `/artikel`, `/toko/[slug]`, `/sitemap.xml`, `/robots.txt`, dan `/admin`. Lanjutkan dengan uji login admin, CRUD setiap section, upload gambar, form kontak, dan pembaruan slug produk.

## Deployment

Project siap dideploy ke platform Next.js seperti Vercel. Push ke branch `main` akan memicu auto-deploy Vercel jika proyek sudah terhubung. Untuk deployment mandiri (VPS/cPanel/PM2), gunakan paket `deploy_package` sesuai `DEPLOYMENT.md`. Pastikan environment variables produksi sudah tersedia, terutama:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADMIN_CLERK_ID`
- `NEXT_PUBLIC_ADMIN_CLERK_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_FORMSPREE_ENDPOINT`
- `NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL`

Karena upload saat ini memakai `public/uploads`, penyimpanan gambar tidak persisten di lingkungan serverless. Untuk produksi jangka panjang, gunakan object storage atau CDN storage seperti Bunny, S3, R2, atau layanan sejenis.

## Catatan Pengembangan

- Jangan gunakan Lorem Ipsum untuk konten dummy.
- Konten publik sebaiknya tetap memakai Bahasa Indonesia profesional dan ramah.
- Field Inggris diisi manual, lewat tombol Terjemahkan, atau dibiarkan kosong (mode EN lalu memakai teks Indonesia).
- Produk hanya berupa katalog/CTA, tidak ada checkout atau payment gateway.
- Admin adalah single-owner CMS, bukan sistem multi-user publik.
