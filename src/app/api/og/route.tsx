import { ImageResponse } from "next/og";
import {
  OG_IMAGE_SIZE,
  renderSectionOgElement,
} from "@/lib/og-section-renderer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "profil";
    const lang = searchParams.get("lang") === "en" ? "en" : "id";
    const title = searchParams.get("title") || undefined;
    const subtitle = searchParams.get("subtitle") || searchParams.get("desc") || undefined;
    const badge = searchParams.get("badge") || undefined;

    const element = await renderSectionOgElement({
      section,
      lang,
      title,
      subtitle,
      badge,
    });

    return new ImageResponse(element, {
      ...OG_IMAGE_SIZE,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Error generating OG image in /api/og:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
