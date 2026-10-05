# Changelog MyWebPorto

Format: `Added / Changed / Fixed / Security`. Tag rilis: `git tag -a vX.Y.Z`.

## [Unreleased]

### Fixed — Tombol gambar AI hilang di artikel & draf AI diam-diam jadi templat

Dua masalah yang dilaporkan dari pemakaian nyata di Redaksi.

**1. "Bantuan AI" untuk membuat gambar tidak pernah muncul di artikel.**
Tombol itu hanya dirender di dalam field yang kuncinya `imageUrl`, sementara
`COMPOSER_FIELDS.article` tidak punya field tersebut — padahal schema artikel
memiliki `imageUrl` (opsional, dipakai sebagai `og:image`) dan
`generateRedaksiImageAction` secara eksplisit mengizinkan tipe `article`.
Akibatnya artikel tidak pernah punya tombol gambar, padahal produk dan proyek
memilikinya. Field "Cover Artikel" kini ada di composer.

**2. Draf AI tidak mengikuti aturan SEO/GEO.**
Penyebabnya bukan analyzer, melainkan diam-diamnya fallback lokal. Saat
provider gagal merespons, `draftContentWithAI` mengembalikan kerangka lokal
berisi ~27 kata ("## Pendahuluan / ### Pembahasan / ### Kesimpulan") dengan
judul sama persis dengan brief, lalu hasil itu dilaporkan sebagai
"Draf AI berhasil dimuat". Remediasi format tetap jalan (ringkasan pembuka +
internal link), sehingga kelihatannya "cukup", padahal isinya tetap
templat: 1 sub-judul, 0 sub-judul tanya, 0 fakta berangka, 0 daftar.

- `DraftSeoReport.usedFallback` menandai kerangka lokal, dan UI menampilkan
  peringatan eksplisit "Ini kerangka lokal, bukan hasil AI" beserta
  alasannya. Toast tidak lagi menyebut "berhasil" saat provider gagal.
- Kerangka artikel lokal ditulis ulang mengikuti aturan GEO yang sama dengan
  draf AI: ringkasan pembuka sebelum sub-judul pertama, 5 sub-judul dengan
  4 di antaranya berbentuk pertanyaan, satu daftar langkah, dan permintaan
  fakta berangka. Angka contoh (250 ms, 40%) sengaja dibiarkan sebagai
  placeholder untuk diisi admin — kerangka tidak boleh mengarang fakta.
  Struktur GEO kerangka dikunci test di `tests/redaksi-draft.test.ts`.

Hasil: kerangka artikel lama GEO 73 dengan 1 H2, 0 tanya, 0 fakta, 0
daftar; kerangka baru GEO 100 pada dimensi struktural dengan 5 H2, 4 tanya,
2 fakta, 3 item daftar.

### Added — Sinkronisasi bantuan AI dengan analisis SEO + GEO

Tombol "Bantuan AI" dan panel "Analisis SEO" dulu berjalan dengan dua
pengaturan yang saling bertentangan. Analyzer menghitung `](/` sebagai
sinyal internal link, sementara prompt AI melarang model menulis link
markdown sama sekali — sehingga draf AI **tidak mungkin** lolos analyzer
apa pun yang ada. Selain itu semua angka ambang hanya hidup di dalam
analyzer, jadi model tidak pernah tahu batas panjang judul, batas density,
atau minimal jumlah kata.

Kini keduanya membaca satu sumber kebenaran, `src/lib/seo-rules.ts`:

- `SEO_RULES` (judul 30-65, meta 120-165, slug ≤ 6 kata, isi ≥ 600 kata,
  H2 minimal 3, density 0,3-3 persen, kalimat ≤ 32 kata) dan `GEO_RULES`
  (ringkasan pembuka, sub-judul pertanyaan, fakta berangka, daftar,
  panjang paragraf). Blok prompt `seoGeoPromptBlock()` **diturunkan** dari
  konstanta itu — mengubah angka di satu tempat otomatis mengubah prompt,
  tidak ada lagi duplikasi yang bisa berbeda.
- Kontradiksi internal link dihapus: link internal justru diminta, dengan
  daftar path yang boleh dipakai (`internalLinksPromptBlock()`) sehingga
  model tidak mengarang URL.
- `src/lib/seo-remediate.ts` merapikan draf secara deterministik sebelum
  dikembalikan (judul, slug, deskripsi, ringkasan pembuka GEO, internal
  link dari halaman terbit), lalu melaporkan apa yang diperbaiki dan apa
  yang masih perlu tulisan manusia. Prinsipnya: tidak pernah mengarang
  fakta, angka, atau URL; hanya memotong kelebihan dan menyusun ulang isi
  yang sudah ada.
- GEO di analyzer: lima temuan baru (`geo-no-answer-first`,
  `geo-no-question-heading`, `geo-no-fact`, `geo-no-list`,
  `geo-long-paragraph`), metrik baru, serta skor 0-100 (`score` dan
  `geoScore`) supaya dua draf bisa dibandingkan. Skor ini bukan prediksi
  peringkat — hanya ringkasan sisa masalah teknis.
- Panel "Analisis SEO" menampilkan skor + metrik GEO, dan composer
  menampilkan laporan sinkronisasi draf AI.

### Fixed — Upload gambar gagal di Vercel (EROFS: read-only file system)

Upload gambar artikel & avatar di produksi memunculkan
`EROFS: read-only file system, open '/var/task/public/uploads/…'`.
Penyebab: environment variable `BUNNY_STORAGE_ZONE_NAME` dan
`BUNNY_STORAGE_API_KEY` belum diisi, sehingga upload jatuh ke fallback
`public/uploads/` — filesystem Vercel serverless read-only selain `/tmp`,
jadi tulisan pasti gagal.

Adapter storage sudah benar; masalahnya konfigurasi. Kini saat terdeteksi
lingkungan serverless tanpa Bunny terkonfigurasi, upload gagal cepat dengan
pesan yang menyebut env yang harus diset (bukan `EROFS` samar yang
menyesatkan):

> Upload lokal tidak didukung di serverless (filesystem read-only).
> Set BUNNY_STORAGE_ZONE_NAME + BUNNY_STORAGE_API_KEY di Environment
> Variables Vercel.

**Solusi produksi (aksi admin, bukan kode):** isi
`BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_API_KEY`, dan
`NEXT_PUBLIC_BUNNY_PULL_ZONE_URL` di Settings → Environment Variables
Vercel. `.env.local` hanya untuk dev lokal dan tidak dibaca Vercel.

