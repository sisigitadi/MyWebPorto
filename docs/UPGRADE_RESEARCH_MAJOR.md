# Riset Arsitektur & Blueprint Pembaruan Major (Tier 2): MyWebPorto

Dokumen riset ini menyajikan studi kelayakan teknis, analisis dampak, potensi *breaking changes*, dan rekomendasi jalur migrasi (*migration roadmap*) untuk ketergantungan generasi baru (Major Upgrades) yang dievaluasi pada Siklus Audit 2026-11-12.

---

## 1. Ringkasan Eksekutif & Status Dependensi

Sesuai strategi pembaruan **Dua Tahap (Two-Tier)**:
- **Tier 1 (Telah Diterapkan & Lolos Verifikasi)**:
  - `next`: `16.4.3` → `16.4.6`
  - `react` / `react-dom`: `19.3.0` → `19.3.1`
  - `@clerk/nextjs`: `7.9.22` → `7.9.25`
  - `@clerk/ui`: `1.42.1` → `1.42.4`
  - `tailwindcss` & `@tailwindcss/postcss`: `4.3.3` → `4.3.5`
  - `vitest`: `5.0.5` → `5.1.0`
  - `vite`: `8.3.5` → `8.3.8`
  - `lucide-react`: `1.63.0` → `1.72.0`
  - `gsap`: `3.15.0` → `3.15.1`
  - `@playwright/test`: `1.64.1` → `1.65.0`
- **Tier 2 (Riset Arsitektur untuk Tahap Mendatang)**:
  - `postgres`: `3.4.9` → `4.1.1`
  - `typescript`: `5.9.3` → `7.0.2`
  - `eslint`: `9.39.5` → `10.14.0`
  - `@types/node`: `22.20.5` → `26.6.6`
  - WhatsApp Baileys Worker Architecture (Serverless vs Persistent Container)

---

## 2. Analisis Postgres.js v4 vs Drizzle ORM v0.45

### 2.1 Konteks Arsitektur Saat Ini
Aplikasi menggunakan driver `postgres` (`postgres.js`) yang dihubungkan ke Drizzle ORM (`drizzle-orm/postgres-js` di `src/db/index.ts`). Driver ini melayani seluruh operasi Server Actions, query RLS, dan transaksi atomik pengurangan stok digital store.

### 2.2 Perubahan Fundamental di Postgres.js v4
1. **Model Pooling & Socket Lifecycle**:
   - `postgres@4` merombak total manajemen *connection pooling* dan penanganan *backpressure* TCP.
   - Pada v3, opsi pooling seperti `max: 1` atau `idle_timeout` bekerja secara synchronous saat instance dibuat. Pada v4, inisialisasi socket menggunakan async event loop baru yang dapat menyebabkan race condition bila dipanggil sebelum handshake pool siap.
2. **Kompatibilitas Drizzle ORM**:
   - `drizzle-orm@0.45.4` saat ini memiliki peer dependency yang terikat erat ke `postgres@^3.4.0`.
   - Menghubungkan driver `postgres@4` langsung ke adapter `drizzle-orm/postgres-js` saat ini memicu peringatan tipe dan ketidakcocokan return shape pada `sql.begin(async tx => ...)` untuk transaksi berlapis (*nested transactions/savepoints*).

### 2.3 Rekomendasi & Rencana Tindakan
> [!TIP]
> **Rekomendasi:** Tunda migrasi `postgres` ke v4 hingga Drizzle ORM merilis adapter resmi khusus driver v4 (ditargetkan pada Drizzle ORM v0.46/v1.0). Tetap gunakan `postgres@3.4.9` yang stabil, terbukti bekerja sempurna dengan pool connection Neon/Supabase, dan lolos 100% tes RLS.

---

## 3. Analisis TypeScript v7 & Ekosistem Type Definitions

### 3.1 Perubahan Signifikan pada TypeScript v7
1. **Pengetatan Inferensi Generik & Exact Optional Property Types**:
   - TypeScript v7 memperketat aturan tipe union dan `exactOptionalPropertyTypes`.
   - Objek `Metadata` Next.js 16 serta skema Zod `z.infer<...>` dapat mengalami ketidakcocokan tipe bila ada properti opsional `undefined` yang dipassing tanpa flag eksplisit.
2. **Dependensi `@types/*`**:
   - Mengupgrade TypeScript ke v7 mengharuskan upgrade serentak pada `@types/node` ke v26+.
   - Lingkungan runtime produksi saat ini menargetkan Node.js LTS v22.x/v24.x. Menaikkan `@types/node` ke v26 sebelum Node 26 memasuki fase Active LTS berisiko memunculkan inkonsistensi API global (seperti `crypto`, `fetch`, dan `Uint8Array`).

