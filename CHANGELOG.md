# Changelog MyWebPorto

Format: `Added / Changed / Fixed / Security`. Tag rilis: `git tag -a vX.Y.Z`.

## [Unreleased] (dev)

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
