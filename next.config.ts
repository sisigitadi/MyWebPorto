import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Next 16 memblokir akses cross-origin ke resource dev (/_next/hmr) dari
  // host tak terdaftar. Playwright memakai 127.0.0.1 sedangkan dev server
  // mengidentifikasi diri sebagai localhost → tanpa allow-list, handshake
  // HMR ditolak (ERR_INVALID_HTTP_RESPONSE) dan bootstrap client E2E
  // tidak pernah selesai hydrate (lihat playwright.config.ts). Dev-only;
  // diabaikan di build produksi.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Gunakan standalone hanya untuk build mandiri VPS/PM2, biarkan default untuk Vercel
  output: process.env.VERCEL ? undefined : "standalone",
  // deploy_package/ adalah output packaging ini sendiri (berisi app + node_modules
  // lengkap). Jika ada saat `npm run build` berjalan, tracer standalone pernah
  // menyalinnya ke .next/standalone → rekursi deploy_package/deploy_package/...
  // yang bertambah 1 level per siklus (guard; root cause tetap di package-deploy.mjs
  // yang menghapusnya sebelum build).
  outputFileTracingExcludes: {
    "/": ["./deploy_package/**/*"],
  },
  // Next.js 16: tetap di experimental (diverifikasi via tipe NextConfig 16.3.5
  // — config-shared.d.ts:928; tidak ikut pindah ke top-level).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // Allowlist host gambar eksternal (defense in depth — aktif penuh saat unoptimized=false).
    // unoptimized=true saat ini (ramah VPS tanpa sharp) sehingga pola ini belum dienforce runtime.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
      },
      {
        protocol: "https",
        hostname: "sigitadi.id",
      },
      {
        protocol: "https",
        hostname: "*.sigitadi.id",
      },
    ],
  },
  // Security Headers — lihat SECURITY.md §3 untuk mapping OWASP
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: (() => {
              // Domain Frontend API Clerk diturunkan dari publishable key
              // (format: pk_live_<base64 domain>). Pada akun Clerk dengan custom
              // domain, domainnya BUKAN *.clerk.accounts.dev — hardcode hanya
              // itu membuat script clerk.browser.js diblokir CSP → komponen
              // <SignIn /> tidak pernah render ("tidak ada pilihan login").
              // Keduanya diizinkan: custom domain untuk akun ini, wildcard
              // .clerk.accounts.dev untuk akun dev/instans Clerk lain.
              const clerkDomains = (() => {
                const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
                if (!pk || pk.includes("xxxx")) return "";
                // Bagian base64 menurunkan domain Frontend API Clerk, tetapi
                // sering membawa sufiks non-host (mis. '$') yang membuat source
                // CSP tidak valid → browser mengabaikannya → script tetap
                // diblokir. Ambil hanya karakter host yang valid.
                const decoded = Buffer
                  .from(pk.replace(/^pk_(live|test)_/, ""), "base64")
                  .toString("utf-8");
                const host = decoded.replace(/[^a-zA-Z0-9.\-]/g, "").replace(/^[.]+|[.]+$/g, "");
                return host ? ` https://${host}` : "";
              })();
              const clerkAny = " https://*.clerk.accounts.dev https://clerk.com";
              return [
                "default-src 'self'",
                // Clerk memerlukan 'unsafe-inline' untuk hydration.
                // 'unsafe-eval' WAJIB hanya di dev: runtime React Fast Refresh
                // (next/dist/compiled/@next/react-refresh-utils) mengevaluasi
                // string sebagai JS. Tanpanya, eksekusi client chunk melempar
                // EvalError → React tidak pernah hydrate → efek boot loader
                // (setTimeout 5s) tidak pernah berjalan → overlay BIOS diam
                // selamanya ("hang di loading / tidak masuk menu"). Dihapus di prod.
                `script-src 'self' 'unsafe-inline'${
                  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
                }${clerkDomains}${clerkAny}`,
                "worker-src 'self' blob:",
                "style-src 'self' 'unsafe-inline'",
                "font-src 'self' data:",
                "img-src 'self' data: https: blob:",
                `connect-src 'self' https://api.indexnow.org${clerkDomains}${clerkAny} https://clerk-telemetry.com https://formspree.io https://portofolio-visitor-tracker.si-sigitadi.workers.dev`,
                `frame-src 'self'${clerkDomains}${clerkAny} https://challenges.cloudflare.com`,
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self' https://formspree.io",
                "frame-ancestors 'self'",
                "report-uri https://portofolio-visitor-tracker.si-sigitadi.workers.dev/csp-report",
                "upgrade-insecure-requests",
              ].join("; ");
            })(),
          },
        ],
      },
      // Cache-control untuk endpoint sensitif — cegah cache admin/API di CDN/proxy
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      // Pengecualian: GET /api/media/:id adalah aset statis (bytea immutable —
      // id baru untuk setiap upload, jadi konten id tertentu tidak pernah
      // berubah). Wajib di-cache, jika tidak setiap render gambar memukul
      // Postgres dan mentransfer bytea penuh. Aturan ini diletakkan SETELAH
      // rule /api/:path* di atas agar menimpanya untuk path media saja.
      // Cross-Origin-Resource-Policy HARUS di-longgarkan di sini. Gambar
      // media kini dilayani dari origin sendiri dan dipakai sebagai
      // og:image. Scraper WhatsApp dan Facebook mengambil og:image dari
      // server mereka sendiri (permintaan cross-origin), sehingga CORP
      // same-origin dari rule /(.*) di atas memblokirnya: preview gambar
      // muncul di Telegram (fetcher-nya mengabaikan CORP) tetapi hilang
      // di WhatsApp dan platform lain. Nilai cross-origin aman di sini
      // karena berkasnya sudah publik lewat og:image dan immutable, jadi
      // tidak ada data sensitif yang bisa bocor.
      {
        source: "/api/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
