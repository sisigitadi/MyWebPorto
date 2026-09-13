# Changelog MyWebPorto

Format: `Added / Changed / Fixed / Security`. Tag rilis: `git tag -a vX.Y.Z`.

## [Unreleased] (dev)
- Added: CI pre-merge gate (lint + typecheck + unit test + build).
- Added: validasi env terpusat (`src/lib/env.ts`, non-blocking, tampil di `/admin/system`).
- Added: audit log persisten (`audit_logs` + fallback local-store, tampil di `/admin/system`).
- Added: unit test Vitest (`npm run test`).

## [v2.6.1] - 2026-09-13
- Changed: taskbar atas tanpa bar sosmed; theme selector tampil di semua ukuran layar.
- Changed: format tanggal menubar `dd/mm/yyyy`.
- Added: halaman `/admin/system` (feasibility, tracing `x-request-id`, sumber logging).

## [v2.6.0] - 2026-09-12
- Final hardening v2 (CSP tanpa `unsafe-eval`, COOP/CORP, validasi max-length + slug regex, IndexNow admin-only).
- OG preview dinamis, chip editor tag/tech-stack, Terminal AI + Sigit_Bot NLP.
