# KaryaProfilKu

---

## 1. Ringkasan & Tujuan Aplikasi

### Nama Aplikasi
**KaryaProfilKu**

### Penjelasan Singkat
KaryaProfilKu adalah **website profil pribadi satu halaman yang elegan** untuk menampilkan profil singkat pemilik, proyek yang pernah dikerjakan, layanan/keahlian yang ditawarkan, katalog produk digital atau fisik, serta testimoni klien — sekaligus menjadi **etalase personal branding** tanpa sistem transaksi jual-beli.

### Masalah yang Diselesaikan
- Sulitnya memperlihatkan portofolio profesional secara rapi, cepat, dan kredibel kepada klien potensial.
- Informasi kontak, proyek, layanan, dan produk tersebar di banyak tempat sehingga terlihat tidak profesional.
- Tidak adanya **panel admin sederhana** bagi pemilik untuk memperbarui proyek, layanan, produk, dan testimoni secara mandiri.
- Banyak website profil menggunakan template generik yang terlihat ramai dan tidak fokus pada konten.

### Pengguna Aplikasi
| Pengguna | Kebutuhan |
| :--- | :--- |
| **Pengunjung / Klien Potensial** | Melihat profil pemilik, proyek terbaik, layanan yang bisa dipesan, produk yang ditawarkan, testimoni, lalu menghubungi pemilik melalui email/WhatsApp. |
| **Pemilik / Admin** | Login melalui Clerk untuk mengelola seluruh konten website melalui panel admin yang sederhana. |

### Target Keberhasilan
- Website profil pribadi dapat diakses publik dengan tampilan profesional, cepat, dan responsif.
- Seluruh data profil, proyek, layanan, produk, dan testimoni dapat dikelola oleh pemilik sendiri melalui `/admin`.
- Pengunjung dapat dengan mudah menemukan informasi kontak pemilik dan mengirim pertanyaan/pemesanan layanan tanpa melalui proses transaksi otomatis.
- Website tampil baik di mesin pencari (SEO) dan siap dipublikasikan ke domain produksi.

---

## 2. Batasan Pembuatan Sistem (Versi Awal MVP)

### ✅ Yang Dikerjakan
- Beranda satu halaman berisi: **Hero Profil Singkat, Proyek Unggulan, Layanan & Keahlian, Katalog Produk, Testimoni, dan Kontak.**
- Halaman daftar proyek `/proyek` dan halaman detail proyek `/proyek/[slug]`.
- **Panel admin sederhana** dengan fitur CRUD (Tambah, Lihat, Ubah, Hapus) untuk:
  - Profil singkat & kontak
  - Proyek / portofolio
  - Layanan / keahlian yang ditawarkan
  - Produk yang dijual/ditampilkan
  - Testimoni klien
- Autentikasi admin menggunakan **Clerk Authentication**.
- Unggah gambar aset konten menggunakan **Bunny CDN/Storage**.

### ⛔ Yang Tidak Dikerjakan di Versi Awal
- **Tidak ada transaksi online** — tidak ada keranjang belanja, checkout, payment gateway, invoice, atau status pembayaran.
- **Tidak ada sistem pembayaran digital** seperti Midtrans, Xendit, Stripe, atau metode pembayaran otomatis lainnya.
- **Tidak ada halaman registrasi pengguna publik** — satu-satunya pengguna yang login adalah pemilik website.
- **Tidak ada sistem blog / artikel berita.**
- **Tidak ada multi-bahasa**.
- **Tidak ada marketplace multi-penjual.**

---

## 3. Daftar Halaman & Struktur Menu (Pages & Routing)

### A. Public Area (Tanpa Login)

