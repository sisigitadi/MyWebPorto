import { describe, expect, it } from "vitest";
import {
  parseUserAgent,
  hashIp,
  extractReferrerDomain,
  recordVisitorHit,
  formatReadableNetwork,
} from "@/lib/visitor-analytics";

describe("Visitor Analytics — parseUserAgent", () => {
  it("menangani UA kosong atau null secara aman", () => {
    const res1 = parseUserAgent(null);
    expect(res1.isBot).toBe(false);
    expect(res1.device).toBe("unknown");
    expect(res1.browser).toBe("Unknown");
    expect(res1.os).toBe("Unknown");

    const res2 = parseUserAgent("");
    expect(res2.isBot).toBe(false);
    expect(res2.device).toBe("unknown");
  });

  it("mengenali desktop Windows dengan Google Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    const res = parseUserAgent(ua);
    expect(res.isBot).toBe(false);
    expect(res.device).toBe("desktop");
    expect(res.os).toBe("Windows 10/11");
    expect(res.browser).toBe("Chrome");
  });

  it("mengenali iPhone dengan Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    const res = parseUserAgent(ua);
    expect(res.isBot).toBe(false);
    expect(res.device).toBe("mobile");
    expect(res.os).toBe("iOS");
    expect(res.browser).toBe("Safari");
  });

  it("mengenali tablet iPad", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    const res = parseUserAgent(ua);
    expect(res.isBot).toBe(false);
    expect(res.device).toBe("tablet");
    expect(res.os).toBe("iOS");
    expect(res.browser).toBe("Safari");
  });

  it("mengenali perangkat Android mobile", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36";
    const res = parseUserAgent(ua);
    expect(res.isBot).toBe(false);
    expect(res.device).toBe("mobile");
    expect(res.os).toBe("Android");
    expect(res.browser).toBe("Chrome");
  });

  it("mengenali macOS dengan Firefox", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:130.0) Gecko/20100101 Firefox/130.0";
    const res = parseUserAgent(ua);
    expect(res.isBot).toBe(false);
    expect(res.device).toBe("desktop");
    expect(res.os).toBe("macOS");
    expect(res.browser).toBe("Firefox");
  });

  it("mendeteksi crawler bot dan search engine", () => {
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "curl/7.88.1",
      "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36",
    ];

    for (const botUa of bots) {
      const res = parseUserAgent(botUa);
      expect(res.isBot).toBe(true);
      expect(res.device).toBe("bot");
    }
  });
});

