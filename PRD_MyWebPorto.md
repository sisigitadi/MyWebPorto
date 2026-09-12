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

- Checkout, keranjang belanja, invoice, dan payment gateway.
- Marketplace multi-penjual.
- Akun publik untuk pengunjung.
- Role-based access control kompleks.
- Komentar artikel.
- Newsletter.
- Upload media persisten ke object storage produksi.

## 3. Halaman dan Routing

### Area Publik

| Rute | Nama | Fungsi |
| --- | --- | --- |
| `/` | Beranda | Desktop interaktif berisi profil, layanan, proyek, produk, testimoni, artikel, dan kontak. |
| `/proyek` | Katalog Proyek | Menampilkan semua proyek yang `published = true`. |
| `/proyek/[slug]` | Detail Proyek | Menampilkan studi kasus proyek, tech stack, demo, repo, dan CTA. |
| `/toko/[slug]` | Detail Produk | Menampilkan detail produk digital, harga, metadata, dan CTA checkout/download. |
| `/artikel` | Katalog Artikel | Menampilkan semua artikel yang `published = true`. |
| `/artikel/[slug]` | Detail Artikel | Menampilkan artikel teknis lengkap, metadata, tag, dan profil penulis. |
| `/sign-in` | Login | Login pemilik melalui Clerk. |
| `/sign-up` | Sign Up | Halaman sign up Clerk bila dibutuhkan oleh konfigurasi auth. |

### Area Admin

| Rute | Nama | Fungsi |
| --- | --- | --- |
| `/admin` | Dashboard | Ringkasan jumlah konten dan status publikasi. |
| `/admin/profile` | Kelola Profil | Edit nama, headline, bio, avatar, kontak, skill, statistik, sosial media, CV, dan status available for hire. |
| `/admin/projects` | Kelola Proyek | Tambah, ubah, hapus, publish, featured, urutkan, dan kelola data proyek. |
| `/admin/articles` | Kelola Artikel | Tambah, ubah, hapus, publish, featured, tag, cover, dan konten artikel bilingual. |
| `/admin/services` | Kelola Layanan | Tambah, ubah, hapus, publish, dan urutkan layanan. |
| `/admin/products` | Kelola Produk | Tambah, ubah, hapus, publish, harga tampilan, gambar, dan CTA produk. |
| `/admin/testimonials` | Kelola Testimoni | Tambah, ubah, hapus, publish, rating, avatar, dan identitas klien. |

## 4. Fitur Utama

### 4.1 Beranda SigitOS

Beranda bukan landing page konvensional, melainkan desktop UI interaktif yang mengelola beberapa jendela konten. Komponen utama berada di `src/components/public/os`.

Kebutuhan:

- Menampilkan profil, kontak, layanan, proyek, produk, testimoni, dan artikel.
- Menyediakan terminal/CRT interaction sebagai elemen identitas.
- Menyediakan asisten AI Sigit_Bot yang berjalan dari mesin NLP/ML lokal (`src/lib/ai-engine.ts`).
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

- Produk berfungsi sebagai katalog, bukan checkout.
- Produk dapat memiliki `priceLabel` dan `ctaUrl`.
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

- Jika Clerk key belum tersedia atau masih placeholder, middleware mengizinkan akses admin untuk development.
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

- Upload disimpan ke `public/uploads`.
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
- `title`
- `titleEn`
- `description`
- `descriptionEn`
- `imageUrl`
- `priceLabel`
- `ctaUrl`
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
- `order`
- `createdAt`
- `updatedAt`

## 8. SEO dan Aksesibilitas

Kebutuhan SEO:

- Setiap halaman publik memiliki title dan description.
- Halaman katalog dan detail memiliki canonical URL.
- Open Graph dan Twitter Card tersedia.
- `sitemap.ts` dan `robots.ts` tersedia.
- JSON-LD digunakan untuk Person, CollectionPage, BlogPosting, BreadcrumbList, atau schema lain yang relevan.
- Slug proyek dan artikel harus ramah URL.
- Jika `NEXT_PUBLIC_APP_URL` kosong, canonical URL fallback ke `https://sigitadi.dev`.

Kebutuhan aksesibilitas:

- Konten penting tetap tersedia sebagai HTML server-rendered.
- Struktur heading harus logis.
- Link internal harus jelas.
- Gambar memakai alt text bermakna.
- UI interaktif tidak boleh menghilangkan akses ke konten utama.

## 9. Keamanan

Kebutuhan:

- Admin memakai Clerk.
- Rute `/admin/*` dilindungi middleware saat Clerk aktif.
- Server Actions memvalidasi admin sebelum mutasi data.
- Input divalidasi menggunakan Zod.
- URL gambar/link hanya menerima pola aman yang diizinkan.
- Secret harus berada di environment variables, bukan kode frontend.
- Konten user tidak boleh dirender sebagai HTML mentah kecuali benar-benar diperlukan dan sudah disanitasi.

Catatan:

- Project saat ini memakai `dangerouslySetInnerHTML` untuk menyuntik JSON-LD. Ini dapat diterima selama payload berasal dari object yang di-serialize, bukan HTML bebas dari user.

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

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/admin
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin

ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_CLERK_ID=user_xxxxxxxxxxxxxxxxx

DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require

NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id
NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL=x@sigitadi.id
```

## 13. Status Implementasi

Status saat dokumen ini direvisi:

- Setup Next.js, TypeScript, Tailwind, dan shadcn/ui: selesai.
- Public pages: selesai.
- SigitOS public interface: selesai.
- Admin layout dan dashboard: selesai.
- CRUD profil, proyek, layanan, produk, testimoni, artikel: selesai.
- **Manajemen tautan sosial dinamis** (13 platform, conditional display): selesai.
- **Editor chip** untuk tag artikel & tech stack proyek: selesai.
- **Terminal AI** (perintah baru, history, data-driven): selesai.
- **OG preview dinamis** per route/slug via `next/og`: selesai.
- Drizzle schema dan migrations: tersedia.
- Neon integration: tersedia jika `DATABASE_URL` diset.
- Local fallback store: tersedia.
- Clerk middleware: tersedia.
- Local image upload: tersedia.
- SEO metadata, sitemap, robots, JSON-LD: tersedia.
- AI engine lokal untuk terminal & Sigit_Bot: tersedia.
- Rute detail produk `/toko/[slug]` dan slug produk: selesai.
- Helper URL kontak (`contact-link.ts`) dan slug produk (`product-link.ts`): tersedia.

## 14. Rekomendasi Lanjutan

Prioritas teknis berikutnya:

- Migrasikan upload gambar produksi ke storage persisten.
- Tambahkan test untuk Server Actions dan validasi Zod.
- Tambahkan smoke test untuk rute publik utama.
- Audit lagi penggunaan `dangerouslySetInnerHTML` agar hanya dipakai untuk structured data.
- Rapikan strategi cache/revalidation antara halaman dynamic dan static.
- Pastikan deployment production tidak bergantung pada local file store.