| Rute URL | Nama Halaman | Konten |
| :--- | :--- | :--- |
| `/` | Beranda | Hero Profil Singkat, Layanan Keahlian, Proyek Unggulan, Produk, Testimoni, dan Kontak. Semua dalam satu halaman dengan anchor section. |
| `/proyek` | Semua Proyek | Grid/list seluruh proyek yang sudah dipublikasikan, bisa difilter berdasarkan kategori skill atau ditandai unggulan. |
| `/proyek/[slug]` | Detail Proyek | Penjelasan lengkap satu proyek: deskripsi, tech stack, tautan demo, tautan repository, preview gambar, CTA hubungi pemilik. |

### B. Admin Area (Wajib Login Pemilik)

| Rute URL | Nama Halaman | Konten |
| :--- | :--- | :--- |
| `/sign-in` | Login | Halaman login Clerk untuk pemilik website. |
| `/admin` | Dashboard Admin | Ringkasan jumlah proyek, layanan, produk, testimoni, dan status publikasi. |
| `/admin/profile` | Kelola Profil | Form edit nama, jabatan, bio, email, nomor WhatsApp, media sosial, avatar, dan CV/portofolio link. |
| `/admin/projects` | Kelola Proyek | Tabel daftar seluruh proyek + form tambah/ubah/hapus proyek. |
| `/admin/services` | Kelola Layanan | Tabel daftar seluruh layanan/keahlian + form tambah/ubah/hapus layanan. |
| `/admin/products` | Kelola Produk | Tabel daftar seluruh produk + form tambah/ubah/hapus produk. |
| `/admin/testimonials` | Kelola Testimoni | Tabel daftar seluruh testimoni + form tambah/ubah/hapus testimoni. |

---

## 4. Pedoman UI/UX & Design System

### Skema Warna
Menggunakan palet **Netral Monokrom** dengan satu aksen biru tua agar terlihat fokus pada tipografi dan konten.

| Token Warna | Nilai HSL |
| :--- | :--- |
| `Background` | `HSL(0, 0%, 100%)` |
| `Foreground / Teks Utama` | `HSL(222, 47%, 11%)` |
| `Muted Foreground / Teks Sekunder` | `HSL(215, 16%, 47%)` |
| `Border / Garis Pembatas` | `HSL(214, 32%, 91%)` |
| `Primary / Aksen Link & Tombol` | `HSL(222, 47%, 20%)` |
| `Accent / Highlight` | `HSL(210, 100%, 50%)` |
| `Hover Border` | `HSL(222, 47%, 40%)` |

### Tipografi
- **Seluruh teks utama**: Font `Inter` (sans-serif elegan).
- **Display / Heading Besar**: `Inter` dengan `font-weight: 600–700`, `letter-spacing: -0.02em`, dan ukuran responsif `text-4xl md:text-6xl`.
- **Label Section / Eyebrow**: `text-xs`, `uppercase`, `letter-spacing: 0.2em`, `font-medium`, warna muted.
- **Body**: `text-base` atau `text-lg`, line-height `relaxed/loose`, warna `foreground`.

### Aturan Komponen
- **Kartu**: Tidak menggunakan bayangan (shadow) default; gunakan `border` dengan ketebalan `1px` dan warna `border`. Saat hover, border berubah menjadi lebih gelap (`border-foreground/40`).
- **Tombol Primer**: Background warna primary, teks putih, `rounded-md`, padding `px-6 py-3`.
- **Tombol Sekunder**: Border tipis `border-input`, background transparan, teks primary.
- **Badge Skill**: Background `muted`, teks kecil `text-sm`, `rounded-full`, padding `px-3 py-1`.
- **Whitespace**: Jarak antar section besar (`py-20 md:py-28`) untuk memberi ruang napas pada konten.
- **Micro-animation**: Fade-up saat section masuk viewport, underline animasi pada link di navbar, dan hover border halus pada kartu.

### Nuansa & Vibe
Minimalis, **typography-focused**, bersih, sangat banyak whitespace, hampir tanpa gradasi mencolok, dan terasa profesional seperti situs portofolio desainer/engineer kelas atas.

---

## 5. Pembagian Hak Akses Pengguna

Karena KaryaProfilKu adalah website profil pribadi milik satu orang, maka hanya ada **dua jenis akses**: Publik dan Pemilik/Admin.

