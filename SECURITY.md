# Keamanan MyWebPorto — Security Policy & Hardening Guide

Dokumen ini menjelaskan **postur keamanan**, langkah hardening yang diterapkan, threat model, dan cara melaporkan kerentanan pada **MyWebPorto**.

> **Versi hardening:** 2026-09-12 (v2) — mencakup CSP v2, validasi max-length, rate-limit admin-only IndexNow, header COOP/CORP, dan sanitasi error v2.
> **Dokumen terakhir diperbarui:** 2026-10-11 — sinkronisasi dengan kode: §3.2 upload kini merujuk validasi terpusat `storage.ts` (whitelist MIME tanpa SVG, magic-bytes, id UUID), §3.3 `images.remotePatterns` = allowlist host + pengecualian CORP `cross-origin` untuk `/api/media/*`, §3.5 `middleware.ts` → `src/proxy.ts`, §3.7/§4 form Cloud AI pindah ke `/admin/cloud-ai`, §4 catatan `npm audit` disegarkan. Lihat §7.

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
| `/admin/*`, Server Actions CRUD | Broken Access Control (A01) | Clerk + `ADMIN_CLERK_ID` single-owner + `verifyAdmin()` di **semua** mutasi; non-admin 404; `NEXT_PUBLIC_CLERK_SIGN_IN_URL` wajib `/sign-in` (lihat §4) |
| `socialLinks`, URL, slug, upload | Injection / XSS (A03) | Zod `safeUrlSchema` + max-length + slug regex + magic-bytes + `safeJsonLd` |
| Header / CSP / HSTS | Misconfiguration (A05) | Header ketat di `next.config.ts` (HSTS 2 tahun, CSP, COOP/CORP, Permissions-Policy) |
| `POST /api/indexnow` | Abuse / SSRF / DoS | Admin-only + rate-limit 5/60s/IP + host allowlist + max 100 URLs + payload 10KB |
| `POST /api/retrobot` | Abuse / prompt injection / egress data | Publik + rate-limit 20/5mnt/IP + input 500 char + history 4 turn + prompt hanya katalog publik |
| Tabel `settings` (key `cloud_ai`) | Kebocoran API key cloud | Penulisan admin-only via `verifyAdmin()` + masking di `settings.ts` + tidak dikirim ke klien |
| Upload gambar (tabel `media`, bytea Postgres) | Stored XSS / RCE | SVG blacklist, ekstensi dari MIME, validasi magic bytes terpusat di `storage.ts` |
| `/admin/orders`, tracking invoice | Information Disclosure / Tampering | Mutasi status dan resi admin-only via `verifyAdmin()`; lookup tracking publik `/order` membutuhkan invoice valid dan nomor kontak terdaftar |
| `/admin/whatsapp-bot`, sesi Baileys | Sesi WhatsApp hijacking | Akses QR pairing dan pengelolaan sesi admin-only; penyimpanan kredensial sesi lokal di server tidak terekspos ke publik |
| Database schema `public`, PostgREST API (Supabase) | Unauthorized Data Access / Tampering (`rls_disabled_in_public`) | RLS aktif penuh (`.enableRLS()`) pada 13 tabel publik via migrasi `0013_enable_rls.sql` + cabut seluruh privilege `SELECT`, `INSERT`, `UPDATE`, `DELETE` dari role `anon` dan `authenticated`; aplikasi beroperasi via koneksi langsung Drizzle (role `postgres`) |
| Translate (Google/MyMemory) | Privacy egress | Opt-in per field, `ENABLE_EXTERNAL_TRANSLATE=false` mematikan total |
| Session / CSRF | Session hijack | Clerk httpOnly session, `bodySizeLimit 25MB`, CSRF via same-origin |

Out of scope: infra pihak ketiga (Clerk, Vercel, Neon, Formspree), social engineering.

---

## 3. Hardening yang Diterapkan