> **Telah digantikan oleh commit yang sama.** Penyimpanan gambar kini pindah
> ke tabel `media` di Postgres (lihat entri "Storage gambar pindah ke
> database" di bawah), sehingga tidak ada lagi penulisan ke filesystem dan
> `EROFS` tidak mungkin terjadi — guard gagal-cepat di atas beserta seluruh
> variabel `BUNNY_STORAGE_*` sudah tidak relevan. **Jangan** isi env Bunny
> di Vercel; hapus bila masih tertinggal.

> Kerjaan terbuka berikutnya: migrasi provider context (theme/cart/i18n) ke
> external store + custom change event, dan pindahkan fetch list admin ke
> Server Component (plan doc §5).

### Added — `npm run check:prod`: smoke test URL produksi + workflow terjadwal

Gate yang ada (`check:media`) memeriksa **data di database**. Yang baru ini
memeriksa **URL nyatanya di server produksi**. Keduanya bisa hijau bersamaan
ketika route-nya belum ter-deploy — persis yang terjadi pada 2026-10-05
saat `profiles.avatar_url` sudah menunjuk baris `media` tapi route
`GET /api/media/[id]` belum ikut naik, sehingga avatar dan dua cover artikel
membalas 404 selama berjam-jam sementara `tsc`, `eslint`, `vitest`, dan
`next build` tetap hijau penuh.

- `scripts/prod-health.mjs` (15 pemeriksaan): endpoint inti beserta
  `content-type`, setiap referensi `/api/media/<id>` di HTML homepage harus
  membalas `200 image/*`, nihil referensi `/uploads/`, slug tak dikenal
  harus 404, `og:image` artikel harus absolut dan bisa diambil, dan host
  alias harus 308 ke apex. Host bisa dioverride lewat
  `PROD_HEALTH_BASE_URL`.
- `.github/workflows/prod-health.yml` menjalankannya tiap 6 jam (dan manual
  dari tab Actions). SHA action dipin sama seperti `ci.yml`. Bila gagal,
  workflow membuka issue berisi log.
- Dibuktikan bisa gagal: dijalankan melawan server yang meniru produksi
  rusak (HTML merujuk `/api/media/<id>` tapi route-nya 404) — keluar
  non-nol dan menunjuk `/api/media/… → 404` secara spesifik.

### Fixed — Dua cover artikel mati (ID foto Unsplash dihapus di sisi Unsplash)

`studi-kasus-sistem-kasir-umkm-offline-first` dan
`windows-security-hardening-untuk-workstation-dan-server` menunjuk foto
Unsplash yang sekarang membalas **404 dari Unsplash sendiri** — 9 URL Unsplash
lainnya masih sehat. Diganti dengan foto bertema dan sudah diverifikasi
200 (tablet POS + kasir; desktop Windows dengan panel Security terbuka).
Halaman `/artikel` memakai ISR `revalidate = 60`, jadi perubahan tampil tanpa
deploy; kedua URL juga dikirim ke IndexNow (Bing) dan terverifikasi merender
dengan 0 gambar rusak.

> Catatan: `npm run test:e2e` lokal tidak dijalankan di sini karena Next 16
> menolak dua dev server di satu direktori; CI menjalankannya seperti biasa.

### Security — `next` 16.3.5 → 16.3.8 (RCE di `next/og`, GHSA-vcvr-r3jv-pc5j)

`npm audit --audit-level=high` (checklist pra-deploy) gagal dengan satu temuan
**critical**: `next@16.3.5` berada di rentan `>=16.2.0 <16.3.6` — *Remote Code
Execution in `next/og` ImageResponse*. Bukan temuan teoritis di sini: OG image
situs ini dirender lewat `next/og` (`src/app/opengraph-image.tsx` +
`src/lib/og-image.ts`) dari input yang bisa dipengaruhi konten, jadi permukaan
serangnya nyata.

- Dipatch ke `^16.3.8` (versi patch, sebaris minor). Verifikasi ulang pada
  artefak `next start`: `/opengraph-image` 200 `image/png` (387 KB),
  `/api/media/<id>` 200 `image/png`, `robots.txt`/`sitemap.xml` 200, dan
  slug tak dikenal di `/toko`, `/artikel`, `/proyek` tetap 404. `tsc`,
  `eslint --max-warnings=0`, `vitest` 436/436, `check:media`, dan
  `next build` semuanya hijau.
- Enam temuan `high` sisanya hanya rantai lint-time
  (`eslint-config-next` → `fast-glob`/`micromatch`/`brace-expansion`) dan
  perbaikannya memaksa turun ke `eslint-config-next@14`, ditunda terpisah.

### Added — Storage gambar pindah ke database (Postgres bytea)

Upload gambar admin kini disimpan **langsung di Postgres** (tabel `media`,
kolom `data` bertipe `bytea`) dan dilayani via `GET /api/media/<id>`.
Tujuannya: satu penyimpanan saja — backend + database yang sudah ada — tanpa
CDN/S3 eksternal dan tanpa menulis ke filesystem (yang read-only di
serverless Vercel).

- **Skema**: tabel baru `media` (id uuid, name, mime, size, data bytea,
  created_at + index) di `src/db/schema.ts`; drizzle-orm 0.45 tidak
  menyediakan tipe `bytea` bawaan, jadi didefinisikan via `customType`.
  Migration: `drizzle/0010_tidy_texas_twister.sql` (sekalian menambal
  `settings_history` yang drift — tabel sudah dipakai kode tapi belum pernah
  di-generate migration-nya).
- **Penyimpanan** (`src/lib/storage.ts`): seluruh jalur Bunny Storage
  (getBunnyConfig/putBunny/listBunny/deleteBunny) dihapus, diganti
  `putMedia`/`listMediaItems`/`getMedia`/`deleteMediaRow`. Validasi keamanan
  (whitelist MIME, magic bytes, max 20MB) tetap utuh dan terpusat.
- **Penyajian**: route `src/app/api/media/[id]/route.ts` — Content-Type dari
  MIME hasil validasi + `Cache-Control: immutable` (id UUID tidak pernah
  berubah isinya). Id divalidasi format UUID sebelum query.
- **Server actions** (`src/lib/local-upload.ts`): upload/list/delete memakai
  DB; URL yang dikembalikan berbentuk path relatif `/api/media/<id>` agar
  tetap valid pindah host. Guard EROFS dan path filesystem dihapus — tidak
  ada lagi tulis ke disk.
- **UI**: Media Library menampilkan badge "Database (Neon Postgres)";
  panel `/admin/system` melaporkan storage via DB, bukan Bunny/upload lokal.
- **ENV tidak lagi dipakai**: `BUNNY_STORAGE_ZONE_NAME`,
  `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_REGION`, `BUNNY_CDN_HOSTNAME`,
  `NEXT_PUBLIC_BUNNY_PULL_ZONE_URL` aman dihapus dari Vercel.
- **Gambar lama di `public/uploads`** (local-only, sudah di-gitignore) tidak
  dimigrasi otomatis; referensi lama yang masih path `/uploads/...` tetap
  dilayani sebagai file statis biasa di lokal.

### Fixed — Audit 2026-10-05: header `Cache-Control: immutable` media tertimpa `no-store`

`next.config.ts` punya rule blanket `source: "/api/:path*"` →
`Cache-Control: no-store, max-age=0` (untuk cegah cache endpoint sensitif).
Rule itu **menimpa** header immutable yang di-set route media, sehingga setiap
  render gambar memukul Postgres + transfer bytea penuh tanpa pernah di-cache.

- **Fix**: rule baru `source: "/api/media/:path*"` →
  `public, max-age=31536000, immutable` diletakkan **setelah** rule `/api/*`
  di atas, sehingga hanya path media yang di-cache; endpoint API lain tetap
  `no-store` (diverifikasi: `/api/indexnow` masih 405 + no-store).
- **Verifikasi live**: probe HTTP ke dev server — sebelum fix header terbaca
  `no-store, max-age=0`; setelah fix `public, max-age=31536000, immutable`,
  body PNG 4096 byte utuh, magic bytes benar.
- **Dokumentasi diperbarui**: README, DEPLOYMENT.md, SECURITY.md, .env.example
  masih mendeskripsikan Bunny Storage/`public/uploads` (sudah tidak ada
  kodenya) — ditarik ke deskripsi storage DB (bytea Postgres).

### Fixed — Halaman detail produk: `og:image` dan `twitter:image` beda gambar

Saat `/toko/<slug>` dishare, Open Graph menampilkan foto produk tetapi Twitter
menampilkan kartu `/opengraph-image` (avatar) — dua platform memperlihatkan
gambar berbeda dari link yang sama. Diverifikasi dari HTML live sebelum fix:

- `og:image` → `https://images.unsplash.com/photo-1517842645767-…`
- `twitter:image` → `http://localhost:3000/opengraph-image`
- `twitter:title` → juga ikut salah: menampilkan judul profil
  ("Sigit Adi Irianto — …") alih-alih judul produk.

- **Akar masalah**: halaman hanya mengembalikan `openGraph`, tidak `twitter`.
  Karena objek metadata child meng-*replace* objek sejenis di layout, field
  `twitter` diwarisi utuh dari `generateDynamicMetadata` — termasuk gambar dan
  judulnya yang memang ditujukan untuk halaman root.
- **Fix** (`src/app/(public)/toko/[slug]/page.tsx`): blok `twitter` kini
  didefinisikan berdampingan dengan `openGraph`, memakai `absoluteImageUrl()`
  yang sama untuk kedua platform — sehingga `og:image` dan `twitter:image`
  dijamin menunjuk URL identik. `twitter:title`/`twitter:description` juga
  disamakan dengan `og:*`. Ditambah `og:image:alt` dari nama produk.
- **Test**: 4 test baru di `tests/og-detail-metadata.test.ts` memanggil
  `generateMetadata` produk langsung — kecocokan URL og↔twitter, judul produk
  (bukan judul profil), path relatif di-absolut-kan, dan fallback kartu avatar.
  Total suite 364/364 hijau.
- **Verifikasi live**: 7 halaman dicek berpasangan — `/`, `/artikel`,
  `/artikel/<slug>`, `/proyek`, `/proyek/<slug>`, dua `/toko/<slug>` —
  semuanya `og:image` == `twitter:image`. `tsc` dan `eslint` bersih.
- **Catatan tipe**: `Twitter` di Next adalah union yang termasuk
  `TwitterMetadata` (tanpa `card`), jadi `md.twitter.card` tidak sah secara
  tipe; test membaca `card` lewat narrowing `in`, bukan `any`/suppress.

### Fixed — Halaman detail artikel & proyek tidak punya `og:image` saat dishare

Share link `/artikel/<slug>` dan `/proyek/<slug>` ke WhatsApp/Telegram/X tidak
menampilkan gambar sama sekali. Diverifikasi dari HTML live: kedua halaman
mempunyai `og:title`, `og:url`, dan `twitter:card summary_large_image`, tetapi
**nol `og:image` dan nol `twitter:image`** — crawler justru mendapat kartu
kosong karena `summary_large_image` dinyatakan tanpa gambar.

- **Akar masalah**: `generateMetadata` di kedua halaman mengembalikan objek
  `openGraph` sendiri **tanpa field `images`**. Next.js meng-*replace* seluruh
  objek `openGraph` milik layout (bukan merge per-field), sehingga `images`
  turunan dari `generateDynamicMetadata` ikut terbuang. Halaman daftar
  `/artikel` & `/proyek` tidak terdampak karena memang mengisi `images`.
- **Fix**: helper baru `absoluteImageUrl()` di `src/lib/seo.ts` meresolvi
  cover konten ke URL absolut — dengan fallback ke `/opengraph-image` (kartu
  berisi avatar profil) bila cover kosong. Dipakai oleh kedua halaman untuk
  `openGraph.images` **dan** `twitter.images`, sehingga OG dan Twitter selalu
  menampilkan gambar yang sama.
- **Bentuk sumber didukung**: URL absolut CDN, path relatif hasil upload DB
  (`/api/media/<uuid>`), maupun legacy (`/uploads/...`) — konsisten dengan
  JSON-LD `BlogPosting.image` / `SoftwareApplication.image` sehingga crawler
  yang membaca meta tag dan yang membaca JSON-LD tidak melihat URL berbeda.
  `baseUrl` dinormalkan agar tidak menghasilkan `//` ganda.
- **Test**: `tests/og-detail-metadata.test.ts` (7 test integrasi memanggil
  `generateMetadata` langsung dengan data di-mock — cover ada, cover kosong,
  path relatif, slug tidak ada) + 5 test `absoluteImageUrl` di
  `tests/seo.test.ts`. Total suite 360/360 hijau; `tsc` dan `eslint` bersih.
- **Verifikasi live**: `/artikel/arsitektur-retro-os-nextjs-15` kini memancarkan
  `og:image` + `og:image:alt` + `twitter:image` menunjuk cover Unsplash;
  `/proyek/sentinel-soc` menunjuk thumbnail Imgix. Regresi dicek: `/`,
  `/artikel`, `/proyek`, dan `/toko/<slug>` tetap seperti sebelumnya.

### Fixed — Sisa cover artikel masih menunjuk `/uploads/` yang di-gitignore

Setelah `avatar_url` dimigrasi (entri di bawah), audit menyisir **seluruh**
kolom teks/JSON di seluruh tabel (`information_schema` → query `like '%uploads/%'`)
untuk menemukan referensi path upload lama lain. Hasilnya persis dua baris,
keduanya `articles.image_url`:

- `membangun-dashboard-halaqah-…-taklim` → `/uploads/1789177425748-93e9001a.png`
- `membuat-video-di-chatgpt` → `/uploads/1791150657181-86612d05.png`

Keduanya memakai file di `public/uploads/` yang di-gitignore → cover ini 404 di
produksi (hero artikel, listing `/artikel`, `og:image`, JSON-LD).

- **Fix (data, dua langkah per artikel)**: file dimasukkan ke tabel `media`
  (bytea, MIME `image/png` hasil cek magic bytes) — id baru
  `3f069a13-121d-485a-9daa-7596533d5412` (2.520.991 byte) dan
  `0b15a13f-7953-49ec-b55e-9c95bf9d6767` (2.284.037 byte) — lalu `image_url`
  di-point ke `/api/media/<id>`. Sebelum insert, isi `media` dicek dulu untuk
  memakai baris identik bila sudah ada (tidak ada; avatar sudah tercatat).
- **Byte identik**: sha256 respons route media == file lokal (`e93c1c08bbaf…`
  dan `e9728d6c689f…`) — cover yang sama, bukan penggantian gambar.
- **Verifikasi live**: rescan seluruh tabel → **0** referensi tersisa;
  `GET /api/media/<id>` keduanya 200 `image/png` + `immutable`; halaman detail
  kedua artikel memancarkan `og:image` == `twitter:image` ke `/api/media/…`
  dan **0** kemunculan `/uploads/`; listing `/artikel` menampilkan kedua cover
  (img `naturalWidth` 1536, bukan gambar rusak).
- **Rollback** (file lokal masih ada):
  `update articles set image_url='/uploads/1789177425748-93e9001a.png' where slug='membangun-dashboard-halaqah-digitalisasi-presensi-santri-dan-evaluasi-kurikulum-taklim';` dan
  `update articles set image_url='/uploads/1791150657181-86612d05.png' where slug='membuat-video-di-chatgpt';`
  (dua baris `media` yang ditambahkan ikut bisa dihapus).
- **Referensi hardcoded di source**: tidak ada — yang tersisa hanya komentar
  dokumentasi dan test jalur legacy (`tests/og-image.test.ts`,
  `tests/seo.test.ts`) yang memang menguji dukungan path `/uploads/`.
### Added — Analisis SEO + saran keyword di Redaksi (deterministik, tanpa AI)

Bagian 1 dari rencana SEO: sebelum admin menulis panjang, admin
butuh pemeriksaan cepat apakah judul, slug, meta description, struktur heading,
dan internal link-nya sudah benar. Sekarang satu klik memunculkan temuannya
beserta saran siap pakai.

- **Analyzer murni (`src/lib/seo-keywords.ts`)**: **sengaja tidak memanggil
  LLM**. Analisisnya deterministik, jadi (1) tetap jalan meski kuota Cloud AI
  habis, (2) hasilnya bisa diuji unit, dan (3) murah serta cepat.
- **Batas yang ditulis jujur di UI**: skor keyword dihitung dari frekuensi
  frasa DI DALAM konten itu sendiri, **bukan data volume pencarian** (tidak ada
  akses Keyword Planner/Ahrefs/Semrush). Panel menampilkan catatan ini supaya
  angkanya tidak disalahartikan sebagai data pasar.
- **Kandidat keyword**: unigram + bigram + trigram, dibobot frekuensi; panjang
  frasa **dibatasi maksimal 2 kata** karena trigram terlalu spesifik dan jarang
  jadi intent pencarian. Frasa berpotongan (mis. `keyword nextjs diulang`) tidak
  boleh mengalahkan bigram bermakna.
- **Keyword utama**: diutamakan frasa yang juga muncul di judul, maksimal dua
  kata, dengan tie-break ke frasa lebih spesifik.
- **Pemeriksaan**: panjang judul (30-65), slug (format + maksimal 6 kata +
  memuat keyword), meta description (120-165), ketebalan isi (minimal 600 kata),
  keberadaan H2, jumlah internal link, **density** kata kunci (0-3%), dan
  rata-rata panjang kalimat sebagai proxy keterbacaan. Temuan dikelompokkan
  `critical` / `warning` / `opportunity` sesuai dampaknya.
- **Saran siap pakai**: alternatif judul, slug dari kata kunci, meta description
  dari dua kalimat pertama, dan **internal link ke 3 halaman** yang paling
  berbagi frasa dengan konten ini. Semua lewat tombol **Terapkan** per field —
  panel tidak pernah menulis ulang konten diam-diam.
- **Server action `analyzeContentSeoAction`**: `verifyAdmin()` + rate limit
  (30/5 menit, tidak memakai kuota API), supplying konteks situs dari artikel,
  proyek, dan produk terbit untuk saran internal link.
- **Temuan dari data produksi** (smoke test ke artikel sungguhan, bukan
  fixture): 4 dari 5 artikel/sample **tidak punya H2 dan tidak punya internal
  link sama sekali**, dan beberapa artikel hanya ~750 karakter (10 baris) —
  jauh di bawah ambang isi minimum. Satu artikel kena density 4,49%. Jadi
  temuan analyzer bukan sekadar formalitas; ada pekerjaan isi nyata menunggu.
- **Test**: `tests/seo-keywords.test.ts` — 22 test (tokenisasi, kandidat,
  keyword utama, slug, density, tiap aturan finding, saran internal link).
  Dua bug nyata ketangkap oleh test: `countPhrase` gagal menghitung frasa di
  awal baris baru (haystack berisi newline), dan trigram menyalip bigram —
  keduanya diperbaiki di implementasi, bukan dikurangi expektasi test.
### Added — Bikin gambar cover dengan AI di Redaksi (artikel, proyek, produk)

Field **"URL Gambar (wajib)"** di composer Redaksi adalah satu-satunya field
wajib yang tidak bisa diisi dari draf AI — draf sendiri bahkan menghapus
`imageUrl` (lihat redaksi-draft.ts). Akibatnya tiap artikel baru harus mencari
gambar manual sebelum bisa disimpan. Sekarang satu klik menghasilkannya.

- **Layer AI (`src/lib/ai-image.ts`)**: `generateCoverImage()` memanggil
  Gemini image model dengan **rantai fallback** `gemini-3.1-flash-lite-image`
  → `gemini-3.1-flash-image` → `gemini-3-pro-image` (murah/cepat dulu). Daftar ini
  bukan tebakan: hasil **probe ListModels** langsung dengan key aktif
  (2026-10-05) menunjukkan 6 model berkemampuan gambar tersedia. Bisa
  ditimpa lewat env `GEMINI_IMAGE_MODEL`.
- **Prompt disusun dari isi konten** (`buildCoverImagePrompt`): judul +
  deskripsi + cuplikan badan (tag HTML dibuang), rasio 16:9 karena cover dipakai
  untuk og:image (1200x630) sekaligus thumbnail katalog, plus larangan eksplisit
  **teks/logo/watermark** — penyebab paling sering cover hasil AI terlihat rusak
  (huruf pseudografis). Gaya visual menyesuaikan tipe konten.
- **Server action `generateRedaksiImageAction`**: `verifyAdmin()` + rate limit
  terpisah dari draf teks (10/5 menit, satu klik = satu panggilan berbayar),
  MIME dari provider **tidak dipercaya** — diverifikasi ulang lewat magic bytes
  (`matchesImageSignature`, whitelist yang sama dengan upload manual) sebelum
  disimpan lewat `putMedia()`. Hasil balik ke composer adalah URL
  `/api/media/<id>` — gambar ikut ter-deploy bersama DB, bukan file lokal yang
  bisa hilang seperti dulu.
- **UI (`redaksi-composer.tsx`)**: tombol **"Buat gambar dengan AI"** di bawah
  field gambar, lengkap dengan status sibuk, pratinjau thumbnail, dan tombol
  berubah jadi **"Buat ulang gambar"** untuk percobaan berikutnya. Field
  `imageUrl` langsung terisi tapi tetap bisa diganti manual admin.
- **Hanya untuk tipe yang punya field gambar**: artikel, proyek, produk.
  Service/testimonial/profile ditolak dengan pesan jelas.
- **Kontrak never-throw**: kegagalan dikembalikan sebagai
  `{ ok: false, error }` dengan pesan yang bisa ditindaklanjuti. 429 di ketiga
  model dikenali sebagai **kuota akun habis** dan diberi petunjuk (tunggu reset
  atau ganti key di /admin/cloud-ai), bukan error teknis mentah.
- **Verifikasi live**: probe nyata ke API mengembalikan **HTTP 429
  "quota exceeded"** pada ketiga model — artinya endpoint, key, nama model,
  dan payload sudah benar (429 Struktural dari Google, bukan 400), tetapi
  kuota akun sedang habis sehingga byte gambar belum bisa dibuktikan keluar.
  Semua unit test memakai fetch di-mock.
- **Test**: `tests/ai-image.test.ts` — 17 test (prompt per tipe, larangan teks,
  ekstraksi inlineData, rantai model, fallback saat 429, pesan kuota, tidak
  pernah melempar saat jaringan gagal).
### Fixed — Audit SEO/GSC 2026-10-05: host duplikat, kartu produk, h1 beranda, sitemap

Masukan: GSC melaporkan 17 URL **"Alternate page with proper canonical tag"**
dan 14 URL **"Crawled - currently not indexed"** (semua varian `?contactSubject=`,
`?lang=`, dan satu `http://porto.sigitadi.id/`). Audit dilakukan dengan probe
HTTP read-only ke produksi, lalu kode diperbaiki seperlunya.

**Hasil audit — apa yang sebenarnya sudah benar** (terverifikasi di produksi,
jadi tidak perlu disentuh lagi):

- `/?contactSubject=…&contactBody=…` → **308** ke `/#kontak` (fix konsolidasi
  URL lama sudah live; itu penyebab utama 14 URL "tidak terindeks" itu).
- `/?lang=id|en` → 200 dengan `<link rel="canonical">` ke URL bersih ✓.
- `www.sigitadi.id` dan `http://` → redirect ke apex `https://sigitadi.id` ✓.
- Trailing slash (`/proyek/`) → redirect ke `/proyek`; path huruf besar
  (`/PROYEK`) → 404 ✓.

**Yang diperbaiki di kode:**

- **Host duplikat `porto.sigitadi.id`** (MASIH 200 + canonical ke dirinya
  sendiri, menyajikan situs lama statis `ai-engineer.html` /
  `secops-engineer.html`). Dua salinan utuh dengan canonical masing-masing
  memecah otoritas backlink dan membuat Bing/Google tidak tahu URL mana yang
  benar-benar diindeks. Helper baru `src/lib/canonical-host.ts`
  (`isAliasHostname`/`resolveHostRedirectUrl`, murni) menyalakan **308 ke apex
  untuk setiap subdomain alias**, disambungkan di `src/proxy.ts` (kedua
  cabang: dengan dan tanpa Clerk). Aturannya sengaja sempit — hanya subdomain
  dari domain kanonik; preview deployment Vercel (`*.vercel.app`) dan localhost
  tidak disentuh agar share tautan preview tidak rusak.
  **TINDAKAN INFRA (tidak bisa dari kode):** `porto.sigitadi.id` masih
  menyajikan deployment lama, jadi hapus alias domain / record DNS-nya — atau
  arahkan ke deployment ini agar redirect di atas langsung berlaku. Meskipun
  tidak disentuh, `robots.txt` produksi tetap perlu decode ulang setelah
  subdomain hilang agar GSC cepat melepaskannya.
- **Kartu produk di hasil pencarian**: `/toko/<slug>` tidak pernah memancarkan
  JSON-LD apa pun (nol `application/ld+json` di HTML produksi) — artikel dan
  proyek sudah punya BlogPosting/BreadcrumbList, produk tidak. Builder murni
  baru `src/lib/product-schema.ts` kini memancarkan **Product** (nama,
  deskripsi, gambar absolut, sku, kategori) + **Offer** (harga IDR dari
  `priceAmount`, ketersediaan dari `stock`, penjual). Dua hal SENGAJA tidak
  dikarang: **aggregateRating/review** (data produk tidak punya rating; memalsukan
  structured data review melanggar pedoman Google) dan **BreadcrumbList**
  (section Toko tidak punya halaman katalog — `/toko` me-redirect ke anchor,
  sehingga URL breadcrumb di tengah tidak bisa di-crawl). Brand memakai konstanta
  `SITE_BRAND` (nama yang sama dengan schema WebSite) — BUKAN `STORE_NAME`
  ("Toko"), yang hanya label UI dilokalkan dan akan dibaca Google sebagai brand
  generik yang bertabrakan dengan entitas situs.
- **Beranda tanpa `<h1>`**: hero visual hanya muncul setelah boot client-side,
  sehingga HTML yang dilihat crawler tidak punya heading utama sama sekali
  (terverifikasi: 0 tag `h1` di HTML produksi beranda). Heading nama + headline di blok `sr-only` sekarang dipromosikan jadi `<h1>`.
- **Sitemap**: route statis dan produk memakai `lastModified: new Date()`,
  sehingga SETIAP fetch sitemap menandai seluruh URL sebagai baru diubah —
  Google menganggap semua halaman berubah tiap hari dan boros crawl budget
  untuk perubahan yang tidak ada. `lastModified` dihapus untuk route tanpa
  tanggal nyata (statis & produk); artikel/proyek tetap memakai
  `updatedAt`/`createdAt` yang sebenarnya. `/artikel` juga turun dari `daily`
  ke `weekly` (katalog berubah saat ada artikel baru, bukan tiap hari).

**Catatan untuk `?lang=id|en`** (kelompok URL terbesar di laporan GSC):
canonical-nya sudah benar, dan tidak ada satu pun link internal yang membuat
URL itu — duplikatnya berasal dari share/backlink lama. Status "Alternate page
with proper canonical tag" memang label Google untuk URL canonicalized yang
sengaja tidak diindeks. Menhapusnya berarti mematikan fitur deep-link bahasa
(link `?lang=en` yang dibagikan orang akan mendarat di versi Indonesia),
jadi **tidak** diubah di sini karena itu keputusan produk, bukan bug.

**Test**: `tests/seo-host-product.test.ts` — 14 test (normalisasi harga,
Product/Offer lengkap, gallery path relatif, tanpa offers saat harga kosong,
OutOfStock, tanpa rating dikarang, brand, alias-host + query preservation, dan
wiring proxy beneran mengembalikan 308).
### Fixed — Slug produk/konten tak dikenal membalas 200, bukan 404

`/toko/<slug>`, `/artikel/<slug>`, dan `/proyek/<slug>` untuk slug yang tidak
ada di database **sudah** memanggil `notFound()` sejak lama, tapi responsnya
tetap **HTTP 200** dengan body halaman not-found (soft-404). Pengunjung yang
menyalin URL salah tidak diberi tanda, dan crawler, monitoring, serta cache
semuanya melihat “halaman sukses”.

- **Akar masalah**: `loading.tsx` berada di `src/app/(public)/`, yaitu akar
  route group — jadi Suspense boundary-nya membungkus **seluruh** anak, bukan
  cuma beranda. Shell skeleton ter-flush dengan status 200 lebih dulu,
  sedangkan `notFound()` baru dievaluasi setelahnya; status yang sudah
  terkirim tidak bisa diubah. Terverifikasi empiris: dengan `loading.tsx`
  sementara dihapus, ketiga rute langsung membalas 404 tanpa sentuhan kode
  lain — jadi penyebabnya pasti, bukan tebakan.
- **Fix (blast radius terkecil)**: `page.tsx` beranda + `loading.tsx` dipindah
  ke route group baru `src/app/(public)/(home)/`, sehingga skeleton hanya
  menutupi beranda. Halaman detail konten tidak lagi punya boundary di
  atasnya → `notFound()` menghasilkan HTTP 404 sungguhan. Layout,
  `template.tsx`, dan URL beranda (`/`) tidak berubah sama sekali.
- **Verifikasi live**: `/toko/tidak-ada`, `/artikel/tidak-ada`,
  `/proyek/tidak-ada` → **404** (body not-found kustom tetap ter-render);
  `/toko/template-portfolio-notion`, `/`, `/artikel`, `/proyek` → 200;
  `/toko` tetap 308 ke `/#produk`; path asing tetap 404.
- **Test**: `e2e/public.spec.ts` — spec baru **“slug tak dikenal benar-benar
  404, bukan soft-404 berstatus 200”** meng-request ketiga path dan
  mengunci status 404. Suite publik lokal hijau 6/6.
- **Konsekuensi yang disadari**: katalog `/artikel` dan `/proyek` ikut
  kehilangan instant skeleton (segment yang sama dengan halaman detailnya —
  `loading.tsx` berlaku untuk anak juga). Animasi boot OS + `template.tsx`
  tetap menutupi perpindahan.
- **Catatan operasional**: setelah pemindahan file rute,
  `.next/types/validator.ts` masih menunjuk path lama sampai `npx next
  typegen` dijalankan — tanpa itu `tsc --noEmit` gagal dengan TS2307.
### Added — Gate `npm run check:media`: URL gambar tak tersedia di produksi = build gagal

Dua entri di atas perlu diperbaiki manual karena bug-nya senyap: `avatar_url`
dan dua `articles.image_url` menunjuk `/uploads/...` yang file-nya di-
`.gitignore`, sehingga **lokal selalu hijau** dan baru 404 setelah deploy di
Vercel. Audit lama baru bisa menemukan ini setelah rusak. Sekarang ia jadi gate.

- **Audit baru (`src/lib/media-url-audit.ts`)**: `auditStoredImageUrls()`
  menyisir kolom bergambar di seluruh tabel dan menandai 7 jenis masalah —
  `/uploads/<file>` (file .gitignore), `/api/media/<id>` yang id-nya tidak ada
  di tabel `media`, id bukan UUID (route 404), URL `localhost`/IP privat,
  `http://` (harus https), path relatif yang tidak dilayani Next.js, dan nilai
  kosong. `data:image/...` dan `https://` host luar dianggap aman. Read-only.
- **Dua lapis filter agar nol false positive**: kolom skalar hanya diperiksa
  bila NAMANYA bergambar (`isImageFieldName`); kolom JSON hanya diambil bila
  key-nya (atau nama kolom, mis. array `gallery`) bergambar — string biasa
  yang kebetulan memuat `/uploads/x.png` di dalam deskripsi bukan field gambar.
  Tabel historis (`settings_history`, `audit_logs`) dikecualikan: isinya
  catatan masa lalu, bukan konfigurasi yang disajikan.
- **Gate**: `npm run check:media` → `tests/media-url-audit.test.ts`. Blok live
  (butuh `DATABASE_URL`) memanggil audit sungguhan dan **gagal** bila ada
  temuan. Tanpa `DATABASE_URL` blok di-skip — CI memang sengaja berjalan
  tanpa DB (lihat `.github/workflows/ci.yml`), jadi gate tidak memutus build
  yang memang tidak bisa menyentuh database.
- **Gate dibuktikan benar-benar gagal**: `articles.image_url` sementara diisi
  `/uploads/tmp-gate-check.png` → `check:media` exit 1 dengan pesan
  `legacy-uploads-path` + kolom & baris yang salah; setelah itu nilai
  dikembalikan dan read-back identik dengan nilai awal.
- **Terlihat di admin**: `/admin/system` → Integrasi → **"Audit URL gambar"**
  menampilkan jumlah kolom/nilai yang diperiksa, jumlah temuan (20 pertama),
  dan alasannya. Query dibungkus try/catch agar kegagalan audit tidak
  menjatuhkan seluruh panel status.
- **Satu sumber kebenaran untuk format id**: `MEDIA_ID_RE` + `isMediaId()` di
  `src/lib/storage.ts` dipakai route `GET /api/media/[id]`, resolver Open Graph,
  dan audit — ketiga regex UUID tidak lagi bisa berbeda antar jalur.
  Sengaja memakai **fungsi**, bukan regex yang diimpor lalu dirakit jadi RegExp
  baru: `vi.mock("@/lib/storage")` mengisi ekspor modul SETELAH modul lain
  dievaluasi, sehingga `new RegExp(MEDIA_ID_RE.source)` di level modul tertangkap
  `undefined` — regresi nyata yang ketahuan saat 1 test OG gagal (lalu hijau lagi).
- **Test**: `tests/media-url-audit.test.ts` — 19 test (18 unit untuk klasifikasi
  tiap jenis masalah + ekstraksi dari JSON bersarang, 1 live-DB gate).
- **Dokumentasi**: `DEPLOYMENT.md` → bagian baru **"Gate URL Gambar
  (Pra-Deploy)"** + checklist hardening.
### Fixed — `profiles.avatar_url` menunjuk baris media DB (avatar hilang di produksi)

`avatar_url` pemilik masih menunjuk `/uploads/1791098437470-5b89105b.png`, padahal
`public/uploads/` masuk `.gitignore` (lihat entri Storage di atas) — file itu hanya
ada di mesin lokal, sehingga di Vercel hero, JSON-LD `Person.image`, dan kartu OG
kebagian gambar yang tidak pernah ikut ter-deploy.

- **Perbaikan data (bukan kode)**: baris `profiles` di-point ke media DB yang sudah
  ada: `/api/media/97d87474-b119-4f87-b2fe-ccbeaa2b5a35` — bytea Postgres, jadi
  ikut ter-deploy tanpa file di repo.
- **Bukan ganti gambar**: byte identik dengan file lama (sha256 `2ffee54d…43eda`,
  2.532.211 byte, PNG 1254×1254) — dibuktikan `sha256sum` file lokal vs isi respons
  `GET /api/media/<id>` yang sama persis.
- **Verifikasi live** (dev :51371): `GET /api/media/97d87474-…` → 200
  `image/png` 2.532.211 byte + `Cache-Control: public, max-age=31536000, immutable`;
  HTML homepage memuat path itu 7× (JSON-LD ×2 + payload RSC) dan **nol** referensi
  `/uploads/1791098437470…`; `<img>` hero di browser punya `naturalWidth` 1254
  (bukan 0/broken); `GET /opengraph-image` → 200 PNG 1200×630 388KB berisi foto
  avatar.
- **Rollback** (bila file lama ikut dideploy):
  `update profiles set avatar_url='/uploads/1791098437470-5b89105b.png' where id='owner';`
### Fixed — Avatar profil tidak muncul di pratinjau share (WhatsApp/Telegram/sosial)

`/opengraph-image` merender **monogram inisial**, bukan foto avatar, ketika
link dibagikan ke WhatsApp/Telegram/dll. Penyebabnya: tes lama
`/^https?:\/\//` menolak `avatar_url` berupa path relatif
(`/uploads/…`, dan kini `/api/media/<id>`), sehingga gambar dianggap tidak ada.

- **Resolver baru (`src/lib/og-image.ts`)**: `resolveOgImageSrc()` menerima
  tiga bentuk referensi — `/api/media/<uuid>` (bytea dari DB), `/uploads/…`
  (legacy, dibaca dari `public/`), dan `http(s)://…` (fetch) — lalu
  mengembalikan **data URL**. Hasil berupa data URL bukan Buffer karena
  diuji langsung ke next/og yang dibundel: Buffer/Uint8Array mentah untuk
  PNG/JPEG melempar `First argument to DataView constructor must be an
  ArrayBuffer` (parser dimensi `Js`/`Ps` memanggil `new DataView(A)`),
  sementara jalur data URL aman untuk PNG, JPEG, dan GIF.
- **Whitelist format satori**: hanya `image/png`, `image/jpeg`, `image/gif`
  yang diterima (set `qI` di next/og). WEBP/AVIF/BMP lolos whitelist upload
  tapi **melempar** di satori — kalau diteruskan route OG akan 500; kini jatuh
  ke monogram dengan warning. Magic bytes dicek ulang via
  `matchesImageSignature`, bukan percaya ekstensi/header.
- **Keamanan**: path traversal legacy (`/uploads/../../package.json`) diblokir
  sebelum `readFile`; referensi tak dikenal (`javascript:`, `data:`) ditolak;
  resolver tidak pernah throw — gagal = monogram, bukan 500.
- **Override admin ikut diperbaiki** (`opengraph-image.tsx`): gambar OG kustom
  dari `/admin/seo` kini boleh path relatif (`/api/media/<id>`) maupun absolut
  — sebelumnya hanya absolut yang dipakai.
- **JSON-LD (`json-ld.tsx`)**: `image` pada schema Person kini selalu absolut
  (`baseUrl` + path relatif), bukan path mentah yang tidak bisa di-crawl
  validator Google.
- **Verifikasi live**: GET `/opengraph-image` di dev server → 200, PNG 1200×630
  388KB, dan screenshot memperlihatkan foto avatar (bukan monogram);
  `og:image`/`twitter:image` menunjuk `/opengraph-image` dengan URL absolut.
- **Test**: `tests/og-image.test.ts` — 14 test (3 jalur referensi + keamanan),
  total suite 348/348 hijau; `tsc` dan `eslint` bersih.

### Fixed — Audit 2026-10-05: model Gemini default & cadangan menyasar model pensiun (404)

Probe langsung ke API Gemini (ListModels + `generateContent` per kandidat,
key diambil dari `settings.cloud_ai`) membuktikan beberapa model yang dikodekan
sebagai default/cadangan SUDAH dipensiunkan Google (404 "no longer
available"), sehingga jalur default & beberapa retry menyasar model mati:

- **404 (pensiun, dikeluarkan)**: `gemini-2.5-flash`, `gemini-2.0-flash`,
  `gemini-1.5-flash`, `gemini-2.5-pro`. `gemini-2.5-flash` adalah default
  string terakhir di tiga tempat, jadi installasi baru tanpa pengaturan admin
  default-nya model yang tidak bisa dipanggil.
- **200 OK (sehat, dipakai)**: `gemini-3.5-flash-lite`, `gemini-3.7-flash`,
  `gemini-3.6-flash`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`.
- **429 (hidup, hanya quota free-tier habis karena probing)**:
  `gemini-3.5-flash`, `gemini-flash-latest`, `gemini-3.8-flash` — BUKAN
  pensiun; tetap layak dicoba (quota per-model terpisah, bisa sembuh).

**Yang diubah:**

- **Daftar model cadangan (`ai-provider.ts`)**: ekor berisi
  `gemini-2.5/2.0/1.5-flash` (semua 404 pasti) diganti dengan model 3.x sehat.
  Fix sebelumnya membuat loop retry melompati 404 dengan aman, tapi setiap
  request ke model yang tak akan pernah berhasil tetap membuang waktu dan
  memperlambat cadangan sehat pertama saat quota habis.
- **Default model hemat (`ai-providers.ts`, `cloud-ai-config.ts`,
  `ai-provider.ts`)**: `gemini-2.5-flash` (404) diganti ke alias
  `gemini-flash-lite-latest` yang selalu mengikuti model flash hemat terbaru,
  sehingga tidak stagnan saat Google memensiunkan versi spesifik. Model aktif
  utama tetap dari resolved config (DB admin/env); konstanta ini hanya jaring
  terakhir bila keduanya kosong.
- **Tabel quota free-tier (`gemini-quota.ts`)**: limit RPM/RPD ditambah untuk
  model 3.x sehat (`3.5-flash-lite`, `3.7-flash`, `3.6-flash`,
  `3.1-flash-lite`, `3-flash-preview`, `flash-lite-latest`) yang sebelumnya
  jatuh ke `GLOBAL_DEFAULT` kurang akurat. Entri keluarga 2.x/1.5 tetap
  dipertahankan untuk prefix-matching varian preview lama & request historis.
- **Terverifikasi**: `tsc --noEmit` EXIT 0, `eslint` 0 error, `vitest` 327/327
  (termasuk test baru: keluarga pensiun pasti tidak ada di daftar cadangan
  default; model sehat didahulukan).

### Fixed — Audit 2026-10-04: tracker analytics, label provider, & visibilitas fallback

- **Fixed (code, `visitor-tracker.tsx`)**: hit analytics TIDAK PERNAH terkirim.
  `navigator.sendBeacon` sesuai spesifikasi selalu berjalan dengan credentials
  mode `include`, dan Blob `application/json` memicu preflight — worker tracker
  membalas preflight dengan `Access-Control-Allow-Origin: *` tanpa
  `Allow-Credentials` (diverifikasi via curl OPTIONS), sehingga browser MENOLAK
  request dan error CORS muncul di console. Kini memakai `fetch` +
  `credentials: "omit"` + `keepalive: true` — tetap tanpa cookie (desain anonim
  tracker), preflight wildcard lolos, hit terverifikasi sampai (`POST /hit 200`).
- **Fixed (code, `os-crt-terminal.tsx`)**: tag jawaban cloud terminal
  meng-hardcode `"Gemini"` meski provider efektif bisa openai/anthropic/groq
  dll. Registry kini punya `shortLabel` per provider (`getProviderShortLabel`)
  dan `getCloudAIStatus` meneruskan provider aktif ke terminal.
- **Fixed (code, `retro-bot.tsx`)**: `fallbackReason` dari meta SSE fallback
  kini ditampilkan sebagai badge `⚠ Cloud gagal: <reason>` (bilingual, dengan
  tooltip) di footer panel RetroBot — admin tak perlu buka devtools untuk tahu
  kenapa jawaban jatuh ke lokal. Terverifikasi live: badge muncul dengan
  `insufficient_user_quota`.
- **Security (repo hygiene)**: `scratch/check-db.mjs` (skrap diagnosis sekali pakai
  yang mengandung kredensial DB) ternyata masih ter-track di repo — ditambahkan
  sebelum aturan `/scratch/` di `.gitignore` ada, dan lolos dari pembersihan
  sebelumnya. Dihapus dari index. Catatan: file masih ada di history git lama;
  rotasi kredensial DB disarankan jika isiinya pernah valid.
- **Fixed (build, `scripts/package-deploy.mjs` + `next.config.ts`)**: rekursi
  `deploy_package/deploy_package/…` sedalam 15 level di dalam `.next/standalone`.
  Penyebab: `package-deploy.mjs` menghapus `deploy_package/` baru setelah
  `npm run build` selesai, padahal Next.js standalone tracer ikut menyertakan
  folder root `deploy_package/` yang tersisa dari siklus sebelumnya — lalu
  hasilnya di-copy kembali ke `deploy_package`, bertambah 1 level per siklus
  (path >260 char memicu error "Filename too long" dan membengkakkan ukuran
  paket deploy). Kini `deploy_package/` dihapus SEBELUM build, plus guard
  `outputFileTracingExcludes: { "/": ["./deploy_package/**/*"] }`. Terverifikasi:
  setelah build dengan `deploy_package` 15-level masih ada di root,
  `.next/standalone/deploy_package` tidak lagi terbentuk.
- **Fixed (code, `ai-openai.ts`)**: `readUpstreamError` kini menerima
  `error.code` NUMERIK (beberapa relay memakai `{"code":404}` sebagai angka)
  sehingga reason tetap diagnostic, bukan `status_<http>`.
- **Fixed (config DB)**: `settings.cloud_ai.model` masih `gpt-4o-mini` (relay
  hanya menyajikan gemini-*) — penyebab 503 model_not_found terus berulang.
  Diperbaiki ke `gemini-3.8-flash-high` (satu field, key/baseUrl utuh).
  Tindak lanjut di luar kode: **kuota API key relay habis**
  (`insufficient_user_quota`) —  top up di relay atau ganti provider via
  `/admin/cloud-ai`.
- **Fixed (code, `retrobot/route.ts` + `ai-provider.ts`)**: jawaban cloud
  RetroBot terpotong di ~30-35 karakter. Akar masalah: cabang non-streaming
  memanggil `submitToGeminiMessages` **tanpa** override `maxOutputTokens`,
  sehingga memakai default 300 — di model flash keluarga 2.5+ token "thinking"
  IKUT terhitung di `maxOutputTokens`, reasoning memakan hampir semua budget
  dan `finishReason: MAX_TOKENS` memotong teks yang terlihat. Kini budget
  token/char diturunkan dari `answerStyle` (concise 600/1800, friendly 900/2600,
  detailed 1500/4000) dan diteruskan ke Gemini & Anthropic. Tambahan:
  `trimAnswer` memotong di batas kalimat/kata terakhir yang utuh (bukan tengah
  kata) saat jawaban melebihi `maxChars` — potongan mentah `slice(0, n)` sering
  memotong kalimat di tengah dan terlihat seperti jawaban "truncated".
  Terverifikasi live di browser: badge **CLOUD**, jawaban 1735 karakter utuh
  (services + kontak), tanpa fallback note.
- **Fixed (code, `actions.ts` + `cloud-ai-config.ts` + `retrobot/route.ts`)**:
  saudara dari entri di atas di **jalur terminal** (`askSigitBot` →
  `submitToCloud`, dipakai `os-crt-terminal.tsx`): jawaban terminal masih
  terpotong ~30-35 karakter meski RetroBot sudah diperbaiki. Akar masalahnya
  sekelas, tapi tempatnya berbeda — `submitToCloud` memanggil `submitToGemini`
  / `submitToOpenAI` / `submitToAnthropic` **hanya** dengan `{ config }`, tanpa
  meneruskan `maxOutputTokens` / `maxTokens` / `maxChars`, sehingga ketiganya
  jatuh ke default provider (300 token / 2000 char) dan token "thinking"
  kembali memakan hampir seluruh budget. Tabel budget kini diekstrak menjadi
  satu helper terpusat `getAnswerStyleBudget()` di `cloud-ai-config.ts` (satu
  sumber kebenaran untuk kedua jalur), diteruskan ke ketiga cabang provider di
  `submitToCloud`, dan route RetroBot direfaktor memakai helper yang sama —
  bug ini sendiri muncul karena tabel budget hanya ada di satu jalur, sehingga
  keduanya diam-diam drift. Terverifikasi live di terminal: badge
  **[Sigit_Bot.ai Cloud | Gemini]**, jawaban utuh 1557 karakter (4 poin,
  penutup natural), tanpa potongan. Unit test: 4 kasus baru untuk
  `getAnswerStyleBudget` (token selalu di atas default provider 300 yang
  memicu `MAX_TOKENS`).
- **Fixed (code, `ai-provider.ts` + `ai-anthropic.ts` + `retrobot/route.ts`)**:
  path non-streaming Gemini/Anthropic menelan status HTTP saat gagal — semua
  kegagalan dilaporkan ke client sebagai `fallbackReason: "empty_cloud"`,
  sehingga badge "⚠ Cloud gagal" tidak membedakan quota habis (429), key
  salah (401), overload sementara (503), atau timeout. Kini result membawa
  field `reason` (`status_429` / `status_503` / `status_401` / `network` /
  `empty_cloud`) dan route memakainya sebagai `fallbackReason`. Terverifikasi
  live: saat quota free-tier Gemini habis, badge menampilkan `status_429`.
- **Fixed (config DB)**: model `gemini-flash-latest` (alias → `gemini-3.8-flash`)
  mengalami **429 `RESOURCE_EXHAUSTED`** — quota free-tier Gemini adalah
  **per model** (`limit: 20 requests/window`), dan model itu habis dipakai
  sesi pengujian; reset ~15 jam. Probe langsung ke ListModels +
  `generateContent` untuk tiap kandidat menemukan bahwa model 2.x/1.5 sudah
  **dipensiunkan** (404 "no longer available"), sedangkan `gemini-3.5-flash`
  dan `gemini-3.5-flash-lite` **masih 200 OK**. Model diganti ke
  `gemini-3.5-flash` (lebih baik dari varian `-lite`; terverifikasi menjawab
  natural dalam Bahasa Indonesia, 951 karakter, `finishReason: STOP` —
  bukan `MAX_TOKENS`). RetroBot langsung kembali ke cloud: `meta.source:
  "cloud"` tanpa fallback, 1351 karakter utuh. Pelajaran: quota 429 Gemini
  free-tier tidak perlu menunggu reset — cukup pilih model lain yang masih
  punya jatah di `/admin/cloud-ai`.
- **Fixed (code, `ai-provider.ts` + `ai-anthropic.ts`)**: konsistensi
  `fallbackReason`. Jalur OpenAI sudah memancarkan `unconfigured` saat API
  key masih placeholder, tapi early-return `isPlaceholderKey()` di
  `submitToGemini`, `submitToGeminiMessages`, dan `submitToAnthropic`
  mengembalikan result **tanpa** `reason` → route menjatuhkannya ke
  `empty_cloud`, yang menyesatkan (cloud tidak kosong, tapi belum dikonfigurasi).
  Ketiganya kini memancarkan `reason: "unconfigured"`, sejalan dengan jalur
  OpenAI dan dokumentasi `fallbackReason` di route & CHANGELOG ini.

- **Added (code, `mini-markdown.ts` + `mini-markdown.tsx`)**: jawaban Gemini
  memakai markdown (`**bold**`, `*italic*`, list, heading), tapi RetroBot
  menampilkannya mentah sebagai asterisk literal — terlihat seperti output
  "rusak". Kini jawaban bot dirender sebagai teks terformat lewat parser
  minimal (nol dependensi baru): `**bold**` → `<strong>`, `*italic*`/`_italic_`
  → `<em>`, `` `code` `` → `<code>`, `[teks](url)` → `<a>`, serta list urut/
  tidak-urut dan heading — disertai renderer React tanpa `dangerouslySetInnerHTML`
  (XSS-proof: semua node dibangun dari string yang di-tokenisasi). Parser adalah
  transformasi data murni agar tetap unit-testable di environment node vitest.
  Aman terhadap streaming: markup yang belum ditutup (`**bo` tanpa penutup)
  ditampilkan apa adanya sampai penandanya lengkap. Bubble pesan **user** tetap
  dirender mentah (hanya jawaban AI yang diformat). Terminal CRT (`os-crt-terminal.tsx`)
  dapat treatment sebaris (bold/italic/code/link per baris log) karena sudah
  memecah jawaban per baris sendiri. Terverifikasi live: `<strong>`/`<em>` dan
  `<ul>`/`<ol>` muncul di bubble bot, **nol** asterisk literal tersisa, console
  bersih. Unit test: 21 kasus (semua token + streaming parsial).

- **Added (code, `ai-provider.ts` + `retrobot/route.ts`)**: RetroBot kini
  otomatis mencoba **model Gemini cadangan** saat model aktif kena 429 (quota
  habis) atau 503 (overload), sebelum akhirnya jatuh ke jawaban lokal TF-IDF.
  Sebelumnya satu quota habis langsung mematikan cloud untuk seluruh sesi
  padahal quota Gemini dihitung **per-model**, jadi model lain biasanya masih
  sehat. Perubahan: `submitToGeminiMessages` menerima opsi `fallbackModels`
  (diisi route lewat `getGeminiFallbackModels(cloudCfg.model)` — default:
  keluarga `gemini-*-flash`, bisa ditimpa via env `GEMINI_FALLBACK_MODELS`,
  model aktif selalu dikecualikan karena sudah dicoba lebih dulu). Loop hanya
  melanjutkan ke cadangan untuk status yang **mungkin sembuh** di model lain
  (429/503); status seperti 401 (key salah) serta kegagalan jaringan langsung
  berhenti dengan `reason` akurat — jangan buang permintaan yang tak akan
  berbeda hasilnya. (Catatan: 404 model tak dikenal awalnya juga berhenti,
  tapi itu bug — 404 per-model justru harus dilompati; lihat entri Fixed
  "retry model cadangan Gemini putus terlalu dini" di bawah.)
  `CloudAIResult.model` menyimpan
  model yang benar-benar menjawab, dan route memancarkan ulang event `meta`
  berkoreksi bila jawaban datang dari cadangan, agar stream tetap jujur tentang
  model mana yang dipakai. Kontrak lama tetap: tidak pernah throw, gagal total
  → `success:false` + `reason`  (mis. `status_429` bila semua cadangan juga habis)
  → fallback lokal + badge `⚠ Cloud gagal` seperti biasa. Unit test: 6 kasus
  baru (retry sukses di cadangan pertama, semua model 429 dicoba satu per satu,
  503 memicu retry, 401 tak memicu retry, eksklusi/dedup env override).

- **Fixed (code, `ai-provider.ts`)**: retry model cadangan Gemini **putus
  terlalu dini** — satu model yang dipensiunkan Google membunuh seluruh
  rantai cadangan, sehingga fallback sehat tak pernah dicoba dan RetroBot
  langsung jatuh ke jawaban lokal. Akar masalah: loop retry memperlakukan 404
  (model tak dikenal) sama dengan 401 (key salah) — keduanya `break`. Padahal
  401 bersifat **global** (key yang sama dipakai untuk semua model, jadi
  percobaan lain pasti sama hasilnya), tapi 404 bersifat **per-model**:
  audit 2026-10-04 membuktikan keluarga `gemini-2.x`/`1.5` sudah dipensiunkan
  (404 "no longer available") sementara `gemini-3.5-flash` &
  `gemini-3.5-flash-lite` masih 200 OK. Saat model aktif kena 429 dan cadangan
  pertama adalah model yang dipensiunkan, loop `break` di 404 itu → model sehat
  di belakangnya (`flash-latest`, `3.5-flash-lite`) tak pernah disentuh.
  Kini 404 dilompati ke cadangan berikutnya (`continue`) seperti 429/503;
  hanya status yang hasilnya pasti sama di model manapun (401/403 key salah)
  yang tetap berhenti. Tambahan: `DEFAULT_GEMINI_FALLBACK_MODELS` diurutkan
  **sehat-di-depan** (`gemini-3.5-flash-lite`, `gemini-3.5-flash`,
  `gemini-flash-latest`) sebelum model yang dipensiunkan (`2.5`/`2.0`/`1.5`)
  sebagai cadangan ekor — model sehat tetap disimpan untuk kasus Google
  mengaktifkan kembali, dan urutan menentukan mana dicoba lebih dulu. Unit
  test: 4 kasus baru (404 di cadangan pertama dilompati ke cadangan kedua yang
  sehat, 404 di model aktif tetap lanjut ke cadangan, semua model 404 dicoba
  satu per satu + `reason: status_404`, urutan default model sehat di depan).

- **Added (code, `gemini-quota.ts` + `ai-provider.ts` +
  `admin/cloud-ai/page.tsx`)**: halaman `/admin/cloud-ai` kini menampilkan
  **estimasi sisa quota free-tier Gemini** (Card "Estimasi Sisa Quota Gemini
  (Free-Tier)") untuk model aktif + seluruh model cadangan: progress bar
  pemakaian vs batas RPM (rolling window 60 detik) & RPD (24 jam), badge
  status (Aman / Mendekati batas / Dibatasi), jam sampai pembatasan berakhir,
  dan asal batas yang dipakai. Akar masalah: Gemini API **tidak punya endpoint
  "sisa quota"**, jadi satu-satunya cara memperkirakannya adalah dengan
  mencatat sendiri permintaan yang kita kirim dan mempelajari batas asli dari
  error 429 yang dikembalikan Google.
  - `recordGeminiRequest(model)` dipanggil SEBELUM setiap fetch di
    `submitToGemini` (terminal/Redaksi) dan `submitToGeminiMessages`
    (RetroBot, termasuk tiap model cadangan yang dicoba saat retry 429).
  - `recordGeminiRateLimit(model, {status, body, retryAfter})` dipanggil pada
    response non-ok: mempelajari batas asli dari pesan error Google
    ("Requests per minute: N" / "Requests per day: N", cadangan terstruktur
    `error.details[].metadata.quotaValue` + `quotaId`) dan masa pembatasan
    dari header `Retry-After`. Learned limits **menimpa** default & env.
  - Prioritas batas efektif: dipelajari dari 429 asli > env
    (`GEMINI_FREE_RPM` / `GEMINI_FREE_RPD`) > tabel default per keluarga model
    (flash/pro; varian preview dikecohkan via prefix-match, model tak
    dikenal jatuh ke default global). Batas default sengaja konservatif dan
    ditandai sebagai "perkiraan default" di UI — bila keliru, 429 pertama
    mengoreksinya otomatis.
  - Store tracker disimpan di **`globalThis`**, bukan variabel module-level:
    `next dev` me-bundle tiap route ke module registry terpisah, sehingga
    `const store = new Map()` akan berupa instance berbeda di route handler
    `/api/retrobot` (mencatat) vs Server Component admin (membaca) → angka di
    halaman admin selalu 0 meski sudah ada permintaan nyata. `globalThis`
    bersifat per-proses (satu proses `next dev` untuk semua route node) sehingga
    kedua route berbagi instance yang sama, dan hitungan tahan terhadap Fast
    Refresh/HMR. Diverifikasi live: setelah POST nyata ke `/api/retrobot`,
    reload admin menampilkan RPM/RPD `gemini-3.5-flash` naik ke 1.
  - Limitasi jujur yang diungkapkan langsung di Card: tracker bersifat
    **in-memory per-instance** (proses `next dev` ini / satu serverless
    function Vercel) — restart/cold-start menghapus hitungan, dan bila belum
    ada permintaan sejak server menyala, pemakaian menampilkan 0. Ini
    ESTIMASI, bukan angka resmi Google.
  - Unit test: 20 kasus baru — 17 di `tests/gemini-quota.test.ts` (rolling
    window expiry RPM 60 detik & RPD 24 jam, learned limits menimpa env,
    env override & nilai non-angka diabaikan, cadangan terstruktur
    `quotaValue`, status ok → near (≥80%) → limited + kedaluwarsa
    `limitedUntil`, independensi per-model, bentuk output, never-throw pada
    body bukan-JSON) + 3 wiring test di `tests/ai-provider.test.ts` (permintaan
    sukses tercatat di RPM/RPD, tiap model retry tercatat satu per satu, 429
    nyata mempelajari batas + mencatat Retry-After).
  - Verifikasi: `tsc --noEmit` EXIT 0, ESLint 0 error di berkas berubah,
    `vitest run` **319/319** (27 file), dan live check UI di
    `/admin/cloud-ai` (Card merender 5 model: aktif + 4 cadangan, batas
    sesuai tabel default, badge status Aman, note + kode env terlihat).

- **Chore**: hapus duplikat root `lib/og-image.ts(x)` (tak direferensi), file
  notes berisi perintah git, log basi di root, dan dead code
  `getProviderName()`.

### Fixed — RetroBot tak pernah memakai Cloud AI meski diaktifkan (audit 503)

RetroBot selalu jatuh ke jawaban lokal yang kaku meski Cloud AI sudah dianggap
aktif. Audit langsung ke produksi (meta SSE → `fallbackReason: status_503`)
menemukan akar masalah yang sebenarnya: **bukan** kode eskalasi (itu sudah benar
sejak PR #54), melainkan model yang dikirim **tidak tersedia di endpoint**.

Bukti audit (probe langsung ke `settings.cloud_ai` + endpoint relay):

- Konfigurasi tersimpan: `provider=openai`, `baseUrl=https://router.juan.web.id/v1`
  (gateway "New API"), API key **valid** (`GET /v1/models` → 200), tapi
  `model=gpt-4o-mini`.
- Relay tersebut **hanya menyajikan model Gemini** (`gemini-3.1-pro`,
  `gemini-3.5-flash-lite`, `gemini-3.7/3.8-flash-high/low`). Karena itu
  `POST /chat/completions` membalas **503 `model_not_found`**
  ("No available channel for model gpt-4o-mini under group gemini"), dan RetroBot
  memakai fallback TF-IDF — itulah jawaban robotiknya.

- **Fixed (config)**: model diganti ke `gemini-3.8-flash-high` (terverifikasi
  menjawab natural dalam Bahasa Indonesia, ~5-8 dtk). RetroBot langsung menjawab
  dari cloud (`meta.source: "cloud"`, tanpa meta fallback).
- **Fixed (code, `cloud-ai-config.ts`)**: `saveCloudAIConfig` tidak lagi
  mereset paksa model lewat heuristik prefix ("provider openai harus gpt-*").
  Provider `openai` adalah OpenAI-compatible **custom** — endpointnya bisa relay
  yang justru hanya menyajikan model lain. Heuristik lama diam-diam mengembalikan
  model yang sudah benar ke `gpt-4o-mini`, sehingga perbaikan via UI tak pernah
  bertahan.
- **Fixed (code, `ai-openai.ts`)**: `submitToOpenAIStream` kini meneruskan
  `error.code` provider (mis. `model_not_found`, `invalid_api_key`) ke
  `fallbackReason` — sebelumnya hanya `status_503` yang tertulis, sehingga
  penyebab aslinya tak terlihat. Jatuh ke `status_<http>` bila body tak terbaca.
- **Fixed (code, `ai-openai.ts`)**: `submitToOpenAI` (non-streaming, untuk
  terminal & Redaksi) kini toleran terhadap relay yang **selalu memakai SSE**
  meski `stream:false` — sebelumnya parse JSON gagal → salah dianggap cloud gagal.
- **Added**: `tests/ai-openai.test.ts` (10 test) + 1 test regresi di
  `tests/cloud-ai-config.test.ts`. Verifikasi: `tsc`/build 0 error, ESLint 0,
  `vitest run` 267/267.



### Added & Fixed — Cloud AI, OAuth, Smart Fallback & Natural RetroBot

- **Added**: Rute halaman terpisah `/admin/cloud-ai` di bawah grup God Mode untuk pengaturan Cloud AI, serta dukungan metode otentikasi ganda (`API Key` atau `OAuth Token / Login`).
- **Fixed & Enhanced**: Mekanisme **Smart Local Fallback** otomatis pada Redaksi AI — jika koneksi internet terputus atau provider eksternal tidak merespons, sistem otomatis menyusun draf lokal pintar tanpa menampilkan eror merah.
- **Fixed**: RetroBot kini **selalu eskalasi ke Cloud AI saat diaktifkan** — bukan sekadar menaikkan ambang confidence ke 0.99. Ambang 0.99 sebelumnya rapuh: `scoreIntent` di `ai-engine.ts` menambah `+0.5` per token yang cocok, sehingga pertanyaan kaya kata kunci (8+ kecocokan, mis. *"siapa sigit, keahlian, proyek, layanan, kontak?"*) mencapai confidence `1.0` dan **tetap dilayani mesin TF-IDF lokal yang kaku**. Kini mesin lokal hanya dipakai bila cloud mati (ambang 0.55) atau sebagai fallback saat panggilan cloud gagal.
- **Changed**: Persona & instruksi sistem (*system prompt*) default Cloud AI ditulis ulang agar **natural dan mengalir seperti obrolan** — sebelumnya kaku ("nada profesional, maksimal 5 kalimat"). Jawaban RetroBot tidak lagi terdengar seperti skrip robotik (`[Neural Model 2.6]: Saya menganalisis input…` itu hanya muncul di jalur lokal murni).
- **Added**: Alasan kegagalan cloud kini disertakan di meta fallback SSE RetroBot (`fallbackReason` — mis. `status_401` untuk API key salah/expired, `status_429` untuk quota habis, `network`, `unconfigured`), agar admin bisa langsung melihat mengapa RetroBot jatuh ke jawaban lokal dan memperbaiki konfigurasinya di `/admin/cloud-ai`.

### Added — God Mode: Halaman terpisah Pengaturan Cloud AI (`/admin/cloud-ai`)

Pengaturan provider Cloud AI (Gemini, OpenAI, Anthropic, Groq, DeepSeek, OpenRouter, Together, Mistral, xAI) yang sebelumnya berada di halaman `Sistem & Logs` (`/admin/system`) kini dipisahkan ke halaman sendiri.

- **Added**: Rute halaman `/admin/cloud-ai` dan item navigasi "Pengaturan Cloud AI" di sidebar panel admin di bawah grup God Mode.
- **Changed**: Memindahkan formulir `CloudAIConfigForm` dari `/admin/system` ke `/admin/cloud-ai`. Halaman `Sistem & Logs` kini lebih bersih dan terfokus pada monitoring kelayakan deploy, database, integrasi, audit log, dan tracing.
- **Changed**: Memperbarui referensi pesan navigasi di komponen komposisi Redaksi (`redaksi-composer.tsx` & `redaksi-draft.ts`) ke menu Pengaturan Cloud AI.

---

### Fixed — SEO: path section SigitOS (`/layanan`, `/toko`, `/terminal`, `/testimoni`) 404

Section homepage (theme SigitOS) hidup sebagai **anchor** (`/#layanan`), bukan
rute sendiri. Mengetik `sigitadi.id/layanan` polos (atau backlink tebekan/materi
cetak) kena **404** — GSC berpotensi melaporkannya "Not found (404)" dan boros
crawl budget. Kebetulan keempat nama ini juga merupakan label app di taskbar,
jadi mudah disangka path.

- Added: `src/lib/section-redirects.ts` — peta path→anchor murni (tanpa I/O,
  teruji unit). `src/proxy.ts` me-**redirect 308** path polos ke anchor section
  di homepage (query `?lang=` dipertahankan, tetap toggle client-side). Fragment
  `#…` tidak diindeks Google sebagai URL terpisah → kanonik tetap `/`, tidak
  menciptakan varian baru (sama prinsipnya dengan konsolidasi pre-fill kontak).
  - Id section di DOM untuk app "Toko" adalah **`produk`** (bukan `toko`), jadi
    `/toko` → `/#produk` — konsisten dengan tombol "Kembali ke Toko" di halaman
    detail produk. `/proyek` & `/artikel` **tidak** masuk tabel: rute nyata.
- Changed: `os-desktop-manager.tsx` — `id="terminal"` di kartu section terminal
  (mode scroll mobile) agar `/#terminal` punya target anchor.
- Added: unit test `tests/section-redirects.test.ts`.
- Verifikasi produksi: `curl -sI https://sigitadi.id/layanan` → `308` ke
  `https://sigitadi.id/#layanan` (begitu juga `/toko` → `#produk`, `/terminal`,
  `/testimoni`). Path yang tidak terdaftar tetap 404 seperti sediakala.

### Fixed — SEO: varian URL duplikat homepage ("Alternate page with proper canonical tag")

Google Search Console melaporkan 13 URL (mayoritas homepage dengan query string)
sebagai "Alternate page with proper canonical tag" / "Crawled - currently not
indexed" — varian `/?contactSubject=…&contactBody=…` (tombol "diskusikan" di
halaman artikel/proyek/layanan) plus alternate `?lang=` seperti
`/proyek/promptmatrix-2-0?lang=en`. Semuanya menampilkan HTML identik dengan
kanoniknya (i18n 100% client-side), jadi Google anggap duplikat dan sengaja tidak
mengindeksnya.

- Changed: pre-fill form kontak pindah dari query string ke **sessionStorage**
  — `prefillContact()` di `src/lib/contact-link.ts`. Tombol "diskusikan" tetap
  `<a href="/#kontak">` (URL bersih) dengan `onClick` yang menaruh
  subject/body di sessionStorage; `ContactSection` membacanya sekali saat mount
  lalu menghapus (one-shot handoff). Tidak ada lagi varian URL baru per konten,
  dan `buildContactPrefillUrl` dihapus.
- Added: konsolidasi varian lama — `src/proxy.ts` me-**redirect 308**
  `/?contactSubject=…` atau `/?contactBody=…` ke `/#kontak` (query lain seperti
  `?lang=` dipertahankan) sebelum gate Clerk. Link equity mengalir ke kanonik
  dan varian yang sudah di-crawl segera keluar dari indeks. Halaman publik
  tetap statis (redirect di proxy, bukan baca `searchParams` di page).
- Changed: varian `?lang=id` / `?lang=en` **tidak lagi diiklankan** sebagai
  alternate hreflang/sitemap. Karena i18n 100% client-side, HTML kedua varian
  identik dengan kanoniknya — justru jadi sinyal duplikat. `?lang=` tetap
  berfungsi sebagai deep-link/toggle bahasa (client-side + e2e memakainya);
  `localeAlternates()` (`lib/seo.ts`) kembali kanonik-only, helper
  `withLocales` di `app/sitemap.ts` dihapus, dan komponen `locale-hreflang.tsx`
  dihapus beserta pemakaiannya di homepage.

### Added — Menu admin SEO & SEM (`/admin/seo`)
- Added: halaman admin terpadu untuk SEO/SEM — token verifikasi **Google
  Search Console** & **Bing Webmaster**, key **IndexNow** + tombol ping manual
  semua URL, serta override **Open Graph** lengkap dengan pratinjau kartu
  sosial (Facebook/X/LinkedIn) dan gambar OG aktual yang dibangkitkan.
  Konfigurasi disimpan di tabel `settings` (key `"seo"`) lewat
  `saveSeoConfigAction` — urutannya `verifyAdmin()` → validasi 100%
  server-side di `saveSeoConfig()` → `logAudit` → `revalidatePath("/",
  "layout")`. Tidak ada redeploy untuk mengganti token/key/OG.
- Added: `src/lib/seo-config.ts` — lapisan resolusi dengan prioritas pengaturan
  admin → env (`NEXT_PUBLIC_GOOGLE_VERIFICATION`,
  `NEXT_PUBLIC_BING_VERIFICATION`, `INDEXNOW_KEY`) → token publik fallback.
  Token tidak pernah dikembalikan mentah ke client (`maskToken`, 4 karakter
  terakhir); field token kosong saat submit = "pertahankan yang sudah ada"
  (sama seperti pola Cloud AI), sedangkan field OG kosong = "kembali ke
  default profil".
- Added: route dinamis `/{key}.txt` (`src/app/[indexnowKey]/route.ts`) yang
  melayani file verifikasi IndexNow — rotasi key dari admin langsung efektif
  tanpa menambah file statis. Path asing tetap 404; file statis lama di
  `public/` tetap diutamakan Next.js untuk nama yang sama (tidak ada regresi).
- Changed: `generateDynamicMetadata` (`lib/seo.ts`) dan `opengraph-image.tsx`
  memakai `resolveOgMeta()` + `resolveVerification()` sehingga override OG
  mengubah tag **dan** gambar yang dibangkitkan (sebelumnya OG murni
  diturunkan dari profil). Token verifikasi tidak lagi di-hardcode di
  `app/layout.tsx` (sebelumnya bertentangan dengan aturan "tidak ada
  default di source" — token tersebut bukan rahasia dan juga dipublikasikan
  via file statis `public/`, tetap dipindah ke lapisan konfigurasi; fallback
  konstanta sengaja dijaga supaya produksi tidak kehilangan meta tag sebelum
  admin membuka halaman baru).
- Added: `NEXT_PUBLIC_GOOGLE_VERIFICATION` & `NEXT_PUBLIC_BING_VERIFICATION`
  terdaftar di validasi env (`lib/env.ts`, severity `info`) → muncul di
  checklist `/admin/system`.
- Added: 15 unit test baru di `tests/seo-config.test.ts` (prioritas
  admin>env>default, validasi token, semantik "kosong = keep", masking, URL
  gambar). File didaftarkan di `SHARED_FS_TESTS` (`vitest.config.mts`) karena
  menulis `data/local-settings.json` — ikut project serial anti-flaky.
  Total 248 test lolos.
- Added: dokumentasi deploy SEO — `.env.example` mencantumkan
  `NEXT_PUBLIC_GOOGLE_VERIFICATION` & `NEXT_PUBLIC_BING_VERIFICATION`;
  `DEPLOYMENT.md` menambah env tersebut ke template `.env`, checklist
  pra-deploy (rotasi key/token dari `/admin/seo` tanpa redeploy), dan
  verifikasi pasca-deploy (`curl /{key}.txt` + grep meta verifikasi);
  `README.md` menambah bullet fitur admin SEO/SEM, env wajib, dan
  troubleshooting GSC ("Not verified").
- Fixed: lint error pre-existing di `godmode-preview-bar.tsx` (`<a href>`
  → `next/link`) — selain mematikan job `lint` di CI (gate deploy),
  sebelumnya navigasi admin memicu full page reload. `npm run lint`
  sekarang 0 error.

### Fixed — E2E CI (Playwright) berjalan lagi + masuk sebagai job CI
- Fixed: 20 test E2E (9 publik + 11 God Mode) hijau kembali; job `e2e`
  ditambahkan ke `.github/workflows/ci.yml`. Tiga akar penyebab, semuanya
  environmental (bukan regresi aplikasi):
  - **Instance Clerk dev (`pk_test_`)** memaksa handshake browser di tiap
    navigasi (Chrome modern memblokir cookie pihak-ketiga →
    `ERR_TOO_MANY_REDIRECTS`); terpisah itu, Clerk SDK v7 **menolak** key
    placeholder di runtime — `clerkMiddleware` melempar HTTP 500 di setiap
    route dan `ClerkProvider` crash di client. Solusi: **"mode tanpa Clerk"** —
    `proxy.ts` & `layout.tsx` mendeteksi key placeholder/absen di level export
    dan melewati Clerk (server tetap render publik, `/admin` fail-closed 404
    di produksi). Dev lokal & CI jalan tanpa kredensial Clerk; produksi tidak
    berubah (key valid → `clerkMiddleware` + `auth.protect()` aktif penuh).
  - **Next 16 memblokir resource dev cross-origin** (`/_next/hmr`): Playwright
    memakai `127.0.0.1` sedangkan dev server mengidentifikasi diri sebagai
    `localhost` → handshake HMR ditolak → aplikasi client tidak pernah hydrate.
    Fix: `allowedDevOrigins: ["127.0.0.1", "localhost"]` di `next.config.ts`
    (dev-only, diabaikan build produksi).
  - **Spec settings butuh DB mati**: `features`/`ui_strings`/`os_apps` menulis
    `data/local-settings.json`; di dev server biasa (tersambung Neon) tulisan
    itu diabaikan, ditambah race tulis file antar worker. Fix: spec tersebut
    hanya berjalan via `npm run test:e2e:godmode` (DB dimatikan + 1 worker);
    suite utama disempitkan ke 9 test publik dengan `workers: 1` (aplikasi
    berat tidak bisa dilayani paralel oleh satu dev server dalam batas 60s)
    dan `DATABASE_URL` juga dikosongkan — suite hermetic, hasil lokal ==
    hasil CI (tidak tergantung koneksi Neon developer).
- Fixed: `DUMMY_PROFILE.name` ("Sigit" → "Sigit Adi Irianto") — fallback
  tanpa database harus memakai nama pemilik lengkap (konvensi project: string
  fallback = "Sigit Adi Irianto", DB adalah source of truth). Sebelumnya
  `<title>` di mode fallback hanya memuat "Sigit", sehingga E2E CI (yang tak
  punya `DATABASE_URL`) gagal di test beranda.
- Changed: bagian autentikasi `os-menubar.tsx` dipindah ke komponen `MenubarUser`
  yang hanya dimuat saat Clerk aktif (`useUser` butuh konteks `ClerkProvider`);
  halaman `/sign-up` kini punya fallback seperti `/sign-in` saat key belum diset.

## [v3.0.1] - 2026-09-20 (tag `v3.0.1`; Vercel prod success)

### Changed — pembayaran utang teknis `set-state-in-effect`
- Changed: rule `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7) dikembalikan
  dari `warn` ke **`error`**. 18 situs yang tadinya memicu warning (lihat v3.0.0) sudah
  ditangani — nol error, nol warning di `npm run lint`:
  - **6 situs diperbaiki** dengan pola idiomatik React (bukan `useEffectEvent`):
    penyesuaian state saat render — "store information from previous renders" — di
    `os-command-palette.tsx` (2: reset query/pilihan saat palette dibuka & saat query
    berubah), `os-desktop-manager.tsx` (guard `activeApp` saat props `apps` berganti),
    `retro-bot.tsx` (reset `panelGeo` saat panel ditutup), `cloud-ai-config-form.tsx`
    (reset state turunan saat ganti provider); serta `useSyncExternalStore` untuk baca
    URL halaman di `article-detail-content.tsx` (server snapshot `""` → hydration aman).
  - **12 situs di-suppress** per-situs dengan `eslint-disable-next-line` + justifikasi
    tertulis di kode: baca `localStorage`/`sessionStorage` pasca-mount yang hydration-safe
    (cart, tema, sound, greeting, bahasa, hash), fetch-on-mount di client component
    (products/testimonials/cloud-ai), one-shot handoff sessionStorage→form
    (contact-section), boot state machine (os-boot-loader), dan sync awal `matchMedia`
    (os-desktop-manager).
  - `useEffectEvent` — pemilik "utang" aslinya — **tidak** dipakai: di React 19.3.0 ia
    memang sudah ada di build stabil (terverifikasi: `typeof react.useEffectEvent ===
    "function"`), tapi mayoritas situs ini bukan event-handler-in-effect; pola yang
    benar adalah penyesuaian state di render.
- Sisa utang (butuh E2E CI yang valid lebih dulu, lihat plan doc §5 butir 4): migrasi
  provider context (`theme`/`cart`/`i18n`) ke external store + custom change event
  (mutasi in-app di tab yang sama tidak memicu `storage` event), dan pindah fetch list
  admin ke Server Component (data awal sebagai prop; refetch pasca-mutasi di event
  handler, bukan effect).

## [v3.0.0] - dirilis (tag `v3.0.0`; Vercel prod `success`)

> **Major release — upgrade framework Next.js 15.5.25 → 16.3.5.** Lihat rencana lengkap di
> `plans/next-16-upgrade-plan.md` (§5 hasil eksekusi). Semua gate hijau: `tsc` EXIT 0,
> `vitest` 233/233, `eslint` 0 error, build Turbopack 38/38 route, gerbang proxy terverifikasi.

### Changed
- Changed: **middleware.ts → proxy.ts** (konvensi Next.js 16; logika gate identik). Clerk resmi
  mendukung proxy.ts di Next 16 — hanya nama file yang berubah. `createRouteMatcher()` (kini
  deprecated Clerk) diganti dengan matching native `req.nextUrl.pathname.startsWith("/admin")`.
  Pertahanan berlapis tetap utuh: cek server-side `auth()` + `notFound()` di `admin/layout.tsx`
  dan `verifyAdmin()` di setiap server action.
- Changed: **ESLint flat config native** — `eslint.config.mjs` tidak lagi memakai `FlatCompat`
  (`@eslint/eslintrc` dihapus); extends langsung `eslint-config-next/core-web-vitals` +
  `/typescript`. Memperbaiki crash `Converting circular structure to JSON` pada eslint 9.39.5
  + config-next 16.
- Changed: script `dev` tidak lagi memakai flag `--turbopack` (Turbopack jadi default bundler
  Next 16 untuk dev maupun build).
- Changed: `tsconfig.json` diupdate oleh `next typegen` (`jsx: react-jsx`, include
  `.next/dev/types`).

### Fixed
- Fixed: `os-boot-loader.tsx` — `handleComplete` dipanggil dalam `setTimeout` **sebelum**
  deklarasinya (TDZ); sebelumnya hanya jalan berkat delay 5 detik. Dipindah ke atas + dibungkus
  `useCallback` (deps effect `[handleComplete]`, tetap run-once). Ditangkap oleh rule baru
  `react-hooks/immutability` (eslint-plugin-react-hooks v7).

### Deprecations / utang teknis (didokumentasikan, bukan blocker)
- `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7) menandai 18 situs
  inisialisasi-mount yang sah (fetch-on-mount, load cart dari localStorage, bahasa dari URL).
  Saat rilis ini diturunkan ke `warn` agar tidak memblokir CI — **selesai di [Unreleased]
  di atas** (6 situs diperbaiki idiomatik, 12 di-suppress terdokumentasi, rule kembali
  ke `error`).