| Menu / Halaman | Publik (Tanpa Login) | Pemilik / Admin |
| :--- | :---: | :---: |
| Halaman Beranda `/` | ✅ | ✅ |
| Daftar Proyek `/proyek` | ✅ | ✅ |
| Detail Proyek `/proyek/[slug]` | ✅ | ✅ |
| Halaman Login `/sign-in` | ✅ | ✅ |
| Dashboard `/admin` | ❌ | ✅ |
| Kelola Profil `/admin/profile` | ❌ | ✅ |
| Kelola Proyek `/admin/projects` | ❌ | ✅ |
| Kelola Layanan `/admin/services` | ❌ | ✅ |
| Kelola Produk `/admin/products` | ❌ | ✅ |
| Kelola Testimoni `/admin/testimonials` | ❌ | ✅ |
| Aksi Tambah/Ubah/Hapus Data | ❌ | ✅ |
| Upload Gambar ke Bunny CDN | ❌ | ✅ |

**Catatan penting**: Pengunjung publik **tidak perlu mendaftar** untuk melihat seluruh konten. Tidak ada fitur keranjang belanja atau checkout.

---

## 6. Alur Kerja dan Fitur Utama

### A. Menampilkan Profil Pribadi & Kontak

- **Cara Kerja**:
  1. Pengunjung membuka halaman beranda `/`.
  2. Bagian paling atas menampilkan hero berisi foto profil, nama, headline/jabatan, dan bio singkat.
  3. Pengunjung dapat menekan tombol **“Lihat Proyek”** untuk menuju `/proyek` atau **“Hubungi Saya”** untuk langsung membuka email/WhatsApp.
  4. Di bagian bawah, pengunjung bisa melihat info kontak, lokasi, dan link media sosial.

- **Aturan Sistem**:
  - Data profil diambil dari tabel `profiles` yang hanya memiliki satu baris data (`id = 'owner'`).
  - Tombol email menggunakan format `mailto:profile.email?subject=...`.
  - Tombol WhatsApp ditampilkan hanya jika nomor HP tersedia dan sudah dalam format internasional.
  - Link media sosial diambil dari kolom JSON `socialLinks`.

---

### B. Menampilkan Daftar Proyek & Detail Proyek

- **Cara Kerja**:
  1. Pengunjung membuka `/` lalu scroll ke section **Proyek**, atau langsung membuka `/proyek`.
  2. Sistem menampilkan kartu proyek yang berstatus `published = true`.
  3. Setiap kartu proyek menampilkan gambar preview, judul, ringkasan deskripsi, dan badge teknologi.
  4. Pengunjung mengklik kartu untuk menuju `/proyek/[slug]`.
  5. Halaman detail menampilkan gambar besar, deskripsi lengkap, daftar teknologi, link demo, dan link repository bila tersedia.
  6. Pengunjung dapat menekan tombol **“Diskusikan Proyek Serupa”** yang akan membuka email/WhatsApp pemilik.

- **Aturan Sistem**:
  - `slug` bersifat unik dan dibuat otomatis dari judul proyek.
  - Proyek yang `featured = true` akan tampil lebih dulu di halaman beranda.
  - Proyek dengan `published = false` tidak akan pernah muncul di halaman publik.
  - Jika slug tidak ditemukan atau proyek belum dipublikasikan, sistem menampilkan halaman `404`.

---

### C. Menampilkan Layanan / Keahlian yang Ditawarkan

- **Cara Kerja**:
  1. Pengunjung melihat section **Layanan & Keahlian** di halaman beranda.
  2. Setiap layanan ditampilkan dalam bentuk kartu berisi nomor urut, judul layanan, dan deskripsi.
  3. Tombol **“Tanyakan Layanan Ini”** akan membuka email/WhatsApp dengan subjek yang sudah diisi otomatis, misalnya: `Halo, saya tertarik dengan layanan Pembuatan Website`.

