# MyWebPorto

MyWebPorto adalah website portofolio pribadi berbasis Next.js 15 untuk personal branding, katalog proyek, layanan profesional, produk, testimoni, dan artikel teknis. Project ini juga menyediakan panel admin sederhana agar pemilik dapat mengelola konten tanpa mengubah kode langsung.

Tampilan publik memakai konsep retro desktop "SigitOS" dengan window manager interaktif, namun tetap menyimpan konten server-rendered untuk SEO dan aksesibilitas.

## Fitur Utama

### Area Publik

- Beranda interaktif di `/` dengan profil, layanan, proyek, produk, testimoni, artikel, kontak, terminal CRT, dan asisten AI lokal Sigit_Bot.
- Pengalaman desktop retro **SigitOS**: window manager interaktif (minimize/restore, double-click maximize, drag), taskbar dengan indikator, command palette **Ctrl+K**, search start menu, dan **4 tema** (Retro 90s default, Dark, Tokyo Night, VS Code) yang dipilih lewat theme selector dan dipertahankan di `localStorage`.
- Boot screen sekali per sesi (`sessionStorage`) agar animasi tidak berulang saat navigasi antar halaman; hash `#proyek` dsb. langsung membuka app yang dimaksud sebelum first paint.
- Katalog proyek di `/proyek`.
- Detail proyek di `/proyek/[slug]`.
- Katalog Store.zip pada section `#produk`, dengan **keranjang belanja** (persisten di `localStorage`) dan checkout **pesan WhatsApp** otomatis (stok terbatas, label harga coret, etalase badge/kategori/galeri).
- Detail produk shareable di `/toko/[slug]`.
- Katalog artikel di `/artikel`.
- Detail artikel di `/artikel/[slug]` dengan reading progress, share X/LinkedIn/WhatsApp, dan related articles berperingkat tag.
- **RetroBot** — asisten AI melayang yang sadar halaman (tahu app SigitOS mana yang sedang dibuka), memandu lewat *nav chip* di dalam percakapan, efek visual (scan ring, radar ping, burst partikel, hover tip, panel-in, nudge), dan quick prompt per app.
- Metadata SEO, Open Graph, Twitter Card, sitemap, robots.txt, JSON-LD, **`llms.txt`** dinamis untuk AI crawler, dan **OG preview dinamis** per route/slug.
- **PWA**: manifest, ikon avatar (192/512/maskable/Apple), halaman offline + service worker fallback, theme-color.
- **RSS** di `/feed.xml` dengan autodiscovery.
- Fallback konten SSR tersembunyi untuk mesin pencari dan assistive technology.

### Panel Admin

- Login admin melalui Clerk di `/sign-in`.
- Proteksi rute `/admin/*` memakai Clerk middleware dan `ADMIN_CLERK_ID` (single-owner; non-admin mendapat 404, fail-closed di produksi).
- Dashboard ringkasan konten + tombol Visitor Analytics.
- CRUD profil, proyek, layanan, produk, testimoni, dan artikel.
- **Sistem & Logs** di `/admin/system`: kelayakan deploy (validasi env terpusat), tracing `x-request-id`, dan audit log mutasi.
- **Media Library** di `/admin/media`: daftar gambar di Bunny Storage (bila terkonfigurasi) dengan hapus.
- **Konfigurasi Cloud AI** di `/admin/system`: pilih provider (Gemini / OpenAI-compatible), isi API key + base URL, **ambil daftar model otomatis** dari endpoint provider, atur **prompt & cara menjabarkan** (concise / detailed / friendly). Disimpan di tabel `settings` (key `cloud_ai`), nilai efektif dapat dari admin *atau* env.
- **God Mode — Tampilan & App OS** di `/admin/appearance`: atur aplikasi SigitOS yang ditampilkan ke pengunjung (centang aktif) dan urutannya (tombol panah), tanpa kode/redeploy. Mengendalikan taskbar, sidebar ikon desktop, Start Menu, command palette, jalan pintas angka, dan urutan section mobile. Disimpan di tabel `settings` (key `os_apps`); minimal satu app harus aktif, config rusak kembali ke default. Fase pertama dari roadmap God Mode; editor teks UI menyusul.
- **Manajemen tautan sosial**: isi Telegram, Instagram, TikTok, YouTube, Facebook, Discord, Slack, Reddit, Medium, GitHub, LinkedIn, X, Portofolio — tampil otomatis di Kontak.exe, footer & menubar hanya jika terisi.
- **Editor chip** untuk tag artikel & tech stack proyek (tambah/hapus per item, bukan hardcode).
- **Content editor** dengan toolbar sintaks (H2/H3/quote/kode) + pratinjau WYSIWYG via renderer publik bersama.
- **Draft & schedule**: kolom `publishAt` proyek/artikel — masa depan tersembunyi dari publik, badge Terjadwal di admin.
- **Terminal AI** dengan perintah: `help`, `whoami`, `skills`, `projects`, `services`, `articles`, `contact`, `open <app>`, `theme`, `lang`, `neofetch`, `history`, `clear`, `reboot`, `cv`, `github`, `email` + navigasi riwayat panah atas/bawah, natural-language chat ke Sigit_Bot, input suara + TTS.
- Input konten Indonesia dan Inggris untuk beberapa field.
- Terjemahan ID → EN **opt-in per field** lewat tombol Terjemahkan di form admin (tidak ada terjemahan otomatis saat menyimpan); kolom English yang dikosongkan memakai teks Indonesia sebagai fallback di mode EN.
- Upload gambar lokal ke `public/uploads`, atau **Bunny Storage otomatis bila `BUNNY_STORAGE_*` terkonfigurasi** (wajib di Vercel/serverless).
- Slug produk dapat dikelola dari admin dan masuk ke sitemap.
- Artikel studi kasus project dan topical authority AI, cybersecurity, Linux, Windows, dan macOS.

