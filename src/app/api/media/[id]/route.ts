import { NextResponse } from "next/server";
import { getMedia, isMediaId } from "@/lib/storage";
import sharp from "sharp";

/**
 * Sajikan gambar dari tabel media (bytea Postgres) dengan optimasi WebP dinamis & on-the-fly resizing.
 *
 * Query Params yang didukung:
 * - `w`: Lebar target gambar (px), misal `?w=192` (dibatasi 16px - 2560px, withoutEnlargement).
 * - `q`: Kualitas kompresi (1-100), default 80.
 * - `fmt`: Format target (`webp` default, atau `avif`).
 *
 * Cache immutable: CDN/browser men-cache respons berdasarkan URL lengkap (termasuk query params).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Id selalu UUID v4; tolak format aneh sebelum query.
  if (!isMediaId(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await getMedia(id);
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  // File SVG vektor tidak perlu dikompresi atau di-rasterize
  if (row.mime === "image/svg+xml") {
    return new NextResponse(new Uint8Array(row.buffer), {
      status: 200,
      headers: {
        "Content-Type": row.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const url = new URL(req.url);
  const widthParam = url.searchParams.get("w");
  const qualityParam = url.searchParams.get("q");
  const formatParam = url.searchParams.get("fmt");

  // Jika tidak meminta resize, format sudah WebP, dan tidak ada param quality, kirim langsung
  if (!widthParam && !qualityParam && !formatParam && row.mime === "image/webp") {
    return new NextResponse(new Uint8Array(row.buffer), {
      status: 200,
      headers: {
        "Content-Type": row.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  try {
    const width = widthParam ? Math.min(Math.max(parseInt(widthParam, 10) || 0, 16), 2560) : undefined;
    const quality = qualityParam ? Math.min(Math.max(parseInt(qualityParam, 10) || 80, 20), 100) : 80;

    let pipeline = sharp(Buffer.from(row.buffer));

    if (width && width > 0) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }

    let targetMime = "image/webp";
    let outputBuffer: Buffer;

    if (formatParam === "avif") {
      targetMime = "image/avif";
      outputBuffer = await pipeline.avif({ quality }).toBuffer();
    } else {
      targetMime = "image/webp";
      outputBuffer = await pipeline.webp({ quality }).toBuffer();
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": targetMime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Fallback aman ke buffer asli bila terjadi kendala saat transformasi
    return new NextResponse(new Uint8Array(row.buffer), {
      status: 200,
      headers: {
        "Content-Type": row.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