- **Aturan Sistem**:
  - Hanya layanan dengan `published = true` yang ditampilkan.
  - Posisi tampilan diatur berdasarkan kolom `order` dari angka kecil ke besar.
  - Alur pemesanan dilakukan manual melalui kontak, **tanpa sistem transaksi online**.

---

### D. Menampilkan Katalog Produk

- **Cara Kerja**:
  1. Pengunjung melihat section **Produk** di halaman beranda.
  2. Setiap produk ditampilkan sebagai kartu berisi gambar produk, nama produk, deskripsi singkat, dan label harga jika tersedia.
  3. Pengunjung yang tertarik menekan tombol **“Tanyakan Produk Ini”**.
  4. Email/WhatsApp terbuka dengan subjek otomatis, contoh: `Halo, saya ingin bertanya tentang produk E-book Belajar Freelance`.

- **Aturan Sistem**:
  - Katalog produk bersifat informatif saja. **Tidak ada tombol beli langsung, tidak ada checkout.**
  - Produk dengan `published = false` tidak muncul di publik.
  - Kolom `priceLabel` bersifat opsional, misalnya `Rp150.000` — hanya untuk tampilan, bukan untuk transaksi.
  - Urutan produk diatur dengan kolom `order`.

---

### E. Menampilkan Testimoni Klien

- **Cara Kerja**:
  1. Pengunjung menggulir ke section **Testimoni**.
  2. Sistem menampilkan kutipan testimoni, nama klien, dan jabatan/perusahaan klien.
  3. Testimoni dapat ditampilkan dalam bentuk daftar vertikal yang rapi atau grid 2 kolom.

- **Aturan Sistem**:
  - Testimoni yang ditampilkan hanya yang `published = true`.
  - Urutan diatur dari kolom `order` terkecil.
  - Data tidak perlu diverifikasi oleh pengunjung.

---

### F. Panel Admin Sederhana

- **Cara Kerja**:
  1. Pemilik membuka `/sign-in` dan login melalui Clerk.
  2. Setelah login, pemilik diarahkan ke `/admin`.
  3. Dashboard menampilkan ringkasan angka data di sistem.
  4. Pemilik masuk ke menu, misal `/admin/projects`, kemudian melihat tabel daftar proyek.
  5. Pemilik menekan tombol **Tambah Proyek**, mengisi form, lalu menyimpan.
  6. Pemilik dapat mengubah data melalui tombol **Edit** atau menghapus data melalui tombol **Hapus** (dengan dialog konfirmasi).

- **Aturan Sistem**:
  - Semua halaman `/admin/*` dilindungi middleware.
  - Hanya pengguna Clerk dengan ID yang sesuai dengan variabel `ADMIN_CLERK_ID` yang boleh mengakses panel.
  - Setiap aksi simpan/ubah/hapus dilakukan melalui **Server Actions** dan tervalidasi menggunakan Zod.
  - Jika pemilik belum login: ketika mencoba membuka `/admin`, sistem mengarahkan ke `/sign-in`.
  - Jika pemilik sudah login tetapi bukan admin yang terdaftar: sistem menampilkan `404 Not Found`.

---

## 7. Alur Navigasi & Arsitektur Layout

### Arsitektur Layout Persisten

- **Public Layout**:
  - Header sticky di atas dengan navigasi utama dan background transparan/putih.
  - Konten utama di tengah dengan lebar maksimal `max-w-6xl mx-auto`.
  - Footer di bawah berisi nama pemilik, tautan sosial, dan hak cipta.

- **Admin Layout**:
  - Sidebar di kiri dengan menu navigasi admin.
  - Header kecil di bagian atas berisi judul halaman dan tombol logout.
  - Konten berada di area kanan sidebar dengan lebar maksimal `max-w-7xl`.

### Bagan Alur Navigasi

