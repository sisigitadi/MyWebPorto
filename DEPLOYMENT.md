# PANDUAN DEPLOY KE HOSTING PRIBADI (COPY-PASTE READY)

Aplikasi ini telah dikonfigurasi dengan mode **Next.js Standalone**, artinya seluruh dependensi produksi dan server telah dibundel ke dalam ukuran yang sangat ringkas. Anda **tidak perlu menjalankan `npm install` atau build ulang di server hosting Anda**. Cukup copy-paste dan jalankan!

---

## Opsi 1: Deploy Direct Copy-Paste (cPanel / VPS / Server Node.js)

### Langkah 1: Buat Paket Siap Deploy di Komputer Lokal
Jalankan perintah ini di terminal proyek Anda:
```bash
npm run package
```
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
   BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
   BUNNY_STORAGE_API_KEY=xxxx
   BUNNY_CDN_HOSTNAME=namazone.b-cdn.net
   PORT=3000
   ```

### Langkah 3: Jalankan Aplikasi di Server (Tanpa Setup Tambahan)

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
