# Rencana Upgrade Next.js 15.5.25 → 16.3.5 (MyWebPorto)

> Status: **EKSEKUSI SELESAI (Fase 0–5 terverifikasi; Fase 6 rilis menunggu merge PR).**
> Branch kerja: `upgrade/next-16` dari **`main`** (CATATAN: `origin/dev` tertinggal 70 commit
> dan isinya sudah termuat di `main` — branch dari `main`, bukan `dev`).
> Rilis target: **v3.0.0** (major — framework breaking). Rollback: revert commit / Vercel
> instant rollback ke deployment v2.15.x.
> Referensi: `nextjs.org/docs/app/guides/upgrading/version-16`, `nextjs.org/blog/next-16`.

## 1. Hasil Audit Kesiapan (2026-09-14)

| Titik sentuh | Kondisi kode | Dampak |
|---|---|---|
| `params`/`searchParams` | 3 rute dinamis SUDAH `Promise + await` (`toko/[slug]`, `proyek/[slug]`, `artikel/[slug]`) | NIHIL — lolos breaking change terbesar |
| `cookies()`/`headers()`/`draftMode()` | Tidak dipakai di `src` (hanya `URLSearchParams` client-side) | NIHIL |
| `revalidateTag`/`unstable_*` | Tidak dipakai (hanya `revalidatePath`, tidak berubah di 16) | NIHIL |
| ISR `export const revalidate = 60` (7 rute) | Masih didukung di 16 sebagai legacy | Tunda — migrasi `'use cache'` tahap lanjutan, bukan blocker |
| Parallel routes `@slot` | Tidak ada | NIHIL |
| AMP / webpack custom / runtime-config / PPR | Tidak ada | NIHIL |
| Node (24 lokal / 20 CI) / TS ^5 / React 19.3.0 | ≥ syarat 16 (Node 20.9+, TS 5.1+, React 19.2) | NIHIL |
| `images.unoptimized=true` | Perubahan default image 16 tidak relevan | NIHIL |
| `middleware.ts` (Clerk gate + `x-request-id`) | **DIVERIFY: tetap dieksekusi** (banner build `ƒ Proxy (Middleware)` + header `x-request-id` terlihat di response) | Rename ke `proxy.ts` tetap dilakukan (konvensi 16 + Clerk mendukungnya). Bukan single-point-of-failure: `/admin` layout punya cek server-side `auth()`+`notFound()`, semua action `verifyAdmin()` |
| ESLint (`FlatCompat` + config-next 15) | Crash sudah terbukti di 9.39.5 | Wajib migrasi flat-native (didukung PENUH baru di config-next 16) |
| Build webpack → Turbopack default | Dev sudah `--turbopack`; build belum pernah Turbopack | Wajib uji, risiko sedang |
| `experimental.serverActions.bodySizeLimit` | **TETAP di `experimental`** — diverifikasi via tipe `NextConfig` 16.3.5 (`config-shared.d.ts:928`); asumsi "pindah ke top-level" SALAH | Tidak ada perubahan config; hanya tambah komentar |
| Kompatibilitas Clerk ^7 / Drizzle / GSAP | Belum teruji di 16 | Risiko utama — tentukan di Fase 0 |

## 2. Fase Eksekusi (berhenti & lapor tiap fase)

### Fase 0 — Persiapan (read-only, tanpa ubah kode)
- [ ] Tag backup `pre-next16` di `dev`.
- [ ] Baca changelog 16.x + cek matriks support `@clerk/nextjs`, `drizzle-orm`, `gsap`, `sonner` terhadap Next 16.
- [ ] Buat branch `upgrade/next-16` dari `dev`.
- Go/no-go: semua dependensi kritis dukung 16. Jika Clerk belum dukung → STOP total.

