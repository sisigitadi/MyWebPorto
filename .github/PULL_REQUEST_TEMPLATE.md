<!-- Checklist PR ke main — centang semua sebelum request review. -->
## Ringkasan
<!-- Apa yang diubah + kenapa -->

## Checklist
- [ ] `npm run lint` lolos (0 error)
- [ ] `npx tsc --noEmit` lolos
- [ ] `npm run test` lolos (atau N/A bila tanpa logika baru)
- [ ] `npm run build` lolos
- [ ] Migrasi Drizzle diterapkan bila ubah `src/db/schema.ts` (`npm run db:generate` + `db:push` staging)
- [ ] Rute terdampak diuji: `/`, `/proyek`, `/artikel`, `/toko/[slug]`, `/admin`, `/sitemap.xml`
- [ ] Tanpa secret/credential (cek `.env`, key, token)
- [ ] `CHANGELOG.md` diupdate (Unreleased)
- [ ] Bila menyentuh SEO/GEO/Redaksi: angka aturan tetap hanya di `src/lib/seo-rules.ts`, field lewat `seoFieldsFor()`, dan daftar aturan di `SEO_GEO_SYNC.md` ikut diperiksa