### 3.1 OWASP A01 — Broken Access Control
- Semua **Server Actions** mutasi wajib `await verifyAdmin()` di baris pertama.
- `ADMIN_CLERK_ID` = satu-satunya akun yang boleh ubah konten. Di `proxy.ts` (middleware Next 16) dan `lib/actions.ts`, placeholder `user_xxxxxxxxxxxxxxxxx` sengaja diabaikan agar dev tetap jalan.
- **Mode tanpa Clerk** (publishable key kosong / placeholder `xxxx`): SDK Clerk v7 menolak key format-invalid saat inisialisasi — `clerkMiddleware` melempar "Publishable key not valid" di **setiap** request (HTTP 500) dan `ClerkProvider` crash di client, sehingga deteksi di dalam handler tidak pernah tercapai. Karena itu `proxy.ts` dan `layout.tsx` memilih gate/provider tanpa Clerk **di level export**: situs publik tetap render (dev lokal tanpa kredensial + CI E2E), `/admin` **fail-closed 404** di produksi, dan komponen butuh-konteks Clerk (`os-menubar` `useUser`/`UserButton`, `<SignIn/>`, `<SignUp/>`) disembunyikan atau diganti fallback. Produksi (key valid) tidak terdampak: `clerkMiddleware → auth.protect()` + gate `ADMIN_CLERK_ID` aktif penuh.
- Rute `/admin/*` dilindungi `clerkMiddleware → auth.protect()`; non-admin dapat **404** (bukan 403) agar tidak leak keberadaan halaman.
- `GET /api/indexnow` dinonaktifkan (405); `POST` kini **admin-only** (`src/app/api/indexnow/route.ts`).
- Error disamaratakan via `sanitizeError()` —Stack trace / env tidak pernah ke klien.

### 3.2 OWASP A03 — Injection & XSS
- **Validasi input** (`src/lib/validations.ts`):
  - `safeUrlSchema`: hanya `http://`, `https://`, `/`, `#`, `mailto:`.
  - `imageOrUrlSchema`: hanya `/` atau `http(s)`.
  - **Max-length** di semua field (headline 200, bio 5000, title 150, slug 100, content 50000, dll.) untuk cegah DoS via payload raksasa.
  - **Slug regex** `^[a-z0-9]+(?:-[a-z0-9]+)*$` — cegah path traversal / `../`.
  - `techStacks` max 30, `tags` max 20, `skills` max 50.
- **CSP ketat** (`next.config.ts`):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' <domain Clerk> https://*.clerk.accounts.dev https://clerk.com` — **domain Clerk diturunkan dari publishable key saat build** (lihat catatan di bawah), bukan hardcode. **`unsafe-eval` dihapus** (hanya diperlukan di dev).
  - `worker-src 'self' blob:` — Clerk butuh blob worker.
  - `style-src 'self' 'unsafe-inline'` (Tailwind), `font-src 'self' data:` (next/font self-host).
  - `img-src 'self' data: https: blob:`.
  - `connect-src` terbatas ke IndexNow, Clerk, Formspree, visitor-tracker.
  - `frame-src 'self' <domain Clerk> https://challenges.cloudflare.com` — Clerk butuh iframe handshake OAuth.
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://formspree.io`, `frame-ancestors 'self'`, `report-uri` → visitor-tracker (`/csp-report`), `upgrade-insecure-requests`.
  - **Catatan domain Clerk (pernah menyebabkan bug):** publishable key berformat `pk_<live|test>_<base64 domain Frontend API>`. Pada akun dengan **custom domain**, domainnya BUKAN `*.clerk.accounts.dev` (mis. `clerk.sigitadi.id`). Hardcode hanya wildcard itu membuat `clerk.browser.js` diblokir CSP → komponen `<SignIn />` tidak pernah render ("tidak ada pilihan login"). Bug ini **tidak terlihat di dev** karena key dev memang cocok wildcard. Bagian base64 juga sering membawa sufiks non-host (mis. `$`) yang membuat source CSP tidak valid → browser mengabaikannya → script tetap diblokir; karena itu hanya karakter host yang valid yang diambil. Verifikasi dengan browser asli, bukan cek string (lihat `scripts/check-clerk-login.mjs`).