- Rule v7 lainnya (`refs`, `purity`, `immutability`): 3 false-positive di-scope-suppress dengan
  komentar (rule tak bisa membedakan render vs event handler).

## [v2.15.2] - 2026-09-20

### Fixed — Konsistensi pasca-audit (nol perubahan perilaku runtime)
- Fixed: CHANGELOG v2.15.0 menyebut "8 provider baru", padahal union
  `CloudProvider` (`src/lib/cloud-ai-config.ts`) menambahkan tepat **7**
  provider baru selain Gemini & OpenAI-compatible: `anthropic`, `deepseek`,
  `groq`, `openrouter`, `together`, `mistral`, `xai`. Klaim "Total 10
  pilihan (`off` + 9)" tetap benar — hanya angka "8" yang salah.
- Changed: string key fake di test disatukan ke konstanta fixture yang sama
  (`TEST_ANTHROPIC_KEY_FIXTURE` / `TEST_GROQ_KEY_FIXTURE`). Sebelumnya scrub
  GitGuardian hanya merename dua nilai yang memicu scanner; sisanya
  (`sk-ant-real-key`, `gsk_real_key`, `sk-ant-fake`, `gsk_fake`) tertinggal
  di `tests/ai-anthropic.test.ts`, `tests/ai-models.test.ts`, dan
  `tests/cloud-ai-config.test.ts`. Nol impact fungsional (semuanya jelas
  fake & CI hijau), murni konsistensi konvensi fixture.
