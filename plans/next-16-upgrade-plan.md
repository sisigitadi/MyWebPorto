# Rencana Upgrade Next.js 15.5.25 → 16.3.4 (MyWebPorto)

> Status: PERENCANAAN (belum eksekusi). Branch kerja: `upgrade/next-16` dari `dev`.
> Rilis target: **v3.0.0** (major — framework breaking). Rollback: revert commit / Vercel instant rollback ke deployment v2.8.x.
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
| `middleware.ts` (Clerk gate + `x-request-id`) | **KRITIS** — di 16 file ini DIABAIKAN SILENTLY bila tidak rename | Wajib rename `proxy.ts` + uji gate admin |
| ESLint (`FlatCompat` + config-next 15) | Crash sudah terbukti di 9.39.5 | Wajib migrasi flat-native (didukung PENUH baru di config-next 16) |
| Build webpack → Turbopack default | Dev sudah `--turbopack`; build belum pernah Turbopack | Wajib uji, risiko sedang |
| `experimental.serverActions.bodySizeLimit` | Kemungkinan pindah/stabil di 16 | Ikut codemod, verifikasi |
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
