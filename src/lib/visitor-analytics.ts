import crypto from "crypto";
import { sql, desc, eq } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import { visitorHits } from "@/db/schema";

function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}


export interface ParsedUA {
  isBot: boolean;
  device: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser: string;
  os: string;
}

const BOT_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|bingbot|googlebot|yandex|duckduckbot|baiduspider|twitterbot|headless|curl|wget|lighthouse|bytespider|semrush|ahrefs|uptime|postman/i;

/**
 * Urai User-Agent ringan tanpa dependency eksternal.
 * Menentukan tipe perangkat, sistem operasi, browser, dan deteksi bot/crawler.
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua || typeof ua !== "string") {
    return { isBot: false, device: "unknown", browser: "Unknown", os: "Unknown" };
  }

  const isBot = BOT_REGEX.test(ua);

  // Device
  let device: ParsedUA["device"] = "desktop";
  if (isBot) {
    device = "bot";
  } else if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = "tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|phone|iemobile/i.test(ua)) {
    device = "mobile";
  }

  // OS
  let os = "Other";
  if (isBot) {
    os = "Bot";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/windows nt 10/i.test(ua)) {
    os = "Windows 10/11";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
  }

  // Browser
  let browser = "Other";
  if (isBot) {
    browser = "Bot/Crawler";
  } else if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  } else if (/samsungbrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Safari";
  }

  return { isBot, device, browser, os };
}

/**
 * Hash IP dengan salt SHA-256 (UU PDP & privasi ramah).
 * Raw IP tidak pernah masuk ke database atau log.
 */
export function hashIp(ip: string, salt: string = process.env.VISITOR_SALT || "mywebporto-vtr-salt-2026"): string {
  return crypto.createHash("sha256").update(`${salt}:${ip.trim()}`).digest("hex");
}

/**
 * Peta kamus ASN ke Nama Operator / ISP yang ramah dan mudah dipahami.
 * Menghindari tampilan kode teknis mentah semata (misal AS17974 -> Telkomsel).
 */
export const ASN_REGISTRY: Record<string, string> = {
  // Provider / ISP Indonesia
  AS7713: "Telkom Indonesia (IndiHome)",
  AS17974: "Telkomsel (PT Telekomunikasi Selular)",
  AS24203: "Indosat Ooredoo Hutchison (IM3)",
  AS4761: "Indosat Ooredoo Hutchison",
  AS23693: "Biznet Networks (PT Supra Primatama Nusantara)",
  AS23947: "MNC Play (PT MNC Kabel Mediacom)",
  AS24521: "MyRepublic (PT Eka Mas Republik)",
  AS136052: "First Media (PT Link Net Tbk)",
  AS24213: "XL Axiata (PT XL Axiata Tbk)",
  AS9341: "Smartfren (PT Smartfren Telecom Tbk)",
  AS55688: "CBN (PT Cyberindo Adhitama)",
  AS45727: "Moratelindo (Oxygen.id)",
  AS58395: "Fiberstar (PT Mega Akses Persada)",
  AS131759: "Balifiber (PT Bali Towerindo Sentra)",
  AS55685: "Citranet (PT Citra Jelajah Informatika)",
  AS132061: "Nusanet (PT Media Antar Nusa)",
  AS55699: "Lintasarta (PT Aplikanusa Lintasarta)",
  AS45729: "PGNCOM (PT PGAS Telekomunikasi Nusantara)",
  AS134704: "PLN Icon Plus (Icon+)",
  AS133036: "PT Mora Telematika Indonesia",
  AS136034: "Transvision (PT Indonusa Telemedia)",
  AS138977: "XLSmart Telecom",
  AS24155: "APJII / IDNIC",
  AS45778: "CBN Internet Service",
  AS17642: "Matrix (PT NAP Info Lintas Nusantara)",
  AS18004: "Artha Telekomindo",

  // Cloud Providers, Global CDNs & Tech Networks
  AS13335: "Cloudflare, Inc.",
  AS209242: "Cloudflare Warp",
  AS15169: "Google LLC",
  AS396982: "Google Cloud",
  AS19527: "Google Fiber",
  AS16509: "Amazon Web Services (AWS)",
  AS14618: "Amazon.com, Inc.",
  AS8075: "Microsoft Corporation",
  AS32934: "Meta Platforms (Facebook/Instagram)",
  AS14061: "DigitalOcean, LLC",
  AS63949: "Linode / Akamai Cloud",
  AS20473: "Vultr (The Constant Company)",
  AS54113: "Fastly CDN",
  AS20940: "Akamai Technologies",
  AS16276: "OVHcloud",
  AS24940: "Hetzner Online GmbH",
  AS46484: "Hetzner Online GmbH",
  AS714: "Apple Inc.",
  AS132203: "Tencent Cloud",
  AS37963: "Alibaba Cloud",
  AS45102: "Alibaba Cloud",
  AS7018: "AT&T Services",
  AS7922: "Comcast Cable",
  AS3356: "Lumen Technologies",
  AS1299: "Arelion (Telia)",
  AS6453: "TATA Communications",
  AS7473: "Singtel (Singapore)",
  AS4657: "StarHub Ltd",
  AS4837: "China Unicom",
  AS4134: "China Telecom",
  AS9808: "China Mobile",
  AS2516: "KDDI Corporation",
  AS4713: "NTT Communications",
  AS45899: "VNPT Telecom",
  AS7552: "Viettel Group",
};

