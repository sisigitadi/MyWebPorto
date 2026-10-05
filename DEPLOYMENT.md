# PANDUAN DEPLOY KE HOSTING PRIBADI (COPY-PASTE READY)

Aplikasi menggunakan mode **Next.js Standalone**. Build dilakukan di mesin lokal/CI, kemudian hasil `deploy_package/` dapat diunggah ke server. Jangan menyalin `.env.local` atau credential ke repository.

> Catatan: untuk deployment ke Vercel, cukup push ke branch `main` (auto-deploy Vercel). Panduan di bawah ini khusus untuk hosting pribadi (VPS/cPanel/PM2/Docker).

---

## Opsi 1: Deploy Direct Copy-Paste (cPanel / VPS / Server Node.js)

### Langkah 1: Buat Paket Siap Deploy di Komputer Lokal
Jalankan perintah ini di terminal proyek Anda:
```bash
npm run package
```

Sebelum packaging, jalankan `npm run lint` dan `npm run build`. Packaging akan membangun ulang aplikasi dan menyusun server standalone, aset statis, `public`, local store `data`, serta konfigurasi PM2.
Perintah ini akan secara otomatis:
1. Mem-build aplikasi Next.js ke mode `standalone`.
2. Menyusun folder `deploy_package/` lengkap dengan server, modul produksi yang diperlukan, file statis `.next/static`, folder `public`, template konfigurasi `.env`, dan PM2 `ecosystem.config.cjs`.

### Langkah 2: Copy-Paste ke Server Hosting Anda
1. Salin seluruh isi folder `deploy_package/` (atau kompres menjadi .zip terlebih dahulu lalu upload dan ekstrak) ke direktori web root server Anda (misalnya `/var/www/my-web-porto` di VPS atau `app/` di cPanel).
2. Buka file `.env` di folder tersebut dan sesuaikan nilainya:
   ```env
   NEXT_PUBLIC_APP_URL=https://domainanda.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx
   CLERK_SECRET_KEY=sk_live_xxxx
   CLERK_SIGN_IN_FORCE_REDIRECT_URL=/admin
   CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
   ADMIN_CLERK_ID=user_xxxx
   NEXT_PUBLIC_ADMIN_CLERK_ID=user_xxxx
   DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
   NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id
   NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id
   # SEO / SEM (opsional — token verifikasi BUKAN rahasia, sengaja dipublikasikan
   # di <meta> + file statis; key IndexNow wajib bisa diambil crawler)
   INDEXNOW_KEY=ganti-key-indexnow-anda
   NEXT_PUBLIC_GOOGLE_VERIFICATION=
   NEXT_PUBLIC_BING_VERIFICATION=
   # Cloud AI Sigit_Bot (opsional — default OFF, mesin lokal)
   AI_PROVIDER=off
   GEMINI_API_KEY=
   AI_MODEL=
   OPENAI_API_KEY=
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=
   PORT=3000
   ```

Catatan: upload gambar disimpan langsung ke Postgres (tabel `media`, bytea) via migrasi `drizzle/0010` — tidak perlu object storage/CDN terpisah, dan variabel `BUNNY_STORAGE_*` lama sudah tidak dipakai (aman dihapus dari Vercel). Variabel Cloud AI juga dapat diisi lewat form **Cloud AI** di `/admin/system` (disimpan di tabel `settings`) tanpa redeploy. Jika `NEXT_PUBLIC_APP_URL` kosong, canonical URL fallback ke `https://sigitadi.id`.

> **WAJIB di produksi: Clerk key live, bukan `pk_test_`.** PUBLISHABLE_KEY harus `pk_live_...` (bukan `pk_test_...`) dan SECRET_KEY `sk_live_...`. Lihat "Pemecahan Masalah Google Search Console" di README — `pk_test_` memakai domain `*.clerk.accounts.dev` yang me-redirect Googlebot ke handshake Clerk di **semua** rute (termasuk `/robots.txt`), terbaca sebagai "Redirect error" di GSC dan halaman tidak terindeks. Peringatan Vercel "Remove the public framework prefix" aman diabaikan untuk `pk_` (publishable by design); `sk_` wajib tetap server-only.

### Langkah 3: Konfigurasi Environment dan Database

Edit `deploy_package/.env` dengan `NEXT_PUBLIC_APP_URL`, Clerk production keys, `ADMIN_CLERK_ID`, `DATABASE_URL`, Formspree endpoint, dan `NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id`. Terapkan schema database sebelum menjalankan aplikasi memakai `npm run db:push`. **Jangan** memakai `npm run db:migrate` di produksi: database produksi tidak punya tabel `__drizzle_migrations`, jadi `migrate` akan mencoba menjalankan `drizzle/0000`–`0010` dari awal dan gagal dengan `relation already exists`. `db:push` membandingkan `src/db/schema.ts` dengan kondisi database lalu hanya menerapkan selisihnya, jadi aman dijalankan berulang kali. Yang perlu dipastikan sudah ter-apply: tabel `media` untuk gambar (bytea, `drizzle/0010`), `settings_history`, `availability_badge` (`drizzle/0009`), tabel `products` beserta kolom slug (`drizzle/0006`, `0003`), `publish_at` (`0005`), `audit_logs` (`0004`), dan `settings` (`0008`).

