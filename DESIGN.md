# Design Direction

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

## Identity & Product
- **Type**: Portofolio pribadi software engineer / tech creator.
- **Audience**: Rekruter teknis, klien potensial, dan sesama pengembang perangkat lunak.
- **Goal**: Menampilkan karya teknis, proyek full-stack, kapabilitas AI, serta pengalaman rekayasa perangkat lunak secara profesional dan interaktif.

## Personality & Mood
- **Visual Theme**: SigitOS (Retro tech, 90s OS desktop chrome, CRT terminal vibe dipadukan dengan standar web modern).
- **Tone**: Percaya diri, presisi, teknis, bernuansa nostalgia komputasi klasik namun tetap cepat, responsif, dan fungsional.

## Theme & Palette
Sistem mendukung toggle tema ganda (Light / Retro 90s dan Dark):
- **Core Desktop & Paper**:
  - Light (Retro 90s): Paper `#f3f2ee`, Chrome `#cfcdc8`, Desktop `#0a1631`
  - Dark: Paper `#16161d`, Chrome `#23232b`, Desktop `#08080d`
- **Primary & Accent Colors**:
  - Primary Blue: `#3b2fd6` (Light) / `#7a86ff` (Dark)
  - Secondary Violet: `#7c5cff`
  - Terminal & CRT Green Accent: `#37ff9b`
  - Accent Amber: `#ffd400`
- **Surface & Borders**: Beveled edges khas antarmuka sistem operasi klasik (`--vt-edge-hi`, `--vt-edge-lo`) dengan bayangan elevasi terukur.

## Typography
Mengikuti hierarki tipografi yang sudah dikonfigurasi pada proyek:
- **Display & Headings**: Unbounded dan Space Grotesk (`--font-unbounded`, `--font-space-grotesk`)
- **Body & UI**: Inter (`--font-inter`)
- **Retro OS Chrome & Window Titles**: Silkscreen (`--font-silkscreen`)
- **Terminal & Code Blocks**: Azeret Mono dan Fira Code (`--font-azeret-mono`, `--font-fira-code`)

## Motion & Interactivity
- **Dial Setting**: MOTION 2
- **Behaviors**: Animasi terminal CRT (efek scanline halus dan pengetikan teks), perpindahan/fokus jendela retro, transisi buka-tutup dialog, serta feedback interaktif pada setiap kontrol.