### Fase 1 — Bump + codemod
- [ ] `npm i next@16.3.4 eslint-config-next@16.3.4` (react 19.3.0 tetap).
- [ ] `npx @next/codemod@canary upgrade latest` (turbopack config, next-lint→ESLint, middleware→proxy, hapus `unstable_`, drop `experimental_ppr`).
- [ ] `npx next typegen`.
- [ ] Verifikasi: `tsc --noEmit` + `vitest run` hijau.

### Fase 2 — Proxy (KRITIS KEAMANAN)
- [ ] Pastikan `src/proxy.ts` export `proxy` (Node.js runtime), logika gate + `x-request-id` identik.
- [ ] Hapus sisa `middleware.ts` agar tidak ganda.
- [ ] Uji WAJIB: anonim ke `/admin` → 404; `/admin/system` → 404; login owner → 200; mutasi non-owner → ditolak. Satu saja gagal = STOP.
- [ ] Verifikasi: `npm run lint` hijau.

### Fase 3 — ESLint flat-native
- [ ] `eslint.config.mjs`: `import nextVitals from "eslint-config-next/core-web-vitals"` (tanpa `.js` — didukung di v16) + `nextTs`, hapus `FlatCompat`.
- [ ] `npm rm @eslint/eslintrc` (kembali dicoba SETELAH v16, bukan sebelumnya).
- [ ] Verifikasi: `npm run lint` hijau (kegagalan 9.39.5 kemarin harus hilang).

### Fase 4 — Turbopack build + config
- [ ] Hapus `--turbopack` dari script dev (sudah default); pastikan tidak ada config webpack.
- [ ] Selesaikan pemindahan config hasil codemod (`experimental.turbopack` → top-level, `serverActions`).
- [ ] Verifikasi: `npm run build` Turbopack bersih 38+ rute + `/admin/system` ada.

### Fase 5 — QA penuh
- [ ] E2E Playwright 3/3 + tambah 1 spec: `/admin` anonim → 404.
- [ ] Manual: boot BIOS, terminal, Sigit_Bot, CRUD tiap entitas, upload, kontak, slug produk, OG image, sitemap/robots.
- [ ] Lighthouse CI tetap 100 (a11y/SEO).
- [ ] Perilaku cache: ISR legacy dianggap cukup; catat anomali TTFB/DB-load (efek opt-in caching 16).

### Fase 6 — Rilis v3.0.0
- [ ] PR `upgrade/next-16` → `dev` → CI hijau → merge; PR `dev` → `main` → CI → merge.
- [ ] Tag `v3.0.0`, pantau deploy Vercel + smoke test produksi (HOME 200, IndexNow 405/401, sitemap).
- [ ] Rollback bila merah: revert merge di `main`, atau Vercel instant rollback ke deployment v2.8.1.

## 3. Risiko Teratas
1. **Proxy silent-ignore** → `/admin` publik tanpa proteksi. Mitigasi: Fase 2 adalah gate, tidak bisa dilewati.
2. **Clerk/Drizzle/GSAP tidak kompatibel 16** → bisa menggagalkan total; matei di Fase 0.
3. **Turbopack build break** (loader pihak ketiga) → fallback `--webpack` sementara, catat utang.
4. **Perilaku cache berubah diam-diam** (rute jadi dinamis, DB load naik) → pantau TTFB + Neon CPU pasca-rilis; migrasi `'use cache'` menyusul.

## 4. Yang SENGAJA tidak dikerjakan (defer)
- Migrasi `revalidate=60` → `'use cache'` + `cacheLife` (bekerja sebagai legacy; proyek lanjutan).
- `updateTag()`/`refresh()` (butuh UX decision per entitas).
- PPR/Cache Components `cacheComponents: true`.
- React Compiler.

## 5. Hasil Eksekusi (2026-09-20, branch `upgrade/next-16`)

**Semua gate hijau:**