### Langkah 4: Jalankan Aplikasi di Server

#### A. Menggunakan PM2 (Rekomendasi Production):
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

#### B. Menggunakan Node.js Langsung:
```bash
node server.js
```

#### C. Menggunakan cPanel "Setup Node.js App":
- **Node.js version**: 20.x atau 22.x
- **Application mode**: Production
- **Application root**: folder tempat Anda meletakkan file
- **Application startup file**: `server.js`
- Simpan dan klik **Restart**.

---

## Opsi 2: Deploy Menggunakan Docker & Docker Compose (VPS)

Jika server Anda menggunakan Docker:

1. Salin folder proyek atau file berikut ke server:
   - `Dockerfile`
   - `docker-compose.yml`
   - `.env.production` (buat dan isi variabel env)
2. Jalankan perintah:
   ```bash
   docker compose up -d --build
   ```
3. Web Anda langsung aktif dan berjalan di port `3000`.

---

## Verifikasi Setelah Deploy

```bash
curl -I https://domainanda.com/
curl -I https://domainanda.com/sitemap.xml
curl -I https://domainanda.com/robots.txt
curl -I https://domainanda.com/toko/template-portfolio-notion
# SEO: file verifikasi IndexNow harus 200, path asing harus 404
curl -s -o /dev/null -w "%{http_code}\n" https://domainanda.com/INDEXNOW_KEY_Anda.txt
# SEO: meta verifikasi harus muncul di <head>
curl -s https://domainanda.com/ | grep -E "google-site-verification|msvalidate.01"
```

Uji browser untuk login admin, CRUD setiap section, upload gambar, form kontak, dan halaman slug artikel/proyek/produk.

Setelah deploy, konfigurasi SEO dari **`/admin/seo`** (tanpa redeploy): tempel token verifikasi Google Search Console & Bing Webmaster, rotasi key IndexNow, dan override Open Graph. Verifikasi kepemilikan domain di GSC/Bing bisa memakai metode tag `<meta>` (sudah otomatis terpasang) atau file `https://domainanda.com/{key}.txt` yang dilayani dinamis.

## Gate URL Gambar (Pra-Deploy)

Gambar kini disimpan di Postgres (`media.data`), bukan di `public/`. Karena
`public/uploads/` masuk `.gitignore`, referensi lama `/uploads/...` **hanya
resolve di mesin lokal** — di produksi semuanya 404 (avatar, cover artikel,
`og:image`). Di lokal semuanya selalu hijau, jadi jalankan gate ini sebelum
deploy:

```bash
npm run check:media
```

Exit code non-nol bila ada referensi gambar tersimpan yang tidak akan ada di
produksi:

- `/uploads/<file>` — file .gitignore, tidak ikut ter-deploy.
- `/api/media/<id>` dengan id yang tidak ada di tabel `media`.
- `/api/media/<bukan-uuid>` — route `GET /api/media/[id]` akan 404.
- URL `localhost`/IP privat, atau `http://` (harus `https://`).
- Path relatif lain yang tidak dilayani Next.js.

Cara memperbaiki: unggah ulang gambarnya lewat `/admin/media` (menyimpan ke
tabel `media`), lalu salin path `/api/media/<id>` ke kolom yang salah.
Panel **`/admin/system`** menampilkan hasil audit yang sama secara live.

Catatan: butuh `DATABASE_URL`. Tanpa itu blok live di-skip (CI memang
berjalan tanpa DB) — pastikan env prod sudah terisi sebelum menjalankan gate.

---
## Gate Produksi Otomatis (`check:prod`)

