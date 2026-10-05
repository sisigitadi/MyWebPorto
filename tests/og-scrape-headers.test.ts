import { describe, expect, it } from "vitest";
// Alias "@" menunjuk ke src/, sedangkan next.config.ts berada di root proyek.
import nextConfig from "../next.config";

/**
 * Header yang dikirim ke scraper WhatsApp/Facebook untuk gambar share.
 *
 * Bug nyata (2026-10-05): rule global `/(.*)` memasang
 * `Cross-Origin-Resource-Policy: same-origin` ke /api/media/* juga. Padahal
 * gambar media inilah yang dipakai sebagai og:image. Scraper WhatsApp
 * mengambil og:image dari server MEREKA sendiri (cross-origin), sehingga CORP
 * memblokirnya: preview gambar muncul di Telegram (fetcher-nya mengabaikan
 * CORP) tetapi hilang di WhatsApp dan platform lain.
 *
 * Test ini mengunci header itu supaya tidak kembali strict tanpa disadari —
 * gejalanya sulit direproduksi karena hanya muncul di aplikasi tertentu.
 */

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

// `headers()` bertipe `() => Promise<HeaderRule[]>` di NextConfig, tetapi
// implementasi di next.config.tssinkron. Keduanya ditangani di sini.
async function headerRules(): Promise<HeaderRule[]> {
  const build = nextConfig.headers;
  if (typeof build !== "function") {
    throw new Error("next.config tidak mengekspos headers()");
  }
  return (await build.call(nextConfig)) as HeaderRule[];
}

function valueFor(rules: HeaderRule[], source: string, key: string): string | undefined {
  const rule = rules.find((r) => r.source === source);
  return rule?.headers.find((h) => h.key === key)?.value;
}

describe("Cross-Origin-Resource-Policy untuk gambar media", () => {
  it("rule global tetap strict untuk halaman dan API biasa", async () => {
    const rules = await headerRules();
    expect(valueFor(rules, "/(.*)", "Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(valueFor(rules, "/api/:path*", "Cross-Origin-Resource-Policy")).toBeUndefined();
  });

  it("/api/media dilepas dari CORP strict agar bisa di-fetch scraper luar", async () => {
    const rules = await headerRules();
    expect(valueFor(rules, "/api/media/:path*", "Cross-Origin-Resource-Policy")).toBe(
      "cross-origin",
    );
  });

  it("keputusan CORP menggantung pada urutan rule (media wajib setelah rule umum)", async () => {
    const rules = await headerRules();
    const globalIdx = rules.findIndex((r) => r.source === "/(.*)");
    const mediaIdx = rules.findIndex((r) => r.source === "/api/media/:path*");
    expect(globalIdx).toBeGreaterThanOrEqual(0);
    expect(mediaIdx).toBeGreaterThan(globalIdx);
  });

  it("media tetap immutable dan ter-cache penuh (tidak diturunkan jadi no-store)", async () => {
    const rules = await headerRules();
    expect(valueFor(rules, "/api/media/:path*", "Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });
});

describe("shareImage — kelengkapan metadata untuk scraper sosial", () => {
  it("kartu /opengraph-image membawa dimensi dan tipe yang pasti", async () => {
    const { shareImage } = await import("@/lib/seo");
    const image = shareImage(null, "https://sigitadi.id", "Judul Artikel");
    expect(image.url).toBe("https://sigitadi.id/opengraph-image");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.type).toBe("image/png");
    expect(image.alt).toBe("Judul Artikel");
  });

  it("cover konten tidak dikasih dimensi karangan", async () => {
    const { shareImage } = await import("@/lib/seo");
    const cases = [
      ["/api/media/abc", "https://sigitadi.id/api/media/abc"],
      ["https://images.unsplash.com/photo-1?w=800", "https://images.unsplash.com/photo-1?w=800"],
      ["https://6aa37cdc9422e77b387b9b2e.imgix.net/x.png", "https://6aa37cdc9422e77b387b9b2e.imgix.net/x.png"],
    ] as const;
    for (const [src, expected] of cases) {
      const image = shareImage(src, "https://sigitadi.id", "Alt");
      expect(image.url).toBe(expected);
      expect(image.width).toBeUndefined();
      expect(image.height).toBeUndefined();
      expect(image.type).toBeUndefined();
    }
  });

  it("path relatif jadi URL absolut tanpa garis miring ganda", async () => {
    const { shareImage } = await import("@/lib/seo");
    expect(shareImage("/api/media/x", "https://sigitadi.id/", "a").url).toBe(
      "https://sigitadi.id/api/media/x",
    );
  });
});