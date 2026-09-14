# Changelog MyWebPorto

Format: `Added / Changed / Fixed / Security`. Tag rilis: `git tag -a vX.Y.Z`.

## [Unreleased] (dev)
- Added: CI pre-merge gate (lint + typecheck + unit test + build).
- Added: validasi env terpusat (`src/lib/env.ts`, non-blocking, tampil di `/admin/system`).
- Added: audit log persisten (`audit_logs` + fallback local-store, tampil di `/admin/system`).
- Added: unit test Vitest (`npm run test`).
- Added: E2E Playwright area publik (`npm run test:e2e`, 3 spec hijau).
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

## [v2.6.1] - 2026-09-13
- Changed: taskbar atas tanpa bar sosmed; theme selector tampil di semua ukuran layar.
- Changed: format tanggal menubar `dd/mm/yyyy`.
- Added: halaman `/admin/system` (feasibility, tracing `x-request-id`, sumber logging).

## [v2.6.0] - 2026-09-12
- Final hardening v2 (CSP tanpa `unsafe-eval`, COOP/CORP, validasi max-length + slug regex, IndexNow admin-only).
- OG preview dinamis, chip editor tag/tech-stack, Terminal AI + Sigit_Bot NLP.