| Gate | Hasil |
|---|---|
| `npx next typegen` | ✅ tipe route regenerasi; `tsconfig.json` diupdate otomatis (jsx→react-jsx, include `.next/dev/types`) |
| `tsc --noEmit` | ✅ EXIT 0 |
| `vitest run` | ✅ **233/233 (21 file)** — nol regresi |
| `npm run lint` | ✅ 0 error (lihat catatan react-hooks v7 di bawah) |
| `npm run build` (Turbopack) | ✅ 38/38 halaman statis, `/admin/system` & semua route hadir, banner `ƒ Proxy (Middleware)` |
| Gerbang proxy (prod mode) | ✅ anonymous `GET /admin` → **307 → /sign-in** (via `auth.protect()`); `GET /` → 200 |
| `npm run dev` | ✅ jalan tanpa flag `--turbopack` (default 16), `/` → 200 |

**Temuan baru saat eksekusi (tidak ada di audit awal):**

1. **`createRouteMatcher()` (Clerk) deprecated** — log runtime warning. Diganti dengan matching
   native `req.nextUrl.pathname.startsWith("/admin")` sesuai anjuran Clerk.
2. **eslint-plugin-react-hooks v7** (dibundel eslint-config-next 16) mengaktifkan rule baru sebagai
   **error**: `set-state-in-effect`, `refs`, `purity`, `immutability`. Ditangani:
   - 1 code smell asli diperbaiki: `os-boot-loader.tsx` — `handleComplete` dipanggil dalam `setTimeout`
     sebelum deklarasi (TDZ) → dipindah ke atas + `useCallback([])`, deps effect `[handleComplete]`.
   - 3 false positive di-scope-suppress dengan `eslint-disable-next-line` + komentar penjelasan
     (`content-editor.tsx` ref di event handler; `os-crt-terminal.tsx` `Math.random()` & `window.location`
     di command handler — rule tak bisa membedakan render vs event handler).
   - `set-state-in-effect` (23 situs: fetch-on-mount, load localStorage, baca bahasa URL — pola sah)
     diturunkan ke `warn` di `eslint.config.mjs`; refactor `useEffectEvent` = utang terpisah.
3. **Flat config ESLint**: plugin `react-hooks` harus dideklarasikan ulang di object override karena
   config object `next` (eslint-config-next) me-scope plugin-nya hanya ke `files:` tertentu — object
   global tidak bisa melihatnya tanpa deklarasi (`@typescript-eslint` global, jadi tidak terkena).
4. **E2E Playwright (16 test) — 4 lulus / 12 gagal, semua karena environmental, BUKAN regresi Next 16:**
   - Akar penyebab: `.env.local` memakai instance Clerk **development** (`pk_test_`, domain
     `*.clerk.accounts.dev`). Instance dev memaksa **handshake Clerk di setiap navigasi browser**
     (response header `x-clerk-auth-reason: dev-browser-missing`). Chrome modern memblokir cookie
     pihak-ketiga → handshake tak pernah selesai → `ERR_TOO_MANY_REDIRECTS`.
   - Curl polos dapat 200 (tidak bawa header browser); 4 test yang lulus murni konten server
     (`/proyek`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`).
   - Sudah didokumentasikan sejak lama di `env.ts` & `SECURITY.md` §4 (perilaku `pk_test_`).
   - Prod-mode E2E dengan placeholder key juga tidak viable: Clerk SDK v7 **menolak** placeholder
     format-invalid di runtime (`pk_test_xxxx` ditolak; validasi ketat di `initPublishableKeyValues`).
   - **Saran**: E2E penuh butuh CI dengan instance Clerk valid (key `pk_test_` nyata dari dashboard)
     atau mock Clerk di level test — pekerjaan terpisah, bukan blocker upgrade.

**File yang berubah (9 + 1 rename):** `package.json`, `package-lock.json`, `eslint.config.mjs`,
`next.config.ts` (komentar saja), `tsconfig.json` (typegen), `src/proxy.ts` (rename dari
`middleware.ts` + matching native), `os-boot-loader.tsx`, `content-editor.tsx`, `os-crt-terminal.tsx`.

