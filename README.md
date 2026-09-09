# MyWebPorto

Website profil pribadi dan portofolio profesional elegan berbasis Next.js 15, dirancang untuk personal branding, etalase karya digital, layanan keahlian, katalog produk, dan testimoni klien dengan panel admin lengkap.

---

## 🚀 Fitur Utama

### 🌐 Halaman Publik
1. **Beranda Interaktif (`/`)**:
   - **Hero Section**: Foto profil, headline profesional, bio singkat, CTA "Lihat Proyek" & "Hubungi Saya".
   - **Layanan & Keahlian**: Daftar keahlian/jasa yang ditawarkan beserta tombol konsultasi langsung via WhatsApp/Email.
   - **Proyek Unggulan**: Showcase portofolio unggulan dengan gambar beresolusi tinggi, tag tech stack, dan link detail.
   - **Katalog Produk**: Etalase produk digital/fisik dengan label harga dan tombol tanya produk (tanpa checkout otomatis).
   - **Testimoni Klien**: Ulasan dan rekomendasi dari klien/mitra kerja.
   - **Kontak & Media Sosial**: Form/link komunikasi langsung dengan pemilik website.
2. **Daftar Proyek (`/proyek`)**:
   - Grid seluruh portofolio proyek yang dipublikasikan dengan badge teknologi dan link ke detail proyek.
3. **Detail Proyek (`/proyek/[slug]`)**:
   - Penjelasan komprehensif proyek, preview gambar, live demo link, repositori GitHub, dan CTA diskusi proyek serupa.
4. **SEO & Metadata Dinamis**:
   - Open Graph tags, Twitter Card, `sitemap.xml`, `robots.txt`, dan JSON-LD Schema.

### 🔐 Panel Admin Sederhana (`/admin`)
1. **Autentikasi Clerk**:
   - Proteksi rute admin via Clerk Middleware dan validasi `ADMIN_CLERK_ID`.
2. **Dashboard Ringkasan**:
   - Menampilkan total proyek, layanan, produk, dan testimoni.
3. **Manajemen Konten (CRUD)**:
   - **Kelola Profil (`/admin/profile`)**: Update nama, headline, bio, avatar, email, WhatsApp, lokasi, link CV, dan akun medsos.
   - **Kelola Proyek (`/admin/projects`)**: Tambah, edit, hapus, atur urutan, toggle featured & published status.
   - **Kelola Layanan (`/admin/services`)**: Tambah, edit, hapus, atur urutan dan published status.
   - **Kelola Produk (`/admin/products`)**: Tambah, edit, hapus produk, atur harga display dan gambar.
   - **Kelola Testimoni (`/admin/testimonials`)**: Tambah, edit, hapus testimoni klien beserta peran/organisasi.
4. **Unggah Gambar Bunny CDN / Storage**:
   - Upload gambar langsung dari form admin ke Bunny Storage dengan integrasi CDN cepat.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Database**: [Neon PostgreSQL](https://neon.tech/) Serverless
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Autentikasi**: [Clerk](https://clerk.com/)
- **CDN & Storage**: [Bunny CDN / Storage](https://bunny.net/)
- **Validasi**: [Zod](https://zod.dev/)
- **Notifikasi**: [Sonner](https://sonner.emilkowal.ski/)

---

## 📋 Struktur Folder

```
src/
├── app/
│   ├── (public)/          # Rute halaman publik (Beranda, /proyek, /proyek/[slug])
│   ├── admin/             # Panel admin terproteksi (/admin, /admin/projects, dll.)
│   ├── sign-in/           # Halaman login Clerk
│   ├── globals.css        # Konfigurasi Tailwind CSS
│   ├── layout.tsx         # Root layout dengan ClerkProvider & Sonner
│   ├── robots.ts          # Generator robots.txt
│   └── sitemap.ts         # Generator sitemap.xml
├── components/
│   ├── admin/             # Komponen panel admin (sidebar, header, uploader)
│   ├── public/            # Komponen halaman publik (hero, projects, services, footer, dll.)
│   └── ui/                # Komponen shadcn/ui (Button, Dialog, Card, Input, Table, dll.)
├── db/
│   ├── index.ts           # Koneksi Drizzle ORM ke Neon PostgreSQL
│   ├── schema.ts          # Definisi skema tabel database
│   └── seed.ts            # Script data awal (dummy seed)
└── lib/
    ├── actions.ts         # Server Actions untuk CRUD & pengambilan data
    ├── bunny-upload.ts    # Integrasi Bunny CDN Storage
    ├── dummy-data.ts      # Data fallback saat offline/tanpa DB
    ├── seo.ts             # Metadata dinamis & Open Graph
    ├── utils.ts           # Utility helper
    └── validations.ts     # Skema validasi Zod
```

---

## ⚙️ Persiapan & Instalasi

### 1. Klon Repositori & Install Dependensi
```bash
git clone https://github.com/username/karya-profil-ku.git
cd karya-profil-ku
npm install
```

### 2. Atur Environment Variables
Salin template konfigurasi:
```bash
cp .env.example .env.local
```

Isi variabel lingkungan berikut di `.env.local`:
```env
# URL Aplikasi
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/admin
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin

# ID Clerk User yang menjadi Admin / Pemilik website
ADMIN_CLERK_ID=user_2xxxxxxxxxxxxx

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Bunny CDN / Storage (Opsional, fallback otomatis aktif jika kosong)
BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
BUNNY_STORAGE_API_KEY=xxxx-xxxx-xxxx
BUNNY_CDN_HOSTNAME=namazone.b-cdn.net
```

### 3. Migrasi & Seed Database (Opsional)
Jika Anda sudah mengisi `DATABASE_URL`:
```bash
# Generate & migrate schema Drizzle
npm run db:push

# Isi data awal profil, proyek, layanan, produk, dan testimoni
npm run db:seed
```
*Catatan: Jika `DATABASE_URL` belum diisi, aplikasi akan tetap berfungsi normal dalam mode fallback menggunakan data awal yang elegan.*

### 4. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 📦 Build Produksi & Deployment

Verifikasi build aplikasi:
```bash
npm run build
```

Aplikasi siap dideploy ke [Vercel](https://vercel.com/) dengan menambahkan environment variables sesuai konfigurasi di atas.
