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
   BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
   BUNNY_STORAGE_API_KEY=xxxx
   BUNNY_CDN_HOSTNAME=namazone.b-cdn.net
   PORT=3000
   ```

Catatan: variabel `BUNNY_STORAGE_*` bersifat opsional dan belum terhubung ke kode. Upload gambar saat ini disimpan lokal ke `public/uploads`. Jika `NEXT_PUBLIC_APP_URL` kosong, canonical URL fallback ke `https://sigitadi.dev`.

### Langkah 3: Konfigurasi Environment dan Database

Edit `deploy_package/.env` dengan `NEXT_PUBLIC_APP_URL`, Clerk production keys, `ADMIN_CLERK_ID`, `DATABASE_URL`, Formspree endpoint, dan `NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id`. Terapkan schema/migration database sebelum menjalankan aplikasi, termasuk migration slug produk.

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
```

Uji browser untuk login admin, CRUD setiap section, upload gambar, form kontak, dan halaman slug artikel/proyek/produk.

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