/**
 * Format string jaringan dan ASN menjadi nama operator/ISP yang jelas dan ramah manusia.
 * Jika hanya berupa kode ASN (misal "AS17974"), otomatis dikonversi ke nama ISP resminya.
 */
export function formatReadableNetwork(
  network: string | null | undefined,
  asn?: string | null | undefined
): string {
  const candidateAsn = (
    asn ||
    (typeof network === "string" && /^AS\d+/i.test(network.trim())
      ? network.trim().match(/^AS\d+/i)?.[0]
      : null) ||
    ""
  ).toUpperCase().trim();

  // 1. Jika cocok dengan kamus ASN yang terdaftar
  if (candidateAsn && ASN_REGISTRY[candidateAsn]) {
    return ASN_REGISTRY[candidateAsn];
  }

  if (!network || network === "Unknown" || network === "undefined" || network === "null") {
    if (candidateAsn) {
      return `Jaringan ${candidateAsn} (ISP Publik)`;
    }
    return "Jaringan Publik / Terbuka";
  }

  const trimmed = network.trim();

  // 2. Jika nilai hanya kode ASN semata seperti "AS17974" atau "AS7713"
  const asnOnly = trimmed.match(/^AS(\d+)$/i);
  if (asnOnly) {
    const key = `AS${asnOnly[1]}`.toUpperCase();
    if (ASN_REGISTRY[key]) return ASN_REGISTRY[key];
    return `Jaringan ${key} (ISP Publik)`;
  }

  // 3. Jika nilai berupa gabungan "ASxxxx <Nama Org>"
  const asnPrefixMatch = trimmed.match(/^AS\d+[\s\-:]+(.+)$/i);
  if (asnPrefixMatch) {
    const orgName = asnPrefixMatch[1].trim();
    if (candidateAsn && ASN_REGISTRY[candidateAsn]) {
      return ASN_REGISTRY[candidateAsn];
    }
    return orgName;
  }

  // 4. Jika nilai berupa tipe koneksi seluler seperti "Cellular / 4G"
  if (/^Cellular\s*\/\s*(.+)$/i.test(trimmed)) {
    const type = trimmed.replace(/^Cellular\s*\/\s*/i, "").trim().toLowerCase();
    if (type === "4g") return "Koneksi Seluler (4G / LTE)";
    if (type === "5g") return "Koneksi Seluler (5G Superfast)";
    if (type === "3g") return "Koneksi Seluler (3G / HSPA)";
    if (type === "2g" || type === "slow-2g") return "Koneksi Seluler (2G / Edge)";
    return `Koneksi Seluler (${type.toUpperCase()})`;
  }

  return trimmed;
}

// Global in-memory cache untuk debouncing hit burst dari ip+path yang sama (< 2.5s)
const recentHitsCache = new Map<string, number>();

export interface VisitorHitPayload {
  path?: string;
  referrer?: string;
  timezone?: string;
  connection?: string;
  country?: string;
  city?: string;
  region?: string;
}

export const VISITOR_ANALYTICS_ENABLED = false;

/**
 * Catat satu hit kunjungan ke database PostgreSQL secara aman dan non-blocking.
 * Jika VISITOR_ANALYTICS_ENABLED bernilai false, hit tidak akan disimpan ke database.
 */
