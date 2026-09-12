import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProjects, getArticles } from "@/lib/actions";
import { rateLimit, cleanupRateLimits } from "@/lib/rate-limit";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "e5b871c984924b179571fcfdca565780";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";

// Hardening: IndexNow harus admin-only + rate-limited
// Limit: 5 requests per 60s per IP (diturunkan dari 10 agar lebih ketat)
const POST_LIMIT = 5;
const POST_WINDOW_MS = 60_000;
const MAX_URLS_PER_REQUEST = 100;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Submits URL list to IndexNow (Bing, Yandex, Seznam, Naver)
 * POST /api/indexnow
 * Optional Body: { urls: string[] }
 * If no body provided, gathers all published projects, articles, and main routes.
 */
export async function POST(req: NextRequest) {
  // Auth gate: hanya admin yang boleh trigger IndexNow (mencegah abuse anon)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isPlaceholder = !publishableKey || publishableKey.includes("xxxx");
  if (!isPlaceholder) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminId = process.env.ADMIN_CLERK_ID;
    if (adminId && adminId !== "user_xxxxxxxxxxxxxxxxx" && userId !== adminId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const ip = clientIp(req);
  const rl = rateLimit(`indexnow:post:${ip}`, POST_LIMIT, POST_WINDOW_MS);
  cleanupRateLimits();

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) } }
    );
  }

  try {
    let urlsToSubmit: string[] = [];

    try {
      const rawBody = await req.text();
      if (rawBody.length > 10_000) {
        return NextResponse.json({ success: false, error: "Payload too large" }, { status: 413 });
      }
      const body = rawBody ? JSON.parse(rawBody) : null;
      if (body && Array.isArray(body.urls) && body.urls.length > 0) {
        if (body.urls.length > MAX_URLS_PER_REQUEST) {
          return NextResponse.json(
            { success: false, error: `Too many URLs (max ${MAX_URLS_PER_REQUEST})` },
            { status: 400 }
          );
        }
        // Sanitize: only accept absolute http(s) URLs on our host.
        const host = new URL(BASE_URL).host;
        const rawUrls: unknown[] = body.urls;
        urlsToSubmit = rawUrls
          .filter((u): u is string => typeof u === "string")
          .slice(0, MAX_URLS_PER_REQUEST)
          .filter((u) => {
            try {
              const parsed = new URL(u);
              return (
                (parsed.protocol === "https:" || parsed.protocol === "http:") &&
                parsed.host === host
              );
            } catch {
              return false;
            }
          });
      }
    } catch {
      // Body not provided or invalid JSON, collect site urls dynamically
    }

    if (urlsToSubmit.length === 0) {
      const [projects, articles] = await Promise.all([getProjects(), getArticles()]);
      const host = BASE_URL.replace(/\/$/, "");

      urlsToSubmit = [
        `${host}/`,
        `${host}/proyek`,
        `${host}/artikel`,
        ...projects.filter((p) => p.published).map((p) => `${host}/proyek/${p.slug}`),
        ...articles.filter((a) => a.published).map((a) => `${host}/artikel/${a.slug}`),
      ];
    }

    const hostName = new URL(BASE_URL).host;

    const payload = {
      host: hostName,
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL.replace(/\/$/, "")}/${INDEXNOW_KEY}.txt`,
      urlList: urlsToSubmit,
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const success = response.ok || response.status === 200 || response.status === 202;

    return NextResponse.json({
      success,
      status: response.status,
      submittedCount: urlsToSubmit.length,
      urls: urlsToSubmit,
      message: success
        ? "URLs successfully submitted to IndexNow (Bing & Search Engine Network)."
        : `IndexNow API returned status code ${response.status}`,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to ping IndexNow API",
      },
      { status: 500 }
    );
  }
}

// GET is intentionally disabled: it previously exposed the IndexNow key publicly.
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed." },
    { status: 405 }
  );
}