- **Upload** (validasi terpusat di `src/lib/storage.ts`, dipakai `local-upload.ts` & `actions.ts`):
  - **Whitelist MIME** (JPEG/PNG/WEBP/GIF/AVIF/BMP) — **SVG tidak ada di daftar** sehingga ditolak (cegah XSS via inline `<script>`).
  - **Magic-bytes** diverifikasi per MIME (`matchesImageSignature`); MIME dari klien tidak dipercaya.
  - **Ekstensi diturunkan dari MIME tervalidasi** (`EXTENSION_BY_MIME`), bukan dari `file.name` — nama asli hanya jadi label display yang dibersihkan ke basename.
  - Gambar disimpan ke tabel `media` dengan **id UUID (`randomUUID()`)** dan disajikan via `GET /api/media/<uuid>`; `Content-Type` diambil dari MIME hasil validasi.
  - `bodySizeLimit 25MB` (serverActions) & `MAX_IMAGE_SIZE 20MB` per file.
- **JSON-LD** (`src/lib/json-ld.ts`): `safeJsonLd()` ganti `<` → `\u003c` untuk cegah `</script>` breakout (stored XSS).
- **Error sanitasi** (`src/lib/error-utils.ts`): allowlist pesan aman + `slice(0,500)` + `console.error` mask internal.