export async function recordVisitorHit(
  headers?: Headers,
  payload: VisitorHitPayload = {}
): Promise<{ ok: boolean; rateLimited?: boolean; disabled?: boolean }> {
  try {
    const rawPath = typeof payload?.path === "string" ? payload.path.trim() : "/";
    const path = rawPath.startsWith("/") ? rawPath.slice(0, 500) : `/${rawPath.slice(0, 499)}`;

    // Ambil IP klien dari header reverse proxy
    const forwarded = headers?.get("x-forwarded-for");
    const realIp = headers?.get("x-real-ip");
    const cfIp = headers?.get("cf-connecting-ip");
    const ip = forwarded ? forwarded.split(",")[0].trim() : realIp || cfIp || "127.0.0.1";

    const ipHash = hashIp(ip);

    // Debounce hit burst dari IP yang sama pada path yang sama dalam 2.5 detik
    const cacheKey = `${ipHash}:${path}`;
    const now = Date.now();
    const lastHit = recentHitsCache.get(cacheKey);
    if (lastHit && now - lastHit < 2500) {
      return { ok: true, rateLimited: true };
    }
    recentHitsCache.set(cacheKey, now);

    // Prune cache bila terlalu besar (> 5000 entri)
    if (recentHitsCache.size > 5000) {
      for (const [k, ts] of recentHitsCache.entries()) {
        if (now - ts > 10000) recentHitsCache.delete(k);
      }
    }

    // Jika pelacakan dinonaktifkan, hentikan tanpa menulis ke database
    if (!VISITOR_ANALYTICS_ENABLED) {
      return { ok: true, disabled: true };
    }

    return { ok: true };
  } catch (err) {
    console.warn("visitor analytics record warning:", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

export type AnalyticsRange = "today" | "7d" | "30d" | "all";

export interface PageStat {
  path: string;
  hits: number;
  unique: number;
}

export interface ReferrerStat {
  referrer: string;
  domain: string;
  hits: number;
}

export interface DimensionStat {
  name: string;
  count: number;
  percentage: number;
}

export interface CountryStat {
  code: string;
  name: string;
  flag: string;
  count: number;
  percentage: number;
}

export interface CityStat {
  city: string;
  count: number;
  percentage: number;
}

export interface LocationStat {
  countryCode: string;
  countryName: string;
  flag: string;
  city: string | null;
  region: string | null;
  fullLocation: string;
  count: number;
  percentage: number;
}

export interface TimezoneStat {
  timezone: string;
  count: number;
  percentage: number;
}

export interface NetworkStat {
  network: string;
  count: number;
  percentage: number;
}

export interface DailyTrendStat {
  date: string;
  hits: number;
  unique: number;
}

export interface RecentVisitLog {
  id: string;
  path: string;
  referrer: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  countryName: string;
  countryFlag: string;
  city: string | null;
  region: string | null;
  fullLocation: string;
  timezone: string | null;
  asn: string | null;
  network: string | null;
  isBot: boolean;
  createdAt: Date;
  ipHashShort: string;
}

export interface VisitorAnalyticsSummary {
  totalHits: number;
  uniqueVisitors: number;
  todayHits: number;
  todayUniq: number;
  topPages: PageStat[];
  topReferrers: ReferrerStat[];
  deviceBreakdown: DimensionStat[];
  browserBreakdown: DimensionStat[];
  osBreakdown: DimensionStat[];
  countryBreakdown: CountryStat[];
  cityBreakdown: CityStat[];
  locationBreakdown: LocationStat[];
  timezoneBreakdown: TimezoneStat[];
  networkBreakdown: NetworkStat[];
  dailyTrend: DailyTrendStat[];
  recentVisits: RecentVisitLog[];
}

/**
 * Konversi ISO 3166-1 alpha-2 code menjadi emoji bendera dan nama negara.
 */
export function getCountryInfo(code: string | null | undefined): { code: string; name: string; flag: string } {
  if (!code || code === "Unknown" || code === "--") {
    return { code: "--", name: "Tidak Diketahui", flag: "🌐" };
  }
  const cleanCode = code.toUpperCase().trim();
  let flag = "🌐";
  if (/^[A-Z]{2}$/.test(cleanCode)) {
    const codePoints = [...cleanCode].map((c) => 127397 + c.charCodeAt(0));
    flag = String.fromCodePoint(...codePoints);
  }

  const COUNTRY_NAMES: Record<string, string> = {
    ID: "Indonesia",
    US: "Amerika Serikat",
    SG: "Singapura",
    MY: "Malaysia",
    JP: "Jepang",
    AU: "Australia",
    GB: "Inggris (UK)",
    DE: "Jerman",
    NL: "Belanda",
    FR: "Prancis",
    IN: "India",
    CN: "Tiongkok",
    KR: "Korea Selatan",
    CA: "Kanada",
    BR: "Brasil",
    RU: "Rusia",
    VN: "Vietnam",
    TH: "Thailand",
    PH: "Filipina",
    HK: "Hong Kong",
    TW: "Taiwan",
  };

  const name = COUNTRY_NAMES[cleanCode] || cleanCode;
  return { code: cleanCode, name, flag };
}

/**
 * Normalisasi URL referrer menjadi domain bersih untuk grouping.
 */
export function extractReferrerDomain(rawReferrer: string | null | undefined): string {
  if (!rawReferrer) return "Langsung / Direct";
  try {
    const url = new URL(rawReferrer);
    const host = url.hostname.replace(/^www\./, "");
    if (host.includes("google.")) return "Google";
    if (host.includes("bing.")) return "Bing";
    if (host.includes("github.com")) return "GitHub";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("t.co") || host.includes("twitter.com") || host.includes("x.com")) return "X (Twitter)";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("whatsapp.")) return "WhatsApp";
    return host;
  } catch {
    return rawReferrer.slice(0, 30);
  }
}

/**
 * Ambil analitik lengkap dari database PostgreSQL.
 */
export async function getVisitorAnalytics(
  range: AnalyticsRange = "30d",
  includeBots: boolean = false
): Promise<VisitorAnalyticsSummary> {
  const emptyResult: VisitorAnalyticsSummary = {
    totalHits: 0,
    uniqueVisitors: 0,
    todayHits: 0,
    todayUniq: 0,
    topPages: [],
    topReferrers: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    osBreakdown: [],
    countryBreakdown: [],
    cityBreakdown: [],
    locationBreakdown: [],
    timezoneBreakdown: [],
    networkBreakdown: [],
    dailyTrend: [],
    recentVisits: [],
  };

  if (!isDbConnected) {
    return emptyResult;
  }

  try {
    const now = new Date();
    // Tentukan awal hari dalam zona waktu Asia/Jakarta (WIB, UTC+7)
    const jakartaDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const startOfTodayJakarta = new Date(`${jakartaDateStr}T00:00:00+07:00`);

    let since: Date | null = null;
    if (range === "today") {
      since = startOfTodayJakarta;
    } else if (range === "7d") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const sinceIso = since ? since.toISOString() : null;
    const startOfTodayJakartaIso = startOfTodayJakarta.toISOString();

    // Filter kondisi query
    const botCondition = includeBots ? sql`1=1` : sql`is_bot = false`;
    const rangeCondition = sinceIso ? sql`created_at >= ${sinceIso}::timestamptz` : sql`1=1`;

    // 1. Overall stats
    const totalQuery = await db.execute<{
      total_hits: number;
      unique_visitors: number;
    }>(sql`
      SELECT
        COUNT(*)::int AS total_hits,
        COUNT(DISTINCT ip_hash)::int AS unique_visitors
      FROM visitor_hits
      WHERE ${botCondition} AND ${rangeCondition}
    `);

    const todayQuery = await db.execute<{
      today_hits: number;
      today_uniq: number;
    }>(sql`
      SELECT
        COUNT(*)::int AS today_hits,
        COUNT(DISTINCT ip_hash)::int AS today_uniq
      FROM visitor_hits
      WHERE ${botCondition} AND created_at >= ${startOfTodayJakartaIso}::timestamptz
    `);

    const totalRows = toRows<{ total_hits: number; unique_visitors: number }>(totalQuery);
    const todayRows = toRows<{ today_hits: number; today_uniq: number }>(todayQuery);
    const totalHits = Number(totalRows[0]?.total_hits || 0);
    const uniqueVisitors = Number(totalRows[0]?.unique_visitors || 0);
    const todayHits = Number(todayRows[0]?.today_hits || 0);
    const todayUniq = Number(todayRows[0]?.today_uniq || 0);

    // 2. Top Pages
    const pagesQuery = await db.execute<{
      path: string;
      hits: number;
      unique: number;
    }>(sql`
      SELECT
        path,
        COUNT(*)::int AS hits,
        COUNT(DISTINCT ip_hash)::int AS unique
      FROM visitor_hits
      WHERE ${botCondition} AND ${rangeCondition}
      GROUP BY path
      ORDER BY hits DESC
      LIMIT 15
    `);

    const topPages: PageStat[] = toRows<{ path: string; hits: number; unique: number }>(pagesQuery).map((r) => ({
      path: String(r.path),
      hits: Number(r.hits),
      unique: Number(r.unique),
    }));

    // 3. Top Referrers
    const referrersQuery = await db.execute<{
      referrer: string | null;
      hits: number;
    }>(sql`
      SELECT
        COALESCE(referrer, 'direct') AS referrer,
        COUNT(*)::int AS hits
      FROM visitor_hits
      WHERE ${botCondition} AND ${rangeCondition}
      GROUP BY referrer
      ORDER BY hits DESC
      LIMIT 15
    `);

    // Grouping per domain
    const domainMap = new Map<string, { referrer: string; domain: string; hits: number }>();
    for (const r of toRows<{ referrer: string | null; hits: number }>(referrersQuery)) {
      const ref = r.referrer === "direct" ? null : String(r.referrer);
      const domain = extractReferrerDomain(ref);
      const hits = Number(r.hits);
      const existing = domainMap.get(domain);
      if (existing) {
        existing.hits += hits;
      } else {
        domainMap.set(domain, { referrer: ref || "Langsung / Direct", domain, hits });
      }
    }
    const topReferrers = Array.from(domainMap.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    // Helper dimension query
    async function queryDimension(columnName: string, limit = 8): Promise<DimensionStat[]> {
      const colSql = sql.raw(columnName);
      const res = await db.execute<{ name: string | null; count: number }>(sql`
        SELECT
          COALESCE(${colSql}, 'Unknown') AS name,
          COUNT(*)::int AS count
        FROM visitor_hits
        WHERE ${botCondition} AND ${rangeCondition}
        GROUP BY ${colSql}
        ORDER BY count DESC
        LIMIT ${limit}
      `);

      return toRows<{ name: string | null; count: number }>(res).map((r) => ({
        name: String(r.name || "Unknown"),
        count: Number(r.count),
        percentage: totalHits > 0 ? Math.round((Number(r.count) / totalHits) * 100) : 0,
      }));
    }

    const [
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      rawCountryBreakdown,
      citiesQuery,
      timezonesQuery,
      networksQuery,
      locationsQuery,
    ] = await Promise.all([
      queryDimension("device"),
      queryDimension("browser"),
      queryDimension("os"),
      queryDimension("country", 10),
      db.execute<{ city: string | null; count: number }>(sql`
        SELECT
          city,
          COUNT(*)::int AS count
        FROM visitor_hits
        WHERE ${botCondition} AND ${rangeCondition} AND city IS NOT NULL AND city != ''
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
      `),
      db.execute<{ timezone: string | null; count: number }>(sql`
        SELECT
          timezone,
          COUNT(*)::int AS count
        FROM visitor_hits
        WHERE ${botCondition} AND ${rangeCondition} AND timezone IS NOT NULL AND timezone != ''
        GROUP BY timezone
        ORDER BY count DESC
        LIMIT 10
      `),
      db.execute<{ network: string | null; asn: string | null; count: number }>(sql`
        SELECT
          network,
          asn,
          COUNT(*)::int AS count
        FROM visitor_hits
        WHERE ${botCondition} AND ${rangeCondition} AND (network IS NOT NULL OR asn IS NOT NULL)
        GROUP BY network, asn
        ORDER BY count DESC
        LIMIT 30
      `),
      db.execute<{ country: string | null; city: string | null; region: string | null; count: number }>(sql`
        SELECT
          country,
          city,
          region,
          COUNT(*)::int AS count
        FROM visitor_hits
        WHERE ${botCondition} AND ${rangeCondition} AND (country IS NOT NULL OR city IS NOT NULL OR region IS NOT NULL)
        GROUP BY country, city, region
        ORDER BY count DESC
        LIMIT 12
      `),
    ]);

    const countryBreakdown: CountryStat[] = rawCountryBreakdown.map((c) => {
      const info = getCountryInfo(c.name);
      return {
        code: info.code,
        name: info.name,
        flag: info.flag,
        count: c.count,
        percentage: totalHits > 0 ? Math.round((c.count / totalHits) * 100) : 0,
      };
    });

    const cityBreakdown: CityStat[] = toRows<{ city: string | null; count: number }>(citiesQuery).map((r) => ({
      city: String(r.city || "Unknown"),
      count: Number(r.count),
      percentage: totalHits > 0 ? Math.round((Number(r.count) / totalHits) * 100) : 0,
    }));

    const timezoneBreakdown: TimezoneStat[] = toRows<{ timezone: string | null; count: number }>(timezonesQuery).map((r) => ({
      timezone: String(r.timezone || "Unknown"),
      count: Number(r.count),
      percentage: totalHits > 0 ? Math.round((Number(r.count) / totalHits) * 100) : 0,
    }));

    // Agregasi nama jaringan manusiawi yang rapi dan terstandardisasi
    const networkMap = new Map<string, number>();
    for (const r of toRows<{ network: string | null; asn: string | null; count: number }>(networksQuery)) {
      const cleanName = formatReadableNetwork(r.network, r.asn);
      networkMap.set(cleanName, (networkMap.get(cleanName) || 0) + Number(r.count));
    }
    const networkBreakdown: NetworkStat[] = Array.from(networkMap.entries())
      .map(([network, count]) => ({
        network,
        count,
        percentage: totalHits > 0 ? Math.round((count / totalHits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const locationBreakdown: LocationStat[] = toRows<{
      country: string | null;
      city: string | null;
      region: string | null;
      count: number;
    }>(locationsQuery).map((r) => {
      const countryInfo = getCountryInfo(r.country);
      const locParts: string[] = [];
      if (r.city) locParts.push(r.city);
      if (r.region) locParts.push(r.region);
      if (countryInfo.name && countryInfo.name !== "--") locParts.push(countryInfo.name);
      const fullLocation = locParts.length > 0 ? locParts.join(", ") : "Tidak Diketahui";

      return {
        countryCode: countryInfo.code,
        countryName: countryInfo.name,
        flag: countryInfo.flag,
        city: r.city ? String(r.city) : null,
        region: r.region ? String(r.region) : null,
        fullLocation,
        count: Number(r.count),
        percentage: totalHits > 0 ? Math.round((Number(r.count) / totalHits) * 100) : 0,
      };
    });

    // 4. Daily Trend
    const trendQuery = await db.execute<{
      day: string;
      hits: number;
      unique: number;
    }>(sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS hits,
        COUNT(DISTINCT ip_hash)::int AS unique
      FROM visitor_hits
      WHERE ${botCondition} AND ${rangeCondition}
      GROUP BY day
      ORDER BY day ASC
      LIMIT 60
    `);

    const dailyTrend: DailyTrendStat[] = toRows<{ day: string; hits: number; unique: number }>(trendQuery).map((r) => ({
      date: String(r.day),
      hits: Number(r.hits),
      unique: Number(r.unique),
    }));

    // 5. Recent Visits Log
    const recentRows = await db
      .select()
      .from(visitorHits)
      .where(includeBots ? undefined : eq(visitorHits.isBot, false))
      .orderBy(desc(visitorHits.createdAt))
      .limit(30);

    const recentVisits: RecentVisitLog[] = recentRows.map((r) => {
      const countryInfo = getCountryInfo(r.country);
      const locParts: string[] = [];
      if (r.city) locParts.push(r.city);
      if (r.region) locParts.push(r.region);
      if (countryInfo.name && countryInfo.name !== "--") locParts.push(countryInfo.name);
      const fullLocation = locParts.length > 0 ? locParts.join(", ") : "-";

      return {
        id: r.id,
        path: r.path,
        referrer: r.referrer,
        browser: r.browser,
        os: r.os,
        device: r.device,
        country: r.country,
        countryName: countryInfo.name,
        countryFlag: countryInfo.flag,
        city: r.city,
        region: r.region,
        fullLocation,
        timezone: r.timezone,
        asn: r.asn,
        network: formatReadableNetwork(r.network, r.asn),
        isBot: r.isBot,
        createdAt: r.createdAt,
        ipHashShort: r.ipHash.slice(0, 8),
      };
    });

    return {
      totalHits,
      uniqueVisitors,
      todayHits,
      todayUniq,
      topPages,
      topReferrers,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      countryBreakdown,
      cityBreakdown,
      locationBreakdown,
      timezoneBreakdown,
      networkBreakdown,
      dailyTrend,
      recentVisits,
    };
  } catch (err) {
    console.error("Failed to query visitor analytics:", err);
    return emptyResult;
  }
}