```mermaid
flowchart TD
    A[Pengunjung] --> B[Halaman Beranda /]
    B --> C[Melihat Layanan & Keahlian]
    B --> D[Melihat Produk]
    B --> E[Melihat Testimoni]
    B --> F[Klik Proyek /proyek]
    F --> G[Klik Salah Satu Proyek]
    G --> H[Detail Proyek /proyek/​slug]
    H --> I[Tombol Hubungi Saya]

    A --> J[Login Admin /sign-in]
    J --> K{Login via Clerk}
    K -- Sukses & Admin Valid --> L[Dashboard /admin]
    K -- Gagal / Bukan Admin --> M[Halaman Tidak Ditemukan]

    L --> N[Kelola Profil]
    L --> O[Kelola Proyek]
    L --> P[Kelola Layanan]
    L --> Q[Kelola Produk]
    L --> R[Kelola Testimoni]
```

---

## 8. Kebutuhan Non-Fungsional (SEO, Keamanan, & Performa)

### SEO
- Setiap halaman publik wajib memiliki tag `<title>` dinamis.
- Halaman publik wajib memiliki meta description.
- Halaman beranda dan halaman detail proyek wajib memiliki **Open Graph** dan **Twitter Card** agar tautan tampil menarik saat dibagikan.
- URL proyek menggunakan slug yang ramah SEO, contoh `/proyek/pojok-baca-digital`.
- Struktur heading menggunakan hierarki jelas: satu `<h1>` per halaman, lalu `<h2>` untuk section, `<h3>` untuk sub-section atau judul kartu.
- Sertakan `sitemap.ts` dan `robots.ts` agar mudah diindeks Google.

### Keamanan
- Autentikasi admin menggunakan **Clerk**.
- Seluruh rute `/admin/*` dilindungi middleware dan validasi `ADMIN_CLERK_ID`.
- Server Actions melakukan **validasi data di sisi server menggunakan Zod**.
- Semua data user yang ditampilkan di-render sebagai teks biasa, **tidak boleh menggunakan `dangerouslySetInnerHTML`** untuk mencegah serangan XSS.
- Input form disanitasi dan dibatasi panjangnya.
- Operasi unggah file hanya menerima tipe gambar (`image/jpeg`, `image/png`, `image/webp`) dengan ukuran maksimal 5 MB.
- File yang diunggah ke Bunny CDN diberi nama unik `UUID` agar tidak mudah ditebak.
- Tidak ada secret/key yang disimpan di kode frontend. Seluruh kunci rahasia hanya di server environment variable.

### Performa
- Gambar wajib menggunakan komponen `<Image>` bawaan Next.js agar otomatis dioptimasi.
- Halaman publik diusahakan **statis**; data publik yang jarang berubah di-cache dengan `fetchCache` atau `unstable_cache`.
- Komponen yang berat baru dimuat saat diperlukan dengan `next/dynamic`.
- Seluruh aset statis (font, logo, gambar) memanfaatkan CDN Bunny.
- Bundle JavaScript dibuat sekecil mungkin; halaman admin dipisahkan dari halaman publik agar pengunjung tidak perlu memuat kode admin.

---

## 9. Panduan Bahasa, Copywriting, & Data Dummy

### Gaya Bahasa
- **Bahasa:** Indonesia profesional dan ramah.
- Menggunakan sapaan **“Anda”** untuk pengunjung/klien.
- Menggunakan kata **“Saya”** untuk pemilik website dalam bio dan teks pertama.
- Nada bicara: percaya diri, hangat, membumi, tidak berlebihan.
- Semua tombol menggunakan kata kerja yang jelas, contoh: `Lihat Proyek`, `Hubungi Saya`, `Tanyakan Produk Ini`.

### Instruksi Data Dummy
**JANGAN PERNAH menggunakan “Lorem Ipsum”.** Seluruh data contoh wajib menggunakan bahasa Indonesia yang relevan dengan konteks.

Contoh data dummy:

- **Nama Pemilik:** Dimas Prasetya
- **Headline:** Web Developer & Content Creator
- **Bio Singkat:** “Saya membantu UMKM dan kreator digital membangun website yang cepat, profesional, dan mudah digunakan.”