### Sigit_Bot / RetroBot (arsitektur hybrid)

- **Default: mesin lokal** — `src/lib/ai-engine.ts` (TF-IDF + rule-based) bekerja tanpa key, tanpa biaya, tanpa egress data. Dipakai terminal CRT dan RetroBot.
- **Cloud opt-in** — bila `AI_PROVIDER` di-set (`gemini` atau `openai`) **atau** diisi lewat form Cloud AI admin, dan confidence lokal < 0,55, pertanyaan diteruskan ke provider: `src/lib/ai-provider.ts` (Gemini) dan `src/lib/ai-openai.ts` (OpenAI-compatible streaming SSE). Prompt hanya berisi katalog publik — tanpa PII/secret.
- **Endpoint streaming** `POST /api/retrobot` (SSE: `meta` → `delta` → `done`) dengan konteks halaman SigitOS disisipkan, rate-limit publik 20 req/5 menit/IP, input 500 char.
- **Daftar model** — `src/lib/ai-models.ts` mengambil daftar model dari provider (Gemini `models.list` atau OpenAI `/models`) untuk dropdown auto-fetch di form admin.

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
|   |-- (public)/          # Rute publik: beranda, proyek, artikel, toko
|   |   |-- layout.tsx     # CartProvider + CartDialog + locale hreflang
|   |   |-- page.tsx       # Beranda SigitOS
|   |   |-- proyek/        # Katalog + detail proyek
|   |   |-- artikel/       # Katalog + detail artikel
|   |   `-- toko/[slug]/    # Detail produk shareable
|   |-- admin/             # Panel admin terproteksi (single-owner)
|   |   |-- appearance/    # God Mode: app SigitOS aktif + urutan (settings.os_apps)
|   |   |-- system/        # Kelayakan deploy + audit logs + Cloud AI config
|   |   `-- media/         # Media Library (Bunny Storage)
|   |-- sign-in/           # Login Clerk
|   |-- sign-up/           # Sign up Clerk
|   |-- api/
|   |   |-- indexnow/      # Ping IndexNow (admin-only, rate-limited)
|   |   `-- retrobot/      # Streaming SSE RetroBot (publik, rate-limited)
|   |-- feed.xml/          # RSS
|   |-- llms.txt/          # llms.txt dinamis untuk AI crawler
|   |-- offline/           # Halaman fallback PWA
|   |-- globals.css        # Styling global + token 4 tema
|   |-- layout.tsx         # Root layout
|   |-- opengraph-image.tsx
|   |-- sitemap.ts         # Generator sitemap.xml
|   `-- robots.ts          # Generator robots.txt
|-- components/
|   |-- admin/             # Komponen admin
|   |   |-- cloud-ai-config-form.tsx  # Form Cloud AI + auto-fetch model
|   |   |-- content-editor.tsx        # Toolbar sintaks + pratinjau
|   |   `-- media-list.tsx            # Media Library
|   |-- public/            # Komponen halaman publik
|   |   |-- os/            # Komponen SigitOS / retro desktop
|   |   |   |-- os-desktop-manager.tsx  # Window manager + hash sync
|   |   |   |-- os-boot-loader.tsx      # Boot screen sekali per sesi
|   |   |   |-- os-crt-terminal.tsx     # Terminal CRT + AI
|   |   |   |-- os-command-palette.tsx  # Ctrl+K palette
|   |   |   |-- os-window.tsx           # Chrome jendela (drag/maximize)
|   |   |   |-- os-menubar.tsx          # Menubar atas + theme selector
|   |   |   |-- os-sound-layer.tsx      # Layer suara retro
|   |   |   |-- os-scroll-fade.tsx      # Gradien + chevron "masih bisa scroll"
|   |   |   `-- theme-context.tsx       # 4 tema (data-theme attribute)
|   |   |-- retro-bot.tsx         # Asisten AI melayang sadar-halaman
|   |   |-- retro-bot-avatar.tsx  # Avatar + efek (scan ring, burst, dll)
|   |   |-- cart-dialog.tsx       # Keranjang + checkout WhatsApp
|   |   `-- ...            # Section publik (hero, proyek, produk, dll)
|   `-- ui/                # Komponen UI berbasis shadcn
|-- db/
|   |-- index.ts           # Koneksi Drizzle ke Neon
|   `-- schema.ts          # Skema 8 tabel (lihat "Model Data")
`-- lib/
    |-- actions.ts         # Server Actions CRUD, query, askSigitBot, listCloudModels
    |-- ai-engine.ts       # Mesin NLP/ML lokal (TF-IDF) untuk terminal & bot
    |-- ai-provider.ts     # Cloud Gemini (prompt builder + style jawaban)
    |-- ai-openai.ts       # Cloud OpenAI-compatible (streaming SSE)
    |-- ai-models.ts       # Daftar model dari provider (auto-fetch)
    |-- cloud-ai-config.ts # Config Cloud AI: admin settings menimpa env
    |-- settings.ts        # Key/value store (tabel settings) + masking secret
    |-- admin-auth.ts      # verifyAdmin() + isAdminOwnerConfigured()
    |-- audit.ts           # Audit log mutasi (DB + fallback local)
    |-- rate-limit.ts      # Sliding window rate limiter in-memory
    |-- env.ts             # Validasi env terpusat (non-blocking)
    |-- system-status.ts   # Kelayakan deploy untuk /admin/system
    |-- error-utils.ts     # sanitizeError() (allowlist + masking)
    |-- validations.ts     # Skema validasi Zod (max-length, slug regex, URL)
    |-- storage.ts         # Validasi gambar (magic bytes) + Bunny Storage
    |-- local-upload.ts    # Upload gambar (Bunny bila ada, jika tidak lokal)
    |-- cart-context.tsx   # Keranjang belanja (localStorage)
    |-- cart-stock.ts      # Logika stok & batas qty
    |-- whatsapp-order.ts  # Builder pesan WhatsApp order
    |-- publish.ts         # Filter published/publishAt (draft & schedule)
    |-- indexnow.ts        # Ping IndexNow best-effort
    |-- seo.ts             # Helper SEO
    |-- json-ld.ts         # safeJsonLd() (escape </script>)
    |-- content-edit.ts    # Parser sintaks konten (H2/H3/quote/kode)
    |-- os-sound.ts        # SFX retro (WebAudio)
    |-- unsaved-changes.ts # Guard "perubahan belum disimpan"
    |-- store.ts           # Local store read/write (data/*.json)
    |-- contact-link.ts    # Helper URL kontak prefill
    |-- dummy-data.ts      # Data fallback
    |-- i18n.tsx           # State dan teks bilingual
    |-- product-link.ts    # Helper slug & link produk
    |-- translate.ts       # Penerjemahan ID/EN opt-in (peringatan privasi ada di berkas ini)
    |-- gsap-scroller.ts   # Jembatan ScrollTrigger ↔ scroller internal SigitOS
    `-- utils.ts           # Utility umum

# Di luar src/:
drizzle/                   # Migrasi SQL 0000–0009 + meta snapshot
tests/                     # Unit test Vitest (13 file, 100 test)
e2e/                       # E2E Playwright area publik
scripts/                   # seed.mjs, package-deploy.mjs, dll
data/                      # Local store: local-store.json, local-settings.json
deploy_package/            # Hasil `npm run package` (standalone + PM2)
```