Gate di atas memeriksa **data di database**. Gate ini memeriksa **URL
nyatanya di server produksi**, karena keduanya bisa hijau bersamaan saat
route-nya belum ter-deploy. Contoh nyata 2026-10-05: `profiles.avatar_url
sudah menunjuk baris `media`, tapi route `GET /api/media/[id]` belum ikut
naik ke produksi sehingga avatar dan dua cover artikel membalas 404
selama berjam-jam — sementara `tsc`, `eslint`, `vitest`, dan `next build`
tetap hijau penuh, karena tidak ada satupun yang menyentuh URL produksi.

```bash
npm run check:prod
```

Exit code non-nol bila salah satu hal ini rusak:

- Endpoint inti (`/`, `/robots.txt`, `/sitemap.xml`, `/feed.xml`,
  `/llms.txt`, `/opengraph-image`, `/icon`) tidak 200 atau `content-type`
  tidak sesuai.
- Ada referensi `/api/media/<id>` di HTML homepage yang tidak membalas
  `200 image/*` — ini tepat menangkap kasus avatar 404.
- Masih ada referensi `/uploads/` di halaman publik.
- Slug tak dikenal di `/toko`, `/artikel`, `/proyek` membalas bukan 404.
- `og:image` artikel bukan URL absolut, atau tidak bisa diambil.
- Host alias (`www.`) tidak mengalihkan ke apex.

Override host bila perlu:

```bash
PROD_HEALTH_BASE_URL=https://preview.example.com npm run check:prod
```

### Menjalankan otomatis

Workflow **`.github/workflows/prod-health.yml`** menjalankan skrip yang
sama setiap 6 jam (dan bisa dijalankan manual dari tab Actions). Bila
gagal, workflow membuka issue berisi log supaya tidak diam saja. Job yang
gagal juga mengirim email ke pemilik repo, jadi email itu yang biasanya
lebih dulu memberi tahu.

> GitHub menunda jadwal (`schedule`) bila repo lama tidak aktif, jadi
> frekuensi sebenarnya bisa lebih jarang dari 6 jam. Jalankan manual dari
> tab Actions setelah deploy besar bila perlu kepastian segera.

---
## Minta Reindex: IndexNow (Bing) vs Google Search Console

Setelah konten atau gambar Artikel berubah, IndexNow di `/admin/seo`
menodong Bing, Yandex, Seznam, dan Naver. **Google tidak ada di sini.**

Google Search Console tidak punya API submit terbuka yang bisa dipakai
otomatis dari aplikasi ini: Google Publishing/Indexing API hanya berlaku
untuk halaman Job Posting/BroadcastEvent, dan API Search Console lain
membutuhkan OAuth service account yang diberi akses ke properti
tersebut. Proyek ini **tidak punya kredensial OAuth itu** (hanya ada
`INDEXNOW_KEY`, dan itu bukan rahasia). Jadi:

1. Ping IndexNow dari `/admin/seo` untuk Bing dan sekutunya.
2. Untuk Google, kirim ulang indeks secara manual lewat
   **Search Console → Inspeksi URL → Minta indeks** untuk URL yang berubah.

Menambahkannya jadi otomatis butuh dua hal yang belum ada: service
account Google yang punya akses ke properti `sigitadi.id`, lalu token OAuth
yang disimpan di `/admin/system`. Tanpa itu, jangan andalkan Google
menyusul cepat hanya karena IndexNow diklik.

---
## Keamanan Pra-Deploy (Hardening v2)

Pastikan sudah memenuhi checklist berikut sebelum produksi (lihat `SECURITY.md` §4):

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` pakai key **produksi** (bukan `pk_test_xxxx`).
- [ ] `ADMIN_CLERK_ID` diisi dengan Clerk user ID pemilik (bukan `user_xxxxxxxxxxxxxxxxx`).
- [ ] `DATABASE_URL` Neon prod (`sslmode=require`), sudah `npm run db:push`.
- [ ] `NEXT_PUBLIC_APP_URL` = domain prod (tanpa trailing slash, untuk canonical & OG).
- [ ] `INDEXNOW_KEY` ganti dari default `e5b871c...` dan jangan commit. Key maupun token verifikasi Google/Bing bisa diisi/rotasi dari **`/admin/seo`** (disimpan di tabel `settings`) tanpa redeploy; env di atas hanya fallback pra-admin.
- [ ] `ENABLE_EXTERNAL_TRANSLATE` sesuai kebijakan privasi (`false` jika egress dilarang).
- [ ] `npm run lint && npm run build` pass (0 error) + `npm audit --audit-level=high` cek.
- [ ] Header CSP tidak blokir UI: buka DevTools → Console, pastikan tidak ada CSP violations.
- [ ] Uji `GET /api/indexnow` → 405; `POST /api/indexnow` tanpa login → 401; non-admin → 403/404.
- [ ] Storage gambar: tabel `media` (bytea Postgres) sudah dibuat migrasi `drizzle/0010` — persisten di serverless, tidak perlu CDN terpisah.
- [ ] `npm run check:media` pass — audit URL gambar tersimpan (lihat "Gate URL Gambar" di atas). Menangkap referensi `/uploads/...` yang hanya ada di mesin lokal dan akan 404 di produksi.
- [ ] `npm run check:prod` pass — smoke test URL produksi (lihat "Gate Produksi Otomatis"). Jalankan **setelah** deploy, bukan sebelum: ia menguji server yang sedang berjalan.

Lihat detail lengkap di [SECURITY.md](./SECURITY.md).

## Rollback

Simpan paket deployment sebelumnya dengan nomor versi atau commit SHA. Jika release bermasalah, pulihkan paket sebelumnya, restart PM2, dan jangan menghapus `data/local-store.json` sebelum backup. Perubahan schema harus di-rollback atau disesuaikan secara terpisah dari rollback aplikasi.

## Reverse Proxy Nginx (Opsional jika menggunakan VPS)

```nginx
server {
    listen 80;
    server_name domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