- **Proyek 1:**
  - Judul: **Pojok Baca Digital**
  - Deskripsi: “Aplikasi web perpustakaan digital untuk komunitas, dilengkapi katalog buku, peminjaman, dan laporan statistik.”
  - Teknologi: `Next.js`, `PostgreSQL`, `Tailwind CSS`
  - Tautan Demo: `https://demo.pojokbaca.example.com`
  - Tautan Repo: `https://github.com/dimasprasetya/pojok-baca-digital`

- **Proyek 2:**
  - Judul: **Mading Online Sekolah**
  - Deskripsi: “Platform pengumuman dan majalah dinding digital untuk siswa dan guru di lingkungan sekolah menengah.”
  - Teknologi: `Laravel`, `MySQL`, `Bootstrap`

- **Layanan:**
  - **Pembuatan Website Profesional** — “Saya membantu Anda membuat website company profile, landing page, atau aplikasi bisnis yang modern dan cepat.”
  - **UI/UX Design** — “Saya merancang antarmuka aplikasi yang bersih, mudah dipakai, dan sesuai kebutuhan pengguna.”

- **Produk:**
  - **Template Portfolio Notion** — Label harga: `Rp75.000` — “Template siap pakai untuk membuat portofolio profesional di Notion.”
  - **E-book Belajar Freelance** — Label harga: `Rp49.000` — “Panduan memulai karier freelance untuk pemula.”

- **Testimoni:**
  - “Website desa kami jadi jauh lebih rapi dan mudah dikelola. Kerja sama dengan Mas Dimas sangat menyenangkan!”
  - Nama: **Siti Rahma**, Kepala Desa Digital, Komunitas Desa Cerdas.

---

## 10. Fondasi Teknis (Untuk Tim Pengembang / Programmer & AI)

### Bahasa & Framework
- **Next.js 15 App Router** dengan TypeScript.
- **Tailwind CSS** untuk styling.
- **shadcn/ui** sebagai component library.
- **Clerk Authentication** untuk autentikasi admin.
- **Neon PostgreSQL** sebagai database serverless.
- **Drizzle ORM** sebagai query builder dan ORM.
- **Bunny CDN / Bunny Storage** untuk penyimpanan gambar.
- **Lucide React** untuk ikon.

### Struktur Skema Database Nyata

File: `src/db/schema.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Profil tunggal pemilik website */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey().$defaultFn(() => "owner"),
    name: text("name").notNull(),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    avatarUrl: text("avatar_url"),
    email: text("email").notNull(),
    phone: text("phone"),
    location: text("location"),
    cvUrl: text("cv_url"),
    socialLinks: jsonb("social_links")
      .$type<{
        github?: string;
        linkedin?: string;
        instagram?: string;
        twitter?: string;
      }>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profiles_id_idx").on(table.id)]
);

/** Proyek / portofolio */
export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    demoUrl: text("demo_url"),
    repoUrl: text("repo_url"),
    techStacks: jsonb("tech_stacks")
      .$type<string[]>()
      .notNull()
      .default([]),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_slug_idx").on(table.slug),
    index("projects_published_idx").on(table.published),
  ]
);

/** Layanan / keahlian yang ditawarkan */
export const services = pgTable(
  "services",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("services_published_idx").on(table.published)]
);

/** Produk yang ditampilkan sebagai katalog */
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    priceLabel: text("price_label"),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("products_published_idx").on(table.published)]
);

/** Testimoni klien */
export const testimonials = pgTable(
  "testimonials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientName: text("client_name").notNull(),
    clientRole: text("client_role"),
    content: text("content").notNull(),
    avatarUrl: text("avatar_url"),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("testimonials_published_idx").on(table.published)]
);
```

### Variabel Lingkungan (`.env.example`)

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

