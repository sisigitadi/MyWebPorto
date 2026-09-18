# Keamanan MyWebPorto — Security Policy & Hardening Guide

Dokumen ini menjelaskan **postur keamanan**, langkah hardening yang diterapkan, threat model, dan cara melaporkan kerentanan pada **MyWebPorto**.

> **Versi hardening:** 2026-09-12 (v2) — mencakup CSP v2, validasi max-length, rate-limit admin-only IndexNow, header COOP/CORP, dan sanitasi error v2.

---

## 1. Kebijakan Singkat

- **Jangan** menguji kerentanan pada produksi tanpa izin.
- Lakukan pengujian hanya pada lingkungan **lokal/staging** Anda sendiri.
- Laporkan temuan ke **`x@sigitadi.id`** dengan bukti yang memadai (PoC, langkah reproduksi).
- Kami menghargai *responsible disclosure* dan akan merespons dalam **2–5 hari kerja**.

---

## 2. Threat Model

| Aset | Ancaman Utama | Kontrol |
|------|---------------|---------|
| `/admin/*`, Server Actions CRUD | Broken Access Control (A01) | Clerk + `ADMIN_CLERK_ID` single-owner + `verifyAdmin()` di **semua** mutasi |
| `socialLinks`, URL, slug, upload | Injection / XSS (A03) | Zod `safeUrlSchema` + max-length + slug regex + magic-bytes + `safeJsonLd` |
| Header / CSP / HSTS | Misconfiguration (A05) | Header ketat di `next.config.ts` (HSTS 2 tahun, CSP, COOP/CORP, Permissions-Policy) |
| `POST /api/indexnow` | Abuse / SSRF / DoS | Admin-only + rate-limit 5/60s/IP + host allowlist + max 100 URLs + payload 10KB |
| `POST /api/retrobot` | Abuse / prompt injection / egress data | Publik + rate-limit 20/5mnt/IP + input 500 char + history 4 turn + prompt hanya katalog publik |
| Tabel `settings` (key `cloud_ai`) | Kebocoran API key cloud | Penulisan admin-only via `verifyAdmin()` + masking di `settings.ts` + tidak dikirim ke klien |
| Upload `public/uploads` | Stored XSS / RCE | SVG blacklist, ekstensi dari MIME, timestamp+random filename |
| Translate (Google/MyMemory) | Privacy egress | Opt-in per field, `ENABLE_EXTERNAL_TRANSLATE=false` mematikan total |
| Session / CSRF | Session hijack | Clerk httpOnly session, `bodySizeLimit 25MB`, CSRF via same-origin |

Out of scope: infra pihak ketiga (Clerk, Vercel, Neon, Bunny, Formspree), social engineering.

---

## 3. Hardening yang Diterapkan

### 3.1 OWASP A01 — Broken Access Control
- Semua **Server Actions** mutasi wajib `await verifyAdmin()` di baris pertama.
- `ADMIN_CLERK_ID` = satu-satunya akun yang boleh ubah konten. Di `middleware.ts:13` dan `lib/actions.ts:40`, placeholder `user_xxxxxxxxxxxxxxxxx` sengaja diabaikan agar dev tetap jalan.
- Rute `/admin/*` dilindungi `clerkMiddleware → auth.protect()`; non-admin dapat **404** (bukan 403) agar tidak leak keberadaan halaman.
- `GET /api/indexnow` dinonaktifkan (405); `POST` kini **admin-only** (`src/app/api/indexnow/route.ts:24`).
- Error disamaratakan via `sanitizeError()` —Stack trace / env tidak pernah ke klien.

### 3.2 OWASP A03 — Injection & XSS
- **Validasi input** (`src/lib/validations.ts`):
  - `safeUrlSchema`: hanya `http://`, `https://`, `/`, `#`, `mailto:`.
  - `imageOrUrlSchema`: hanya `/` atau `http(s)`.
  - **Max-length** di semua field (headline 200, bio 5000, title 150, slug 100, content 50000, dll.) untuk cegah DoS via payload raksasa.
  - **Slug regex** `^[a-z0-9]+(?:-[a-z0-9]+)*$` — cegah path traversal / `../`.
  - `techStacks` max 30, `tags` max 20, `skills` max 50.
- **CSP ketat** (`next.config.ts:25`):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com` — **`unsafe-eval` dihapus** (hanya diperlukan di dev).
  - `worker-src 'self' blob:` — Clerk butuh blob worker.
  - `style-src 'self' 'unsafe-inline'` (Tailwind), `font-src 'self' data:` (next/font self-host).
  - `img-src 'self' data: https: blob:`.
  - `connect-src` terbatas ke IndexNow, Clerk, Formspree.
  - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`.