describe("Visitor Analytics — hashIp", () => {
  it("menghasilkan hash SHA-256 yang konsisten dengan salt", () => {
    const hash1 = hashIp("192.168.1.1", "test-salt");
    const hash2 = hashIp("192.168.1.1", "test-salt");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("menghasilkan hash berbeda untuk salt atau IP berbeda", () => {
    const hash1 = hashIp("192.168.1.1", "salt-a");
    const hash2 = hashIp("192.168.1.1", "salt-b");
    const hash3 = hashIp("192.168.1.2", "salt-a");
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("membersihkan spasi pada IP", () => {
    const hash1 = hashIp("10.0.0.1", "salt");
    const hash2 = hashIp("  10.0.0.1  ", "salt");
    expect(hash1).toBe(hash2);
  });
});

describe("Visitor Analytics — extractReferrerDomain", () => {
  it("mengembalikan 'Langsung / Direct' jika kosong", () => {
    expect(extractReferrerDomain(null)).toBe("Langsung / Direct");
    expect(extractReferrerDomain("")).toBe("Langsung / Direct");
  });

  it("mengenali domain terkenal", () => {
    expect(extractReferrerDomain("https://www.google.com/search?q=sigit")).toBe("Google");
    expect(extractReferrerDomain("https://bing.com/search?q=test")).toBe("Bing");
    expect(extractReferrerDomain("https://github.com/sisigitadi")).toBe("GitHub");
    expect(extractReferrerDomain("https://t.co/abcxyz")).toBe("X (Twitter)");
    expect(extractReferrerDomain("https://linkedin.com/in/sigit")).toBe("LinkedIn");
  });

  it("mengekstrak domain umum tanpa www", () => {
    expect(extractReferrerDomain("https://www.example.org/blog/article")).toBe("example.org");
    expect(extractReferrerDomain("https://tech-news.id/read")).toBe("tech-news.id");
  });
});

describe("Visitor Analytics — recordVisitorHit", () => {
  it("mencatat hit dan melakukan debouncing saat burst dari IP dan path yang sama", async () => {
    const headers = new Headers({
      "x-forwarded-for": "103.174.238.100",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36",
      "x-vercel-ip-country": "ID",
      "x-vercel-ip-city": "Jakarta",
    });

    const res1 = await recordVisitorHit(headers, { path: "/test-unit-run" });
    expect(res1.ok).toBe(true);

    // Hit kedua dalam waktu singkat (< 2.5s) harus ter-rate limited (debounce)
    const res2 = await recordVisitorHit(headers, { path: "/test-unit-run" });
    expect(res2.ok).toBe(true);
    expect(res2.rateLimited).toBe(true);
  });
});

describe("Visitor Analytics — getVisitorAnalytics", () => {
  it("mengembalikan struktur data analitik yang valid", async () => {
    const { getVisitorAnalytics } = await import("@/lib/visitor-analytics");
    const stats = await getVisitorAnalytics("30d");
    expect(typeof stats.totalHits).toBe("number");
    expect(typeof stats.uniqueVisitors).toBe("number");
    expect(typeof stats.todayHits).toBe("number");
    expect(typeof stats.todayUniq).toBe("number");
    expect(Array.isArray(stats.topPages)).toBe(true);
    expect(Array.isArray(stats.topReferrers)).toBe(true);
    expect(Array.isArray(stats.deviceBreakdown)).toBe(true);
    expect(Array.isArray(stats.browserBreakdown)).toBe(true);
    expect(Array.isArray(stats.osBreakdown)).toBe(true);
    expect(Array.isArray(stats.countryBreakdown)).toBe(true);
    expect(Array.isArray(stats.cityBreakdown)).toBe(true);
    expect(Array.isArray(stats.locationBreakdown)).toBe(true);
    expect(Array.isArray(stats.timezoneBreakdown)).toBe(true);
    expect(Array.isArray(stats.networkBreakdown)).toBe(true);
    expect(Array.isArray(stats.dailyTrend)).toBe(true);
    expect(Array.isArray(stats.recentVisits)).toBe(true);
  });

  it("mencatat network, location (region), dan timezone dari header dan payload", async () => {
    const headers = new Headers({
      "x-forwarded-for": "180.252.100.5",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
      "x-vercel-ip-country": "ID",
      "x-vercel-ip-city": "Bandung",
      "x-vercel-ip-country-region": "JB",
      "x-vercel-ip-timezone": "Asia/Jakarta",
      "x-vercel-ip-as-number": "7713",
      "x-vercel-ip-as-org": "PT Telekomunikasi Indonesia",
    });

    const res = await recordVisitorHit(headers, {
      path: "/test-network-geo",
      timezone: "Asia/Jakarta",
      connection: "4G",
    });
    expect(res.ok).toBe(true);
  });
});

describe("Visitor Analytics — formatReadableNetwork", () => {
  it("mengonversi kode ASN Indonesia ke nama ISP manusiawi yang ramah", () => {
    expect(formatReadableNetwork("AS17974")).toBe("Telkomsel (PT Telekomunikasi Selular)");
    expect(formatReadableNetwork("AS7713")).toBe("Telkom Indonesia (IndiHome)");
    expect(formatReadableNetwork("AS23693")).toBe("Biznet Networks (PT Supra Primatama Nusantara)");
    expect(formatReadableNetwork("AS24213")).toBe("XL Axiata (PT XL Axiata Tbk)");
    expect(formatReadableNetwork("AS136052")).toBe("First Media (PT Link Net Tbk)");
    expect(formatReadableNetwork("AS24203")).toBe("Indosat Ooredoo Hutchison (IM3)");
  });

  it("mengonversi kode ASN global (Cloud/CDN/Tech) dengan tepat", () => {
    expect(formatReadableNetwork("AS13335")).toBe("Cloudflare, Inc.");
    expect(formatReadableNetwork("AS15169")).toBe("Google LLC");
    expect(formatReadableNetwork("AS16509")).toBe("Amazon Web Services (AWS)");
    expect(formatReadableNetwork("AS8075")).toBe("Microsoft Corporation");
  });

  it("membersihkan string gabungan prefix ASN dengan nama organisasi", () => {
    expect(formatReadableNetwork("AS7713 PT Telekomunikasi Indonesia")).toBe("Telkom Indonesia (IndiHome)");
    expect(formatReadableNetwork("AS13335 CLOUDFLARENET")).toBe("Cloudflare, Inc.");
  });

  it("mengonversi tipe koneksi seluler perangkat browser", () => {
    expect(formatReadableNetwork("Cellular / 4G")).toBe("Koneksi Seluler (4G / LTE)");
    expect(formatReadableNetwork("Cellular / 5g")).toBe("Koneksi Seluler (5G Superfast)");
    expect(formatReadableNetwork("Cellular / 3G")).toBe("Koneksi Seluler (3G / HSPA)");
    expect(formatReadableNetwork("Cellular / 2G")).toBe("Koneksi Seluler (2G / Edge)");
  });

  it("menangani nilai kosong, tidak diketahui, atau ASN non-katalog secara anggun", () => {
    expect(formatReadableNetwork(null)).toBe("Jaringan Publik / Terbuka");
    expect(formatReadableNetwork("Unknown")).toBe("Jaringan Publik / Terbuka");
    expect(formatReadableNetwork(null, "AS99999")).toBe("Jaringan AS99999 (ISP Publik)");
    expect(formatReadableNetwork("AS88888")).toBe("Jaringan AS88888 (ISP Publik)");
    expect(formatReadableNetwork("My Custom Corporate Network")).toBe("My Custom Corporate Network");
  });
});