## Model Data

Skema database utama berada di `src/db/schema.ts` (8 tabel). Migrasi: `drizzle/0000`–`0009`.

- `profiles`: data pemilik website, kontak, avatar, skill, statistik, sosial media (GitHub, LinkedIn, Instagram, X, Medium, YouTube, TikTok, Telegram, Facebook, Discord, Slack, Reddit, Portofolio), serta status available for hire. Sosial media tampil hanya jika URL terisi.
- `projects`: portofolio proyek, slug, summary, deskripsi, gambar, demo, repo, tech stack (array, dikelola via editor chip), featured, published, `publishAt` (jadwal tayang), dan urutan.
- `services`: layanan atau keahlian yang ditawarkan.
- `products`: katalog produk dengan slug, label harga + `comparePriceLabel` (harga coret), `priceAmount` (nominal Rupiah untuk keranjang), `badge`, `category`, `stock` (null = digital/tanpa batas), `gallery`, `ctaUrl`, `purchaseType` (`whatsapp` default), `customWhatsapp`, `customButtonLabel`, published, dan urutan.
- `testimonials`: testimoni klien, role, avatar, rating, status publikasi.
- `articles`: artikel teknis dengan slug, summary, konten, gambar, tag (array, dikelola via editor chip), featured, published, `publishAt` (jadwal tayang), dan urutan.
- `audit_logs`: siapa mengubah apa dan kapan (best-effort, retensi 500 baris terbaru).
- `settings`: key/value JSON untuk konfigurasi tanpa redeploy — saat ini menampung konfigurasi Cloud AI di key `cloud_ai`. **Value boleh berisi rahasia** (API key); module pengakses wajib mem-mask saat mengembalikan ke client.