### 3.3 OWASP A05 — Security Misconfiguration
Header lengkap di `next.config.ts` (`headers()`):
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2 tahun)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin` (diperketat dari `origin-when-cross-origin`)
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()`
- `X-Permitted-Cross-Domain-Policies: none`
- **Baru:** `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
- **Pengecualian sadar:** `GET /api/media/:id` di-set `Cross-Origin-Resource-Policy: cross-origin` + `Cache-Control: public, max-age=31536000, immutable` agar `og:image` bisa diambil scraper WhatsApp/Facebook (permintaan cross-origin). Aman karena berkasnya memang publik dan immutable.
- **Baru:** `Cache-Control: no-store` untuk `/admin/*` dan `/api/*` (cegah cache sensitif di CDN)
- `poweredByHeader: false`, `compress: true`
- `images.remotePatterns` — **allowlist host, bukan wildcard**: `images.unsplash.com`, `*.b-cdn.net`, `sigitadi.id`, `*.sigitadi.id`. Saat ini `images.unoptimized: true` (ramah VPS tanpa sharp) sehingga pola ini belum dienforce runtime; begitu dioptimalkan (`unoptimized: false`), allowlist langsung berlaku sebagai defense in depth.
- Secret tidak di-commit (`.env.example`).

### 3.4 OWASP A04 — Insecure Design (Rate Limiting)
- `POST /api/indexnow` (`src/lib/rate-limit.ts` + `src/app/api/indexnow/route.ts`):
  - **5 req / 60s / IP** (diperketat dari 10) + `Retry-After`.
  - **Admin-only** (401/403 jika bukan owner).
  - **Max 100 URLs** + **payload 10KB** (413 jika lebih).
  - **Allowlist host**: hanya URL dengan `host === NEXT_PUBLIC_APP_URL`.
  - In-memory sliding window (per-instance). Untuk multi-instance prod, ganti ke **Redis / Vercel KV / Upstash** (komentar di `rate-limit.ts:3`).
- `GET /api/indexnow` → 405.

### 3.5 OWASP A07 — CSRF / Session
- Clerk httpOnly session, middleware di semua rute kecuali aset statis.
- `x-request-id` (`src/proxy.ts`) untuk korelasi log tanpa leak PII.

### 3.6 Privasi — Egress Data
- **Tidak ada auto-translate saat save.** Tombol `Terjemahkan (ID→EN)` opt-in per field → `translateFieldAction` + `verifyAdmin()`.
- `ENABLE_EXTERNAL_TRANSLATE=false` → `translateText()` throw, UI minta isi manual.
- Kolom EN kosong = fallback ke teks ID (tidak trigger egress).
- **Sigit_Bot / RetroBot hybrid (default lokal):** `askSigitBot` (terminal) publik tanpa login, dibatasi rate-limit **10 req/5 mnt/IP**, input 500 char, output 300 token. Endpoint streaming `POST /api/retrobot` (SSE) publik, rate-limit **20 req/5 mnt/IP**, body 10KB, history maks 4 pasang turn. Cloud hanya bila provider aktif **dan** confidence lokal < 0,55. Prompt hanya berisi katalog publik (nama, headline, skill, judul layanan/proyek/artikel) + nama halaman SigitOS yang sedang dibuka — tanpa PII/secret.

### 3.7 Rahasia Cloud AI (tabel `settings`)
- Konfigurasi Cloud AI (provider, API key, base URL, model, system prompt, gaya jawaban) disimpan di tabel `settings` key `cloud_ai` (migrasi `0008`), **atau** di env server (`AI_PROVIDER` + `<PROVIDER>_API_KEY` / `_MODEL` / `_BASE_URL`). Pengaturan admin menimpa env per-field. Daftar provider, default base URL/model, dan nama env var diatur terpusat di registry `src/lib/ai-providers.ts` (client-safe — tidak berisi rahasia, aman diimpor komponen browser).
- Provider yang didukung: `off` (default), `gemini`, `openai` (OpenAI-compatible custom — OpenAI/Ollama/endpoint `/v1/chat/completions` sendiri), `anthropic`, `deepseek`, `groq`, `openrouter`, `together`, `mistral`, `xai`. Id asing dari form/env/DB → **fail-closed `off`** di `isCloudProvider()`, `resolveCloudAIConfig()`, dan `saveCloudAIConfig()` — tidak ada provider tak dikenal yang bisa membuka egress.
- **API key tidak pernah dikirim ke klien.** `maskKey()` hanya menampilkan `••••••••` + 4 karakter terakhir (placeholder ditandai jelas); `AdminCloudAIView` hanya berisi status masked. Penulisan hanya lewat server action `saveCloudAIConfigAction` yang memanggil `verifyAdmin()`; apiKey kosong di form = "pertahankan key yang ada". Isolasi per-provider: key hanya dibaca lewat `meta.envKey` registry — mengganti provider tidak membocorkan key provider lain.
- Pengambilan daftar model (`listCloudModelsAction`) adalah server action admin-only. Header otentikasi per gaya API: `Authorization: Bearer` untuk `openai-chat`, `x-api-key` + `anthropic-version: 2023-06-01` untuk `anthropic`, `?key=` untuk `gemini`. Key yang dikirim ke provider tidak pernah di-log ke klien; key kosong di form = pakai key yang sudah tersimpan.
- `AI_PROVIDER` default `off` — tanpa key valid (kosong/placeholder dianggap tidak valid), semua pertanyaan dilayani mesin lokal (`ai-engine.ts`) tanpa egress apa pun. Gate yang sama berlaku di route `/api/retrobot` lewat `isCloudAIConfigEnabled()`; provider `off` atau key placeholder → `submitTo*` mengembalikan `{success:false}` tanpa memanggil jaringan.
- **Otentikasi provider = API key saja.** Seluruh 9 provider dalam registry memakai API key (per gaya API: `Authorization: Bearer` / `x-api-key` + `anthropic-version` / `?key=`) — **tidak ada alur login atau OAuth per akun**. Form Cloud AI di `/admin/cloud-ai` hanya menyediakan input API key; nilai yang disimpan tidak pernah dibaca kembali dalam bentuk mentah (lihat `maskKey()` di atas). Login akun provider (mis. "Sign in with…" ke dashboard AI) tidak didukung dan tidak direncanakan: API key adalah standar otentikasi untuk semua provider terdaftar, sekaligus menghindari penyimpanan token OAuth jangka panjang di tabel `settings`.

### 3.8 Isolasi Database, Row-Level Security (RLS) & Proteksi PostgREST API (Supabase)
- **Mitigasi Kerentanan `rls_disabled_in_public` (Supabase Advisory)**: Supabase mengekspos endpoint PostgREST publik (`/rest/v1/*`) menggunakan role `anon`. Seluruh 13 tabel di schema `public` (`profiles`, `projects`, `services`, `products`, `testimonials`, `articles`, `audit_logs`, `settings`, `settings_history`, `media`, `visitor_hits`, `orders`, `customers`) wajib mengaktifkan Row-Level Security (`ENABLE ROW LEVEL SECURITY`) via migrasi `drizzle/0013_enable_rls.sql` dan deklarasi `.enableRLS()` di `src/db/schema.ts`.
- **Pencabutan Hak Akses Role PostgREST (`anon` & `authenticated`)**: Aplikasi MyWebPorto beroperasi secara eksklusif menggunakan koneksi langsung Drizzle ORM (`DATABASE_URL`, role `postgres`), bukan lewat PostgREST. Seluruh hak akses (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) dari role `anon` dan `authenticated` dicabut (`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`) serta default privilege diubah (`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`) sehingga upaya query publik terhadap data sensitif pelanggan (`customers`), pesanan (`orders`), kunci sistem (`settings`), maupun log audit (`audit_logs`) langsung ditolak dengan `permission denied`.
- **Gate Otomatis di Suite Pengujian (`tests/database-rls.test.ts`)**: Pengujian unit dan integrasi live memvalidasi bahwa setiap tabel baru harus mendeklarasikan `.enableRLS()`, dan saat terhubung ke database live, 100% tabel di schema publik memiliki `rowsecurity = true` serta role `anon` terisolasi total.

---

## 4. Checklist Hardening Pra-Deploy (Wajib)

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` = **live** (bukan `pk_test_xxxx`), `ADMIN_CLERK_ID` terisi valid.
  - **Wajib `pk_live_`** — `pk_test_` memakai domain `*.clerk.accounts.dev` yang me-redirect **Googlebot ke handshake Clerk di setiap rute** (termasuk `/robots.txt` & `/sitemap.xml`). Google melaporkannya sebagai **"Redirect error"** dan halaman tidak terindeks. Jika GSC melaporkan redirect error, ini penyebab pertama yang harus diperiksa.
  - **Domain CSP diturunkan dari key ini** — key live dengan custom domain (mis. `clerk.sigitadi.id`) menghasilkan source CSP yang berbeda dari key dev. Lihat §3.2 catatan domain Clerk.
- [ ] **`NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-in` / `/sign-up`** — BUKAN `/admin`.
  - Variabel ini adalah **halaman login** (tujuan *sebelum* otentikasi). Jika diisi `/admin`, `auth.protect()` mengalihkan user belum-login ke `/admin`, yang balik memicu proteksi → **redirect loop tak terbatas** (`ERR_TOO_MANY_REDIRECTS`) di `/admin/*`.
  - Tujuan *setelah* login adalah variabel terpisah: `CLERK_SIGN_IN_FORCE_REDIRECT_URL` / `CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/admin` (memang benar `/admin` di sini).
  - **Jebakan diagnostik:** curl ke `/admin` mengembalikan **404** (bukan redirect) karena `auth.protect()` memperlakukan client non-browser berbeda. Gejala aslinya hanya terlihat di **browser asli** — tes dengan header `Sec-Fetch-Mode: navigate` + `Sec-Fetch-Dest: document`, atau langsung pakai Playwright. Jangan diagnosa redirect loop ini dengan curl polos.
- [ ] `DATABASE_URL` prod (Neon `sslmode=require`), sudah `npm run db:push`.
- [ ] `NEXT_PUBLIC_APP_URL` = domain prod (tanpa trailing slash).
- [ ] `INDEXNOW_KEY` ganti dari default `e5b871c...` (di `.env`, jangan commit).
- [ ] Storage gambar: tabel `media` (bytea Postgres) siap via migrasi `drizzle/0010` — tidak ada dependency object storage lagi.
- [ ] `ENABLE_EXTERNAL_TRANSLATE` sesuai kebijakan privasi (set `false` jika egress dilarang).
- [ ] `npm run lint && npm run build` pass (0 error, 0 warning); `npx tsc --noEmit` 0 error; `npm run test` hijau.
- [ ] `npm audit --audit-level=high` cek. Per 2026-10-12 laporan berisi **9 vuln transitif dev-only** (4 moderate, 5 high) pada `eslint-config-next` dan `drizzle-kit` (@esbuild-kit). Kerentanan `sharp` (CVE-2026-96889), `source-map-js`, dan `brace-expansion` telah ditambal via npm overrides. Tahan `--force` agar tidak merusak ekosistem Next.js 16.
- [ ] Bila Cloud AI diaktifkan: `AI_PROVIDER` + key di env server **atau** di form `/admin/cloud-ai` (tabel `settings`); pastikan UI admin menampilkan key sebagai masked, dan `AI_PROVIDER=off` bila tidak dipakai.
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
# Verifikasi Clerk: OAuth aktif, portal, CSP tidak blokir script (browser asli)
node scripts/check-clerk-login.mjs
```

`scripts/check-clerk-login.mjs` membandingkan instance Clerk di `.env.local` vs situs live (publishable key), mengecek `oauth_google`/password aktif, akses Account Portal, lalu merender `/sign-in` & `/sign-up` di **browser asli** untuk memastikan tidak ada request Clerk yang diblokir CSP. Jalankan setiap kali mengubah key Clerk, domain, atau header CSP.

---

## 6. Melaporkan Kerentanan

1. **Jangan** eksploitasi di luar lingkungan Anda.
2. Email **`x@sigitadi.id`** subjek `[SECURITY] MyWebPorto` + langkah reproduksi, dampak, PoC, usulan fix.
3. Kami akan ack dalam 2–5 hari kerja.

---

## 7. Riwayat Hardening

| Tanggal | Perubahan |
|---------|-----------|
| 2026-10-28 | **Hardening Row-Level Security (RLS) Database Supabase & Isolasi Role PostgREST**: Mengaktifkan RLS penuh pada seluruh 13 tabel schema publik (`0013_enable_rls.sql` & `src/db/schema.ts`), mencabut seluruh privilege tabel/sekuens dari role `anon` dan `authenticated`, menambahkan gate pengujian `tests/database-rls.test.ts`, menuntaskan kerentanan `rls_disabled_in_public` (Supabase Security Advisory). |
| 2026-10-24 | **Pembaruan dependensi Next.js 16.4.3**: Upgrade Next.js dan `eslint-config-next` ke versi 16.4.3 untuk mitigasi CVE bawaan framework Next.js 16. Seluruh build Turbopack dan pemeriksaan linting tervalidasi bersih. |
| 2026-10-12 | **Pembaruan dependensi & mitigasi CVE transitif**: Upgrade Next.js 16.4.0, Clerk 7.9.14, Radix UI, Drizzle, Node 22 LTS types. Penambalan kerentanan `sharp` (CVE-2026-96889), `source-map-js`, dan `brace-expansion` melalui npm overrides. Eliminasi `DeprecationWarning: Buffer()` pada proses build Node 24. |
| 2026-10-11 | **Sinkronisasi dokumentasi** (bukan perubahan kode): §3.2 upload merujuk validasi terpusat `storage.ts` (whitelist MIME tanpa SVG, magic-bytes per MIME, ekstensi dari MIME tervalidasi, id UUID) alih-alih `local-upload.ts` + nama `Date.now()-randomHex`; §3.3 `images.remotePatterns` = allowlist host (bukan wildcard `**`) + pengecualian CORP `cross-origin` untuk `GET /api/media/:id`; §3.5 `middleware.ts:27` → `src/proxy.ts`; §3.7 & §4 form Cloud AI `/admin/system` → `/admin/cloud-ai`; §3.1/§3.4 referensi baris `indexnow/route.ts` dihapus; §4 catatan `npm audit` disegarkan (12 vuln: 4 moderate, 8 high). |
| 2026-09-18 | **Koreksi dokumentasi** (bukan perubahan kode): §3.2 CSP `script-src` diperbaiki — domain Clerk diturunkan dari publishable key saat build (bukan hardcode `*.clerk.accounts.dev`); §4 tambah checklist `NEXT_PUBLIC_CLERK_SIGN_IN_URL` ≠ `/admin` (redirect loop) + catatan curl menyesatkan; §5 tambah `scripts/check-clerk-login.mjs` |
| 2026-09-12 v2 | CSP hapus `unsafe-eval`, tambah COOP/CORP, Cache-Control admin/api, validation max-length+slug regex, IndexNow admin-only (5/60s) + max 100 URLs, error sanitasi allowlist diperluas, middleware `x-request-id` |
| 2026-09-11 v1 | CSP awal, magic-bytes upload, safeJsonLd, rate-limit 10/60s, verifyAdmin, sanitizeError |

---

## 8. Catatan Pengembangan

- **Dev mode:** jika Clerk key placeholder, middleware & `verifyAdmin()` sengaja bypass agar dev jalan — **kecuali di produksi** (`VERCEL_ENV/NODE_ENV=production`): admin 404 dan mutasi ditolak (fail-closed, lihat `src/lib/env.ts`). **Pastikan key prod sebelum deploy.**
- **Upload:** gambar disimpan di tabel `media` (bytea Postgres) — persisten di serverless; `public/uploads` hanya untuk aset statis git-tracked, bukan upload runtime.
- **Kontak:** Formspree langsung ke endpoint eksternal; validasi client + Formspree spam filter.