- Changed: type predicate filter `messages` di `POST /api/retrobot`
  diperluas menjadi `role: "user" | "system" | "assistant"` — riwayat chat
  sah menyumbang role `assistant`; predicate lama lebih sempit dari nilai
  sebenarnya (tsc & runtime sudah benar, ini hanya kejujuran tipe).
- Removed: stale git worktree `.kilo/worktrees/river-ease/` (mirror
  pre-v2.15 — union 3-provider, timeout 15s). Sudah gitignored sehingga
  tidak pernah di-ship, tapi merupakan salinan kode usang yang mencemari
  hasil pencarian tooling. `.kilo/`, `.superpowers/`, `.verify*.log`
  ditambahkan ke `.gitignore` agar scratch sejenis tak masuk repo lagi.

### Docs — Audit keamanan post-merge v2.15.0/v2.15.1
- Added: SECURITY.md §3.7 mencatat bahwa **semua 9 provider memakai
  otentikasi API key** — tidak ada alur login/OAuth per akun. Form admin
  hanya input API key (lihat `maskKey()`); login akun provider tidak
  didukung maupun direncanakan.
- Audit: `tsc --noEmit` EXIT 0; `vitest run` 233/233 (21 file). Auth
  boundary (`verifyAdmin()` di tiap server action baru), fail-closed
  3-lapis (`isCloudProvider` / `resolveCloudAIConfig` / `saveCloudAIConfig`),
  `maskKey()`, placeholder key → nol network call, `AbortSignal.timeout` di
  seluruh egress — **lulus, tanpa issue blocking**.