Sebagian tabel mendukung field bilingual seperti `titleEn`, `descriptionEn`, `contentEn`, `summaryEn`, dan sejenisnya.

## Alur Data

Project ini tetap bisa berjalan walaupun database belum aktif.

1. Jika `DATABASE_URL` tersedia, data dibaca dan disimpan ke Neon PostgreSQL melalui Drizzle.
2. Jika database belum tersedia atau query gagal, aplikasi memakai local store di `data/local-store.json`.
3. Jika local store belum ada, aplikasi memakai data awal dari `src/lib/dummy-data.ts`.

Pengaturan konfigurasi (Cloud AI) memakai jalur paralel: tabel `settings` bila DB aktif, atau `data/local-settings.json` sebagai fallback — lihat `src/lib/settings.ts`.

Server Actions di `src/lib/actions.ts` menangani validasi admin, CRUD, auto-seed awal, local persistence, sinkronisasi database, penjagaan keunikan slug, filter `publishAt` (draft & schedule), dan `revalidatePath`.

## Environment Variables

Buat file `.env.local` di root project (lihat `.env.example`):

```env
# URL aplikasi — WAJIB https://sigitadi.id di Vercel prod (tanpa slash)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id
NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id

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

# Bunny CDN (opsional — upload masih lokal jika kosong)
BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
BUNNY_STORAGE_API_KEY=xxxx-xxxx-xxxx
BUNNY_CDN_HOSTNAME=namazone.b-cdn.net

# IndexNow (jangan commit key asli)
INDEXNOW_KEY=e5b871c984924b179571fcfdca565780

# Cloud AI Sigit_Bot (opsional — default OFF / mesin lokal)
# Provider: off (default) | gemini | openai (OpenAI-compatible)
AI_PROVIDER=off
GEMINI_API_KEY=
AI_MODEL=
# Untuk provider OpenAI-compatible:
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=

# Translate opt-in
ENABLE_EXTERNAL_TRANSLATE=true
NEXT_PUBLIC_GOOGLE_VERIFICATION=nO80...
NEXT_PUBLIC_BING_VERIFICATION=e5b87...
```

> Catatan: konfigurasi Cloud AI juga dapat diisi dari form **Cloud AI** di `/admin/system` (disimpan di tabel `settings`, key `cloud_ai`). Pengaturan admin menimpa env per-field. Jangan masukkan key produksi ke repo — isi lewat form admin atau env server saja.

### Terjemahan dan Privasi

Penerjemahan **tidak berjalan otomatis** saat konten disimpan. Tombol *Terjemahkan (ID → EN)* di form admin memanggil `translateFieldAction` (dilindungi `verifyAdmin()`) dan bersifat opt-in per field, karena teks yang diterjemahkan dikirim ke layanan pihak ketiga: `translate.googleapis.com` lalu `api.mymemory.translated.net` sebagai fallback (lihat peringatan di `src/lib/translate.ts`).