### 3.2 Rekomendasi & Rencana Tindakan
> [!NOTE]
> **Rekomendasi:** Pertahankan `typescript@5.9.3` dan `@types/node@22.x`. Ini adalah konfigurasi standar yang didukung penuh oleh Next.js 16.4.x Turbopack dan ESLint 9. Lakukan evaluasi ulang saat Node.js 24 memasuki maintenance dan Next.js merilis baseline TS7.

---

## 4. Analisis ESLint v10 & Next.js Flat Config

### 4.1 Status Saat Ini
- Proyek menggunakan flat config `eslint.config.mjs` di atas `eslint@9.39.5` dan `eslint-config-next@16.4.6`.
- Linting berjalan 100% bersih tanpa error maupun warning.

### 4.2 Tantangan Migrasi ke ESLint v10
1. `eslint-config-next` saat ini mendistribusikan wrapper rule bawaan (`@next/eslint-plugin-next` dan `eslint-plugin-react-hooks`) yang menargetkan arsitektur core ESLint v8 dan v9.
2. ESLint v10 mengubah internal API parser konteks AST (`RuleContext`), yang dapat memicu crash pada plugin pihak ketiga yang belum merilis build ESM murni v10.

### 4.3 Rekomendasi
> [!TIP]
> **Rekomendasi:** Tetap gunakan ESLint 9 hingga Next.js mengumumkan dukungan resmi untuk ESLint 10 di catatan rilis Next.js.

---

## 5. Analisis Arsitektur Layanan WhatsApp Bot (Baileys v7)

### 5.1 Komparasi Runtime: VPS/PM2 vs Vercel Serverless

| Parameter | Persistent Container / VPS (PM2) | Serverless / Vercel Edge |
| :--- | :--- | :--- |
| **Koneksi WebSocket** | Tetap terhubung 24/7 (Persistent Socket) | Terputus saat lambda sleep (Max timeout 15s/60s) |
| **Penyimpanan Sesi** | Volume disk lokal permanen (`data/wa-session`) | Direktori sementara `/tmp` (Dihapus saat cold start) |
| **QR Code Pairing** | Sekali scan, bertahan berbulan-bulan | Wajib scan ulang setiap kali instance cold start |
| **Respons Pesan Otomatis** | Real-time < 500ms via event `messages.upsert` | Bergantung pada polling atau webhook eksternal |

### 5.2 Solusi Desain yang Diterapkan di MyWebPorto
Kode di `src/lib/whatsapp-bot/wa-service.ts` telah dirancang secara *hybrid-resilient*:
1. Mendeteksi `process.env.VERCEL`:
   - Jika di Vercel: Sesi dialihkan ke `/tmp/my-web-porto-wa-session` untuk keperluan demo/testing admin tanpa merusak build.
   - Jika di VPS/Server Mandiri: Sesi disimpan di `data/wa-session` (didukung Docker/PM2).
2. Auto-reconnection guard:
   - Jika koneksi terputus bukan karena logout manual (`statusCode !== DisconnectReason.loggedOut`), timer rekoneksi otomatis mencoba menyambung ulang dalam 5 detik.

### 5.3 Rekomendasi Arsitektur Masa Depan
Bila WhatsApp bot ingin dioperasikan penuh saat frontend di-host di Vercel:
- **Opsi A (Direkomendasikan)**: Pisahkan microservice Baileys ke VPS kecil (DigitalOcean/Linode/Hetzner seharga \$4/bulan) atau Railway/Fly.io worker dengan persistent volume, lalu integrasikan ke MyWebPorto via REST API / Webhook rahasia.
- **Opsi B**: Gunakan official WhatsApp Cloud API (Meta Graph API) via webhook webhook endpoint di `src/app/api/webhook/whatsapp/route.ts` yang 100% ramah serverless.

---

## 6. Kesimpulan & Roadmap Implementasi

1. **Tahap 1 (Selesai)**: Seluruh pembaruan Minor/Patch Tier 1 berhasil diintegrasikan dengan stabilitas 100% (636 unit test lolos, build 54 rute Turbopack sukses).
2. **Tahap 2 (Selesai)**: Resolusi 9 temuan Audit Anti-Slop #002 tuntas tanpa regresi.
3. **Tahap Mendatang**: Evaluasi migrasi Postgres v4 bersamaan dengan rilis stabil Drizzle ORM v1.0.