## [v2.15.1] - 2026-09-20

### Fixed — RetroBot: eskalasi Gemini kini multi-turn
- Fixed: cabang Gemini di `POST /api/retrobot` sebelumnya memanggil
  `submitToGemini(buildCloudPrompt(...))` (prompt STRING tunggal), sedangkan
  cabang Anthropic & openai-chat memakai `messages` — sehingga RIWAYAT chat
  dan konteks halaman (`appLine`) tidak pernah diteruskan ke Gemini dan
  eskalasi RetroBot ke provider Gemini selalu single-turn (bug kontrak, bukan
  crash: jawaban tetap dibangkitkan, tapi tanpa memori percakapan).
- Added: `submitToGeminiMessages(messages, options)` di `src/lib/ai-provider.ts`
  — versi multi-turn dari `submitToGemini` (REST `:generateContent`), menerima
  `ChatMessage[]` sama persis bentuknya dengan `submitToAnthropic` /
  `submitToOpenAIStream`: role `assistant` → `model`; role `system` dilekatkan
  ke user pertama (`generateContent` tak punya role system — setara isi
  `buildCloudPrompt` versi string); role sama berturut-turut digabung;
  leading `model` di-drop; fail-closed placeholder key; never throws.
- Changed: ketiga gaya API di RetroBot kini memakai array `messages` yang
  SAMA. `submitToGemini` (string) tetap dipakai untuk `askSigitBot` (terminal)
  dan draft Redaksi — keduanya single-turn/single-shot sejak awal, tidak
  diubah. Komentar "KNOWN LIMITATION" di `route.ts` diganti catatan pemetaan.