Set `ENABLE_EXTERNAL_TRANSLATE=false` bila deployment Anda tidak boleh melakukan egress data. Fungsi terjemahan lalu menolak berjalan dan admin diminta mengisi kolom English secara manual.

Catatan:

- Jika Clerk key belum diset atau masih placeholder, middleware mengizinkan navigasi admin untuk kebutuhan development.
- Jika `DATABASE_URL` kosong, aplikasi tetap berjalan memakai data lokal/fallback.
- Jika `NEXT_PUBLIC_APP_URL` kosong, fallback canonical URL memakai `https://sigitadi.id`.
- Upload gambar disimpan ke **Bunny Storage bila `BUNNY_STORAGE_*` terkonfigurasi** (persisten — wajib di Vercel/serverless), jika tidak ke `public/uploads` (lokal, ephemeral di serverless).
- **SVG tidak diizinkan diunggah** (risiko XSS via inline script); hanya JPEG, PNG, WEBP, GIF, AVIF, BMP.
- Isi gambar diverifikasi lewat magic bytes dan ekstensi diturunkan dari MIME tervalidasi, bukan dari nama file kiriman klien.
- Variabel `BUNNY_STORAGE_*` terhubung ke kode: bila zone + API key terisi, upload otomatis masuk ke Bunny Storage (lihat `src/lib/storage.ts` dan `isBunnyConfigured()`); jika tidak, upload jatuh ke `public/uploads`.
- Pastikan form Formspree pada dashboard/workflow diarahkan ke `x@sigitadi.id`.

## Keamanan (Hardening v2 — 2026-09-12)

MyWebPorto menerapkan hardening sesuai **OWASP Top 10**. Lihat **[SECURITY.md](./SECURITY.md)** untuk threat model, header lengkap, dan checklist pra-deploy. Ringkasan:

- **Akses**: Clerk middleware + `verifyAdmin()` di semua Server Actions mutasi; non-admin dapat 404 (bukan 403) + `x-request-id` untuk audit.
- **Header ketat** (`next.config.ts`): HSTS 2 tahun, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/payment/usb), `COOP/CORP: same-origin`, `Cache-Control: no-store` untuk `/admin` & `/api`, `poweredByHeader: false`.
- **CSP v2**: `default-src 'self'`; `script-src` tanpa `unsafe-eval`; `worker-src blob:` untuk Clerk; `img-src https: data: blob:`; `object-src 'none'`.
- **Validasi**: Zod `safeUrlSchema` + **max-length** (headline 200, bio 5000, slug 100) + **slug regex** `^[a-z0-9]+(-[a-z0-9]+)*$`; SVG blacklist, magic-bytes, ekstensi dari MIME, random filename, `bodySizeLimit 25MB`.
- **Rate limiting**: `POST /api/indexnow` **admin-only** + 5 req/60s/IP, max 100 URLs, payload 10KB, host allowlist; `GET` 405.
- **Error sanitasi**: allowlist pesan aman + `slice(0,500)` + masking internal di `sanitizeError()`; `safeJsonLd()` escape `</script>`.
- **Privasi**: translate opt-in per field, `ENABLE_EXTERNAL_TRANSLATE=false` mematikan egress sepenuhnya. Sigit_Bot cloud opt-in (`AI_PROVIDER` default `off`); prompt hanya katalog publik tanpa PII/secret.
- **Rahasia Cloud AI**: API key Gemini/OpenAI hanya disimpan server-side (tabel `settings` / env), tidak pernah dikirim ke klien; `src/lib/settings.ts` mem-mask nilai saat mengembalikan ke UI admin.

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

## Pengujian

```bash
npm run test            # unit test Vitest
npm run test:e2e        # E2E Playwright area publik
npm run test:e2e:godmode # E2E God Mode (dev server tanpa DATABASE_URL → fallback file lokal)
npx tsc --noEmit        # typecheck
npm run lint            # ESLint (flat config)
```

Unit test Vitest mencakup 14 file / 113 test: AI engine (TF-IDF), provider & config Cloud AI, daftar model, validasi env, IndexNow, helper slug produk, logika publish/schedule, validasi storage (magic bytes), stok keranjang, builder pesan WhatsApp, unsaved-changes guard, dan config app SigitOS (`settings.os_apps`). E2E `test:e2e:godmode` memverifikasi utas penuh config → props → DOM. CI (`.github/workflows/ci.yml`) menjalankan **lint + typecheck + unit test + build** otomatis di setiap PR ke `main` — jadikan *required status check* sebelum merge.

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

