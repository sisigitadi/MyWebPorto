import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Gunakan standalone hanya untuk build mandiri VPS/PM2, biarkan default untuk Vercel
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // NOTE: wildcard ** memudahkan thumbnail eksternal, tapi long-term batasi ke host terpercaya
    // Contoh hardening: ganti "**" dengan "images.unsplash.com", "cdn.sigitadi.id", dll.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
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
            value: [
              "default-src 'self'",
              // Clerk memerlukan 'unsafe-inline' untuk hydration; 'unsafe-eval' hanya untuk dev — dihapus di prod
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api.indexnow.org https://*.clerk.accounts.dev https://clerk.com https://clerk-telemetry.com https://formspree.io https://portofolio-visitor-tracker.si-sigitadi.workers.dev",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://formspree.io",
              "frame-ancestors 'self'",
              "report-uri https://portofolio-visitor-tracker.si-sigitadi.workers.dev/csp-report",
              "upgrade-insecure-requests",
            ].join("; "),
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
    ];
  },
};

export default nextConfig;