- Added: 7 test baru di `tests/ai-provider.test.ts` (pemetaan role, merge
  same-role, drop leading model, endpoint/header, fail-closed, error path).
  Total 226 → 233 test (21 file). `tsc --noEmit` EXIT 0; ESLint 0/0;
  `vitest run` 233/233.

### Docs — README: bagian Autentikasi (Clerk + Google OAuth)
- Added: sub-bagian baru di `README.md` (Fitur Utama) yang merangkum flow login
  (Google OAuth / email+password via `/sign-in`), gate single-owner
  `ADMIN_CLERK_ID` yang fail-closed di produksi, `verifyAdmin()` wajib di
  server actions read-only, dua penyebab umum "tiba-tiba tidak bisa login
  Google" (faktor `oauth_google` dev-vs-prod + CSP domain Clerk), dan pemanggilan
  `scripts/check-clerk-login.mjs` — sebelumnya README hanya satu baris
  "Login admin melalui Clerk di /sign-in". Rincian tetap di `SECURITY.md` &
  `DEPLOYMENT.md`.

## [v2.15.0] - 2026-09-20

### Added — Cloud AI: 7 provider baru lewat satu registry (2026-09-20)
- Added: **registry provider terpusat** `src/lib/ai-providers.ts` (client-safe —
  murni data publik: label, hint, base URL/model default, nama env var; tidak
  ada import server-only, tidak ada key). Dipakai bersama oleh form admin DAN
  resolver server, jadi daftar provider hanya didefinisikan sekali. Tipe
  `Record<CloudProvider, ProviderMeta>` memaksa **exhaustiveness check** saat
  compile: tambah provider = satu entry registry + satu baris union
  `CloudProvider`; TypeScript menolak bila salah satu sisi kurang.