Pastikan `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, Clerk production keys, `ADMIN_CLERK_ID`, dan Formspree sudah benar. Terapkan seluruh migration database (`drizzle/0000`–`0009`, termasuk `0003_product_slugs`, `0004_audit_logs`, `0005_publish_at`, `0006_shop`, `0007_purchase_fields`, `0008_settings`, dan `0009_narrow_magneto` yang menambah `availability_badge` + `availability_badge_en` ke `profiles`). Jangan commit `.env`, credential, atau token.

## Verifikasi Setelah Deploy

Uji `/`, `/proyek`, `/proyek/[slug]`, `/artikel`, `/artikel/[slug]`, `/toko/[slug]`, `/feed.xml`, `/llms.txt`, `/sitemap.xml`, `/robots.txt`, dan `/admin`. Lanjutkan dengan uji login admin, CRUD setiap section, upload gambar, form kontak, pembaruan slug produk, keranjang + checkout WhatsApp, dan konfigurasi Cloud AI di `/admin/system`.

## Pemecahan Masalah Google Search Console

Jika GSC melaporkan **"Redirect error"**, **"Excluded by 'noindex' tag"**, atau **"Discovered/Crawled - currently not indexed"**, periksa berikut (urutan = kemungkinan penyebab):

1. **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` masih `pk_test_`** — *penyebab paling umum*. Key test memakai domain `*.clerk.accounts.dev`; pengunjung tanpa cookie dev-browser (termasuk **Googlebot**) diredirect ke handshake Clerk (`/v1/client/handshake?redirect_url=...`) untuk **setiap** rute, termasuk `/robots.txt` dan `/sitemap.xml`. Google membaca ini sebagai redirect error → halaman tidak terindeks. Cek di `/admin/system` (validasi env akan menandai ini sebagai **error**), lalu ganti ke `pk_live_` + `CLERK_SECRET_KEY` live dan redeploy.
2. **URL dengan trailing slash** — Next.js merespons `/proyek/` dengan **308 redirect** ke `/proyek`. Pastikan tidak ada tautan internal atau sitemap yang memakai trailing slash (sitemap di repo ini sudah tanpa trailing slash).
3. **"Excluded by 'noindex'"** — wajar untuk `/admin/*`, `/sign-in`, `/sign-up` (sengaja `robots: { index: false }`). Jika muncul di rute publik, cek `<meta name="robots">` di HTML — semua rute publik memancarkan `index, follow`.
4. **"Discovered/Crawled - currently not indexed"** — halaman baru butuh waktu (hari–minggu). Pastikan `lastmod` di `sitemap.xml` segar dan URL ter-submit. Rute publik dipancarkan statis (`revalidate: 60`), jadi ini masalah waktu, bukan blokir.
5. **Canonical** — `?lang=id` / `?lang=en` sengaja **canonical ke URL tanpa query** (bukan duplikat); hreflang `id-ID`/`en`/`x-default` memandu Google memilih varian. Jangan submit `?lang=` sebagai URL terpisah.

Cepat verifikasi dari terminal (harus `200`, bukan `3xx`):

```bash
curl -sI -o /dev/null -w "%{http_code}\n" https://sigitadi.id/robots.txt
curl -sI -o /dev/null -w "%{http_code}\n" https://sigitadi.id/sitemap.xml
curl -sI -o /dev/null -w "%{http_code}\n" https://sigitadi.id/proyek
```

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
- Produk adalah katalog + **checkout WhatsApp** (keranjang ringan di `localStorage`, pesan dirakit oleh `src/lib/whatsapp-order.ts`). Tidak ada payment gateway — pembayaran tetap manual di luar aplikasi.
- Admin adalah single-owner CMS, bukan sistem multi-user publik.
- **God Mode** adalah upaya bertahap memindahkan konfigurasi hardcode ke tabel `settings` agar bisa diatur dari admin tanpa redeploy. Fase 1 (app SigitOS: aktif + urutan, `/admin/appearance`) sudah jalan. Fase 2 (editor teks UI, overlay di atas default i18n), Fase 3 (feature flag global), dan Fase 4 (draft/preview + undo) menyusul — tiap fase satu PR terpisah. Prinsip: lapisan DB adalah *overlay*, bukan pengganti — DB kosong/korup harus tetap jatuh ke default di kode.
