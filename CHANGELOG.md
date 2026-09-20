# Changelog MyWebPorto

Format: `Added / Changed / Fixed / Security`. Tag rilis: `git tag -a vX.Y.Z`.

## [Unreleased]

> E2E CI diperbaiki (lihat `Fixed` di bawah) — 20/20 test hijau dan masuk ke CI.
> Kerjaan terbuka berikutnya: migrasi provider context (theme/cart/i18n) ke
> external store + custom change event, dan pindahkan fetch list admin ke
> Server Component (plan doc §5).

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
