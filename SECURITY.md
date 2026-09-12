# Keamanan MyWebPorto (Security Policy)

Dokumen ini menjelaskan postur keamanan, langkah hardening yang diterapkan, dan cara melaporkan kerentanan pada **MyWebPorto**.

---

## Kebijakan Singkat

- **Jangan** menguji kerentanan pada produksi tanpa izin.
- Lakukan pengujian hanya pada lingkungan lokal/staging Anda sendiri.
- Laporkan temuan ke **`x@sigitadi.id`** dengan bukti yang memadai.
- Kami menghargai responsible disclosure dan akan merespons secara cepat.

---

## Hardening yang Diterapkan

### 1. OWASP A01 — Broken Access Control
- Semua **Server Actions** yang melakukan mutasi (CRUD) wajib memanggil `verifyAdmin()`.
- `ADMIN_CLERK_ID` di environment menentukan satu-satunya akun yang berhak mengubah konten.
- Rute `/admin/*` dilindungi Clerk middleware; user non-admin mendapat respons **404** (bukan 403) agar tidak membocorkan keberadaan halaman.
- Respons error disamaratakan lewat `sanitizeError()` agar pesan internal (env, stack trace, DB) tidak bocor ke klien.

### 2. OWASP A03 — Injection & XSS
- **Validasi input**: semua URL divalidasi dengan `safeUrlSchema` (Zod) yang hanya mengizinkan `http://`, `https://`, `/`, `#`, atau `mailto:`.
- **Content Security Policy (CSP)** ketat diterapkan via header `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src` hanya mengizinkan origin sendiri + Clerk (diperlukan untuk auth)
  - `worker-src 'self' blob:` — Clerk membuat Web Worker dari blob; tanpa direktif ini `script-src` dipakai sebagai fallback dan worker gagal dibuat
  - `style-src` hanya origin sendiri + inline (Tailwind). Google Fonts **tidak** lagi diizinkan karena seluruh font (termasuk tipografi retro Silkscreen/Azeret Mono/Unbounded/Space Grotesk) di-host sendiri oleh `next/font/google` saat build
  - `font-src 'self' data:` — tanpa origin font eksternal
  - `img-src` mengizinkan sendiri + semua HTTPS (thumbnail eksternal)
  - `connect-src` dibatasi ke IndexNow, Clerk, Formspree
  - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`
- **SVG dihapus** dari tipe yang diunggah karena SVG dapat menyisipkan `<script>`/event handler (XSS saat disajikan dari origin kita).
- **Magic bytes diverifikasi**: isi berkas harus cocok dengan `Content-Type` yang diklaim, sehingga MIME tidak bisa dipalsukan dari klien.
- **Ekstensi diturunkan dari MIME tervalidasi**, bukan dari nama file kiriman. Tanpa ini, berkas bernama `evil.html` dengan `Content-Type: image/png` bisa tersimpan sebagai `/uploads/*.html` dan disajikan sebagai dokumen HTML dari origin kita.
- Nama file unik di-generate ulang (timestamp + random bytes).
- **JSON-LD di-escape** lewat `safeJsonLd()` (`<` → `\u003c`) karena `JSON.stringify` tidak menetralkan `</script>`, sehingga judul/deskripsi dari CMS tidak bisa menutup tag script lebih awal.
- **Pesan error database tidak lagi bocor ke klien**: detail teknis hanya dicatat di log server.

### 3. OWASP A05 — Security Misconfiguration
- Header keamanan lengkap di `next.config.ts`:
  - `Strict-Transport-Security` (HSTS, 2 tahun, includeSubDomains, preload)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: origin-when-cross-origin`
  - `Permissions-Policy` membatasi kamera, mikrofon, geolocation, browsing-topics
  - `X-Permitted-Cross-Domain-Policies: none`
- Secret **tidak** di-commit ke repository (lihat `.env.example`).

### 4. OWASP A04 — Insecure Design (Rate Limiting)
- Endpoint `POST /api/indexnow` dibatasi **10 request / 60 detik per IP**.
- Respons `429` disertai header `Retry-After`.
- `GET /api/indexnow` dinonaktifkan karena sebelumnya membocorkan IndexNow key.
- URL yang disubmission ke IndexNow divaluasi ulang: hanya menerima URL absolut pada host kita sendiri.

### 5. OWASP A07 — CSRF / Session
- Autentikasi menggunakan **Clerk** (session token httpOnly yang dikelola Clerk).
- Clerk middleware berjalan pada semua rute (kecuali aset statis).
- `bodySizeLimit` Server Actions dibatasi 25 MB untuk mencegah unggah berlebihan.

### 6. Privasi — Egress Data ke Pihak Ketiga

- **Tidak ada penerjemahan otomatis saat menyimpan konten.** Sebelumnya setiap `saveProject` / `saveArticle` / `saveProduct` / `saveService` / `saveTestimonial` / `updateProfile` mengirim teks ke `translate.googleapis.com` (fallback `api.mymemory.translated.net`) bila kolom English kosong — termasuk isi artikel penuh. Pemanggilan itu sudah dihapus.
- Penerjemahan kini **opt-in per field**: admin menekan tombol *Terjemahkan (ID → EN)* di form admin, yang memanggil `translateFieldAction` dan tetap dilindungi `verifyAdmin()`.
- `ENABLE_EXTERNAL_TRANSLATE=false` mematikan jalur tersebut sepenuhnya; fungsi terjemahan menolak berjalan dan kolom English harus diisi manual.
- Kolom English yang dibiarkan kosong **tidak** memaksa penerjemahan: mode EN memakai teks Indonesia sebagai fallback.
- Peringatan yang sama didokumentasikan di dalam `src/lib/translate.ts` agar tidak terlupakan saat berkas itu diubah.

---

## Catatan Pengembangan

### Mode Development
Jika `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` belum diset atau masih berisi placeholder `xxxx`, middleware dan `verifyAdmin()` sengaja mengizinkan navigasi tanpa autentikasi agar development tetap jalan. **Pastikan key produksi sudah benar sebelum deploy.**

### Upload Gambar
- Gambar disimpan ke `public/uploads` di lingkungan lokal/standalone.
- Di Vercel serverless, direktori root bersifat **read-only** sehingga upload lokal tidak persisten — gunakan object storage/CDN (Bunny, R2, S3) untuk produksi jangka panjang.
- Tipe yang diizinkan: JPEG, PNG, WEBP, GIF, AVIF, BMP (tanpa SVG).

### Kontak (Formspree)
- Form kontak mengirim langsung ke endpoint Formspree, bukan ke server kita.
- Validasi client tetap berlaku; endpoint Formspree menerapkan validasi & spam filtering sendiri.

---

## Melaporkan Kerentanan

Jika Anda menemukan kerentanan keamanan:

1. **Jangan** mengeksploitasi di luar lingkungan Anda sendiri.
2. Kirim detail ke **`x@sigitadi.id`** dengan subjek `[SECURITY] MyWebPorto`.
3. Sertakan: langkah reproduksi, dampak potensial, dan apabila memungkinkan usulan perbaikan.
4. Kami akan mengakui laporan Anda dan berusaha merespons dalam beberapa hari kerja.

---

## Cakupan Luar (Out of Scope)

- Layanan pihak ketiga yang kami gunakan (Clerk, Vercel, Formspree, Neon, Bunny) — laporkan ke masing-masing vendor.
- Social engineering / phishing yang menargetkan pemilik akun.
- Serangan fisik atau terhadap infrastruktur hosting.