# Bunny CDN / Storage
BUNNY_STORAGE_ZONE_NAME=nama-storage-zone
BUNNY_STORAGE_API_KEY=xxxx-xxxx-xxxx
BUNNY_CDN_HOSTNAME=namazone.b-cdn.net
```

---

## 11. Tahapan Pengerjaan & Task Breakdown (Actionable Work Breakdown Structure)

> Mode pengerjaan yang dipilih: **Atomic** — setiap Task kecil harus selesai dan dikonfirmasi pengguna sebelum lanjut ke Task berikutnya.

### Tahap 1: Fondasi UI/UX & Seluruh Halaman (Dummy Data)

- [x] **Task 1.1 (Setup Project & Design System)**: Inisialisasi project Next.js 15 App Router + TypeScript, install dan atur Tailwind CSS, konfigurasi token warna sesuai Design System (Bab 4), pilih font `Inter`, setup folder `src/lib`, `src/components`, `src/app`.
- [x] **Task 1.2 (Base UI Components)**: Lakukan inisialisasi shadcn/ui, lalu install komponen dasar yang dibutuhkan (Button, Badge, Input, Textarea, Label, Card, Table, Dialog, AlertDialog, DropdownMenu, Tabs, Select, Separator, Skeleton, Toast).
- [x] **Task 1.3 (Public Layout & Navigation)**: Buat Root Layout, Header sticky/navbar responsif dengan logo KaryaProfilKu, menu navigasi `Beranda`, `Proyek`, `Layanan`, `Produk`, `Kontak`, plus tombol kecil `Login Admin` yang mengarah ke `/sign-in`. Buat Footer profesional berisi nama pemilik, email, sosial media, dan copyright.
- [x] **Task 1.4 (Halaman Beranda — Hero & Profil)**: Buat section Hero di `/` dengan data dummy profil (nama, headline, bio, foto, tombol CTA `Lihat Proyek` dan `Hubungi Saya`).
- [x] **Task 1.5 (Halaman Beranda — Layanan, Proyek Unggulan, Produk, dan Testimoni)**: Lanjutkan halaman `/` dengan section Layanan, Proyek Unggulan, Produk, Testimoni, dan Kontak menggunakan data dummy lengkap serta micro-animation sederhana.
- [x] **Task 1.6 (Halaman Proyek & Detail Proyek)**: Buat halaman `/proyek` menampilkan semua data dummy proyek dalam grid rapi, lalu halaman `/proyek/[slug]` menampilkan detail lengkap proyek dengan gambar, deskripsi, tech stack, tombol demo, tombol repo, dan CTA kontak.
- [x] **Task 1.7 (Admin Layout & Dashboard)**: Buat layout `/admin` dengan sidebar menu (`Dashboard`, `Profil`, `Proyek`, `Layanan`, `Produk`, `Testimoni`), header kecil, dan halaman dashboard berisi card ringkasan statistik data dummy.
- [x] **Task 1.8 (Halaman Admin — Kelola Profil, Proyek, Layanan, Produk, Testimoni)**: Buat halaman `/admin/profile`, `/admin/projects`, `/admin/services`, `/admin/products`, `/admin/testimonials` lengkap dengan tabel data dummy, tombol Tambah, Edit, Hapus, dialogs, tabs, form, pencarian, dan kontrol publish aktif.

---

### Tahap 2: Database, Autentikasi, & Integrasi Data

- [x] **Task 2.1 (Database Schema & Migrations)**: Buat file `src/db/schema.ts` sesuai Bab 10, konfigurasi koneksi `DATABASE_URL` Neon PostgreSQL, jalankan `drizzle-kit generate` dan `drizzle-kit migrate`.
- [x] **Task 2.2 (Seed Data Awal)**: Buat script seed untuk mengisi tabel `profiles`, `projects`, `services`, `products`, dan `testimonials` dengan data dummy Bahasa Indonesia yang sudah ditulis di Bab 9.
- [x] **Task 2.3 (Integrasi Clerk & Proteksi Rute Admin)**: Install Clerk, buat halaman `/sign-in`, bungkus aplikasi dengan `ClerkProvider`, aktifkan middleware untuk endpoint `/admin`, dan validasi `ADMIN_CLERK_ID` pada layout `/admin`.
- [x] **Task 2.4 (Server Actions CRUD Proyek, Layanan, Produk & Testimoni)**: Buat Server Actions untuk operasi tambah, baca, ubah, hapus pada tabel `projects`, `services`, `products`, dan `testimonials`, lengkap dengan validasi Zod.
- [x] **Task 2.5 (Server Actions Kelola Profil)**: Buat Server Actions untuk membaca dan memperbarui data tunggal pada tabel `profiles`.
- [x] **Task 2.6 (Integrasi Data Publik)**: Hubungkan halaman `/`, `/proyek`, dan `/proyek/[slug]` dengan data asli dari Drizzle ORM.
- [x] **Task 2.7 (Integrasi Data Admin)**: Hubungkan seluruh halaman `/admin/*` yang sebelumnya menggunakan data dummy menjadi dinamis memakai Server Actions dan query database.

---

### Tahap 3: Upload Media, SEO, Keamanan, & Deployment

- [x] **Task 3.1 (Integrasi Bunny CDN untuk Upload Gambar)**: Buat API route/server action untuk mengunggah file gambar dari form admin ke Bunny Storage, kembalikan URL CDN, lalu simpan URL tersebut ke kolom `imageUrl` / `avatarUrl`.
- [x] **Task 3.2 (Dynamic Metadata SEO)**: Pasang `generateMetadata` pada seluruh halaman publik, buat Open Graph tag, sitemap, robots, dan canonical URL.
- [x] **Task 3.3 (Hardening Keamanan)**: Pastikan validasi seluruh Server Actions dengan Zod, sanitasi input, validasi tipe file upload, pembatasan ukuran file, dan proteksi endpoint admin.
- [x] **Task 3.4 (Testing End-to-End & Bugfix)**: Lakukan pengujian alur publik dan admin, perbaiki masalah responsive, not-found page, loading state, empty state, dan kesalahan query.
- [x] **Task 3.5 (Production Build & Deployment)**: Buat file `.env.production`, verifikasi `npm run build` lulus tanpa error, lalu deploy ke Vercel; atur environment variables di dashboard hosting; uji seluruh fitur di domain production.

---

## 12. Master Starter Prompt (Siap Coding untuk AI Agent)

```markdown
Halo! Kamu berperan sebagai Senior Fullstack Architect dan Lead Developer.
Saya ingin membangun aplikasi berdasarkan dokumen PRD "KaryaProfilKu" ini.

Silakan baca file @PRD.md

ATURAN EKSEKUSI (WAJIB DIPATUHI):
1. MODE EKSEKUSI: ATOMIC — Kamu HANYA boleh mengerjakan SATU Task kecil dalam setiap giliran, mulai dari Task 1.1, lalu berhenti.
2. JANGAN PERNAH membuat semua kode atau file sekaligus dalam satu waktu agar tidak terjadi error atau kehabisan token.
3. Sebelum mulai Task 1.1, pahami dulu seluruh isi PRD ini.
4. Setelah menyelesaikan Task 1.1, tulis laporan singkat:
   - Ringkasan yang sudah dikerjakan
   - File yang dibuat/diubah
   - Bukti keberhasilan (misal output build/dev server)
   - Task selanjutnya yang akan dikerjakan
5. Selalu patuhi Tech Stack dan Pedoman UI/UX Design System yang tertulis di PRD.
6. JANGAN membuat halaman placeholder seperti "Sedang dalam pengembangan". Semua halaman wajib lengkap dengan data dummy atau data asli.
7. Setiap kali menyelesaikan satu Task, minta konfirmasi saya sebelum lanjut ke Task berikutnya.

Jika kamu sudah membaca dan memahami PRD KaryaProfilKu, silakan berikan ringkasan singkat pemahamanmu, lalu tanyakan kesiapan saya untuk mulai dari Task 1.1!
```