- Added: **7 provider baru** selain Gemini & OpenAI-compatible — Anthropic
  Claude, DeepSeek, Groq, OpenRouter, Together AI, Mistral, xAI Grok, tetap
  ada "OpenAI-compatible — custom" (OpenAI / Ollama / endpoint
  `/v1/chat/completions` sendiri). Total 10 pilihan (`off` + 9). Provider
  preset (DeepSeek/Groq/OpenRouter/Together/Mistral/xAI) sudah punya base URL
  & model default — admin cukup isi API key.
- Added: `src/lib/ai-anthropic.ts` — `POST /v1/messages` dengan header
  `x-api-key` + `anthropic-version: 2023-06-01`; system prompt dikirim sebagai
  **field top-level `system`** (bukan role "system"); pesan same-role
  berturut-turut di-merge (API menolak yang tak bergantian — penting untuk
  RetroBot yang menempel konteks halaman sebagai pesan "user" kedua);
  assistant di awal di-drop. Never throws; placeholder key → fail-closed.
- Added: daftar model **realtime** kini mencakup semua gaya API.
  `listCloudModels` menambah cabang Anthropic (`GET {base}/models` dengan
  header `x-api-key` + `anthropic-version`). Form `/admin/system` mengisi
  dropdown model otomatis saat provider diganti / key diisi / field blur,
  dengan badge "· aktif" dan footer "N model aktif (realtime · diperbarui
  HH:MM:SS)".
- Added: 15 env var baru di `src/lib/env.ts` (`ANTHROPIC_*`, `DEEPSEEK_*`,
  `GROQ_*`, `OPENROUTER_*`, `TOGETHER_*`, `MISTRAL_*`, `XAI_*`) — semua
  server-only (TIDAK boleh prefix `NEXT_PUBLIC_`), divalidasi Zod non-blocking.
  `.env.example` diperbarui dengan contoh per-provider.

### Changed — Dispatcher gaya API tunggal; RetroBot tak lagi memaksa SSE OpenAI
- Changed: `getApiStyle()` menjadi satu-satunya pemetaan provider → protokol
  (`gemini` | `openai-chat` | `anthropic` | `off`). Tiga pemanggil bercabang
  darinya: `submitToCloud` (server action `askSigitBot`), `draftContentWithAI`
  (Redaksi), dan route `/api/retrobot` — tidak ada lagi if/else provider
  hardcoded di banyak tempat.
- Fixed: route `/api/retrobot` sebelumnya **memaksa SSE OpenAI untuk semua
  provider**, termasuk Gemini yang tidak menyediakan SSE OpenAI-compatible,
  sehingga eskalasi cloud jatuh diam-diam ke jawaban lokal. Kini `openai-chat`
  tetap streaming penuh; `gemini` & `anthropic` memakai cabang non-streaming
  yang hasilnya dipecah per kata lewat **kontrak SSE yang identik** (meta →
  delta → done; fallback lokal tetap jalan bila kosong/gagal).
- Changed: `system-status.ts` dan label UI memakai registry untuk nama
  provider (mis. "Groq (Llama / Mixtral, sangat cepat)"), bukan hardcoded
  "Gemini/OpenAI-compatible".

### Security — Fail-closed konsisten di setiap lapisan
- Id provider asing dari form, env, atau hasil baca DB → `"off"` (fail-closed)
  di tiga tempat sekaligus: `isCloudProvider()` (type guard),
  `resolveCloudAIConfig()` (env), `saveCloudAIConfig()` (form). Tidak ada
  provider tak dikenal yang bisa membuka egress.
- Isolasi key per-provider terverifikasi: `<PROVIDER>_API_KEY` hanya dibaca
  lewat `meta.envKey` dari registry — mengganti provider di form tidak
  membocorkan key provider lain (no cross-provider key leakage).
- Key tetap tidak pernah dikirim ke client: `maskKey()` → `••••••••` + 4
  karakter terakhir; `AdminCloudAIView` hanya berisi status masked. Yang
  dilewatkan ke `submitTo*` hanya provider/model/base URL/prompt (prompt tetap
  katalog publik, lihat SECURITY.md §3.6).

### Testing — 21 file, 226 test
- Added: `tests/ai-providers.test.ts` (7) — exhaustiveness registry dua arah,
  label/hint wajib, base URL default per gaya API, fail-closed id asing.
- Added: `tests/ai-anthropic.test.ts` (9) — header & endpoint Anthropic, system
  prompt jadi field top-level, merge same-role, drop assistant awal,
  fail-closed placeholder key, HTTP/network error tidak throw.
- Extended: `tests/ai-models.test.ts` (7→9; +cabang Anthropic, +preset Groq
  pakai base URL registry) dan `tests/cloud-ai-config.test.ts` (11→16; +isolasi
  env per-provider, +preset Groq, +save/resolve provider baru anthropic/groq).
- Konvensi test tetap: hanya `vi.spyOn(globalThis, "fetch")`, tidak ada module
  mock; `cloud-ai-config.test.ts` tetap di project `shared-fs` (serial,
  `fileParallelism: false`).
- Verifikasi: `tsc --noEmit` EXIT 0; ESLint 0/0 di 15 berkas berubah;
  `vitest run` 226/226 (21 file); `next build` sukses (`/admin/system`
  23.3 kB, `/api/retrobot` terdaftar).

## [v2.11.0] - 2026-09-19

### Added — God Mode Fase 1: atur aplikasi SigitOS dari admin (2026-09-19)
- Added: halaman baru **`/admin/appearance`** — centang aplikasi yang ditampilkan
  ke pengunjung dan atur urutannya, tanpa menyentuh kode atau redeploy.
  Perubahan langsung tayang di homepage: taskbar, sidebar ikon desktop, Start
  Menu, command palette (Ctrl+K), jalan pintas angka 1–8, dan urutan section
  mode mobile.
- Added: `src/lib/os-apps-config.ts` (server-only) menyimpan konfigurasi di
  tabel `settings` key `os_apps` — pola yang sama dengan Cloud AI config.
  Disimpan hanya `{id, enabled, order}`; ikon/warna tetap di kode.
- Added: `src/lib/os-apps-meta.ts` sebagai sumber kebenaran tunggal untuk id,
  urutan default, dan label/nama file app (sebelumnya duplikat di tiga tempat:
  `appHumanLabel`, `getAppFilename`, `getAppFilenameById`). Dipisah dari
  modul server agar aman diimpor komponen client tanpa menyeret drizzle/`fs`
  ke bundle browser.
- Added: server action `saveOSAppsAction` — `verifyAdmin()` + validasi Zod +
  `logAudit` + `revalidatePath("/")`.
- Added: pengaman berlapis. Id asing dari form admin **ditolak keras** (pesan
  jelas); entri rusak di DB **dilewati**, bukan menggagalkan seluruh config;
  urutan selalu di-rapikan jadi 0..N-1; **minimal satu app harus aktif** —
  config yang melanggar jatuh ke default 8 app, situs tidak pernah kosong.
- Added: komponen client memberi respons pada perubahan config tanpa remount —
  app aktif yang dimatikan admin dilepas dari navigasi (taskbar, palette,
  jalan pintas, deep-link hash, event `switch-os-app` dari RetroBot/hero) dan
  jendela yang sedang terbuka otomatis pindah ke app aktif pertama.
- Added: pengujian — `tests/os-apps-config.test.ts` (13 test, lapisan data +
  semua jalur pengaman) dan `e2e/os-apps-config.spec.ts` (4 test, utas penuh
  settings → props → DOM via `npm run test:e2e:godmode`; config dipakai dengan
  dev server tanpa `DATABASE_URL` sehingga memakai fallback file lokal dan
  tidak menyentuh data DB bersama).

### Changed — Urutan section mobile tidak lagi hardcode (2026-09-19)
- Changed: konstanta `SCROLL_SECTIONS` dihapus. Urutan section single-page
  scroll mobile sekarang diturunkan dari konfigurasi yang sama dengan taskbar
  dan Start Menu — sebelumnya daftar ini ditulis terpisah sehingga bisa
  berbeda dengan urutan desktop (sumber double-maintenance).
- Changed: `titlebar` window desktop memakai nomor urut app aktif (mis.
  `[1/3]`), bukan angka statis `number` di `APPS` — konsisten dengan urutan
  yang diatur admin.

### Fixed — Test flaky karena berbagi file settings (2026-09-19)
- Fixed: `tests/cloud-ai-config.test.ts` dan `tests/os-apps-config.test.ts`
  sama-sama membaca-tulis `data/local-settings.json` (backend fallback saat
  tidak ada DB) dan dijadwalkan di worker berbeda — `beforeEach` satu menghapus
  persis saat yang lain menulis, sehingga config "hilang" acak dan
  `os-apps-config` kadang jatuh ke default tanpa sebab. `vitest.config.mts`
  kini menempatkan kedua file di project `shared-fs` dengan
  `fileParallelism: false`; test file lain tetap berjalan paralel penuh.
  Verifikasi: 3x run berturut-turut 113/113 lulus, sebelumnya gagal ~1 dari 3.

## [v2.10.0] - 2026-09-18

### Fixed — Regresi a11y di Lighthouse CI (2026-09-18)
- Fixed: **`aria-hidden-focus`** — container lapisan RetroBot
  (`fixed inset-0 z-50`) memakai `aria-hidden="true"` saat panel tertutup,
  padahal tombol avatar (aria-label tooltip) & tombol dismiss greeting tetap
  **focusable** di dalamnya (WCAG 1.4.2). `aria-hidden` dihapus dari container;
  dekorasi (scan ring, radar ping, burst partikel) sudah punya `aria-hidden`
  sendiri; panel terbuka punya `role="dialog"` + `aria-label`.
- Fixed: **`color-contrast`** badge "ACTIVE"/"AKTIF" di services section —
  `text-emerald-600` di atas `--vt-paper` ≈3.0:1 (butuh 4.5:1 untuk teks
  kecil). Diganti `text-emerald-800` (≈7:1, AAA).
- Fixed: **`select-name`** — sort select katalog toko & theme select menubar
  tak punya accessible name (atribut `title` saja tidak memenuhi audit).
  Keduanya dapat `aria-label` (localized).

### Changed — Default speaker Terminal ON (2026-09-18)
- Changed: state `ttsOn` di `os-crt-terminal.tsx` kini inisial `true` —
  speaker (text-to-speech) Terminal aktif sejak halaman dimuat. Tombol
  volume di panel tetap ada untuk mematikannya. Catatan: speechSynthesis
  butuh gesture pengguna sebelum memutar suara (kebijakan autoplay
  browser), tapi `speak()` hanya dipanggil setelah user mengetik perintah,
  jadi gesture tersebut sudah ada — tidak ada suara mendadak saat load.

### Fixed — Terminal di mobile: muncul saat di-scroll + tombol kembali ke awal (2026-09-18)
- Fixed: **"setelah buka tab baru, terminal tidak muncul saat discroll, tapi
  bisa dibuka dari Start Menu, lalu muncul semua ikon di taskbar dan tidak
  bisa scroll lagi"**. Bukan bug scroll — akarnya korupsi state `viewMode`.
  `onOpenTerminal` memaksa `setViewMode("desktop")` di viewport <768px, dan
  listener `matchMedia("(min-width:768px)")` hanya memantau event `"change"`
  (resize ulang), jadi `viewMode` nyangkut di `"desktop"` selamanya: taskbar
  desktop (8 `vt-taskbar-tab`) dirender di layar 390px dan single-page scroll
  menghilang. Satu-satunya pemulihan adalah reload/tab baru.
  - `os-desktop-manager.tsx`: `viewMode` tidak pernah lagi dipaksa oleh aksi
    user. `openTerminal` jadi callback terpusat — desktop = `switchApp`
    (jendela biasa), mobile = `scrollToSection("terminal")` (sama seperti
    section lain). Handler `switch-os-app` juga disederhanakan ke pola yang
    sama.
  - **Terminal kini section ke-6 di `SCROLL_SECTIONS`** (urutan tetap
    mengikuti `APPS`), jadi MUNCUL SAAT DI-SCROLL — sebelumnya tersembunyi di
    balik Start Menu dan pengguna mobile tidak tahu terminal itu ada.
    Panelnya interaktif, jadi dibungkus kartu ber-height tetap
    (`h-[60vh] min-h-[300px]`) dengan titlebar "Terminal.bat"; tanpa tinggi
    tetap, panel tumbuh seiring output dan memakan seluruh dokumen.
  - `os-crt-terminal.tsx`: efek auto-scroll tidak lagi memakai
    `scrollIntoView` — itu menggulir **semua** leluhur scrollable, jadi di
    mode section (terminal inline di tengah dokumen) setiap output — termasuk
    8 baris boot saat mount — menarik seluruh halaman ke section terminal dan
    pengguna tidak bisa scroll dengan tenang. Kini hanya `scrollTop` parent
    `[role="log"]` yang diatur. Prop `onClose` & tombol TUTUP dihapus (tidak
    lagi dibutuhkan: tidak ada layer overlay).
  - Fixed: **"saat sampai akhir dokumen tidak ada tombol kembali ke awal,
    hanya ada perintah ketuk ikon taskbar tapi tidak tau yg mana ikon nya"**.
    Taskbar mobile hanya menampilkan SATU ikon (section aktif), jadi petunjuk
    itu membingungkan. EOF marker sekarang ditemani tombol **"KEMBALI KE
    ATAS"** (`ArrowUp`, `scrollTo({top:0, behavior:"smooth"})` + set aktif ke
    Profil) yang bekerja dari mana pun, plus saran "ketuk tombol Start untuk
    lompat ke section mana pun".
  - Added: regression test `e2e/mobile-terminal.spec.ts` (viewport 390×844)
    ditulis ulang untuk skema final: taskbar tetap 1 tab, section terminal
    terlihat setelah di-scroll, log bisa di-scroll sendiri TANPA menarik
    halaman (`scrollTop` container utama tak berubah setelah "help"), tombol
    KEMBALI KE ATAS mengembalikan halaman ke atas, bisa dibuka lewat Start
    Menu. **1/1 lulus.**