- **Upload** (`src/lib/local-upload.ts`):
  - SVG **blacklist** (inline `<script>`).
  - **Magic-bytes** diverifikasi (JPEG/PNG/WEBP/GIF/AVIF/BMP).
  - **Ekstensi dari MIME tervalidasi**, bukan `file.name` → cegah `evil.html` tersimpan sebagai HTML.
  - Nama file `Date.now()-randomHex.ext`.
  - **Vercel warning** (`local-upload.ts:114`): log jika `process.env.VERCEL` (FS ephemeral).
  - `bodySizeLimit 25MB` (serverActions) & `MAX_SIZE 20MB` per file.
- **JSON-LD** (`src/lib/json-ld.ts`): `safeJsonLd()` ganti `<` → `\u003c` untuk cegah `</script>` breakout (stored XSS).
- **Error sanitasi** (`src/lib/error-utils.ts:6`): allowlist pesan aman + `slice(0,500)` + `console.error` mask internal.

### 3.3 OWASP A05 — Security Misconfiguration
Header lengkap di `next.config.ts:25`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2 tahun)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin` (diperketat dari `origin-when-cross-origin`)
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()`
- `X-Permitted-Cross-Domain-Policies: none`
- **Baru:** `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
- **Baru:** `Cache-Control: no-store` untuk `/admin/*` dan `/api/*` (cegah cache sensitif di CDN)
- `poweredByHeader: false`, `compress: true`
- `images.remotePatterns` — wildcard `**` masih aktif untuk kemudahan; **rekomendasi hardening:** batasi ke host tepercaya (`images.unsplash.com`, `cdn.sigitadi.id`) saat prod stabil.
- Secret tidak di-commit (`.env.example`).

### 3.4 OWASP A04 — Insecure Design (Rate Limiting)
- `POST /api/indexnow` (`src/lib/rate-limit.ts` + `src/app/api/indexnow/route.ts:12`):
  - **5 req / 60s / IP** (diperketat dari 10) + `Retry-After`.
  - **Admin-only** (401/403 jika bukan owner).
  - **Max 100 URLs** + **payload 10KB** (413 jika lebih).
  - **Allowlist host**: hanya URL dengan `host === NEXT_PUBLIC_APP_URL`.
  - In-memory sliding window (per-instance). Untuk multi-instance prod, ganti ke **Redis / Vercel KV / Upstash** (komentar di `rate-limit.ts:3`).
- `GET /api/indexnow` → 405.

### 3.5 OWASP A07 — CSRF / Session
- Clerk httpOnly session, middleware di semua rute kecuali aset statis.
- `x-request-id` (`middleware.ts:27`) untuk korelasi log tanpa leak PII.

### 3.6 Privasi — Egress Data
- **Tidak ada auto-translate saat save.** Tombol `Terjemahkan (ID→EN)` opt-in per field → `translateFieldAction` + `verifyAdmin()`.
- `ENABLE_EXTERNAL_TRANSLATE=false` → `translateText()` throw, UI minta isi manual.
- Kolom EN kosong = fallback ke teks ID (tidak trigger egress).
- **Sigit_Bot / RetroBot hybrid (default lokal):** `askSigitBot` (terminal) publik tanpa login, dibatasi rate-limit **10 req/5 mnt/IP**, input 500 char, output 300 token. Endpoint streaming `POST /api/retrobot` (SSE) publik, rate-limit **20 req/5 mnt/IP**, body 10KB, history maks 4 pasang turn. Cloud hanya bila provider aktif **dan** confidence lokal < 0,55. Prompt hanya berisi katalog publik (nama, headline, skill, judul layanan/proyek/artikel) + nama halaman SigitOS yang sedang dibuka — tanpa PII/secret.

### 3.7 Rahasia Cloud AI (tabel `settings`)
- Konfigurasi Cloud AI (provider, API key, base URL, model, system prompt, gaya jawaban) disimpan di tabel `settings` key `cloud_ai` (migrasi `0008`), **atau** di env server (`AI_PROVIDER`, `GEMINI_API_KEY`, `OPENAI_*`). Pengaturan admin menimpa env per-field.
- **API key tidak pernah dikirim ke klien.** `src/lib/settings.ts` mem-mask nilai saat mengembalikan config ke UI admin (hingga indikator `••••` + panjang), dan `AdminCloudAIView` hanya menampilkan status masked. Penulisan hanya lewat server action `saveCloudAIConfig` yang memanggil `verifyAdmin()`.
- Pengambilan daftar model (`listCloudModelsAction`) adalah server action admin-only; key yang dikirim ke provider tidak pernah di-log ke klien. Jika key kosong di form, action jatuh ke key env yang tersimpan.
- `AI_PROVIDER` default `off` — tanpa key valid, semua pertanyaan dilayani mesin lokal (`ai-engine.ts`) tanpa egress apa pun.

---

## 4. Checklist Hardening Pra-Deploy (Wajib)

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` = **live** (bukan `pk_test_xxxx`), `ADMIN_CLERK_ID` terisi valid.
  - **Wajib `pk_live_`** — `pk_test_` memakai domain `*.clerk.accounts.dev` yang me-redirect **Googlebot ke handshake Clerk di setiap rute** (termasuk `/robots.txt` & `/sitemap.xml`). Google melaporkannya sebagai **"Redirect error"** dan halaman tidak terindeks. Jika GSC melaporkan redirect error, ini penyebab pertama yang harus diperiksa.
- [ ] `DATABASE_URL` prod (Neon `sslmode=require`), sudah `npm run db:push`.
- [ ] `NEXT_PUBLIC_APP_URL` = domain prod (tanpa trailing slash).
- [ ] `INDEXNOW_KEY` ganti dari default `e5b871c...` (di `.env`, jangan commit).
- [ ] Storage gambar: **jangan** andalkan `public/uploads` di Vercel — pakai Bunny/R2/S3 (lihat README & `DEPLOYMENT.md`).
- [ ] `ENABLE_EXTERNAL_TRANSLATE` sesuai kebijakan privasi (set `false` jika egress dilarang).
- [ ] `npm run lint && npm run build` pass (0 error, 0 warning); `npx tsc --noEmit` 0 error; `npm run test` hijau.
- [ ] `npm audit --audit-level=high` cek; `postcss`/`esbuild` vuln saat ini dari `next@15` — tunggu upstream fix, jangan `npm audit fix --force` ke `next@16` tanpa uji.
- [ ] Bila Cloud AI diaktifkan: `AI_PROVIDER` + key di env server **atau** di form `/admin/system` (tabel `settings`); pastikan UI admin menampilkan key sebagai masked, dan `AI_PROVIDER=off` bila tidak dipakai.
- [ ] Header CSP tidak blokir UI (cek DevTools → Console → CSP violations).
- [ ] Uji `/admin` dengan akun non-owner → harus 404; `POST /api/indexnow` tanpa login → 401; `POST /api/retrobot` melebihi 20×/5 mnt → 429.
- [ ] **Kesehatan SEO (Google Search Console)**: `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/llms.txt` harus `200` (bukan `3xx`). Redirect di rute ini = penyebab "Redirect error" di GSC. Verifikasi: `curl -sI -o /dev/null -w "%{http_code}\n" https://sigitadi.id/robots.txt`.

---

## 5. Audit Rutin (Bulanan)

```bash
npm audit --audit-level=moderate
npm outdated
npm run lint && npm run build
# Cek header prod
curl -I https://domainanda.com/ | grep -i -E "strict|csp|x-frame|permissions"
```

---

## 6. Melaporkan Kerentanan

1. **Jangan** eksploitasi di luar lingkungan Anda.
2. Email **`x@sigitadi.id`** subjek `[SECURITY] MyWebPorto` + langkah reproduksi, dampak, PoC, usulan fix.
3. Kami akan ack dalam 2–5 hari kerja.

---

## 7. Riwayat Hardening

| Tanggal | Perubahan |
|---------|-----------|
| 2026-09-12 v2 | CSP hapus `unsafe-eval`, tambah COOP/CORP, Cache-Control admin/api, validation max-length+slug regex, IndexNow admin-only (5/60s) + max 100 URLs, error sanitasi allowlist diperluas, middleware `x-request-id` |
| 2026-09-11 v1 | CSP awal, magic-bytes upload, safeJsonLd, rate-limit 10/60s, verifyAdmin, sanitizeError |

---

## 8. Catatan Pengembangan

- **Dev mode:** jika Clerk key placeholder, middleware & `verifyAdmin()` sengaja bypass agar dev jalan — **kecuali di produksi** (`VERCEL_ENV/NODE_ENV=production`): admin 404 dan mutasi ditolak (fail-closed, lihat `src/lib/env.ts`). **Pastikan key prod sebelum deploy.**
- **Upload:** di Vercel, `public/uploads` read-only & ephemeral — file hilang saat redeploy.
- **Kontak:** Formspree langsung ke endpoint eksternal; validasi client + Formspree spam filter.
