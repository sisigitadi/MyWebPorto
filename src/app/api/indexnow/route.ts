import { NextRequest, NextResponse } from "next/server";
import { getProjects, getArticles } from "@/lib/actions";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "e5b871c984924b179571fcfdca565780";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";

/**
 * Submits URL list to IndexNow (Bing, Yandex, Seznam, Naver)
 * POST /api/indexnow
 * Optional Body: { urls: string[] }
 * If no body provided, gathers all published projects, articles, and main routes.
 */
export async function POST(req: NextRequest) {
  try {
    let urlsToSubmit: string[] = [];

    try {
      const body = await req.json();
      if (body && Array.isArray(body.urls) && body.urls.length > 0) {
        urlsToSubmit = body.urls;
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to ping IndexNow API",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "IndexNow Endpoint Ready",
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL.replace(/\/$/, "")}/${INDEXNOW_KEY}.txt`,
  });
}