### Audit & dokumentasi (2026-09-18)
- Fixed: **judul section tak terlihat di mode mobile** — container scroll
  mobile (`os-desktop-manager.tsx`) tidak punya deklarasi background, jadi
  jatuh ke `body{--vt-desktop}` (navy `#0a1631`). Semua section memakai
  `text-[var(--vt-ink)]` (nyaris hitam) → kontras hancur. Ditambah
  `bg-[var(--vt-paper)] text-[var(--vt-ink)]`, menyamai body window desktop.
- Fixed: **stale closure di RetroBot** — `sendMessage` memakai `currentApp`
  & `detectNavIntent` tanpa memasukkannya ke dependency array useCallback.
  Akibatnya deteksi nav chip memakai app yang sudah basi setelah user
  pindah jendela. `detectNavIntent` dipindah sebelum `sendMessage` (TDZ)
  lalu kedua nilai masuk deps. Lint warning reactive-hooks/exhaustive-deps
  di repo utama kini 0.
- Changed: **`.gitignore`** menambah `dev-server-*.log` & `migrate.log`
  (dua file nyaris ter-commit via `git add -A`).
- Docs: README disinkronkan — migrasi `0000`–`0009` + `0009_narrow_magneto`
  (menambah `availability_badge` + `availability_badge_en` ke `profiles`),
  jumlah test 13 file / 100 test (sebelumnya 98), folder tree menambah
  `os-scroll-fade.tsx` & `gsap-scroller.ts`.
- Verifikasi: 100/100 unit test lulus, `tsc --noEmit` bersih, lint 0 error.

### SEO — GSC indexing (diagnosis 2026-09-18)
- Diagnosed: Google Search Console melaporkan **6 "Redirect error"**,
  **15 "Discovered - currently not indexed"**, **1 "Crawled - currently not
  indexed"**. Akar penyebab: produksi masih memakai `pk_test_` (instance
  `careful-bluejay-7114.clerk.accounts.dev`). Googlebot tanpa cookie
  `__client_uat` diredirect oleh clerk-js ke
  `/v1/client/handshake?redirect_url=...` → 307 kembali dengan JWT besar di
  query. curl tak menangkap ini (tidak eksekusi JS); hanya Google renderer
  yang melihatnya.
- Action (di luar repo): ganti `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` →
  `pk_live_` + `CLERK_SECRET_KEY` → `sk_live_` di Vercel, redeploy, lalu
  pasang custom Clerk domain (`clerk.sigitadi.id`) agar FAPI first-party —
  tanpa ini handshake cross-origin tetap terjadi meski key sudah live.
  Catatan: peringatan Vercel "remove NEXT_PUBLIC_ prefix" aman diabaikan
  untuk `pk_` (publishable by design); `sk_` tetap server-only.

### UX — Mobile: kembali ke taskbar OS jadul (navbar dihapus)
- Removed: **section nav rail** (`os-section-nav-bar.tsx`) — tab horizontal di
  atas window mengubah feel OS Windows jadul. Dihapus beserta CSS
  (`.vt-section-rail`, `.vt-section-tab*`, `.vt-section-more`) dan i18n keys
  `os_section_nav_label` / `os_more_sections`.
- Kept: **taskbar bawah menampilkan 8 tombol** dengan ikon + label manusiawi
  singkat di mobile (Profil, Layanan, …), `Profil.exe` di md+. Navigasi antar
  bagian kembali murni lewat taskbar / Start Menu / panah ← → di dalam window.
- Kept: **scroll continuation fade** (panah ↓ + gradien di tepi bawah body
  window) — muncul hanya saat konten masih bisa di-scroll, hilang di dasar.
  Ini satu-satunya "tanda panah kecil ke bawah" yang diminta, dan tidak
  mengganggu chrome OS.

### UX — Mobile: taskbar minimal + perbaikan tanggal terpotong
- Changed: **taskbar mobile hanya menampilkan bagian AKTIF** (sebelumnya 8 tombol). Daftar lengkap 8 bagian sudah ada di section nav rail atas window + Start Menu, jadi taskbar tidak perlu padat. Desktop (sm+) tetap menampilkan semua 8 tombol.
  - Tambahan: `aria-current="page"` pada tombol aktif (a11y navigasi).
- Fixed: **tanggal di menubar atas terpotong di mobile** — angka tahun "2026" tidak terlihat. Akar penyebab (3 lapis):
  1. Blok Admin/UserButton (Clerk avatar) tidak disembunyikan di mobile → +113px di kanan header → header overflow horizontal. Kini `hidden sm:block`.
  2. `.vt-btn` / `.vt-taskbar-tab` di `globals.css` memakai `display:inline-flex` yang **mengalahkan utility Tailwind `hidden`** (spesifisitas sama, CSS dimuat setelah Tailwind). Ditambah `.vt-btn.hidden` / `.vt-taskbar-tab.hidden` scoped `@media (max-width:639px)` supaya `sm:flex` tetap menang di desktop.
  3. Tanggal mobile diubah `dd/mm/yyyy` → `dd/mm/yy` ("17/09/26"); tanggal lengkap tetap ada di `title` tooltip & tampil `sm+`.
- Changed: kontrol kanan menubar dirapatkan di mobile (padding globe icon disembunyikan `<sm`, theme select `max-w` 70px) + breakpoint kustom `xs` (360px) di `@theme` — tanggal disembunyikan di `<360px` agar tidak ada elemen yang terpotong.
- Defense: container menubar dibungkus `overflow-x-auto` + scrollbar tak terlihat (`vt-menubar-scroll`) sebagai jaring terakhir.

### UX — Mobile discoverability (pertahankan SigitOS, perbaiki kebingungan awam)
- Added: **section nav rail mobile** (`os-section-nav-bar.tsx`) — tab horizontal scrollable dengan **label manusiawi** (Profil/Layanan/Proyek/Toko/Artikel/Terminal/Testimoni/Kontak) di atas window. Sebelumnya di mobile dock ikon disembunyikan dan taskbar hanya ikon kecil tanpa teks → pengguna awam tidak tahu ada 8 bagian (illusion of completeness). Desktop (lg+) tetap memakai dock ikon — identitas SigitOS dipertahankan.
  - Tab aktif: 2 indikator (warna + garis bawah), auto-scroll ke tab aktif saat pindah lewat taskbar/keyboard/hash/RetroBot.
  - Hint "Geser untuk lihat bagian lain" muncul hanya bila rail overflow (signifier continuation).
  - ARIA `role="tablist"`/`tab` + `aria-selected` untuk screen reader.
- Added: **label manusiawi di taskbar mobile** — tombol taskbar kini menampilkan "Profil", "Layanan", dst (bukan ikon tanpa teks) di mobile; tetap "Profil.exe" di md+.
- Added: **scroll continuation fade** (`os-scroll-fade.tsx`) — gradien + chevron ▾ di tepi bawah body window yang muncul hanya saat konten masih bisa di-scroll; hilang di dasar. Memerangi illusion of completeness (NN/g).
- Added: i18n `os_section_nav_label`, `os_more_sections` (ID + EN).
- Accessibility: animasi baru ikut `prefers-reduced-motion` (WCAG 2.3.3).

### SEO — Google Search Console indexing fixes
- Fixed: deteksi **`pk_test_` Clerk di produksi** sebagai **error** di validasi env (`src/lib/env.ts`). Key test memakai domain `*.clerk.accounts.dev` yang me-redirect Googlebot ke handshake Clerk di **semua rute** (termasuk `/robots.txt` & `/sitemap.xml`) → Google melaporkan "Redirect error" dan halaman tidak terindeks. Tampil di `/admin/system` + checklist `SECURITY.md` §4.
- Added: section "Pemecahan Masalah Google Search Console" di README — diagnosa Redirect error / noindex / not-indexed (Clerk key, trailing slash 308, canonical `?lang=`).

### Final development stage — Round 3 (UI/UX & AI)
- Fixed: flash jendela profil saat refresh halaman — `os-desktop-manager.tsx` kini membaca hash `#proyek` dsb. lewat `useLayoutEffect` sebelum first paint (`mounted` gate), sehingga app yang dimaksud langsung aktif.
- Fixed: bubble pesan RetroBot tidak terbaca di tema Retro 90s (teks putih di background transparan) — kelas `.vt-btn-blue` kini didefinisikan di `globals.css` (kontras 8.19:1 user, 15.67:1 bot — WCAG AAA).
- Fixed: jawaban RetroBot terpotong — panel dilebarkan (360px, max 448px) + bubble `max-w-[92%]` + `overflow-wrap-anywhere`.
- Fixed: a11y — `aria-hidden` pada container RetroBot hanya aktif saat panel tertutup (sebelumnya selalu `true`, menyembunyikan konten fokus dari screen reader).
- Fixed: deteksi niat navigasi RetroBot false-positive (mis. "nama istrinya siapa?" memicu "Buka Profil.exe") — keyword generic disempitkan + guard `intent !== currentApp`.
- Added: konfigurasi Cloud AI di `/admin/system` — field **Prompt & Cara Menjawab** (system prompt, max 2000 char) dan **Gaya Jawaban** (concise / detailed / friendly), disimpan di tabel `settings`.
- Added: **auto-fetch daftar model** — setelah base URL + API key diisi, form memanggil `listCloudModelsAction` (`src/lib/ai-models.ts`) untuk mengisi dropdown model dari endpoint provider (Gemini `models.list` / OpenAI `/models`).
- Added: RetroBot lebih interaktif — sadar halaman SigitOS yang sedang dibuka (konteks disisipkan ke prompt cloud), quick prompt per app, dan navigasi lewat **nav chip** di dalam percakapan (klik → taskbar glow + `switch-os-app`).
- Added: 6 efek visual RetroBot — scan ring (radar sweep idle), radar ping ×2 (thinking), burst partikel (jawaban selesai), hover tip, panel-in (entrance retro `steps`), nudge (reaksi kirim).
- Changed: hapus label "Sedang membuka:" dan baris ikon navigasi Profil→Kontak di panel RetroBot (digantikan nav chip percakapan).

### Final development stage — Round 2 (UX & content)
- Added: keranjang belanja (`cart-context.tsx`, persisten `localStorage`) + checkout pesan WhatsApp otomatis (`whatsapp-order.ts`) dengan stok terbatas, harga coret, badge, kategori, dan galeri produk.
- Added: etalase produk — `comparePriceLabel`, `priceAmount`, `badge`, `category`, `stock`, `gallery`, `purchaseType`, `customWhatsapp`, `customButtonLabel` (migrasi `0006_shop` + `0007_purchase_fields`).
- Fixed: layout admin mobile (card layout untuk tabel di layar kecil).
- Fixed: tombol kembali di detail proyek/artikel/produk.
- Fixed: truncasi testimoni di section publik.
- Fixed: suara TTS terminal memakai voice yang sesuai bahasa aktif.
- Fixed: terminal CRT menerjemahkan UI saat ganti bahasa tanpa reload.

### Final development stage — Round 1 (boot & polish)
- Fixed: boot loader SigitOS berulang setiap navigasi — kini sekali per sesi (`sessionStorage`).

### Sebelumnya (arsip Unreleased)
- Added: CI pre-merge gate (lint + typecheck + unit test + build).
- Added: validasi env terpusat (`src/lib/env.ts`, non-blocking, tampil di `/admin/system`).
- Added: audit log persisten (`audit_logs` + fallback local-store, tampil di `/admin/system`).
- Added: unit test Vitest (`npm run test`).
- Added: E2E Playwright area publik (`npm run test:e2e`, 5 spec: beranda, katalog, sitemap/robots, RSS/llms.txt, offline/PWA).
- Security: fail-closed admin di produksi tanpa kredensial asli (middleware 404 + `verifyAdmin` tolak).
- Added: auto-ping IndexNow saat save/delete proyek & artikel (best-effort, hanya published).
- Added: RSS `/feed.xml` + autodiscovery, related articles berperingkat tag.
- Added: reading progress + share X/LinkedIn/WA di detail artikel; perintah terminal `cv/github/email/theme random`.
- Added: SigitOS UX — animasi minimize/restore + indikator taskbar, double-click maximize, palet perintah Ctrl+K, search start menu, toggle suara persisten.
- Added: Sigit_Bot hybrid — fallback cloud Gemini opt-in (default OFF) + konteks katalog live, rate-limit publik; input suara + TTS di terminal.
- Added: storage Bunny persisten (otomatis bila terkonfigurasi, validasi terpusat) + Media Library `/admin/media`.
- Added: SEO batch — `llms.txt` dinamis untuk AI crawler, allowlist `remotePatterns`, tombol Visitor Analytics di dashboard admin.
- Added: draft & schedule — kolom `publishAt` proyek/artikel (migrasi 0005), filter publik otomatis, input jadwal + badge Terjadwal di admin.
- Added: content editor admin — toolbar sintaks (H2/H3/quote/kode) + pratinjau WYSIWYG via renderer publik bersama.
- Added: PWA — manifest, ikon avatar (192/512/maskable/Apple), halaman offline + service worker fallback, theme-color.
- Changed: urutan aplikasi SigitOS — Testimoni pindah setelah Terminal, sebelum Kontak.

## [v2.6.1] - 2026-09-13
- Changed: taskbar atas tanpa bar sosmed; theme selector tampil di semua ukuran layar.
- Changed: format tanggal menubar `dd/mm/yyyy`.
- Added: halaman `/admin/system` (feasibility, tracing `x-request-id`, sumber logging).

## [v2.6.0] - 2026-09-12
- Final hardening v2 (CSP tanpa `unsafe-eval`, COOP/CORP, validasi max-length + slug regex, IndexNow admin-only).
- OG preview dinamis, chip editor tag/tech-stack, Terminal AI + Sigit_Bot NLP.
